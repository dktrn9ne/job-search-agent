import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requirementIssues} from '../web/context-contract.js';
const proof={requirement:'Three years SaaS PM',required:true,assessment:'met',candidate_evidence:'Confirmed relevant role dates',source_ref:'private:resume-v2#role-1'};
test('Missing maps and unsupported assertions stay in review',()=>{
 assert.ok(requirementIssues({}).review.length);
 assert.ok(requirementIssues({requirement_evidence:[{...proof,source_ref:''}]}).review.length);
 assert.ok(requirementIssues({requirement_evidence:[{...proof,assessment:'unknown'}]}).review.length);
});
test('Mandatory mismatch rejects, preferred gap does not',()=>{
 assert.equal(requirementIssues({requirement_evidence:[{...proof,assessment:'unmet'}]}).reject.length,1);
 assert.deepEqual(requirementIssues({requirement_evidence:[{...proof,required:false,assessment:'unknown'}]}),{review:[],reject:[]});
});
test('A supported record passes structural validation only',()=>assert.deepEqual(requirementIssues({requirement_evidence:[proof]}),{review:[],reject:[]}));


