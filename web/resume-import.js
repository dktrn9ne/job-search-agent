import {resumeFromJson,resumeFromText} from './resume-schema.js';
export async function importResume(file) {
 if(!file) throw Error('Choose a PDF, DOCX or optional JSON resume.');
 if(file.size>8*1024*1024) throw Error('Choose a resume smaller than 8 MB.');
 if(!file.size) throw Error('This file is empty. Choose your resume again.');
 const extension=file.name.split('.').pop().toLowerCase();
 if(!['pdf','docx','json'].includes(extension)) throw Error('Unsupported file. Choose PDF, DOCX or optional CheckChaser JSON. Older .doc files must be saved as DOCX.');
 if(extension==='json') return resumeFromJson(await file.text());
 const data=new Uint8Array(await file.arrayBuffer());
 let text;
 if(extension==='pdf') {
  if(new TextDecoder().decode(data.slice(0,5))!=='%PDF-') throw Error('This is not a valid PDF. Export your resume as PDF again.');
  const pdfjs=await import('./vendor/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
  let task,pdf;
  try{
   task=pdfjs.getDocument({data,isEvalSupported:false,useSystemFonts:true});pdf=await task.promise;
   if(pdf.numPages>30) throw Error('Resume PDFs must have 30 pages or fewer.');
   const pages=[];
   for(let i=1;i<=pdf.numPages;i++){
    const content=await (await pdf.getPage(i)).getTextContent();let lines=[],line='',lastY;
    for(const item of content.items){if(!('str' in item))continue;const y=item.transform[5];if(lastY!==undefined&&Math.abs(lastY-y)>3&&line){lines.push(line);line='';}line+=(line?' ':'')+item.str;lastY=y;if(item.hasEOL){lines.push(line);line='';lastY=undefined;}}
    if(line)lines.push(line);pages.push(lines.join('\n'));
   }
   text=pages.join('\n');
  }catch(error){if(error.name==='PasswordException')throw Error('This PDF is password protected. Upload an unlocked copy.');if(error.message.includes('30 pages'))throw error;throw Error('Could not read this PDF. Export a searchable PDF or upload DOCX.');}
  finally{if(task)await task.destroy();}
 } else {
  if(data[0]!==0x50||data[1]!==0x4b)throw Error('This is not a valid DOCX. Save your resume as Word .docx again.');
  try{const {default:mammoth}=await import('./vendor/mammoth.js');text=(await mammoth.extractRawText({arrayBuffer:data.buffer})).value;}
  catch{throw Error('Could not read this DOCX. It may be damaged or password protected. Save a new DOCX or searchable PDF.');}
 }
 return resumeFromText(text);
}
