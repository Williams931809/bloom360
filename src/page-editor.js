const editableText = /<(h[1-4]|p)(\s[^>]*)?>([^<>]+)<\/\1>/g;
const editableMain = /<main\b[^>]*>[\s\S]*?<\/main>/;
const websiteTitle = /<title>([^<]*)<\/title>/;
const websiteDescription = /<meta name="description" content="([^"]*)">/;

function decodePageText(value) {
  return value.replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (_, entity) =>
    ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",'#39':"'",nbsp:' '})[entity]);
}

function pageFields(html) {
  if (Array.isArray(html)) return html;
  const fields = [
    ['title','Browser tab title',html.match(websiteTitle)?.[1] || '',160],
    ['description','Search description',html.match(websiteDescription)?.[1] || '',300],
  ];
  const main = html.match(editableMain)?.[0] || '';
  for (const match of main.matchAll(editableText)) {
    if (!match[3].trim()) continue;
    fields.push(['text_' + fields.length, match[1] === 'p' ? 'Paragraph' : 'Heading', match[3],900]);
  }
  return fields.map(([key,label,value,max]) => ({key,label,value:decodePageText(value),max}));
}

function applyPageEdits(html, changes) {
  const value = (key, original) => Object.hasOwn(changes,key) ? e(changes[key]) : original;
  let index = 2;
  return html.replace(websiteTitle, (_,old) => `<title>${value('title',old)}</title>`)
    .replace(websiteDescription, (_,old) => `<meta name="description" content="${value('description',old)}">`)
    .replace(editableMain, (main) => main.replace(editableText, (tag,kind,attrs,old) => {
      if (!old.trim()) return tag;
      return `<${kind}${attrs || ''}>${value('text_' + index++,old)}</${kind}>`;
    }));
}

function referencePage(path, data, method, draft = false) {
  const template = referencePages[path];
  if (!template) return null;
  const html = applyDesign(applyPageEdits(template, data || {}), data || {});
  const rendered = draft ? html.replace('<main id="main">', '<main id="main"><div class="wrap"><p class="callout">Draft preview. <a href="/admin/pages">Back to page manager</a></p></div>') : html;
  return new Response(method === 'HEAD' ? null : rendered, {headers:{
    'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'same-origin',
    'Content-Security-Policy':"default-src 'none'; script-src 'self' 'sha256-/empALHSHnBSWlZiY1ELSXVX7rVovD+Tu3xak2bpEEM='; style-src 'self' 'unsafe-inline'; img-src 'self' https:; media-src https:; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'self'",
    ...(draft ? {'X-Robots-Tag':'noindex'} : {}),
  }});
}

async function readPageVersion(db, type, path) {
  const item = await first(db,'SELECT value FROM settings WHERE key = ?',type + ':' + path);
  return item ? JSON.parse(item.value) : null;
}

async function publishedPages(db) {
  const records = await read(db,"SELECT key,value FROM settings WHERE key LIKE 'page-live:%'");
  return Object.fromEntries(records.map(({key,value}) => [key.slice('page-live:'.length), JSON.parse(value)]));
}

async function managePages(request, url, db) {
  const adminPath = '/admin/pages';
  const selected = url.searchParams.get('page');
  if (request.method === 'POST') {
    const form = await request.formData();
    const path = text(form,'page',150);
    const action = text(form,'action',20);
    if (!Object.hasOwn(referencePages,path)) return errorPage('Choose a site page.',adminPath,404);
    const back = adminPath + '?page=' + encodeURIComponent(path);
    if (action === 'restore') {
      await db.batch(['page-draft:', 'page-live:'].map(prefix => db.prepare('DELETE FROM settings WHERE key = ?').bind(prefix + path)));
      return redirect(back + '&saved=restored');
    }
    if (!['draft','publish'].includes(action)) return errorPage('Choose Save draft or Publish.',back);
    const changes = {};
    for (const item of pageFields(referencePages[path])) {
      const content = text(form,item.key,item.max);
      if (!content) return errorPage('Complete all page fields before saving.',back);
      if (content !== item.value) changes[item.key] = content;
    }
    for (const key of Object.keys(designOptions)) {
      const value = cleanDesign(key,text(form,key,1000));
      if (value === null) return errorPage('Use a valid color, layout or media URL.',back);
      if (value) changes[key] = value;
    }
    const version = JSON.stringify(changes);
    const upsert = 'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value';
    const updates = [db.prepare(upsert).bind('page-draft:' + path,version)];
    if (action === 'publish') updates.push(db.prepare(upsert).bind('page-live:' + path,version));
    await db.batch(updates);
    return redirect(back + '&saved=' + action);
  }
  if (selected !== null && !Object.hasOwn(referencePages,selected)) return errorPage('Page could not be found.',adminPath,404);
  if (selected === null) {
    const versions = new Set((await read(db,"SELECT key FROM settings WHERE key LIKE 'page-%:%'")).map(row => row.key));
    const pageList = Object.entries(referencePages).map(([path,html]) => {
      const title = pageFields(html)[0].value.replace(/ \| Bloom360 Initiative$/,'');
      const status = versions.has('page-live:' + path) ? 'Published edits' : versions.has('page-draft:' + path) ? 'Draft' : 'Original content';
      return `<article class="card record"><div><h2>${e(title)}</h2><p>${e(path)} · ${status}</p></div>${button(adminPath + '?page=' + encodeURIComponent(path),'Edit page')}</article>`;
    });
    return adminPage('Website pages','<p>Edit page copy and search descriptions. Save a draft to review it before publishing.</p><div class="records">' + pageList.join('') + '</div>',adminPath);
  }
  const template = referencePages[selected];
  const draft = await readPageVersion(db,'page-draft',selected);
  const live = await readPageVersion(db,'page-live',selected);
  if (url.searchParams.get('preview') === '1') return Response.json({path:selected,changes:draft || live || {}}, {
    headers:{'Cache-Control':'no-store','X-Bloom360-Page-Preview':'1'},
  });
  const changes = draft || live || {};
  const editorUrl = adminPath + '?page=' + encodeURIComponent(selected);
  const fields = pageFields(template);
  const saved = {draft:'Draft saved.',publish:'Page published.',restored:'Original content restored.'}[url.searchParams.get('saved')];
  const hidden = `<input type="hidden" name="page" value="${e(selected)}">`;
  const actions = '<div class="actions"><button class="btn ghost" name="action" value="draft">Save draft</button><button class="btn primary" name="action" value="publish">Publish page</button></div>';
  const restore = (draft || live) ? `<details class="card"><summary>Restore original content</summary><p>This removes the saved draft and any published edits for this page.</p>${start(adminPath)}${hidden}<button class="btn ghost" name="action" value="restore">Restore original</button></form></details>` : '';
  return adminPage('Edit ' + fields[0].value.replace(/ \| Bloom360 Initiative$/,''),(saved ? notice(saved) : '') +
    '<div class="actions">' + button(selected,'View live page') + button('/admin/assistant?page=' + encodeURIComponent(selected),'Ask AI') + button(editorUrl + '&preview=1','Preview saved draft') + '</div><br>' +
    start(adminPath) + hidden + designFields(changes) + fields.map((item) => area(item.key,item.label,changes[item.key] ?? item.value,true,item.max)).join('') + actions + '</form><br>' + restore,adminPath);
}

export function referencePageSchema() {
  return Object.fromEntries(Object.entries(referencePages).map(([path,html]) => [path,pageFields(html)]));
}
