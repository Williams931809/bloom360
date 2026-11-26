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
  const pageOptions = Object.entries(referencePages).map(([path,html]) =>
    `<option value="${e(path)}" ${url.searchParams.get('page') === path ? 'selected' : ''}>${e(pageFields(html)[0].value)}</option>`).join('');
  const render = (result = '') => adminPage('Website assistant',result +
    '<p>Describe a change to the selected page. The assistant saves its work as a draft for review.</p>' +
    start(assistant) + '<label>Page<select name="page">' + pageOptions + '</select></label>' +
    area('prompt','What would you like to change?', '',true,1600) +
    '<div class="actions"><button class="btn ghost" type="button" id="studio-mic" hidden>Dictate</button><button class="btn primary" type="submit">Create draft</button></div><p id="studio-voice-status" role="status"></p></form>' +
    '<p>Try “Give the About page an editorial serif heading and a deeper purple accent” or paste a link and ask the assistant to add a video.</p><script defer src="/assets/studio-voice.js"></script>',assistant);
  if (request.method !== 'POST') return render();
  if (!ai) return render(notice('The AI service is unavailable. You can edit the page manually.'));
  const form = await request.formData();
  const path = text(form,'page',150);
  const prompt = text(form,'prompt',1600);
  if (!Object.hasOwn(referencePages,path) || !prompt) return render(notice('Choose a page and describe a change.'));
  const day = new Date().toISOString().slice(0,10);
  const usage = await first(db,`INSERT INTO settings(key,value) VALUES('studio-ai-usage', ?)
    ON CONFLICT(key) DO UPDATE SET value = CASE WHEN substr(value,1,10)=? THEN ? || ':' || (CAST(substr(value,12) AS INTEGER)+1) ELSE excluded.value END
    WHERE substr(value,1,10) != ? OR CAST(substr(value,12) AS INTEGER) < 12 RETURNING value`,day + ':1',day,day,day);
  if (!usage) return render(notice('The daily assistant limit has been reached. The manual editor is available.'));
  const fields = pageFields(referencePages[path]);
  const current = await readPageVersion(db,'page-draft',path) || await readPageVersion(db,'page-live',path) || {};
  const allowed = Object.fromEntries(fields.map(f => [f.key,f]));
  let parsed;
  try {
    const result = await ai.run('@cf/meta/llama-3.1-8b-instruct-fast',{
      messages:[
        {role:'system',content:'You edit one Bloom360 page. Output a JSON object with changes (object of string values keyed by supplied keys) and message (brief summary). Only change requested fields. Empty string clears a design field. Never invent media URLs. If required information is missing, return empty changes and ask for what is missing. Colors are 6-digit #hex. Layout: standard, wide, compact. Heading style: standard, serif, sans. No HTML or CSS. Do not publish.'},
        {role:'user',content:JSON.stringify({request:prompt,page:path,pageFields:fields.map(f=>[f.key,(current[f.key] ?? f.value).slice(0,250)]),designFields:designOptions,currentDesign:Object.fromEntries(Object.keys(designOptions).map(k=>[k,current[k] || '']))})},
      ],temperature:.2,max_tokens:850,
    });
    const raw = result?.response;
    parsed = typeof raw === 'string' ? JSON.parse(raw.trim().replace(/^\x60{3}(?:json)?\s*|\s*\x60{3}$/gi,'')) : raw;
  } catch {
    return render(notice('The assistant could not complete this request. Try describing a smaller change.'));
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
  const message = typeof parsed?.message === 'string' ? parsed.message.slice(0,450) : '';
  if (!count) return render(notice(message || 'No supported edits were found. Try a more specific request.'));
  await write(db,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','page-draft:' + path,JSON.stringify(draft));
  return render(notice(message || 'Draft created.') + '<div class="actions">' +
    button('/admin/pages?page=' + encodeURIComponent(path) + '&preview=1','Preview draft',true) +
    button('/admin/pages?page=' + encodeURIComponent(path),'Open editor') + '</div><br>');
}
