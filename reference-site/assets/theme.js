'use strict';
(() => {
  const key = 'bloomTheme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  let choice;
  try { choice = localStorage.getItem(key); } catch {}
  if (choice !== 'dark' && choice !== 'light') choice = undefined;
  const root = document.documentElement;
  function update() {
    const dark = choice ? choice === 'dark' : system.matches;
    root.dataset.theme = dark ? 'dark' : 'light';
    const button = document.querySelector('.theme-switch');
    if (!button) return;
    button.querySelector('.theme-label').textContent = dark ? 'Light mode' : 'Dark mode';
    button.querySelector('.theme-icon').textContent = dark ? '☀' : '☾';
  }
  update();
  system.addEventListener('change', update);
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('.theme-switch');
    if (!button) return;
    update();
    button.addEventListener('click', () => {
      choice = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, choice); } catch {}
      update();
    });
  });
})();
