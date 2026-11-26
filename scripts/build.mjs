import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';

const original = await readFile('src/original.html', 'utf8');
const fragment = (pattern) => {
  const match = original.match(pattern);
  if (!match) throw new Error(`Missing source fragment: ${pattern}`);
  return match[1];
};

const style = fragment(/<style>([\s\S]+?)<\/style>/);
const about = fragment(/(<section id="about"[\s\S]+?<\/section>)/)
  .replace('<h2 id="about-h">', '<h1 id="about-h">')
  .replace('About Bloom360</h2>', 'About Bloom360</h1>');
const symbols = fragment(/(<svg width="0"[\s\S]+?<\/defs>\s*<\/svg>)/);
const logo = fragment(/(<a class="logo"[\s\S]+?<\/a>)/).replace('#top', '/');
const code = await readFile('src/worker.js', 'utf8');
const css = await readFile('src/site.css', 'utf8');

async function loadReferencePages(directory, route = '/', pages = {}) {
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    if (entry.isDirectory()) await loadReferencePages(directory + '/' + entry.name, route + entry.name + '/', pages);
    if (entry.name === 'index.html') pages[route === '/' ? route : route.slice(0,-1)] = await readFile(directory + '/index.html','utf8');
  }
  return pages;
}
const referencePages = await loadReferencePages('reference-site');
const pageEditor = await readFile('src/page-editor.js','utf8');
const studio = await readFile('src/design-studio.js','utf8');

await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await writeFile('dist/server/index.js', `const theme = ${JSON.stringify({ style: style + css, about, symbols, logo })};\nconst referencePages = ${JSON.stringify(referencePages)};\n${code}\n${pageEditor}\n${studio}`);
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
