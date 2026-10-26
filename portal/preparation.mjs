import {createHash} from 'node:crypto';
const stamp=()=>new Date().toISOString();
export async function reconcilePreparation(q,owner){
 const roles=await q('SELECT * FROM portal_roles WHERE candidate_id=$1',[owner]);
 for(const r of roles){
  const [old]=await q('SELECT * FROM portal_preparation WHERE role_id=$1 AND candidate_id=$2',[r.id,owner]);
  if(r.decision!=='pursue'){
   if(old&&old.state!=='cancelled')await q('UPDATE portal_preparation SET state=$1,updated_at=$2 WHERE role_id=$3 AND candidate_id=$4',['cancelled',stamp(),r.id,owner]);
   continue;
  }
  if(!old||old.role_digest!==r.digest||old.state==='cancelled'){
   await q('INSERT INTO portal_preparation VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(role_id) DO UPDATE SET role_digest=excluded.role_digest,state=excluded.state,detail=excluded.detail,updated_at=excluded.updated_at',[r.id,owner,r.digest,'queued',JSON.stringify({summary:'Preparation requested. A preparer will verify the posting, check duplicates and tailor your documents.',questions:[],answers:{}}),old?.created_at||stamp(),stamp()]);
  }
 }
 return q('SELECT * FROM portal_preparation WHERE candidate_id=$1 ORDER BY created_at,role_id',[owner]);
}
export function preparationView(row,role,packages){
 const detail=JSON.parse(row.detail),p=JSON.parse(role.payload);
 const linked=packages.filter(x=>{const s=typeof x.payload==='string'?JSON.parse(x.payload):x.payload;return s.company?.trim().toLowerCase()===p.company?.trim().toLowerCase()&&s.requisition_id===p.requisition_id&&!['superseded','rejected'].includes(x.state);});
 const outstanding=detail.questions.filter(x=>!detail.answers?.[x.id]?.trim());
 let state=row.state;
 if(state!=='cancelled'&&outstanding.length)state='needs_answers';
 else if(state!=='cancelled'&&linked.some(x=>x.state==='pending'))state='ready_for_approval';
 else if(state!=='cancelled'&&linked.some(x=>x.state==='approved'))state='approved_unsent';
 const steps={queued:['Preparation queued','We will verify the role and prepare your materials. No action needed yet.'],preparing:['Preparing materials','Your posting, evidence and documents are being reviewed.'],needs_answers:['Needs your answers','Answer the questions below so preparation can continue.'],answers_received:['Answers received','Your answers are saved for the preparer to review.'],ready_for_approval:['Ready for your approval','Open each application or outreach package and review its exact version.'],approved_unsent:['Approved · unsent','Your approval is saved. Submission remains a separate user-driven step.'],blocked:['Preparation blocked','Review the blocker below; nothing will be submitted.'],cancelled:['Preparation stopped','Choose Pursue again to request preparation.']};
 const [label,next_step]=steps[state]||steps.queued;
 return {role_id:row.role_id,role_digest:row.role_digest,state,label,next_step,...detail,outstanding_questions:outstanding.length,packages:linked.map(x=>({id:x.id,state:x.state,kind:(typeof x.payload==='string'?JSON.parse(x.payload):x.payload).kind})),updated_at:row.updated_at,revision:createHash('sha256').update(row.role_digest+row.state+row.detail+row.updated_at).digest('hex')};
}
