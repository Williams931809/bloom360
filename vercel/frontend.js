import renderer from './renderer.js';

const backend = 'https://bloom360-backend.thankgododiawa6.workers.dev';
const site = 'https://thebloom360initiative.com';
const siteOrigins = new Set([site, 'https://www.thebloom360initiative.com']);
const backendPaths = new Set(['/account', '/login', '/signup', '/logout', '/submit']);
const methods = new Set(['GET', 'HEAD', 'POST']);
const unavailable = (reason = 'runtime') => new Response('Bloom360 is temporarily unavailable. Please try again.', {
  status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Bloom360-Status': reason },
});

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
      return await fetch(target, { method: request.method, headers, body, redirect: 'manual' });
    }
    if (request.method === 'POST') return new Response('Page could not be found.', { status: 404 });
    const response = await fetch(backend + '/content.json', { cache: 'no-store', redirect: 'error' });
    if (!response.ok) return unavailable('backend-' + response.status);
    stage = 'content-json';
    const data = await response.json();
    stage = 'render';
    return await renderer.fetch({ url: url.href, method: request.method, headers: new Headers() }, { PUBLIC_DATA: data });
  } catch (error) {
    console.error('Bloom360 frontend request failed', error);
    return unavailable(stage + '-' + (error?.name || 'runtime'));
  }
}
