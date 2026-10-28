import { access, readdir, mkdir, copyFile } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('web/vendor', {recursive:true});
await copyFile('node_modules/pdfjs-dist/legacy/build/pdf.mjs','web/vendor/pdf.mjs');
await copyFile('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs','web/vendor/pdf.worker.mjs');
await build({entryPoints:['node_modules/mammoth/mammoth.browser.js'],bundle:true,format:'esm',platform:'browser',outfile:'web/vendor/mammoth.js',minify:true});

const required = [
  'web/index.html',
  'web/styles.css',
  'web/app.js',
  'api/research.js',
  'vercel.json',
];

await Promise.all(required.map((file) => access(file)));
const assets = await readdir('web');
if (!assets.includes('index.html')) throw new Error('Missing web/index.html');
console.log(`CheckChaser Vercel bundle ready (${assets.length} static assets).`);
