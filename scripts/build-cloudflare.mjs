import { readFile, writeFile } from 'node:fs/promises';
import './build.mjs';
const worker = await readFile('dist/server/index.js','utf8');
const source = await import('../dist/server/index.js');
const schema = JSON.stringify(source.referencePageSchema());
const backend = worker.replace(/^const referencePages = .*;$/m, () => 'const referencePages = ' + schema + ';');
const auth = await readFile('cloudflare/auth.js','utf8');
await writeFile('dist/server/cloudflare.js', backend + '\n' + auth);
