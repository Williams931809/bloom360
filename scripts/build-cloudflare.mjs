import { readFile, writeFile } from 'node:fs/promises';
import './build.mjs';
const worker = await readFile('dist/server/index.js','utf8');
const auth = await readFile('cloudflare/auth.js','utf8');
await writeFile('dist/server/cloudflare.js', worker + '\n' + auth);
