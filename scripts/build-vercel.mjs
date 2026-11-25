import { mkdir, writeFile, copyFile, cp, readdir } from 'node:fs/promises';
import './build.mjs';

const output = '.vercel/output';
const fn = output + '/functions/bloom-render.func';
async function pageRoutes(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) result.push(...await pageRoutes(directory + '/' + entry.name, prefix + '/' + entry.name));
    if (entry.name === 'index.html' && prefix) result.push({ src: '^' + prefix + '/?$', dest: prefix + '/index.html' });
  }
  return result;
}

await mkdir(fn,{ recursive: true });
await cp('reference-site',output + '/static',{ recursive: true });
const routes = await pageRoutes('reference-site');
await mkdir(output + '/static/images',{ recursive: true });
for (const image of ['bloom360-mentorship.webp', 'bloom360-logo-transparent.webp', 'bloom360-icon-transparent.png']) {
  await copyFile('assets/' + image, output + '/static/images/' + image);
}
await copyFile('dist/server/index.js',fn + '/renderer.js');
await copyFile('vercel/frontend.js',fn + '/index.js');
await writeFile(fn + '/.vc-config.json',JSON.stringify({ runtime:'edge',entrypoint:'index.js' }));
await writeFile(output + '/config.json',JSON.stringify({
  version:3,
  routes:[...routes,{ handle:'filesystem' },{ src:'^/(.*)$', dest:'/bloom-render?__bloom_path=$1' }],
}));
