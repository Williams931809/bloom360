import { mkdir, readFile, writeFile, cp, copyFile } from 'node:fs/promises';
import './build.mjs';

const root = 'dist/kontroldesk';
const server = await readFile('dist/server/index.js', 'utf8');
const auth = await readFile('cloudflare/auth.js', 'utf8');
const brandedAssets = ['bloom360-mentorship.webp', 'bloom360-logo-transparent.webp', 'bloom360-icon-transparent.png'];
await mkdir(root + '/public/images', { recursive: true });
await cp('reference-site/assets', root + '/public/assets', { recursive: true });
await Promise.all(brandedAssets.map(image => copyFile('assets/' + image, root + '/public/images/' + image)));
await writeFile(root + '/app.js', server + '\n' + auth);
await writeFile(root + '/worker.js', `import app from './app.js';
export default {
  async fetch(request, env, context) {
    const response = await app.fetch(request, env, context);
    if (!response.body || !response.headers.get('content-type')?.startsWith('text/html')) return response;
    return new HTMLRewriter()
      .on('a.logo', { element: element => element.setInnerContent('<img src="/images/bloom360-logo-transparent.webp" alt="Bloom360 Initiative" width="530" height="408">', { html: true }) })
      .on('head', { element: element => element.append('<link rel="icon" type="image/png" href="/images/bloom360-icon-transparent.png"><style>.bar .logo img{display:block;width:auto;height:65px;border-radius:7px}@media(max-width:900px){.bar .logo img{height:53px}}</style>', { html: true }) })
      .transform(response);
  },
};
`);
await writeFile(root + '/wrangler.json', JSON.stringify({
  name: 'bloom360-kontroldesk',
  main: 'worker.js',
  compatibility_date: '2026-11-25',
  workers_dev: true,
  assets: { directory: './public' },
  vars: { AUTH_MODE: 'standalone' },
  d1_databases: [{ binding: 'DB', database_name: 'bloom360-kontroldesk', database_id: '54e4e2ec-6892-4bb6-8c08-b01fe377c110' }],
}, null, 2));
