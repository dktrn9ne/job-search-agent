const object = value => value && typeof value === 'object' && !Array.isArray(value);
export function validateCv(cv) {
 if (!object(cv) || typeof cv.name !== 'string' || !Array.isArray(cv.sections)) throw Error('Resume JSON needs a name and sections array. Export master JSON to see the supported format.');
 if (cv.sections.length > 100) throw Error('Resume has too many sections (maximum 100).');
 const ids = new Set();
 const id = (value, path) => { if(typeof value !== 'string' || !/^[a-zA-Z0-9._-]{1,120}$/.test(value) || ids.has(value)) throw Error(path + ': use a unique ID with letters, numbers, dots, underscores or hyphens.'); ids.add(value); };
 const string = (value, path) => { if(value !== undefined && typeof value !== 'string') throw Error(path + ' must be text.'); return value || ''; };
 const sections = cv.sections.map((s,si) => {
  const path = 'sections['+si+']';
  if(!object(s) || !Array.isArray(s.entries)) throw Error(path + ' needs an entries array.');
  id(s.id,path+'.id');
  if(s.entries.length>1000) throw Error(path+' has too many entries.');
  return {id:s.id,title:string(s.title,path+'.title'),entries:s.entries.map((e,ei)=>{
   const p=path+'.entries['+ei+']';
   if(!object(e)||!Array.isArray(e.bullets)) throw Error(p+' needs a bullets array.');
   id(e.id,p+'.id');
   if(e.bullets.length>2000) throw Error(p+' has too many bullets.');
   return {id:e.id,...Object.fromEntries(['org','role','place','dates'].map(k=>[k,string(e[k],p+'.'+k)])),bullets:e.bullets.map((b,bi)=>{
    if(!object(b)||typeof b.text!=='string') throw Error(p+'.bullets['+bi+'] needs text.');
    id(b.id,p+'.bullets['+bi+'].id');return {id:b.id,text:b.text};
   })};
  })};
 });
 if(cv.summary!==undefined&&!object(cv.summary)) throw Error('summary must contain lead and body text.');
 return {name:cv.name,contact:string(cv.contact,'contact'),summary:{lead:string(cv.summary?.lead,'summary.lead'),body:string(cv.summary?.body,'summary.body')},sections};
}

// Preserve extracted lines verbatim; uncertain layout stays editable instead of inventing facts.
export function resumeFromText(text) {
 const lines=String(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(lines.join(' ').length<40) throw Error('No readable resume text found. Scanned PDFs need OCR: export a searchable PDF or upload DOCX.');
 if(text.length>200000) throw Error('Resume text is too long. Upload a shorter resume.');
 const cv={name:lines.shift(),contact:'',summary:{lead:'',body:''},sections:[]};
 let n=0, section, entry, summary=false;
 const newSection=title=>{section={id:'section-'+(++n),title,entries:[]};cv.sections.push(section);entry=null;};
 const heading=/^(?:(?:professional|work|relevant|applied ai|additional)\s+)?(?:experience|employment|summary|profile|education|skills|technical skills|core competencies|projects|certifications|achievements|publications|executive profile|technical & product capabilities)$/i;
 for(const line of lines){
  if(heading.test(line.replace(/:$/,''))){summary=/summary|profile/i.test(line);if(!summary)newSection(line.replace(/:$/,''));continue;}
  if(summary){cv.summary.body+=(cv.summary.body?' ':'')+line;continue;}
  if(!section && /@|https?:|linkedin\.com|github\.com|\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}/i.test(line)){cv.contact+=(cv.contact?' · ':'')+line;continue;}
  if(!section)newSection('RESUME DETAILS');
  const parts=line.replace(/^[•●▪]\s*/, '').split(/\s+\|\s+/);
  if(parts.length>=2&&/\b(?:19|20)\d{2}\b/.test(parts.at(-1))){
   entry={id:'entry-'+(++n),org:parts[0],role:parts.slice(1,-1).join(' | '),place:'',dates:parts.at(-1),bullets:[]};section.entries.push(entry);continue;
  }
  if(!entry){entry={id:'entry-'+(++n),org:'',role:'',place:'',dates:'',bullets:[]};section.entries.push(entry);}
  entry.bullets.push({id:'fact-'+(++n),text:line.replace(/^[•●▪\u007f]\s*/, '').replace(/^-\s+/, '')});
 }
 return validateCv(cv);
}

export function resumeFromJson(text) {
 let json;try{json=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('Invalid JSON. Check commas and quotes, or upload the original PDF or DOCX resume.');}
 const value=json?.cv??json;
 if(object(value)&&!value.sections&&typeof value.name==='string'&&(Array.isArray(value.experience)||Array.isArray(value.applied_ai_experience))){
  // Also accept the profile exports previously supplied to CheckChaser.
  const flatten=v=>typeof v==='string'||typeof v==='number'?[String(v)]:Array.isArray(v)?v.flatMap(flatten):object(v)?Object.entries(v).flatMap(([k,x])=>flatten(x).map(t=>k.replaceAll('_',' ')+': '+t)):[];
  let n=0;
  const cv={name:value.name,contact:[value.location,...flatten(value.contact)].filter(Boolean).join(' · '),summary:{lead:value.headline||'',body:typeof value.summary==='string'?value.summary:value.executive_profile||''},sections:[]};
  for(const [key,items] of Object.entries(value)){
   if(['name','contact','location','headline','summary','executive_profile','source'].includes(key))continue;
   const section={id:'section-'+(++n),title:key.replaceAll('_',' ').toUpperCase(),entries:[]};
   if(Array.isArray(items)&&items.some(object)){
    for(const item of items){
     if(!object(item))throw Error(key+' must contain consistently structured records.');
     const dates=[item.start_year,item.current?'Present':item.end_year].filter(v=>v!==undefined&&v!==null).join(' – ');
     const remaining=Object.fromEntries(Object.entries(item).filter(([k])=>!['title','organization','company','location','start_year','end_year','current'].includes(k)));
     section.entries.push({id:'entry-'+(++n),org:item.organization||item.company||'',role:item.title||'',place:item.location||'',dates,bullets:flatten(remaining).map(t=>({id:'fact-'+(++n),text:t}))});
    }
   }else{section.entries.push({id:'entry-'+(++n),org:'',role:'',place:'',dates:'',bullets:flatten(items).map(t=>({id:'fact-'+(++n),text:t}))});}
   cv.sections.push(section);
  }
  return validateCv(cv);
 }
 return validateCv(value);
}
