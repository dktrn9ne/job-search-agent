import {openStore} from '../portal/store.mjs';
import {createPortal} from '../portal/service.mjs';
let handler;
export default async function portal(req,res){
 try{
  if(!process.env.PORTAL_ORIGIN||!process.env.DATABASE_URL)throw Error('not configured');
  handler ||= openStore().then(store=>createPortal(store,{origin:process.env.PORTAL_ORIGIN,operatorToken:process.env.PORTAL_OPERATOR_TOKEN}));
  const request=new Request(process.env.PORTAL_ORIGIN+req.url,{method:req.method,headers:req.headers,...(req.method==='GET'?{}:{body:JSON.stringify(req.body||{})})});
  const result=await (await handler)(request);res.statusCode=result.status;result.headers.forEach((v,k)=>res.setHeader(k,v));res.end(await result.text());
 }catch{handler=undefined;res.setHeader('Cache-Control','no-store');res.status(503).json({error:'Private dashboard storage is not configured. No candidate data is available.'});}
}
