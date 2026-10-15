import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {evaluate,canonicalUrl} from '../web/eligibility.js';
import {tailoredCv,cvHtml,docx} from '../web/documents.js';
const fixturePath=new URL('./fixtures/research-fixture.json',import.meta.url);
const checker=new URL('./reference/check_jobs.py',import.meta.url);
const fixture=JSON.parse(fs.readFileSync(fixturePath));
test('Browser decisions match the Python agent on its research fixture',()=>{
 const expected=JSON.parse(execFileSync('python',[checker.pathname.replace(/^\/([A-Za-z]:)/,'$1'),fixturePath.pathname.replace(/^\/([A-Za-z]:)/,'$1'),'--now','2026-09-30T16:00:00Z'],{encoding:'utf8'}));
 const actual=evaluate(fixture,Date.parse('2026-09-30T16:00:00Z'));
 assert.deepEqual(actual.map(r=>[r.company,r.decision,r.reasons]),expected.map(r=>[r.company,r.decision,r.reasons]));
});
test('Eligibility never passes without posting and gate evidence',()=>{assert.equal(evaluate({jobs:[{company:'A',title:'B',url:'https://example.com/job',fit_points:100}]})[0].decision,'review');});
test('Posted hourly contract minimum can satisfy the floor at 2,080 hours',()=>{const job={company:'A',title:'B',url:'https://example.com/job',posting_status:'open',verified_at:'2026-09-30T15:00:00Z',verification_source:'Live employer posting',employment_type:'contract',gates:{location:{status:'pass',evidence:'Remote US'},work_authorization:{status:'pass',evidence:'Authorized'},qualifications:{status:'pass',evidence:'Required skills met'}},compensation:{minimum:75,maximum:90,currency:'USD',type:'base',period:'hour',source:'Employer-posted hourly range'}};const result=evaluate({policy:{minimum_base_usd:150000,verification_max_age_hours:72},jobs:[job]},Date.parse('2026-09-30T16:00:00Z'))[0];assert.equal(result.decision,'eligible');assert.match(result.notes[0],/156,000/);});
test('Contradictory duplicate records demote an otherwise eligible role',()=>{const job=fixture.jobs[0];const r=evaluate({...fixture,history:[],jobs:[job,{...job,posting_status:'closed'}]},Date.parse('2026-09-30T16:00:00Z'));assert.equal(r[0].decision,'review');assert.equal(r[1].decision,'duplicate');});
test('Stable identity keeps requisition params and hash routes',()=>{assert.notEqual(canonicalUrl('https://example.com/?job=1'),canonicalUrl('https://example.com/?job=2'));assert.notEqual(canonicalUrl('https://example.com/#/jobs/1'),canonicalUrl('https://example.com/#/jobs/2'));assert.equal(canonicalUrl('https://example.com/jobs/1?utm_source=x'),canonicalUrl('https://example.com/jobs/1'));});
test('Tailoring preserves source wording and excludes unselected claims',()=>{const cv={name:'A',sections:[{title:'Experience',entries:[{bullets:[{id:'1',text:'Supported 10 customers.'},{id:'2',text:'Documented processes.'}]}]}]};const r=tailoredCv(cv,['1']);assert.deepEqual(r.sections[0].entries[0].bullets,[{id:'1',text:'Supported 10 customers.'}]);assert.equal(cv.sections[0].entries[0].bullets.length,2);});
test('CV rendering escapes active markup',()=>{const html=cvHtml({name:'<img src=x onerror=alert(1)>',sections:[]});assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));});
test('DOCX output is a ZIP package rather than renamed text',async()=>{const file=docx({name:'Test',sections:[]});const bytes=new Uint8Array(await file.arrayBuffer());assert.equal(bytes[0],80);assert.equal(bytes[1],75);assert.ok(new TextDecoder().decode(bytes).includes('word/document.xml'));});


