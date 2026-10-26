import fs from 'node:fs/promises';
import {openStore} from '../portal/store.mjs';
import {inviteCandidate,digest,audit,validatePackage} from '../portal/service.mjs';

export async function importBundle(store,bundle){
 const owner=bundle.candidate.id;
 if(!(await store.query('SELECT id FROM portal_candidates WHERE id=$1',[owner])).length)throw Error('Invite candidate before importing');
 for(const role of bundle.roles||[])if(role.candidate_id!==owner)throw Error('Wrong role owner');
 for(const p of bundle.packages||[]){if(p.candidate_id!==owner)throw Error('Wrong package owner');validatePackage(p.payload);if(!['pending','approved','rejected','superseded'].includes(p.state))throw Error('Invalid imported state');if(p.state!=='pending'&&!p.decisionEvidence)throw Error('Historical decision evidence required');}
 await store.transaction(async q=>{
  for(const role of bundle.roles||[]){const id=owner+':'+role.review_id,h=digest(role);const [old]=await q('SELECT digest FROM portal_roles WHERE id=$1 AND candidate_id=$2',[id,owner]);if(old?.digest===h)continue;
   await q('INSERT INTO portal_roles VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET digest=excluded.digest,payload=excluded.payload,decision=excluded.decision,note=excluded.note',[id,owner,h,JSON.stringify(role),'unreviewed','']);await audit(q,owner,id,'role_imported',h);
  }
  for(const p of bundle.packages||[]){const id=owner+':'+p.id,h=digest(p.payload),[old]=await q('SELECT digest FROM portal_packages WHERE id=$1 AND candidate_id=$2',[id,owner]);if(old){if(old.digest!==h)throw Error('Existing version changed; create a new version');continue;}
   const family=s=>s.company.trim().toLowerCase()+'|'+s.requisition_id+'|'+s.kind;
   for(const prior of await q('SELECT * FROM portal_packages WHERE candidate_id=$1',[owner]))if(family(JSON.parse(prior.payload))===family(p.payload)){
    if(prior.version>=p.version)throw Error('Stale package import');
    if(['submitted','uncertain','executing'].includes(prior.state))throw Error('Prior action needs reconciliation');
    if(['pending','approved','changes_requested'].includes(prior.state)){await q('UPDATE portal_packages SET state=$1 WHERE id=$2',['superseded',prior.id]);await audit(q,owner,prior.id,'superseded',id);}
   }
   await q('INSERT INTO portal_packages VALUES ($1,$2,$3,$4,$5,$6,$7)',[id,owner,p.version,h,JSON.stringify(p.payload),p.state,new Date().toISOString()]);await audit(q,owner,id,'imported',JSON.stringify({originalDigest:p.originalDigest,evidence:p.decisionEvidence||'Pending review; no decision imported'}));
  }
 });
}
if(process.argv[1]?.endsWith('portal-admin.mjs')){
 const [command,file]=process.argv.slice(2);const input=JSON.parse(await fs.readFile(file,'utf8'));const store=await openStore();try{
  if(command==='invite'){const token=await inviteCandidate(store,input);console.log(JSON.stringify({activationUrl:process.env.PORTAL_ORIGIN+'/private/#invite='+token}));}
  else if(command==='import'){await importBundle(store,input);console.log(JSON.stringify({imported:true,roles:input.roles?.length||0,packages:input.packages?.length||0}));}
  else throw Error('Use invite or import with a private JSON input file');
 }finally{await store.close();}
}
