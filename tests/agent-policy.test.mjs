import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {APPLICATION_ANSWER_BANK} from '../web/application-answer-bank.js';

const policy=JSON.parse(fs.readFileSync(new URL('../agent/search-policy.json',import.meta.url)));
const source=fs.readFileSync(new URL('../agent/job-search-agent.mjs',import.meta.url),'utf8');

test('Approved discovery sources are explicit and complete',()=>{
 assert.deepEqual(policy.source_priority.map(item=>item.domain),['greenhouse.io','jobs.lever.co','jobs.ashbyhq.com','dice.com','ziprecruiter.com','indeed.com','linkedin.com','web3.career']);
});

test('Application answers retain evidence and claim guardrails',()=>{
 assert.equal(APPLICATION_ANSWER_BANK.length,6);
 assert.equal(new Set(APPLICATION_ANSWER_BANK.map(item=>item.id)).size,6);
 for(const item of APPLICATION_ANSWER_BANK){
  assert.ok(item.question.length>20);
  assert.ok(item.answer.length>200);
  assert.ok(item.evidence.length>0);
  assert.ok(item.guardrail.length>20);
 }
 const healthcare=APPLICATION_ANSWER_BANK.find(item=>item.id==='healthcare-ai-trust');
 assert.match(healthcare.answer,/HIPAA certification/);
 assert.match(healthcare.guardrail,/not claimed/);
});

test('LinkedIn is lead-only and requires an external application URL',()=>{
 const linkedIn=policy.source_priority.find(item=>item.domain==='linkedin.com');
 assert.equal(linkedIn.mode,'lead_only');
 assert.equal(linkedIn.requires_external_application,true);
 assert.equal(policy.posting_url_policy.linkedin_urls_may_not_be_final_application_urls,true);
 assert.match(source,/LinkedIn is lead-only/);
 assert.ok(source.includes('url cannot be LinkedIn'));
});


