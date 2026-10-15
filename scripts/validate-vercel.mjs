import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile('vercel.json', 'utf8'));
if (config.outputDirectory !== 'web') throw new Error('Vercel outputDirectory must be web.');
const html = await readFile('web/index.html', 'utf8');
for (const asset of ['styles.css', 'learning.css', 'app.js']) {
  if (!html.includes(asset)) throw new Error(`web/index.html does not reference ${asset}.`);
}
const app = await readFile('web/app.js', 'utf8');
for (const module of ['documents.js', 'eligibility.js', 'application-answer-bank.js']) {
  if (!app.includes(module)) throw new Error(`web/app.js does not reference ${module}.`);
}
const eligibility = await readFile('web/eligibility.js', 'utf8');
if (!eligibility.includes('context-contract.js')) throw new Error('web/eligibility.js does not reference context-contract.js.');
console.log('Vercel configuration is valid.');
