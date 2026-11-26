const sections = {
  programs: ['Programs', 'Explore mentorship, career preparation and entrepreneurship support.'],
  events: ['Events', 'Find upcoming Bloom360 sessions and community gatherings.'],
  resources: ['Resources', 'Read practical guides for your career, leadership and learning.'],
  opportunities: ['Opportunity Guide', 'Explore fellowships, calls for applications and volunteer opportunities.'],
};
const defaults = [
  ['mentorship', 'programs', 'Mentorship', 'Explore your goals with guidance from people who can help you plan your next step.', 'Eligibility, dates and application details will be shared once confirmed.', 'Details pending'],
  ['bloom-start', 'programs', 'Bloom Start', 'Build a career, confidence and a sense of direction after graduation or as you plan your next move.', 'The seminar covers career preparation, skills, networking, purpose and entrepreneurship for graduates, working women and aspiring entrepreneurs.', 'Details pending'],
  ['entrepreneurship', 'programs', 'Entrepreneurship support', 'Explore practical learning for turning an idea into an action plan.', '', 'Coming soon'],
  ['better-career-2027', 'resources', '5 Things to Do Before the Year Ends for a Better Career in 2027', 'A short checklist for using the last weeks of the year well.', 'Reflect on the work you enjoyed, document your wins, choose one skill to build, reconnect with someone in your field, and schedule a first step for January.', 'Career & Skills'],
  ['volunteer-guide', 'opportunities', 'Detty December volunteer guide', 'Volunteer opportunities to consider this season.', 'Look for calls from local community organizations, event teams and charities. Confirm the dates, responsibilities and organizer before applying.', 'Volunteering'],
  ['woman-of-the-week', 'resources', 'Woman of the Week', 'Stories from women building careers and businesses.', 'Know someone whose story would encourage others? Tell us about her through our contact form.', 'Community Conversations'],
].map(([id, kind, title, summary, body, label]) => ({ id, kind, title, summary, body, label, event_date: '', published: 1 }));
const settings = {
  headline: 'Build the confidence to take your next step.',
  introduction: 'Bloom360 Initiative connects girls and women with mentorship, practical learning and opportunities to grow in their careers, leadership and entrepreneurship.',
  founder: 'Bloom360 Initiative is led by Dr. Thelma Ezeonu, a physician, entrepreneur and philanthropist. Her work with Bloom360 reflects a commitment to helping girls and women develop skills, find guidance and pursue meaningful opportunities.',
  hero_image: '',
  founder_image: '',
};
const nav = [['/about', 'About'], ['/programs', 'Programs'], ['/events', 'Events'], ['/resources', 'Resources'], ['/get-involved', 'Get involved'], ['/contact', 'Contact']];
const formKinds = ['newsletter', 'contact', 'mentor', 'partner', 'volunteer', 'application'];
const labels = { headline: 'Home headline', introduction: 'Home introduction', founder: 'Founder biography', hero_image: 'Hero image HTTPS URL', founder_image: 'Founder portrait HTTPS URL' };

const e = (value = '') => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const read = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;
const first = (db, sql, ...args) => db.prepare(sql).bind(...args).first();
const write = (db, sql, ...args) => db.prepare(sql).bind(...args).run();
const button = (href, label, primary = false) => `<a class="btn ${primary ? 'primary' : 'ghost'}" href="${e(href)}">${e(label)}</a>`;
const submit = (label) => `<button class="btn primary" type="submit">${e(label)}</button>`;
const head = (title, intro = '') => `<div class="pagehead"><div class="wrap"><h1>${e(title)}</h1>${intro ? `<p class="lead">${e(intro)}</p>` : ''}</div></div>`;
const block = (body, cl = '') => `<section class="${cl}"><div class="wrap">${body}</div></section>`;
const notice = (message) => `<p class="notice" role="status">${e(message)}</p>`;
const field = (name, label, value = '', type = 'text', required = true, max = 254) =>
  `<label>${e(label)}<input name="${name}" type="${type}" value="${e(value)}" maxlength="${max}" ${required ? 'required' : ''}></label>`;
const area = (name, label, value = '', required = true, max = 12000) =>
  `<label>${e(label)}<textarea name="${name}" maxlength="${max}" ${required ? 'required' : ''}>${e(value)}</textarea></label>`;
const start = (path) => `<form class="flow" method="post" action="${e(path)}">`;
const redirect = (path) => new Response(null, {status: 303, headers: {Location:path, 'Cache-Control':'no-store'}});
const signIn = (path) => '/signin-with-chatgpt?returnTo=' + encodeURIComponent(path);
const signOut = '/signout-with-chatgpt?returnTo=%2F';
const standaloneRequests = new WeakSet();
const signOutControl = (request) => standaloneRequests.has(request)
  ? start('/logout') + submit('Sign out') + '</form>'
  : `<a class="btn ghost" href="${signOut}" target="_top">Sign out</a>`;
const imageUrl = (value) => {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
  catch { return ''; }
};

function page(title, content, path, status = 200) {
  const menu = nav.map(([href,label]) => `<li><a href="${href}"${path === href || path.startsWith(href + '/') ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} | Bloom360 Initiative</title>
  <meta name="description" content="${e(settings.introduction)}"><style>${theme.style}</style></head>
  <body class="${path === '/' ? 'home-page' : 'inner-page'}">${theme.symbols}<a class="skip" href="#main">Skip to main content</a>
  <header class="site"><div class="wrap bar">${theme.logo}<nav class="desktop-nav" aria-label="Main"><ul>${menu}<li><a class="btn" href="/join">Join Bloom360</a></li></ul></nav><details class="mobile-menu"><summary><svg class="ic" aria-hidden="true"><use href="#i-menu"/></svg>Menu</summary><nav aria-label="Main"><ul>${menu}<li><a class="btn" href="/join">Join Bloom360</a></li></ul></nav></details></div></header>
  <main id="main">${content}</main>
  <footer><div class="wrap"><div class="cols"><div><h2>Bloom360 Initiative</h2><p>Mentorship, skills and opportunities for girls and women.</p></div>
  <div><h2>Explore</h2><ul><li><a href="/opportunities">Opportunity Guide</a></li><li><a href="/get-involved">Get involved</a></li><li><a href="/about#founder">Our founder</a></li></ul></div>
  <div><h2>Connect</h2><ul><li><a href="https://www.instagram.com/bloom360initiative/">Instagram</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/account">My account</a></li></ul></div></div></div></footer></body></html>`,
  { status, headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self' https:; form-action 'self'; frame-ancestors 'self' https://chatgpt.com; base-uri 'none'"} });
}

function cards(items) {
  return `<div class="grid">${items.map(({ id,kind,title,summary,label,event_date }) => `<article class="card editorial-card">${label || event_date ? `<span class="status">${e([label,event_date].filter(Boolean).join(' · '))}</span>` : ''}<h2><a href="/${kind}/${e(id)}">${e(title)}</a></h2><p>${e(summary)}</p></article>`).join('')}</div>`;
}
async function entries(db) {
  if (db.entries) return db.entries;
  const result = new Map(defaults.map((entry) => [entry.id, entry]));
  for (const entry of await read(db, 'SELECT * FROM entries ORDER BY title')) result.set(entry.id, entry);
  return [...result.values()];
}
async function siteSettings(db) {
  if (db.settings) return db.settings;
  const result = {...settings};
  for (const {key,value} of await read(db, 'SELECT key, value FROM settings')) {
    if (Object.hasOwn(settings,key)) result[key] = value;
  }
  return result;
}
function publicForm(kind, subject = '', authenticatedEmail = '') {
  const newsletter = kind === 'newsletter';
  return start('/submit') + `<input type="hidden" name="kind" value="${e(kind)}"><input type="hidden" name="subject" value="${e(subject)}">`
    + (newsletter ? '' : field('name','Name'))
    + field('email','Email address',authenticatedEmail,'email')
    + (newsletter ? '' : area('message', kind === 'application' ? 'Tell us why you are interested' : 'Message', '', true, 4000))
    + '<label class="check"><input type="checkbox" name="consent" required><span>I agree to the <a href="/privacy">privacy information</a>.</span></label>'
    + submit(newsletter ? 'Subscribe' : 'Send') + '</form>';
}

const text = (form,key,max) => String(form.get(key) ?? '').trim().slice(0,max);
const actor = (request) => ({
  id: request.headers.get('oai-authenticated-user-id') || '',
  email: request.headers.get('oai-authenticated-user-email') || '',
});
const errorPage = (message,path,status = 400) => page('Request could not be completed',head(message) + block(button(path,'Go back')),path,status);

async function enroll(db, user, form, secret) {
  const code = text(form,'code',512);
  if (!(await first(db, "SELECT id FROM accounts WHERE role = 'admin'"))) {
    if (!secret || !code || code !== secret) return errorPage('Enter the administrator setup code.','/account',403);
    await write(db, "INSERT OR IGNORE INTO accounts(id,email,role) VALUES(?,?,'admin')",user.id,user.email);
  } else {
    await write(db, "INSERT OR IGNORE INTO accounts(id,email,role) VALUES(?,?,'member')",user.id,user.email);
  }
  return redirect('/account');
}

async function receive(db, form) {
  const kind = text(form,'kind',24);
  const email = text(form,'email',254).toLowerCase();
  const name = text(form,'name',254);
  const subject = text(form,'subject',254);
  const message = text(form,'message',4000);
  const back = kind === 'newsletter' ? '/join' : kind === 'contact' ? '/contact' : '/get-involved';
  if (!formKinds.includes(kind) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !form.has('consent') || (kind !== 'newsletter' && (!name || !message))) {
    return errorPage('Complete the required fields and accept the privacy information.',back);
  }
  if (kind === 'application') {
    const listing = (await entries(db)).find((entry) => entry.id === subject && entry.published && ['programs','events'].includes(entry.kind) && entry.label === 'Open');
    if (!listing) return errorPage('This listing is closed to submissions.','/programs',409);
  }
  await write(db,'INSERT OR IGNORE INTO submissions(id,kind,email,name,subject,message) VALUES(?,?,?,?,?,?)',crypto.randomUUID(),kind,email,name,subject,message);
  return page('Thank you',head(kind === 'newsletter' ? 'You’re on the list.' : 'We received your submission.') + block(button(back,'Back to Bloom360')),'/submit',201);
}

function adminNav() {
  return `<div class="admin-links"><a href="/admin">Overview</a><a href="/admin/pages">Website pages</a><a href="/admin/assistant">AI assistant</a>${Object.entries(sections).map(([key,[title]]) => `<a href="/admin/entries?kind=${key}">${title}</a>`).join('')}<a href="/admin/inbox">Inbox</a><a href="/admin/members">Members</a><a href="/admin/settings">Site settings</a></div>`;
}
function adminPage(title, body, path) {
  return page(title,head(title) + block(adminNav() + body) + (path === '/admin/assistant' ? '' : '<a class="btn primary assistant-launch" href="/admin/assistant">Ask Bloom360 Assistant</a>'),path);
}
function entryForm(kind, entry) {
  const item = entry ?? {};
  const back = '/admin/entries?kind=' + kind;
  return start('/admin/entries') + `<input type="hidden" name="kind" value="${kind}"><input type="hidden" name="id" value="${e(item.id)}">`
    + field('title','Title',item.title) + field('summary','Short description',item.summary,'text',true,600)
    + area('body','Full description',item.body,false) + field('label','Label (use Open to accept program applications or event registrations)',item.label,'text',false,80)
    + (kind === 'events' ? field('event_date','Event date',item.event_date,'date',false) : '')
    + `<label class="check"><input type="checkbox" name="published" ${item.published ? 'checked' : ''}>Visible on the site</label>`
    + '<div class="actions">' + submit('Save') + button(back,'Cancel') + '</div></form>';
}
async function saveEntry(db, form) {
  const kind = text(form,'kind',24);
  const id = text(form,'id',120);
  if (!Object.hasOwn(sections,kind)) return errorPage('Choose a valid content type.','/admin');
  if (id && !(await entries(db)).some((entry) => entry.id === id && entry.kind === kind)) return errorPage('Content could not be found.','/admin',404);
  const title = text(form,'title',254);
  const summary = text(form,'summary',600);
  const date = kind === 'events' ? text(form,'event_date',10) : '';
  if (!title || !summary || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) return errorPage('Enter a title, summary and valid date.','/admin/entries?kind=' + kind);
  await write(db,`INSERT INTO entries(id,kind,title,summary,body,label,event_date,published) VALUES(?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,body=excluded.body,label=excluded.label,event_date=excluded.event_date,published=excluded.published`,
  id || crypto.randomUUID(),kind,title,summary,text(form,'body',12000),text(form,'label',80),date,Number(form.has('published')));
  return redirect('/admin/entries?kind=' + kind);
}
async function admin(request, url, db, ai) {
  const path = url.pathname;
  const user = actor(request);
  if (!user.id) return redirect(standaloneRequests.has(request) ? '/login' : signIn('/admin'));
  const account = await first(db,'SELECT role FROM accounts WHERE id = ?',user.id);
  if (!account) return redirect('/account');
  if (account.role !== 'admin') return errorPage('Administrator access is required.','/account',403);

  if (path === '/admin/pages') return managePages(request,url,db);
  if (path === '/admin/assistant') return siteAssistant(request,url,db,ai);
  if (request.method === 'POST') {
    const form = await request.formData();
    if (path === '/admin/entries') return saveEntry(db,form);
    if (path === '/admin/inbox') {
      await write(db,"UPDATE submissions SET status = 'reviewed' WHERE id = ?",text(form,'id',80));
      return redirect('/admin/inbox');
    }
    if (path === '/admin/settings') {
      const values = Object.keys(settings).map((key) => [key,text(form,key,key.endsWith('_image') ? 1000 : 4000)]);
      if (values.some(([key,value]) => key.endsWith('_image') ? (value && !imageUrl(value)) : !value)) {
        return errorPage('Fill in the text fields and use HTTPS image URLs.','/admin/settings');
      }
      await db.batch(values.map(([key,value]) => db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,value)));
      return redirect('/admin/settings');
    }
    return errorPage('Page could not be found.','/admin',404);
  }

  if (path === '/admin/settings') {
    const current = await siteSettings(db);
    return adminPage('Site settings',start(path) + Object.entries(labels).map(([key,label]) => key.endsWith('_image')
      ? field(key,label,current[key],'url',false,1000)
      : area(key,label,current[key],true,4000)).join('') + submit('Save settings') + '</form>',path);
  }
  if (path === '/admin/members') {
    const members = await read(db,'SELECT email, role, created_at FROM accounts ORDER BY created_at DESC LIMIT 100');
    return adminPage('Members','<div class="records">' + members.map((member) => `<article class="card record"><strong>${e(member.email)}</strong><span>${e(member.role)} · ${e(member.created_at.slice(0,10))}</span></article>`).join('') + '</div>',path);
  }
  if (path === '/admin/inbox') {
    const kind = url.searchParams.get('kind') || '';
    const exportList = url.searchParams.get('download') === 'newsletter';
    if (exportList) {
      const rows = await read(db,"SELECT email, created_at FROM submissions WHERE kind = 'newsletter' ORDER BY created_at DESC");
      const csv = (value) => '"' + String(value).replace(/^[=+\-@\t\r\n]/,"'$&").replaceAll('"','""') + '"';
      return new Response('email,created_at\r\n' + rows.map((row) => [csv(row.email),csv(row.created_at)].join(',')).join('\r\n'),
        {headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="bloom360-subscribers.csv"','Cache-Control':'no-store'}});
    }
    const offset = Math.min(100000, Math.max(0, Number.parseInt(url.searchParams.get('offset'),10) || 0));
    const rows = await read(db,'SELECT * FROM submissions WHERE (? = ? OR kind = ?) ORDER BY created_at DESC, id DESC LIMIT 51 OFFSET ?',kind,'',kind,offset);
    const filters = '<div class="admin-links"><a href="/admin/inbox">All</a>' + formKinds.map((type) => `<a href="/admin/inbox?kind=${type}">${type}</a>`).join('') + '<a href="/admin/inbox?download=newsletter">Export subscribers</a></div>';
    const records = rows.slice(0,50).map((row) => `<article class="card"><span class="status">${e(row.kind)} · ${e(row.status)}</span><h2>${e(row.name || row.email)}</h2><p>${e(row.email)} · ${e(row.created_at)}</p>${row.subject ? `<p>Reference: ${e(row.subject)}</p>` : ''}<p class="copy">${e(row.message)}</p>${row.status === 'new' ? start(path) + `<input type="hidden" name="id" value="${e(row.id)}">` + submit('Mark reviewed') + '</form>' : ''}</article>`).join('');
    const paging = '<div class="actions">'
      + (offset ? button('/admin/inbox?kind=' + encodeURIComponent(kind) + '&offset=' + Math.max(0,offset - 50),'Previous') : '')
      + (rows.length > 50 ? button('/admin/inbox?kind=' + encodeURIComponent(kind) + '&offset=' + (offset + 50),'Next') : '') + '</div>';
    return adminPage('Inbox',filters + (records ? '<div class="records">' + records + '</div>' : notice('No submissions yet.')) + paging,path);
  }
  if (path === '/admin/entries') {
    const kind = url.searchParams.get('kind') || 'programs';
    if (!Object.hasOwn(sections,kind)) return errorPage('Choose a valid content type.','/admin');
    const list = (await entries(db)).filter((item) => item.kind === kind);
    const edit = url.searchParams.get('edit');
    const entry = list.find((item) => item.id === edit);
    if (edit && edit !== 'new' && !entry) return errorPage('Content could not be found.','/admin',404);
    if (edit) return adminPage(entry ? 'Edit content' : 'Add content',entryForm(kind,entry),path);
    const target = '/admin/entries?kind=' + kind + '&edit=';
    return adminPage(sections[kind][0],button(target + 'new','Add content',true) + '<div class="records">' +
      (list.length ? list.map((item) => `<article class="card record"><div><h2>${e(item.title)}</h2><span>${item.published ? 'Published' : 'Draft'}</span></div>${button(target + item.id,'Edit')}</article>`).join('') : notice('No content yet.')) + '</div>',path);
  }
  if (path !== '/admin') return errorPage('Page could not be found.','/admin',404);
  const [member, inbox, content] = await Promise.all([
    first(db,'SELECT COUNT(*) AS total FROM accounts'),
    first(db,"SELECT COUNT(*) AS total FROM submissions WHERE status = 'new'"),
    entries(db),
  ]);
  const totals = [['Published items',content.filter((item) => item.published).length],['New submissions',inbox.total],['Accounts',member.total]];
  return adminPage('Bloom360 dashboard','<div class="grid">' + totals.map(([name,total]) => `<article class="card"><h2>${total}</h2><p>${name}</p></article>`).join('') + '</div>',path);
}

async function account(request, db, secret) {
  const user = actor(request);
  if (!user.id && standaloneRequests.has(request)) return redirect('/login');
  if (!user.id) return page('My account',head('My account','Sign in to register or return to your Bloom360 account.') +
    block(`<a class="btn primary" href="${signIn('/account')}" target="_top">Continue with ChatGPT</a>`),'/account');
  if (request.method === 'POST') return enroll(db,user,await request.formData(),secret);
  const account = await first(db,'SELECT role FROM accounts WHERE id = ?',user.id);
  if (account) {
    return page('My account',head(account.role === 'admin' ? 'Administrator account' : 'My account',user.email) +
      block('<div class="actions">' + (account.role === 'admin' ? button('/admin','Open dashboard',true) : button('/programs','Explore programs',true)) +
        signOutControl(request) + '</div>'),'/account');
  }
  const adminExists = await first(db,"SELECT id FROM accounts WHERE role = 'admin'");
  const enrollment = !adminExists && !secret
    ? notice('Account registration opens once Bloom360 completes administrator setup.')
    : start('/account') + (adminExists ? '' : field('code','Administrator setup code','','password',true,512)) + submit('Create account') + '</form>';
  return page('Create account',head('Create your Bloom360 account',user.email) + block(enrollment +
    `<div class="actions"><a href="${signOut}" target="_top">Sign out</a></div>`),'/account');
}

async function visit(request, url, db) {
  const path = url.pathname;
  if (path === '/') {
    const config = await siteSettings(db);
    const managedImage = imageUrl(config.hero_image);
    const image = managedImage || (db.settings ? '/images/bloom360-mentorship.webp' : '');
    const listings = (await entries(db)).filter((item) => item.published);
    const pathways = listings.filter((item) => ['programs','opportunities'].includes(item.kind)).slice(0,3);
    const resources = listings.filter((item) => item.kind === 'resources').slice(0,2);
    return page('Mentorship, skills and opportunities',
      `<section class="hero"><div class="wrap"><div class="hero-copy"><p class="kicker">Bloom360 Initiative</p><h1>${e(config.headline)}</h1><p class="lead">${e(config.introduction)}</p>
      <div class="actions">${button('/join','Join Bloom360',true)}${button('/programs','Explore programs')}</div></div>
      <div class="hero-art">${image ? `<img src="${e(image)}" alt="${managedImage ? 'Bloom360 community' : 'Two women working together on a laptop'}" fetchpriority="high">` : '<strong>Mentorship. Skills. Opportunities.</strong>'}</div></div></section>`
      + block(`<div class="section-intro"><div><p class="kicker">Programs and opportunities</p><h2>Find your next step</h2></div>${button('/programs','View programs')}</div>` + (pathways.length ? cards(pathways) : notice('New programs will be shared here.')),'pathways')
      + block(`<div class="mission-band"><div><p class="kicker">Our mission</p><h2>More women with the confidence and support to choose what comes next.</h2></div><div><p>Bloom360 brings together mentorship, practical learning and opportunities for girls and women at every stage of their career journey.</p>${button('/about','Meet Bloom360')}</div></div>`,'mission')
      + (resources.length ? block(`<div class="section-intro"><div><p class="kicker">Resource hub</p><h2>Practical guides for what’s next</h2></div>${button('/resources','Browse resources')}</div>` + cards(resources),'home-resources') : '')
      + block(`<div class="join-band"><div><h2>Help someone take her next step.</h2><p>Share your experience, volunteer at an event or partner with Bloom360.</p></div>${button('/get-involved','Get involved',true)}</div>`,'home-join'),path);
  }
  if (path === '/about') {
    const config = await siteSettings(db);
    const portrait = imageUrl(config.founder_image);
    return page('About',theme.about + block(`<div id="founder" class="${portrait ? 'split' : ''}">${portrait ? `<img class="founder-image" src="${e(portrait)}" alt="Dr. Thelma Ezeonu">` : ''}<div><h2>Meet the founder</h2><p class="copy">${e(config.founder)}</p></div></div>`,'alt'),path);
  }
  if (path === '/get-involved') {
    const roles = [['mentor','Become a mentor','Share your expertise with girls and women planning their next step.'],['partner','Partner with us','Collaborate on programs and opportunities.'],['volunteer','Volunteer','Support events, resources and community conversations.']];
    const selected = roles.find(([role]) => role === url.searchParams.get('role'));
    return page('Get involved',head('Get involved','Share your time, expertise or organization’s resources with Bloom360.') +
      block(selected ? '<h2>' + selected[1] + '</h2>' + publicForm(selected[0],'',actor(request).email)
        : '<div class="grid">' + roles.map(([role,title,copy]) => `<article class="card"><h2>${title}</h2><p>${copy}</p>${button('/get-involved?role=' + role,title)}</article>`).join('') + '</div>'),path);
  }
  if (path === '/contact') return page('Contact',head('Contact','Get in touch about programs, partnerships or media.') + block(publicForm('contact','',actor(request).email) + '<p class="note"><a href="https://www.instagram.com/bloom360initiative/">Bloom360 on Instagram</a></p>'),path);
  if (path === '/join') return page('Join Bloom360',head('Join Bloom360','Create an account or subscribe for program, event and resource updates.') + block('<div class="split"><div><h2>Community account</h2>' + button('/account','Continue to account',true) + '</div><div><h2>Newsletter</h2>' + publicForm('newsletter','',actor(request).email) + '</div></div>'),path);
  if (path === '/privacy') return page('Privacy',head('Privacy information') + block('<p>Bloom360 stores the information you submit to respond to inquiries, review applications and manage newsletter subscriptions. If you register, Bloom360 also stores your sign-in identifier and email address.</p><p>Only authorized administrators can access submissions and member records. <a href="/contact">Contact Bloom360</a> to ask about your information or request removal. Please avoid entering sensitive information in these forms.</p>'),path);

  const [,kind,id,extra] = path.split('/');
  if (!extra && Object.hasOwn(sections,kind)) {
    const list = (await entries(db)).filter((item) => item.kind === kind && item.published);
    const [title,intro] = sections[kind];
    if (!id) return page(title,head(title,intro) + block(
      (list.length ? cards(list) : notice('There are no listings here yet.'))
      + (kind === 'resources' ? '<div class="actions">' + button('/opportunities','Explore the Opportunity Guide') + '</div>' : '')
      + (kind === 'events' ? '<div class="actions">' + button('/join','Get event updates') + '</div>' : '')),path);
    const item = list.find((entry) => entry.id === id);
    if (item) {
      const open = item.label === 'Open' && ['programs','events'].includes(kind);
      return page(item.title,head(item.title,item.summary) + block(
        (item.event_date ? `<p><time datetime="${e(item.event_date)}">${e(item.event_date)}</time></p>` : '')
        + (item.body ? `<p class="copy">${e(item.body)}</p>` : '')
        + (open ? '<h2>' + (kind === 'events' ? 'Register interest' : 'Apply') + '</h2>' + publicForm('application',item.id,actor(request).email)
          : button('/join','Get updates'))
        + '<div class="actions">' + button('/' + kind,'Back to ' + title) + '</div>'),path);
    }
  }
  return errorPage('Page could not be found.','/',404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/\/+$/,'') || '/';
    const path = url.pathname;
    const db = env.DB;
    if (!['GET','HEAD','POST'].includes(request.method)) return new Response(null,{status:405,headers:{Allow:'GET, HEAD, POST'}});
    if (request.method === 'POST' && (request.headers.get('Origin') !== (env.SITE_ORIGIN || url.origin) || !request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded'))) {
      return errorPage('Submit this form from the Bloom360 website.','/',403);
    }
    if (request.method === 'POST' && Number(request.headers.get('Content-Length')) > 65536) return errorPage('This submission is too large.','/',413);
    try {
      if (env.PUBLIC_DATA) return referencePage(path,env.PUBLIC_DATA.pages?.[path],request.method,env.PUBLIC_DATA.draft) || await visit(request,url,env.PUBLIC_DATA);
      if (env.AUTH_MODE === 'standalone') {
        const original = request;
        const headers = new Headers(request.headers);
        headers.delete('oai-authenticated-user-id');
        headers.delete('oai-authenticated-user-email');
        const user = await sessionIdentity(original,db);
        if (user) {
          headers.set('oai-authenticated-user-id',user.id);
          headers.set('oai-authenticated-user-email',user.email);
        }
        request = new Request(original,{headers});
        standaloneRequests.add(request);
        if (['/login','/signup','/logout'].includes(path)) return await standaloneAccount(request,env,path);
        if (path === '/account' && request.method === 'POST') return redirect('/account');
        if (path === '/content.json' && request.method !== 'POST') {
          return Response.json({
            entries: (await entries(db)).filter((item) => item.published),
            settings: await siteSettings(db),
            pages: await publishedPages(db),
          }, {headers:{'Cache-Control':'no-store'}});
        }
      }
      if (path === '/admin' || path.startsWith('/admin/')) return await admin(request,url,db,env.AI);
      if (path === '/account') {
        if (request.method === 'POST' && !actor(request).id) return errorPage('Sign in to create an account.','/account',401);
        return await account(request,db,env.ADMIN_SETUP_CODE);
      }
      if (request.method === 'POST') {
        if (path === '/submit') return await receive(db,await request.formData());
        return errorPage('Page could not be found.','/',404);
      }
      return await visit(request,url,db);
    } catch (error) {
      console.error('Bloom360 request failed',error);
      return errorPage('Bloom360 is temporarily unavailable. Please try again.','/',503);
    }
  },
};
