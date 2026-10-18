import crypto from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(crypto.scrypt), sha=s=>crypto.createHash('sha256').update(s).digest('hex');
export const digest=value=>sha(JSON.stringify(value));
const now=()=>new Date().toISOString(), future=hours=>new Date(Date.now()+hours*3600000).toISOString();
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const safeEqual=(a,b)=>crypto.timingSafeEqual(Buffer.from(sha(a)),Buffer.from(sha(b)));
const cookie=(token,secure)=>`cc_session=${token}; Path=/api/portal; HttpOnly; SameSite=Strict; Max-Age=43200${secure?'; Secure':''}`;
export async function passwordHash(password){const salt=crypto.randomBytes(16).toString('hex');return salt+':'+Buffer.from(await scrypt(password,salt,64)).toString('hex');}
async function passwordMatches(password,encoded){const [salt,key]=(encoded||'').split(':');const derived=Buffer.from(await scrypt(password,salt||'absent-user-salt',64)).toString('hex');return !!key&&safeEqual(derived,key);}
export async function audit(q,candidate,item,action,detail=''){await q('INSERT INTO portal_audit VALUES ($1,$2,$3,$4,$5,$6)',[crypto.randomUUID(),candidate,item,action,detail,now()]);}
export async function inviteCandidate(store,{id,email,name,profile={}}){
 if(!/^[a-z0-9-]{1,64}$/.test(id)||!/^\S+@\S+\.\S+$/.test(email))throw Error('Invalid candidate');
 const token=crypto.randomBytes(32).toString('base64url');
 await store.transaction(async q=>{
  if((await q('SELECT id FROM portal_candidates WHERE id=$1 OR email=$2',[id,email.toLowerCase()])).length)throw Error('Candidate already exists');
  await q('INSERT INTO portal_candidates VALUES ($1,$2,$3,$4,$5,$6)',[id,email.toLowerCase(),name,null,JSON.stringify(profile),now()]);
  await q('INSERT INTO portal_invites VALUES ($1,$2,$3)',[sha(token),id,future(24)]);await audit(q,id,null,'invited');
 });return token;
}
export function validatePackage(payload){
 if(!['application','outreach'].includes(payload.kind)||!payload.company||!payload.role)throw Error('Incomplete package');
 if(/placeholder|lorem ipsum|\[insert|\{\{|double offer os|job-hunter-bot|job-search-agent/i.test(JSON.stringify(payload.employer_content)))throw Error('Invalid employer content');
 const docs=payload.documents||[];
 if(payload.kind==='application'&&(!docs.some(d=>d.kind==='resume')||!docs.some(d=>d.kind==='cover')) )throw Error('Resume and cover letter required');
 for(const d of docs){const data=Buffer.from(d.contentBase64||'','base64');if(!data.subarray(0,5).equals(Buffer.from('%PDF-'))||sha(data)!==d.sha256||!d.reviewedText||/placeholder|lorem ipsum|\[insert|\{\{|double offer os|job-hunter-bot|job-search-agent/i.test(d.reviewedText))throw Error('Invalid document');}
}
export function createPortal(store,{origin,operatorToken=''}={}){
 const allowed=new URL(origin);if(allowed.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(allowed.hostname))throw Error('HTTPS required');
 return async request=>{
  try{
   const url=new URL(request.url),action=url.searchParams.get('action')||'workspace',method=request.method;
   if(!['GET','POST'].includes(method))return json({error:'Method not allowed'},405);
   let body={};
   if(method==='POST'){
    if(request.headers.get('origin')!==allowed.origin)return json({error:'Invalid origin'},403);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);
    const text=await request.text();if(Buffer.byteLength(text)>(action==='operator-import'?2000000:300000))return json({error:'Request too large'},413);body=JSON.parse(text);
   }
   if(action==='operator-import'){
    if(method!=='POST'||operatorToken.length<32||!safeEqual(request.headers.get('authorization')||'','Bearer '+operatorToken))return json({error:'Unauthorized'},401);
    const {importBundle}=await import('../scripts/portal-admin.mjs');
    await store.transaction(async q=>{
     const c=body.candidate||{};
     if(!/^[a-z0-9-]{1,64}$/.test(c.id)||!/^\S+@\S+\.\S+$/.test(c.email)||typeof c.name!=='string'||!c.name.trim())throw Error('Invalid candidate');
     const [old]=await q('SELECT email FROM portal_candidates WHERE id=$1',[c.id]);
     if(old&&old.email!==c.email.toLowerCase())throw Error('Candidate identity changed');
     if(!old){
      if(c.passwordHash&&!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(c.passwordHash))throw Error('Invalid migrated credential');
      await q('INSERT INTO portal_candidates VALUES ($1,$2,$3,$4,$5,$6)',[c.id,c.email.toLowerCase(),c.name,c.passwordHash||null,JSON.stringify(c.profile||{}),now()]);
      await audit(q,c.id,null,'operator_account_imported','New account from private source; existing accounts never overwritten');
     }
     await importBundle({query:q,transaction:work=>work(q)},body);
     await audit(q,c.id,null,'operator_queue_imported',JSON.stringify({roles:body.roles?.length||0,packages:body.packages?.length||0}));
    });return json({ok:true,sent:false});
   }
   if(action==='invite'){
    if(method!=='POST'||operatorToken.length<32||!safeEqual(request.headers.get('authorization')||'','Bearer '+operatorToken))return json({error:'Unauthorized'},401);
    const token=await inviteCandidate(store,body);return json({activationUrl:allowed.origin+'/private/#invite='+token},201);
   }
   if(action==='login'||action==='activate'){
    if(method!=='POST')return json({error:'Method not allowed'},405);
    if(typeof body.password!=='string'||body.password.length<12||body.password.length>256)return json({error:'Use a password of 12–256 characters'},400);
    // Durable account-level throttling also works across serverless instances.
    const key=sha(action+String(body.email||body.token||''));
    const permitted=await store.transaction(async q=>{const [a]=await q('SELECT * FROM portal_attempts WHERE attempt_key=$1',[key]);if(a&&a.resets_at>now()&&a.count>=10)return false;await q('INSERT INTO portal_attempts VALUES ($1,$2,$3) ON CONFLICT(attempt_key) DO UPDATE SET count=excluded.count,resets_at=excluded.resets_at',[key,a&&a.resets_at>now()?a.count+1:1,a&&a.resets_at>now()?a.resets_at:future(.25)]);return true;});
    if(!permitted)return json({error:'Too many attempts. Try again in 15 minutes.'},429);
    let candidate;
    if(action==='activate'){
     const encoded=await passwordHash(body.password);
     candidate=await store.transaction(async q=>{const [i]=await q('SELECT * FROM portal_invites WHERE token_hash=$1',[sha(String(body.token||''))]);if(!i||i.expires_at<now())return null;const result=await q('UPDATE portal_candidates SET password=$1 WHERE id=$2 AND password IS NULL RETURNING id',[encoded,i.candidate_id]);if(!result.length)return null;await q('DELETE FROM portal_invites WHERE token_hash=$1',[i.token_hash]);await audit(q,i.candidate_id,null,'activated');return result[0];});
    }else{
     const [c]=await store.query('SELECT id,password FROM portal_candidates WHERE email=$1',[String(body.email||'').trim().toLowerCase()]);if(await passwordMatches(body.password,c?.password))candidate=c;
    }
    if(!candidate)return json({error:'Sign-in details or invitation are invalid'},401);
    const token=crypto.randomBytes(32).toString('base64url');await store.transaction(async q=>{await q('INSERT INTO portal_sessions VALUES ($1,$2,$3)',[sha(token),candidate.id,future(12)]);await audit(q,candidate.id,null,'signed_in');});
    return json({ok:true},200,{'Set-Cookie':cookie(token,allowed.protocol==='https:')});
   }
   const token=request.headers.get('cookie')?.match(/(?:^|;\s*)cc_session=([^;]+)/)?.[1]||'';
   const [session]=await store.query('SELECT * FROM portal_sessions WHERE token_hash=$1',[sha(token)]);
   if(!session||session.expires_at<now())return json({error:'Please sign in'},401);
   const owner=session.candidate_id;
   if(action==='logout'&&method==='POST'){await store.query('DELETE FROM portal_sessions WHERE token_hash=$1',[sha(token)]);return json({ok:true},200,{'Set-Cookie':cookie('',allowed.protocol==='https:')+'; Max-Age=0'});}
   if(action==='workspace'&&method==='GET'){
    const [c]=await store.query('SELECT id,name,email,profile FROM portal_candidates WHERE id=$1',[owner]);
    const roles=await store.query('SELECT * FROM portal_roles WHERE candidate_id=$1 ORDER BY id',[owner]);
    const packages=await store.query('SELECT id,version,digest,state,created_at,payload FROM portal_packages WHERE candidate_id=$1 ORDER BY created_at DESC',[owner]);
    return json({candidate:{...c,profile:JSON.parse(c.profile)},roles:roles.map(r=>({...r,payload:JSON.parse(r.payload)})),packages:packages.map(p=>{const s=JSON.parse(p.payload);return {...p,payload:{...s,documents:(s.documents||[]).map(({contentBase64,reviewedText,...d})=>d)}};}),employerSendingEnabled:false});
   }
   if(action==='package'&&method==='GET'){
    const [p]=await store.query('SELECT * FROM portal_packages WHERE id=$1 AND candidate_id=$2',[url.searchParams.get('id')||'',owner]);if(!p)return json({error:'Not found'},404);
    const events=await store.query('SELECT action,detail,created_at FROM portal_audit WHERE candidate_id=$1 AND item_id=$2 ORDER BY created_at',[owner,p.id]);return json({...p,payload:JSON.parse(p.payload),audit:events});
   }
   if(action==='resume'&&method==='POST'){
    if(typeof body.label!=='string'||!body.label.trim()||body.label.length>100||typeof body.filename!=='string'||body.filename.length>160||!/[.](pdf|docx)$/i.test(body.filename)||! /^[a-f0-9]{64}$/.test(body.sha256)||!body.cv||typeof body.cv.name!=='string'||!Array.isArray(body.cv.sections))return json({error:'Invalid resume import'},400);
    await store.transaction(async q=>{const [c]=await q('SELECT profile FROM portal_candidates WHERE id=$1',[owner]);const profile=JSON.parse(c.profile);const resumes=profile.resumes||[];if(resumes.length>=10)throw Error('Resume limit');resumes.push({id:crypto.randomUUID(),label:body.label,filename:body.filename,sha256:body.sha256,cv:body.cv,source:'Candidate-uploaded; claims require verification',created_at:now()});profile.resumes=resumes;await q('UPDATE portal_candidates SET profile=$1 WHERE id=$2',[JSON.stringify(profile),owner]);await audit(q,owner,null,'resume_added',body.sha256);});return json({ok:true,existingApprovalsChanged:false});
   }
   if(action==='profile'&&method==='POST'){
    const fields=['location','minimumBase','travelPercent','workAuthorized','sponsorship','education','experience','notes'];
    if(Object.keys(body).some(k=>!fields.includes(k))||Object.values(body).some(v=>typeof v!=='string'||v.length>6000))return json({error:'Invalid profile answers'},400);
    await store.transaction(async q=>{const [c]=await q('SELECT profile FROM portal_candidates WHERE id=$1',[owner]);const p={...JSON.parse(c.profile),answers:body};await q('UPDATE portal_candidates SET profile=$1 WHERE id=$2',[JSON.stringify(p),owner]);await audit(q,owner,null,'profile_updated','Approved package contents unchanged');});return json({ok:true});
   }
   if(action==='role-decision'&&method==='POST'){
    if(!['pursue','pass','needs_changes'].includes(body.decision)||typeof body.note!=='string'||body.note.length>2000)return json({error:'Invalid decision'},400);
    return await store.transaction(async q=>{const r=await q('UPDATE portal_roles SET decision=$1,note=$2 WHERE id=$3 AND candidate_id=$4 AND digest=$5 RETURNING id',[body.decision,body.note,body.id,owner,body.digest]);if(!r.length)return json({error:'Stale role or not found'},409);await audit(q,owner,body.id,'role_'+body.decision,body.note);return json({ok:true,applicationApproved:false});});
   }
   if(action==='package-decision'&&method==='POST'){
    if(!['approve','reject','needs_changes'].includes(body.decision))return json({error:'Invalid decision'},400);
    return await store.transaction(async q=>{const [p]=await q('SELECT * FROM portal_packages WHERE id=$1 AND candidate_id=$2',[body.id,owner]);if(!p||p.digest!==body.digest||digest(JSON.parse(p.payload))!==p.digest||p.state!=='pending')return json({error:'Stale package or not found'},409);
     const payload=JSON.parse(p.payload);validatePackage(payload);
     const updated=await q('UPDATE portal_packages SET state=$1 WHERE id=$2 AND candidate_id=$3 AND state=$4 RETURNING id',[body.decision==='approve'?'approved':body.decision==='reject'?'rejected':'changes_requested',p.id,owner,'pending']);if(!updated.length)return json({error:'Stale decision'},409);await audit(q,owner,p.id,body.decision,p.digest);return json({ok:true,sent:false,submissionReady:payload.submission_ready===true});});
   }
   return json({error:'Not found'},404);
  }catch{return json({error:'Unable to complete request'},500);}
 };
}
