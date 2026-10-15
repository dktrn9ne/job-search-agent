import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),hosting=JSON.parse(fs.readFileSync(path.join(root,'dist','.openai','hosting.json'),'utf8'));
assert.equal(hosting.d1,'DB');assert.ok(hosting.capabilities.includes('mcp'));assert.equal(hosting.static,undefined);
const worker=(await import(pathToFileURL(path.join(root,'dist','server','index.js')).href+`?v=${Date.now()}`)).default;
const page=await worker.fetch(new Request('https://example.test/'),{});assert.equal(page.status,200);assert.match(await page.text(),/CheckChaser/);
const tools=await worker.fetch(new Request('https://example.test/mcp',{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':'test-owner'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}})}),{});const rpc=await tools.json();assert.equal(rpc.result.tools.length,3);assert.ok(rpc.result.tools.some(tool=>tool.name==='upsert_research_jobs'));
assert.ok(fs.existsSync(path.join(root,'dist','drizzle','0000_research_queue.sql')));console.log('Worker artifact validated.');


