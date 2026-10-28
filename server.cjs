const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'web'),port=Number(process.env.PORT||4173),origin=`http://127.0.0.1:${port}`;
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
let portal;
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,origin),pathname=decodeURIComponent(url.pathname);
  if(pathname==='/api/portal'){
   portal ||= Promise.all([import('./portal/store.mjs'),import('./portal/service.mjs')]).then(async([s,p])=>p.createPortal(await s.openStore(),{origin,operatorToken:process.env.PORTAL_OPERATOR_TOKEN}));
   const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>300000){res.writeHead(413);return res.end();}chunks.push(c);}
   const response=await (await portal)(new Request(url,{method:req.method,headers:req.headers,...(req.method==='GET'?{}:{body:Buffer.concat(chunks)})}));res.writeHead(response.status,Object.fromEntries(response.headers));return res.end(await response.text());
  }
  const route=pathname.endsWith('/')?pathname+'index.html':pathname;
  const file=path.resolve(root,'.'+route);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const data=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self'; img-src 'self' data:; frame-src blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(data);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:503,{'Cache-Control':'no-store','Content-Type':'application/json'});res.end(JSON.stringify({error:error.code==='ENOENT'?'Not found':'Private storage unavailable'}));portal=undefined;}
}).listen(port,'127.0.0.1',()=>console.log(`Local: ${origin}/private/`));
