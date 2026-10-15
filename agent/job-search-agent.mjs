import {requirementIssues} from '../web/context-contract.js';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import OpenAI from 'openai';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');

function readJson(filename,label){
 try{return JSON.parse(fs.readFileSync(filename,'utf8'));}
 catch(error){throw new Error(`Unable to read ${label} at ${filename}: ${error.message}`);}
}
function loadLocalKey(){
 if(process.env.OPENAI_API_KEY?.trim())return process.env.OPENAI_API_KEY.trim();
 const envFile=path.join(root,'.env.local');
 if(!fs.existsSync(envFile))throw new Error('OPENAI_API_KEY is not configured.');
 const match=fs.readFileSync(envFile,'utf8').match(/^\s*OPENAI_API_KEY\s*=\s*(.+?)\s*$/m);
 if(!match)throw new Error('OPENAI_API_KEY is not configured.');
 return match[1].replace(/^['"]|['"]$/g,'');
}
function option(name,fallback=null){const i=process.argv.indexOf(`--${name}`);return i>=0?process.argv[i+1]:fallback;}
function positiveInt(value,fallback){const n=Number(value);return Number.isInteger(n)&&n>0?n:fallback;}
function parseJsonOutput(text){
 const clean=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 const first=clean.indexOf('{'),last=clean.lastIndexOf('}');
 if(first<0||last<first)throw new Error('The agent did not return a JSON object.');
 return JSON.parse(clean.slice(first,last+1));
}
function stableUrl(value){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!!url.hostname;}catch{return false;}}
function validateBatch(batch,policy){
 if(!batch||!Array.isArray(batch.jobs))throw new Error('Agent output must contain a jobs array.');
 if(batch.jobs.length>100)throw new Error('Agent returned too many roles.');
 const seen=new Set();
 for(const [index,job] of batch.jobs.entries()){
  const at=`jobs[${index}]`;
  for(const field of ['company','title','url','posting_status','verified_at','verification_source','employment_type','location','arrangement','fit_rationale'])if(typeof job[field]!=='string'||!job[field].trim())throw new Error(`${at}.${field} is required.`);
  if(!stableUrl(job.url))throw new Error(`${at}.url must be a public HTTP(S) URL.`);
  if(/(^|\.)linkedin\.com$/i.test(new URL(job.url).hostname))throw new Error(`${at}.url cannot be LinkedIn; LinkedIn is lead-only and the external employer application URL is required.`);
  const key=job.url.toLowerCase();if(seen.has(key))throw new Error(`${at}.url duplicates another result.`);seen.add(key);
  if(job.posting_status!=='open')throw new Error(`${at} is not verified open.`);
  if(!Number.isFinite(Date.parse(job.verified_at))||!/(?:Z|[+-]\d{2}:\d{2})$/i.test(job.verified_at))throw new Error(`${at}.verified_at must include a timezone.`);
  if(!Number.isFinite(job.fit_points)||job.fit_points<policy.minimum_fit_points||job.fit_points>100)throw new Error(`${at}.fit_points is outside the allowed range.`);
  const issues=requirementIssues(job);if(issues.review.length||issues.reject.length)throw new Error(`${at}: ${[...issues.reject,...issues.review].join('; ')}`);
  const pay=job.compensation||{};
  if(pay.currency!=='USD'||pay.type!=='base'||!pay.source)throw new Error(`${at} lacks employer-posted USD base-pay evidence.`);
  const annualMinimum=pay.period==='hour'&&['contract','temporary'].includes(job.employment_type)?Number(pay.minimum)*2080:Number(pay.minimum);
  if(!Number.isFinite(annualMinimum)||annualMinimum<policy.minimum_base_usd)throw new Error(`${at} does not clear the base-pay floor.`);
  for(const gate of ['location','work_authorization','qualifications'])if(job.gates?.[gate]?.status!=='pass'||!job.gates[gate].evidence)throw new Error(`${at}.gates.${gate} lacks pass evidence.`);
 }
 return batch;
}

const policyPath=path.resolve(option('policy',path.join(here,'search-policy.json')));
const resumeArg=option('resume');
if(!resumeArg)throw new Error('Pass an import-ready CheckChaser resume with --resume <file>.');
const contextArg=option('context');
const count=Math.min(60,positiveInt(option('count'),12));
const outputPath=path.resolve(option('output',path.join(here,'output','checkchaser-agent-batch.json')));
const policy=readJson(policyPath,'search policy');
const resume=readJson(path.resolve(resumeArg),'resume');
const prior=contextArg?readJson(path.resolve(contextArg),'CheckChaser context'):{jobs:[],history:[],learning_context:{}};
const priorIdentities=[...(prior.jobs||[]),...(prior.history||[])].map(job=>({company:job.company,title:job.title,url:job.url,requisition_id:job.requisition_id,status:job.status}));
const applicationAnswerBank=prior.application_answer_bank||prior.applicationAnswers||[];

const domainContext=fs.readFileSync(path.join(root,'context/domain_rules.md'),'utf8');
const instructions=domainContext+'\n'+`You are CheckChaser's evidence-first job-search agent. Search the live web for real, currently open jobs. Use only facts supported by the live posting. Never apply, submit information, answer screening questions, contact an employer, or claim that a candidate meets a requirement without evidence. Return JSON only. Use the approved discovery sources in the supplied policy: Greenhouse, Lever (jobs.lever.co), Ashby (jobs.ashbyhq.com), Dice, ZipRecruiter, Indeed, LinkedIn, and Web3 Careers (web3.career). Prefer the employer's direct career page or official ATS as the final URL. LinkedIn is lead-only: never return a LinkedIn URL as the application URL, never use LinkedIn Easy Apply, and always resolve the lead to the employer's external application page. Verify every aggregator lead against the live employer or ATS posting before including it. Compensation must be employer-posted base salary or hourly base rate, not estimates, OTE, equity, bonus, or total compensation. Remote United States comes first, then explicitly hybrid Central Texas. Deduplicate against the supplied history. Return requirement_evidence covering every mandatory and preferred qualification. Each item needs requirement, required (boolean), assessment (met|unknown|unmet), candidate_evidence and source_ref. Never pass an unknown mandatory qualification. The application answer bank is candidate context for evidence-based fit only; obey every answer guardrail and never treat a planned process or hypothetical statement as a completed outcome. Every URL must point to the specific live role.`;
const input=`Find up to ${count} credible roles for this candidate and prepare an import-ready CheckChaser batch.

SEARCH POLICY:
${JSON.stringify(policy)}

RESUME:
${JSON.stringify(resume.cv||resume)}

PRIOR JOBS, APPLICATIONS, AND LEARNING CONTEXT:
${JSON.stringify({records:priorIdentities,learning_context:prior.learning_context||{}})}

VERIFIED APPLICATION ANSWER BANK:
${JSON.stringify(applicationAnswerBank)}

Return exactly one JSON object with this shape:
{"generated_at":"timezone-aware ISO timestamp","summary":"short factual run summary","jobs":[{"company":"","title":"","url":"","requisition_id":"","posting_status":"open","verified_at":"timezone-aware ISO timestamp","verification_source":"what live source was checked","application_method":"","employment_type":"employee|contract|temporary","location":"","arrangement":"Remote|Hybrid","gates":{"location":{"status":"pass","evidence":""},"work_authorization":{"status":"pass","evidence":""},"qualifications":{"status":"pass","evidence":""}},"compensation":{"minimum":0,"maximum":0,"currency":"USD","type":"base","period":"year|hour","source":"employer-posted compensation evidence"},"fit_points":85,"fit_rationale":"strengths and material gaps","jd":"concise requirement summary","approval_status":"awaiting_review"}]}`;

const client=new OpenAI({apiKey:loadLocalKey()});
const events=await client.beta.agents.sessions.create({
 agent:{model:'gpt-6-astra',instructions,reasoning:{effort:'medium',summary:'concise'},tools:[{type:'web_search',mode:'live',context_size:'high'}],text:{verbosity:'low'}},
 environment:{type:'openai_hosted'},
 input,
 stream:true
});
events.withResultCollection();
let sessionId='';
try{
 for await(const event of events){
  if(event.session_id)sessionId=event.session_id;
  if(event.type==='agent.session.created'&&event.session?.id)sessionId=event.session.id;
  if(event.type?.includes('failed'))throw new Error(event.error?.message||'Agent run failed.');
 }
 const result=await events.finalResult();
 sessionId=result.session_id||sessionId;
 const batch=validateBatch(parseJsonOutput(result.output_text),policy);
 batch.policy={minimum_base_usd:policy.minimum_base_usd,target_ceiling_usd:policy.target_ceiling_usd,verification_max_age_hours:policy.verification_max_age_hours};
 batch.history=[];
 batch.agent_run={session_id:sessionId,approval_required:true,submitted_externally:false};
 fs.mkdirSync(path.dirname(outputPath),{recursive:true});
 fs.writeFileSync(outputPath,JSON.stringify(batch,null,2)+'\n');
 console.log(JSON.stringify({ok:true,output:outputPath,roles:batch.jobs.length,session_id:sessionId},null,2));
}finally{
 events.controller.abort();
}


