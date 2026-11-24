import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

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

await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await writeFile('dist/server/index.js', `const theme = ${JSON.stringify({ style: style + css, about, symbols, logo })};\n${code}`);
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
