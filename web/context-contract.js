// Structural checks only: source truth and map completeness require review.
export function requirementIssues(job) {
 const review=[], reject=[], mapping=job?.requirement_evidence;
 if(!Array.isArray(mapping)||!mapping.length) return {review:['Missing requirement-to-proof map'],reject};
 const text=v=>typeof v==='string'&&!!v.trim();
 for(const item of mapping) {
  if(!item||typeof item.required!=='boolean'||!text(item.requirement)||!['met','unknown','unmet'].includes(item.assessment)) {review.push('Invalid requirement evidence record');continue;}
  if(!item.required) continue;
  if(item.assessment==='unmet'&&text(item.candidate_evidence)&&text(item.source_ref)) reject.push('Required condition unmet: '+item.requirement);
  else if(item.assessment!=='met'||!text(item.candidate_evidence)||!text(item.source_ref)) review.push('Required condition needs proof: '+item.requirement);
 }
 return {review,reject};
}


