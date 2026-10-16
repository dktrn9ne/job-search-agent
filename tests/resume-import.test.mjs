import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resumeFromText,resumeFromJson,validateCv} from '../web/resume-schema.js';
import {importResume} from '../web/resume-import.js';
import {tailoredCv,docx,cvText} from '../web/documents.js';
import mammoth from 'mammoth';
const text='Taylor Example\ntaylor@example.test\nSUMMARY\nProduct leader building useful software.\nEXPERIENCE\nExample Company | Product Manager | 2022-Present\n• Shipped accessible onboarding for 200 customers.\n• Reduced review time by 20 percent.\nSKILLS\nPython, SQL';
function pdfFixture(lines){
 const stream='BT /F1 12 Tf 50 750 Td '+lines.map((line,i)=>(i?'0 -16 Td ':'')+'('+line.replace(/[()\\]/g,'\\$&')+') Tj').join('\n')+' ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream'];
 let pdf='%PDF-1.4\n',offsets=[0];for(const [i,object] of objects.entries()){offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+object+'\nendobj\n';}
 const start=pdf.length;pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF';return pdf;
}
test('extracted resume maps to editable facts without inventing claims',()=>{
 const cv=resumeFromText(text);assert.equal(cv.name,'Taylor Example');assert.equal(cv.contact,'taylor@example.test');assert.equal(cv.summary.body,'Product leader building useful software.');
 assert.equal(cv.sections[0].entries[0].org,'Example Company');assert.equal(cv.sections[0].entries[0].role,'Product Manager');assert.equal(cv.sections[0].entries[0].dates,'2022-Present');assert.equal(validateCv(cv).sections.length,2);
});
test('JSON roundtrip, wrappers and useful errors',()=>{
 const cv=resumeFromText(text);assert.deepEqual(resumeFromJson(JSON.stringify({cv})),cv);
 assert.throws(()=>resumeFromJson('{bad'),/Invalid JSON/);
 assert.throws(()=>resumeFromJson('{"name":"Test"}'),/sections array/);
 for(const mutate of [c=>c.sections[0].entries=null,c=>c.sections[0].entries[0].bullets[0].text=42,c=>c.sections[0].entries[0].id=c.sections[0].id,c=>c.contact={}]){
  const broken=structuredClone(cv);mutate(broken);assert.throws(()=>validateCv(broken));
 }
});
test('previous profile JSON imports preserve source evidence',()=>{
 const cv=resumeFromJson(JSON.stringify({name:'Taylor',contact:{email:'taylor@example.test'},summary:'Product leader',experience:[{title:'Manager',organization:'Example',start_year:2022,current:true,highlights:['Shipped useful software.']}]}));
 assert.match(cvText(cv),/Shipped useful software/);assert.equal(cv.sections[0].entries[0].dates,'2022 – Present');
});
test('empty, unsupported, oversized, corrupt uploads and scanned text fail clearly',async()=>{
 await assert.rejects(()=>importResume(new File(['a'],'resume.doc')),/Unsupported/);
 await assert.rejects(()=>importResume(new File([],'resume.pdf')),/empty/);
 await assert.rejects(()=>importResume(new File([new Uint8Array(8*1024*1024+1)],'resume.pdf')),/8 MB/);
 await assert.rejects(()=>importResume(new File(['not pdf'],'resume.pdf')),/not a valid PDF/);
 await assert.rejects(()=>importResume(new File(['bad'],'resume.docx')),/not a valid DOCX/);
 assert.throws(()=>resumeFromText(''),/OCR/);
});
test('import through selected facts to ATS-readable DOCX preserves selected evidence',async()=>{
 const source=resumeFromText(text),bullet=source.sections[0].entries[0].bullets[0];
 const selected=tailoredCv(source,[bullet.id]);
 const buffer=Buffer.from(await docx(selected).arrayBuffer());const result=await mammoth.extractRawText({buffer});
 assert.match(result.value,/Taylor Example/);assert.match(result.value,/Example Company/);assert.match(result.value,/Shipped accessible onboarding for 200 customers/);assert.doesNotMatch(result.value,/Reduced review time/);
 assert.equal(source.sections[0].entries[0].bullets.length,2);
});
test('actual PDF and DOCX bytes parse through the upload entry point',async()=>{
 const pdf=await importResume(new File([pdfFixture(text.replaceAll('• ','').split('\n'))],'resume.pdf'));
 assert.equal(pdf.name,'Taylor Example');assert.match(cvText(pdf),/Shipped accessible onboarding/);
 const word=await importResume(new File([await docx(resumeFromText(text)).arrayBuffer()],'resume.docx'));
 assert.equal(word.name,'Taylor Example');assert.match(cvText(word),/Reduced review time/);
 await assert.rejects(()=>importResume(new File([pdfFixture([])],'scan.pdf')),/OCR/);
 await assert.rejects(()=>importResume(new File(['%PDF-broken'],'corrupt.pdf')),/Could not read/);
 await assert.rejects(()=>importResume(new File(['PKbroken'],'corrupt.docx')),/Could not read/);
});
