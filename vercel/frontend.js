import renderer from './renderer.js';

const backend = 'https://bloom360-backend.thankgododiawa6.workers.dev';
const site = 'https://thebloom360initiative.com';
const siteOrigins = new Set([site, 'https://www.thebloom360initiative.com']);
const backendPaths = new Set(['/account', '/login', '/signup', '/logout', '/submit']);
const methods = new Set(['GET', 'HEAD', 'POST']);
const unavailable = (reason = 'runtime') => new Response('Bloom360 is temporarily unavailable. Please try again.', {
  status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Bloom360-Status': reason },
});

async function withBrand(response) {
  if (!response.headers.get('content-type')?.startsWith('text/html') || !response.body) return response;
  const html = (await response.text())
    .replace(/<a class="logo"[^>]*>[\s\S]*?<\/a>/, '<a class="logo" href="/" aria-label="Bloom360 Initiative home"><img src="/images/bloom360-logo-transparent.webp" alt="Bloom360 Initiative" width="530" height="408"></a>')
    .replace('</head>', '<link rel="icon" type="image/png" sizes="64x64" href="/images/bloom360-icon-transparent.png"><style>.bar .logo img{display:block;width:auto;height:65px;border-radius:7px}@media(max-width:900px){.bar .logo img{height:53px}}</style></head>');
  const headers = new Headers(response.headers);
  for (const name of ['content-length', 'content-encoding', 'etag']) headers.delete(name);
  return new Response(html, { status: response.status, headers });
}

export default async function frontend(request) {
  const url = new URL(request.url);
  const routedPath = url.searchParams.get('__bloom_path');
  if (url.pathname === '/bloom-render') {
    url.pathname = '/' + (routedPath || '');
  }
  url.searchParams.delete('__bloom_path');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (!methods.has(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD, POST' } });

  let stage = 'proxy';
  try {
    if (backendPaths.has(path) || path === '/admin' || path.startsWith('/admin/')) {
      const headers = new Headers();
      for (const name of ['cookie', 'content-type', 'origin']) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
      }
      if (request.method === 'POST' && !siteOrigins.has(request.headers.get('origin'))) {
        return new Response('Submit this form from the Bloom360 website.', { status: 403 });
      }
      let body;
      if (request.method === 'POST') {
        headers.set('origin',site);
        if (!headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return new Response(null, { status: 415 });
        const reader = request.body?.getReader();
        const pieces = [];
        let size = 0;
        if (reader) {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 65536) {
              await reader.cancel();
              return new Response(null, { status: 413 });
            }
            pieces.push(value);
          }
        }
        body = new Blob(pieces);
      }
      const target = new URL(backend);
      target.pathname = path;
      target.search = url.search;
      const response = await fetch(target, { method: request.method, headers, body, redirect: 'manual' });
      return request.method === 'HEAD' ? response : await withBrand(response);
    }
    if (request.method === 'POST') return new Response('Page could not be found.', { status: 404 });
    stage = 'content-fetch';
    const response = await fetch(backend + '/content.json');
    if (!response.ok) return unavailable('backend-' + response.status);
    stage = 'content-json';
    const data = await response.json();
    stage = 'render';
    const rendered = await renderer.fetch({ url: url.href, method: request.method, headers: new Headers() }, { PUBLIC_DATA: data });
    return request.method === 'HEAD' ? new Response(null, { status: rendered.status, headers: rendered.headers }) : await withBrand(rendered);
  } catch (error) {
    console.error('Bloom360 frontend request failed', error);
    return unavailable(stage + '-' + (error?.name || 'runtime'));
  }
}
