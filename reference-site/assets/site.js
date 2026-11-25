'use strict';
const menu = document.querySelector('.menu');
const nav = document.querySelector('#nav');
const dropdowns = [...document.querySelectorAll('.navpop')];
function closeMenu(restore = false) {
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
  dropdowns.forEach(item => item.open = false);
  if (restore) menu.focus();
}
menu.addEventListener('click', () => {
  if (nav.classList.contains('open')) return closeMenu();
  nav.classList.add('open');
  menu.setAttribute('aria-expanded', 'true');
});
dropdowns.forEach(item => item.addEventListener('toggle', () => {
  if (item.open) dropdowns.filter(other => other !== item).forEach(other => other.open = false);
}));
nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('click', event => {
  if (!event.target.closest('.navline')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
  const open = dropdowns.find(item => item.open);
  if (open) { open.open = false; open.querySelector('summary').focus(); }
  else if (nav.classList.contains('open')) closeMenu(true);
});
const dialog = document.querySelector('#newsletter');
const prefs = (storage, key, value) => {
  try { if (value === undefined) return window[storage].getItem(key); window[storage].setItem(key, value); } catch {}
};
let priorFocus;
dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('close', () => {
  prefs('localStorage','bloomDismiss',String(Date.now()));
  if (priorFocus instanceof HTMLElement) priorFocus.focus({preventScroll:true});
});
document.querySelectorAll('form[action="/submit"]').forEach(form => form.addEventListener('submit', async event => {
  event.preventDefault();
  const status = form.querySelector('.status');
  const button = form.querySelector('button[type="submit"]');
  const newsletter = form.classList.contains('signup');
  button.disabled = true;
  status.textContent = 'Sending…';
  try {
    const response = await fetch('/submit', { method: 'POST', body: new URLSearchParams(new FormData(form)) });
    if (!response.ok) throw new Error('Submission failed');
    status.textContent = newsletter ? 'You’re on the list.' : 'We received your submission.';
    if (newsletter) prefs('localStorage','bloomSignup','yes');
    form.reset();
  } catch {
    status.textContent = 'We couldn’t save your submission. Please try again.';
  } finally {
    button.disabled = false;
  }
}));
const blockedPages = /^\/(join|contact|get-involved|privacy|accessibility|safeguarding)(\/|$)/;
let active = 0;
if (!blockedPages.test(location.pathname) && typeof dialog.showModal === 'function') {
  const timer = setInterval(() => {
    if (prefs('sessionStorage','bloomShown') || prefs('localStorage','bloomSignup') || Date.now() - Number(prefs('localStorage','bloomDismiss')) < 30 * 86400000) return clearInterval(timer);
    if (document.visibilityState !== 'visible' || document.activeElement?.closest('form')) return;
    active += 1;
    if (active < 20) return;
    clearInterval(timer);
    priorFocus = document.activeElement;
    prefs('sessionStorage','bloomShown','yes');
    dialog.showModal();
  }, 1000);
}
const search = document.querySelector('#resource-search');
if (search) {
  const topic = document.querySelector('#resource-topic');
  function readFilters() {
    const params = new URLSearchParams(location.search);
    search.value = params.get('q') || '';
    topic.value = params.get('topic') || '';
  }
  function filter(updateUrl = true) {
    const query = search.value.trim().toLowerCase();
    let matches = 0;
    document.querySelectorAll('.resource-item').forEach(item => {
      item.hidden = !item.textContent.toLowerCase().includes(query) || Boolean(topic.value && item.dataset.topic !== topic.value);
      if (!item.hidden) matches += 1;
    });
    document.querySelector('#resource-empty').hidden = matches > 0;
    if (!updateUrl) return;
    const params = new URLSearchParams();
    if (query) params.set('q', search.value.trim());
    if (topic.value) params.set('topic', topic.value);
    history.replaceState(null, '', location.pathname + (params.size ? '?' + params : ''));
  }
  readFilters(); filter(false);
  search.addEventListener('input', () => filter());
  topic.addEventListener('change', () => filter());
  document.querySelector('#clear-filters').addEventListener('click', () => { search.value = ''; topic.value = ''; filter(); search.focus(); });
}

const referenceKind = location.pathname.split('/').filter(Boolean);
const listingKinds = new Set(['programs','resources','events','opportunities']);
const builtInIds = new Set(['mentorship','bloom-start','entrepreneurship','better-career-2027','volunteer-guide','woman-of-the-week']);
if (referenceKind.length === 1 && listingKinds.has(referenceKind[0])) {
  const kind = referenceKind[0];
  fetch('/published-content.json').then(response => {
    if (!response.ok) throw new Error('Published content unavailable');
    return response.json();
  }).then(({entries}) => {
    const additions = entries.filter(entry => entry.kind === kind && !builtInIds.has(entry.id));
    if (!additions.length) return;
    const reading = document.querySelector('main .reading');
    const grid = reading.querySelector('.grid') || document.createElement('div');
    grid.classList.add('grid');
    if (!grid.isConnected) {
      reading.querySelector('.prose p')?.remove();
      reading.prepend(grid);
    }
    for (const entry of additions) {
      const card = document.createElement('article');
      card.className = kind === 'resources' ? 'tile resource-item' : 'tile';
      if (kind === 'resources') card.dataset.topic = entry.label === 'Community Conversations' ? 'community' : 'career';
      const title = document.createElement('h3');
      title.textContent = entry.title;
      const summary = document.createElement('p');
      summary.textContent = entry.summary;
      const link = document.createElement('a');
      link.className = 'more';
      link.href = '/' + kind + '/' + encodeURIComponent(entry.id);
      link.textContent = 'Read more';
      card.append(title, summary, link);
      grid.append(card);
    }
    if (search) search.dispatchEvent(new Event('input'));
  }).catch(() => {});
}
