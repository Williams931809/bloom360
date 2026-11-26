const designOptions = {
  accent:['Accent color','color'],
  background:['Page background','color'],
  foreground:['Text color','color'],
  layout:['Page layout','choice'],
  headlineStyle:['Heading style','choice'],
  photo:['Photo HTTPS URL','url'],
  photoAlt:['Photo description','text'],
  video:['Video HTTPS URL (MP4, WebM, YouTube or Vimeo)','url'],
  videoTitle:['Video title','text'],
  sectionTitle:['New section heading','text'],
  sectionText:['New section copy','text'],
};
const designChoices = {
  layout:{standard:'Original',wide:'Wide',compact:'Compact'},
  headlineStyle:{standard:'Original',serif:'Editorial serif',sans:'Modern sans-serif'},
};

function cleanDesign(key, value) {
  if (typeof value !== 'string' || !Object.hasOwn(designOptions,key)) return null;
  value = value.trim();
  if (!value) return '';
  const [,type] = designOptions[key];
  if (type === 'color') return /^#[0-9a-f]{6}$/i.test(value) ? value : null;
  if (type === 'choice') return Object.hasOwn(designChoices[key],value) ? value : null;
  if (type === 'url') {
    const safe = value.length <= 1000 && imageUrl(value);
    return safe && (key !== 'video' || videoSource(safe)) ? safe : null;
  }
  return value.slice(0,900);
}

function videoSource(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  let id;
  if (['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(host)) {
    id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).at(-1);
    if (/^[\w-]{11}$/.test(id || '')) return {embed:'https://www.youtube-nocookie.com/embed/' + id};
  }
  if (['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)) {
    id = url.pathname.split('/').filter(Boolean).at(-1);
    if (/^\d{5,12}$/.test(id || '')) return {embed:'https://player.vimeo.com/video/' + id};
  }
  if (/\.(mp4|webm)$/i.test(url.pathname)) return {file:url.href};
  return null;
}

function designFields(changes) {
  return '<fieldset class="card"><legend>Design and media</legend><p>Leave a color blank to use the site theme. Use public HTTPS links for photos and videos.</p>' +
    Object.entries(designOptions).map(([key,[label,type]]) => {
      const current = changes[key] || '';
      if (type === 'choice') return `<label>${e(label)}<select name="${key}">${Object.entries(designChoices[key]).map(([value,name]) => `<option value="${value}" ${(current || 'standard') === value ? 'selected' : ''}>${name}</option>`).join('')}</select></label>`;
      if (key === 'sectionText') return area(key,label,current,false,900);
      return field(key,label,current,type === 'url' ? 'url' : 'text',false, type === 'color' ? 7 : 1000);
    }).join('') + '</fieldset>';
}

function applyDesign(html, changes) {
  const design = {};
  for (const key of Object.keys(designOptions)) {
    const value = cleanDesign(key,changes[key]);
    if (value) design[key] = value;
  }
  if (!Object.keys(design).length) return html;
  const style = [];
  if (design.accent) style.push(`html[data-theme] body{--plum:${design.accent};--purple:${design.accent}}.primary{color:${inkOn(design.accent)}}`);
  if (design.background) style.push(`html[data-theme] body,html[data-theme] .header{background:${design.background}}`);
  if (design.foreground) style.push(`html[data-theme] body{color:${design.foreground};--ink:${design.foreground};--muted:${design.foreground}}`);
  if (design.layout === 'wide') style.push('main .wrap{max-width:none;width:min(1400px,calc(100% - 48px))}main .reading,main .narrow{max-width:1000px}');
  if (design.layout === 'compact') style.push('main .wrap{width:min(930px,calc(100% - 40px))}main .band,main .feature,main .pagehead{padding-block:2rem}');
  if (design.headlineStyle === 'serif') style.push('main :is(h1,h2,h3){font-family:Georgia,serif}');
  if (design.headlineStyle === 'sans') style.push('main :is(h1,h2,h3){font-family:system-ui,sans-serif;letter-spacing:-.025em}');
  html = html.replace('</head>', '<style>' + style.join('') + '</style></head>');
  const parts = [];
  if (design.sectionTitle) parts.push('<h2>' + e(design.sectionTitle) + '</h2>');
  if (design.sectionText) parts.push('<p class="studio-copy">' + e(design.sectionText) + '</p>');
  if (design.photo) parts.push(`<img class="studio-photo" src="${e(design.photo)}" alt="${e(design.photoAlt || '')}" loading="lazy" decoding="async">`);
  if (design.video) {
    const source = videoSource(design.video);
    const title = e(design.videoTitle || 'Bloom360 video');
    if (source.embed) parts.push(`<iframe class="studio-video" src="${e(source.embed)}" title="${title}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`);
    else parts.push(`<video class="studio-video" src="${e(source.file)}" aria-label="${title}" controls preload="metadata" playsinline></video>`);
  }
  if (parts.length) html = html.replace('</main>', '<section class="wrap band studio-block">' + parts.join('') + '</section></main>');
  return html;
}

function inkOn(hex) {
  const [r,g,b] = hex.slice(1).match(/../g).map(v => {
    const n = parseInt(v,16) / 255;
    return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
  });
  return .2126*r + .7152*g + .0722*b > .179 ? '#111111' : '#ffffff';
}

async function siteAssistant(request, url, db, ai) {
  const assistant = '/admin/assistant';
  const owner = actor(request).id;
  const prefix = 'studio-chat:' + owner + ':';
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
  const form = request.method === 'POST' ? await request.formData() : null;
  const selected = form ? text(form,'thread',36) : url.searchParams.get('thread');
  if (selected && !uuid.test(selected)) return errorPage('Conversation could not be found.',assistant,404);
  const threads = await read(db,`WITH threads AS (
      SELECT substr(key,?,36) AS id, MAX(key) AS newest, MIN(key) AS oldest
      FROM settings WHERE substr(key,1,?)=? GROUP BY id ORDER BY newest DESC LIMIT 40
    ) SELECT threads.id, settings.value AS opening FROM threads JOIN settings ON settings.key=threads.oldest
    ORDER BY threads.newest DESC`,prefix.length + 1,prefix.length,prefix);
  const thread = selected || (!url.searchParams.has('new') && threads[0]?.id) || crypto.randomUUID();
  const threadPrefix = prefix + thread + ':';
  const recent = await read(db,`SELECT key,value FROM settings WHERE substr(key,1,?)=? ORDER BY key DESC LIMIT 75`,threadPrefix.length,threadPrefix);
  const turns = recent.reverse().map(row => ({...JSON.parse(row.value),key:row.key}));
  const sitePage = url.searchParams.get('page');
  const target = Object.hasOwn(referencePages,sitePage) ? sitePage : turns.at(-1)?.path || '/';
  const threadUrl = assistant + '?thread=' + thread;
  const pageOptions = Object.entries(referencePages).map(([path,html]) =>
    `<option value="${e(path)}" ${target === path ? 'selected' : ''}>${e(pageFields(html)[0].value)}</option>`).join('');
  const hidden = `<input type="hidden" name="thread" value="${e(thread)}">`;
  const bubble = (label, text) => `<div class="chat-message"><strong>${e(label)}</strong><p>${e(text)}</p></div>`;
  const render = async (status = '') => {
    const links = threads.map(row => {
      const label = JSON.parse(row.opening).prompt.slice(0,65);
      return `<a href="${assistant}?thread=${e(row.id)}" ${row.id === thread ? 'aria-current="page"' : ''}>${e(label)}</a>`;
    });
    const latestDraft = turns.findLast(turn => turn.version);
    const history = turns.map(turn => bubble('You',turn.prompt) + bubble('Bloom360 Assistant',turn.reply) +
      (turn === latestDraft ? `<div class="actions chat-actions">${button('/admin/pages?page=' + encodeURIComponent(turn.path) + '&preview=1','Preview current draft')}
        ${start(assistant)}${hidden}<input type="hidden" name="turn" value="${e(turn.key.slice(threadPrefix.length))}"><button class="btn primary" type="submit" name="action" value="publish">Publish this change</button></form></div>` : '')).join('');
    return adminPage('Bloom360 Assistant', (status ? notice(status) : '') +
      `<div class="chat-grid"><aside class="card chat-history"><h2>Conversations</h2>${button(assistant + '?new=1','New chat')}${links.join('')}</aside>
      <div class="card chat-main"><div id="studio-thread" class="chat-thread" role="log" aria-label="Conversation">
      ${bubble('Bloom360 Assistant','Hi! I’m Bloom360 Assistant. Tell me what you’d like to update, or ask a question. I can help with page copy, colors, layout, media, sections and search descriptions. You can review and publish my changes right here.')}${history}</div>
      ${start(assistant)}${hidden}<label>Page<select name="page">${pageOptions}</select></label>
      ${area('prompt','Message Bloom360 Assistant','',true,1600)}
      <div class="actions"><button class="btn ghost" type="button" id="studio-mic" hidden>Dictate</button><button class="btn primary" type="submit">Send</button></div>
      <p id="studio-voice-status" role="status"></p></form></div></div><script defer src="/assets/studio-voice.js"></script>`,assistant);
  };
  if (!form) return render(url.searchParams.get('published') ? 'Page published.' : '');
  if (form.get('action') === 'publish') {
    const record = turns.find(turn => turn.key === threadPrefix + text(form,'turn',90));
    if (!record?.version) return render('This message has no changes to publish.');
    // Compare the exact version so newer manual or AI edits are never published accidentally.
    const published = await first(db,`INSERT INTO settings(key,value)
      SELECT ?,value FROM settings WHERE key=? AND value=?
      ON CONFLICT(key) DO UPDATE SET value=excluded.value RETURNING key`,
      'page-live:' + record.path,'page-draft:' + record.path,record.version);
    if (!published) return render('The page draft has changed. Review the latest draft in Website pages before publishing.');
    return redirect(threadUrl + '&published=1');
  }
  const path = text(form,'page',150);
  const prompt = text(form,'prompt',1600);
  if (!Object.hasOwn(referencePages,path) || !prompt) return render('Choose a page and type or dictate a message.');
  const turnKey = threadPrefix + Date.now() + '-' + crypto.randomUUID();
  const upsert = 'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value';
  const saveReply = async (reply) => {
    await write(db,upsert,turnKey,JSON.stringify({path,prompt,reply}));
    return redirect(threadUrl);
  };
  if (!ai) return saveReply('The AI service is unavailable right now. The manual page editor is available.');
  const day = new Date().toISOString().slice(0,10);
  const usage = await first(db,`INSERT INTO settings(key,value) VALUES('studio-ai-usage', ?)
    ON CONFLICT(key) DO UPDATE SET value = CASE WHEN substr(value,1,10)=? THEN ? || ':' || (CAST(substr(value,12) AS INTEGER)+1) ELSE excluded.value END
    WHERE substr(value,1,10) != ? OR CAST(substr(value,12) AS INTEGER) < 12 RETURNING value`,day + ':1',day,day,day);
  if (!usage) return saveReply('The daily AI limit has been reached. You can continue in the manual editor or come back tomorrow.');
  const fields = pageFields(referencePages[path]);
  const baseDraft = await readPageVersion(db,'page-draft',path);
  const current = baseDraft || await readPageVersion(db,'page-live',path) || {};
  const allowed = Object.fromEntries(fields.map(field => [field.key,field]));
  let parsed;
  try {
    const result = await ai.run('@cf/meta/llama-3.1-8b-instruct-fast',{
      messages:[
        {role:'system',content:'You are Bloom360 Assistant, the friendly site editor for Bloom360 Initiative. Reply naturally, answer questions, and ask clarifying questions when needed. Output JSON with message (your reply) and changes (object of string values keyed by supplied fields). For questions use empty changes. For supported edits change only fields the admin requested, using the selected page and conversation context. If they describe a different page ask them to select it. Empty string clears design fields. Never invent media URLs or claim to publish. Colors use #rrggbb, layouts standard/wide/compact, headings standard/serif/sans. No HTML or CSS. You can edit the supplied page content, design, media and SEO only; never claim to create accounts, change infrastructure, create new routes, upload files, or write arbitrary code. Bloom360 actually uses Cloudflare Workers and D1 for backend/database, Vercel for the frontend; do not claim it uses Kontroldesk.'},
        ...turns.slice(-6).flatMap(turn => [
          {role:'user',content:turn.prompt.slice(0,750)},
          {role:'assistant',content:turn.reply.slice(0,750)},
        ]),
        {role:'user',content:JSON.stringify({request:prompt,page:path,pageFields:fields.map(f=>[f.key,(current[f.key] ?? f.value).slice(0,180)]),designFields:designOptions,currentDesign:Object.fromEntries(Object.keys(designOptions).map(k=>[k,current[k] || '']))})},
      ],temperature:.2,max_tokens:850,
    });
    const raw = result?.response;
    parsed = typeof raw === 'string' ? JSON.parse(raw.trim().replace(/^\x60{3}(?:json)?\s*|\s*\x60{3}$/gi,'')) : raw;
  } catch {
    return saveReply('I couldn’t complete that request. Try again or describe a smaller change.');
  }
  const draft = {...current};
  let count = 0;
  for (const [key,value] of Object.entries(parsed?.changes || {})) {
    if (typeof value !== 'string') continue;
    const item = Object.hasOwn(allowed,key) ? allowed[key] : null;
    const cleaned = item ? value.trim().slice(0,item.max) || null : cleanDesign(key,value);
    if (cleaned === null || cleaned === (draft[key] ?? item?.value ?? '')) continue;
    if (!item && !cleaned) delete draft[key];
    else draft[key] = cleaned;
    count++;
  }
  const message = typeof parsed?.message === 'string' ? parsed.message.slice(0,900) : '';
  if (!count) return saveReply(message || 'What would you like to change on this page?');
  const version = JSON.stringify(draft);
  const changed = await first(db,`INSERT INTO settings(key,value)
    SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM settings WHERE key=? AND value IS NOT ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value RETURNING value`,
    'page-draft:' + path,version,'page-draft:' + path,baseDraft ? JSON.stringify(baseDraft) : null);
  if (!changed) return saveReply('The draft changed while I was working. Send your request again and I’ll work from the latest version.');
  await write(db,upsert,turnKey,JSON.stringify({path,prompt,reply:message || 'I prepared the draft for you.',version}));
  return redirect(threadUrl);
}
