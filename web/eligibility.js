import {requirementIssues} from './context-contract.js';
// Browser adapter for job-search-agent/scripts/check_jobs.py.
// Eligibility and rubric points are separate decisions.
export const hasText = value => typeof value === 'string' && !!value.trim();
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
export function canonicalUrl(value) {
 if (!hasText(value)) return '';
 try { const u = new URL(value.trim()); if (!['http:','https:'].includes(u.protocol) || !u.hostname) return '';
 const query = [...u.searchParams].filter(([key]) => !key.toLowerCase().startsWith('utm_') && !['gclid','fbclid','msclkid'].includes(key.toLowerCase())).sort(([a,av],[b,bv]) => a.localeCompare(b) || av.localeCompare(bv));
 u.search = new URLSearchParams(query).toString(); u.pathname = u.pathname.replace(/\/+$/, '') || '/';
 return u.href.replace(/\/(?=[?#]|$)/, '');
 } catch { return ''; }
}
export function identities(job) {
 const keys = new Set(); const company = String(job.company || '').trim().toLowerCase(); const req = String(job.requisition_id || '').trim().toLowerCase();
 if (company && req) keys.add('req:' + company + ':' + req);
 for (const value of [job.url, ...(Array.isArray(job.alternate_urls) ? job.alternate_urls : [])]) { const url=canonicalUrl(value); if(url) keys.add('url:' + url); }
 return keys;
}
const overlaps = (a,b) => [...a].some(key=>b.has(key));
const timestamp = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
export function checkJob(job, policy={}, history=[], now=Date.now()) {
 const reject=[], review=[], notes=[]; const keys=identities(job);
 const prior=history.filter(old=>['submitted','applied','interviewing','offer','rejected','withdrawn'].includes(old.status));
 if(prior.some(old=>overlaps(keys,identities(old)))) return {decision:'already_applied',reasons:['Application history matches this requisition or URL'],notes};
 if(history.some(old=>old.status==='submission-uncertain' && overlaps(keys,identities(old)))) review.push('Prior submission is uncertain; inspect confirmation/account history before retrying');
 if(!hasText(job.company)||!hasText(job.title)) review.push('Missing employer or role title');
 if(!canonicalUrl(job.url)) review.push('Missing valid direct posting URL');
 if(job.posting_status==='closed') reject.push('Posting confirmed closed'); else if(job.posting_status!=='open') review.push('Posting is not confirmed open');
 const verified=timestamp(job.verified_at);
 if(verified===null || verified>now || now-verified>(policy.verification_max_age_hours ?? 72)*3600000) review.push('Posting needs a current, timezone-aware verification timestamp');
 if(!hasText(job.verification_source)) review.push('Missing source for current posting verification');
 for(const name of ['location','work_authorization','qualifications']) {const gate=job.gates?.[name] || {};
 if(gate.status==='fail' && hasText(gate.evidence)) reject.push(name+': '+gate.evidence);
 else if(gate.status!=='pass'||!hasText(gate.evidence)) review.push(name+': missing verified supporting evidence');}
 if(policy.require_requirement_evidence){const issues=requirementIssues(job);reject.push(...issues.reject);review.push(...issues.review);}
 const floor=policy.minimum_base_usd;
 if(floor!==null&&floor!==undefined) {
 if(!positive(floor)) throw new Error('Minimum base must be a positive number or blank');
 const pay=job.compensation || {}; const low=pay.minimum, high=pay.maximum;
 if(!hasText(pay.source)) review.push('Missing compensation source');
 if(pay.currency!=='USD'||pay.type!=='base') review.push('USD base pay is unverified; OTE, equity and total compensation do not establish base');
 else if((low!=null&&!positive(low))||(high!=null&&!positive(high))||(low!=null&&high!=null&&low>high)) review.push('Invalid compensation range');
 else if(pay.period==='hour'&&['contract','temporary'].includes(job.employment_type)) {
 const annualLow=positive(low)?low*2080:null, annualHigh=positive(high)?high*2080:null;
 if(annualHigh!=null&&annualHigh<floor) reject.push('Posted hourly maximum annualizes below minimum base requirement');
 else if(annualLow==null||annualLow<floor) review.push('Hourly range is missing or straddles the floor after annualizing at 2,080 hours');
 else notes.push('Posted hourly minimum annualizes to USD '+annualLow.toLocaleString('en-US')+' at 2,080 hours; actual hours and earnings may vary');
 } else if(pay.period!=='year'||job.employment_type!=='employee') review.push('Compensation structure does not establish eligible annual base pay');
 else if(high!=null&&high<floor) reject.push('Posted base maximum is below minimum base requirement');
 else if(low==null||low<floor) review.push('Base range is missing or straddles the floor; verify attainable base');
 }
 if(!keys.size) review.push('No stable posting identity');
 return {decision:reject.length?'reject':review.length?'review':'eligible',reasons:[...reject,...review],notes};
}
export function evaluate(payload, now=Date.now()) {
 const policy=payload.policy || {}, floor=policy.minimum_base_usd;
 if(floor!=null&&!positive(floor)) throw new Error('Invalid minimum base');
 if(!positive(policy.verification_max_age_hours ?? 72)) throw new Error('Verification age must be positive');
 const results=[],seen=[];
 for(const job of payload.jobs || []) {
 const keys=identities(job),result=checkJob(job,policy,payload.history || [],now);
 const matches=seen.map((previous,index)=>overlaps(keys,previous)?index:-1).filter(index=>index>=0);
 if(matches.length) {const reason='Duplicate batch identity: reconcile all records and reevaluate before use';
 for(const index of matches){if(results[index].decision==='eligible') results[index].decision='review';if(!results[index].reasons.includes(reason)) results[index].reasons.push(reason);}
 if(result.decision!=='already_applied'){result.original_decision=result.decision;result.decision='duplicate';result.reasons.unshift(reason);}}
 seen.push(keys); results.push({company:job.company,title:job.title,url:job.url,...result});
 }
 return results;
}


