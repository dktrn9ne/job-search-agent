import fs from 'node:fs/promises';
// Keep snapshot and updates outside Git. Never prints candidate content or secrets.
const [mode,origin,operatorFile,file,candidate='maurice']=process.argv.slice(2);
if(!['pull','update'].includes(mode)||!file||new URL(origin).protocol!=='https:')throw Error('Usage: portal-work.mjs pull|update HTTPS_ORIGIN PRIVATE_OPERATOR_JSON PRIVATE_JSON [candidate-id]');
const {token}=JSON.parse(await fs.readFile(operatorFile,'utf8'));
const action=mode==='pull'?'operator-work&candidate_id='+encodeURIComponent(candidate):'operator-preparation';
const body=mode==='update'?await fs.readFile(file,'utf8'):null;
const response=await fetch(origin+'/api/portal?action='+action,{method:body?'POST':'GET',headers:{Origin:origin,Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body}:{}),signal:AbortSignal.timeout(60000)});
if(!response.ok)throw Error('Preparation request failed: '+response.status);
const result=await response.json();
if(mode==='pull')await fs.writeFile(file,JSON.stringify(result,null,2),{mode:0o600});
console.log(JSON.stringify({ok:true,pursued:result.roles?.length,sent:false}));
