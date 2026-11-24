import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import './build.mjs';

const output = '.vercel/output';
const fn = output + '/functions/bloom-render.func';
await mkdir(fn,{ recursive: true });
await mkdir(output + '/static/images',{ recursive: true });
await copyFile('assets/bloom360-mentorship.webp',output + '/static/images/bloom360-mentorship.webp');
await copyFile('dist/server/index.js',fn + '/renderer.js');
await copyFile('vercel/frontend.js',fn + '/index.js');
await writeFile(fn + '/.vc-config.json',JSON.stringify({ runtime:'edge',entrypoint:'index.js' }));
await writeFile(output + '/config.json',JSON.stringify({
  version:3,
  routes:[{ handle:'filesystem' },{ src:'^/(.*)$', dest:'/bloom-render?__bloom_path=$1' }],
}));
