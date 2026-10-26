import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';

// Inputs must stay outside Git. No tokens, passwords, PDF bytes or response
// contents are printed. Import is idempotent; uncertain writes may be reconciled
// with the same immutable bundle rather than making a new version.
const [bundleFile,localDb,operatorFile,origin]=process.argv.slice(2);
if(!bundleFile||!localDb||!operatorFile||!origin)throw Error('Usage: portal-sync.mjs PRIVATE_BUNDLE LOCAL_DB PRIVATE_OPERATOR_JSON HTTPS_ORIGIN');
const target=new URL(origin);
if(target.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(target.hostname))throw Error('HTTPS required');
const bundle=JSON.parse(await fs.readFile(bundleFile,'utf8'));
const db=new DatabaseSync(localDb,{readOnly:true});
const candidate=db.prepare('SELECT id,email,name,password,profile FROM portal_candidates WHERE id=?').get(bundle.candidate.id);db.close();
if(!candidate)throw Error('Local candidate missing');
bundle.candidate={id:candidate.id,email:candidate.email,name:candidate.name,passwordHash:candidate.password,profile:JSON.parse(candidate.profile)};
const {token}=JSON.parse(await fs.readFile(operatorFile,'utf8'));
try{
 const response=await fetch(target.origin+'/api/portal?action=operator-import',{method:'POST',headers:{Origin:target.origin,'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(bundle),signal:AbortSignal.timeout(60000)});
 const result=await response.json();
 if(!response.ok||!result.ok){console.log(JSON.stringify({ok:false,status:response.status}));process.exitCode=1;}
 else console.log(JSON.stringify({ok:true,roles:bundle.roles?.length||0,packages:bundle.packages?.length||0,sent:false}));
}catch{console.log(JSON.stringify({ok:false,uncertain:true,message:'Check hosted state before changing or retrying the import.'}));process.exitCode=1;}
