export const esc = value => String(value ?? '').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const textOnly = value => String(value || '').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'$1 ($2)');
export function tailoredCv(master, selection) {
 const cv=structuredClone(master);
 if(selection) cv.sections=cv.sections.map(section=>({...section,entries:section.entries.map(entry=>({...entry,bullets:entry.bullets.filter(b=>selection.includes(b.id))})).filter(e=>e.bullets.length)})).filter(s=>s.entries.length);
 return cv;
}
export function cvHtml(cv) {
 return '<article class="cv-paper"><h2>'+esc(cv.name || 'Your name')+'</h2><p class="contact">'+esc(textOnly(cv.contact || 'Your contact details'))+'</p><p><strong>'+esc(cv.summary?.lead || '')+'</strong> '+esc(cv.summary?.body || '')+'</p>'+cv.sections.map(s=>'<h3>'+esc(s.title)+'</h3>'+s.entries.map(e=>'<div class="entry-top"><strong>'+esc(e.org)+'</strong><span>'+esc(e.place)+'</span></div><div class="entry-role"><span>'+esc(e.role)+'</span><span>'+esc(e.dates)+'</span></div><ul>'+e.bullets.map(b=>'<li>'+esc(textOnly(b.text))+'</li>').join('')+'</ul>').join('')).join('')+'</article>';
}
export function cvText(cv) {
 return [cv.name,textOnly(cv.contact),[cv.summary?.lead,cv.summary?.body].filter(Boolean).join(' '),...cv.sections.flatMap(s=>['',s.title,...s.entries.flatMap(e=>[[e.org,e.place].filter(Boolean).join(' | '),[e.role,e.dates].filter(Boolean).join(' | '),...e.bullets.map(b=>'• '+textOnly(b.text))])])].join('\n');
}
export function download(name, content, type='application/json') {
 const url=URL.createObjectURL(content instanceof Blob?content:new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
const xml = value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const enc = new TextEncoder();
function crc32(bytes) {let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zip(files) {
 const locals=[], central=[]; let offset=0; const u16=(view,at,value)=>view.setUint16(at,value,true), u32=(view,at,value)=>view.setUint32(at,value,true);
 for(const [name,content] of Object.entries(files)) {const n=enc.encode(name),d=enc.encode(content),crc=crc32(d);const head=new Uint8Array(30+n.length),h=new DataView(head.buffer);
 u32(h,0,0x04034b50);u16(h,4,20);u16(h,6,0x800);u32(h,14,crc);u32(h,18,d.length);u32(h,22,d.length);u16(h,26,n.length);head.set(n,30);
 const c=new Uint8Array(46+n.length),v=new DataView(c.buffer);u32(v,0,0x02014b50);u16(v,4,20);u16(v,6,20);u16(v,8,0x800);u32(v,16,crc);u32(v,20,d.length);u32(v,24,d.length);u16(v,28,n.length);u32(v,42,offset);c.set(n,46);
 locals.push(head,d);central.push(c);offset+=head.length+d.length;}
 const length=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);u32(e,0,0x06054b50);u16(e,8,central.length);u16(e,10,central.length);u32(e,12,length);u32(e,16,offset);
 return new Blob([...locals,...central,end],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
export function docx(cv) {
 const p=(text,bold=false,size=20,center=false)=>'<w:p><w:pPr><w:spacing w:after="80"/>'+(center?'<w:jc w:val="center"/>':'')+'</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>'+(bold?'<w:b/>':'')+'<w:sz w:val="'+size+'"/></w:rPr><w:t xml:space="preserve">'+xml(text)+'</w:t></w:r></w:p>';
 const body=p(cv.name,true,32,true)+p(textOnly(cv.contact),false,18,true)+p([cv.summary?.lead,cv.summary?.body].filter(Boolean).join(' '))+cv.sections.map(s=>p(s.title,true)+s.entries.map(e=>p([e.org,e.place].filter(Boolean).join(' | '),true)+p([e.role,e.dates].filter(Boolean).join(' | '))+e.bullets.map(b=>p('• '+textOnly(b.text))).join('')).join('')).join('');
 return zip({'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
 '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
 'word/document.xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="792" w:right="792" w:bottom="792" w:left="792"/></w:sectPr></w:body></w:document>'});
}


