import { access, readdir } from 'node:fs/promises';

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
