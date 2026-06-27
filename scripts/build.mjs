import { mkdir, readdir, readFile, rm, writeFile, cp } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outDir = path.join(root, 'dist');

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function slugify(value) {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
}

function inlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return html;
}

function highlight(code, language) {
  let html = escapeHtml(code);
  if (['javascript', 'js', 'typescript', 'ts'].includes(language)) {
    html = html.replace(/(\/\/[^\n]*)/g, '<span class="token-comment">$1</span>');
    html = html.replace(/(['`"])(.*?)(\1)/g, '<span class="token-string">$1$2$3</span>');
    html = html.replace(/\b(const|let|var|function|return|async|await|new|if|else|for|of|import|from|export)\b/g, '<span class="token-keyword">$1</span>');
    html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>');
    html = html.replace(/\b([A-Za-z_$][\w$]*)(?=\()/g, '<span class="token-function">$1</span>');
  }
  return html;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const output = [];
  const headings = [];
  let paragraph = [];
  let list = null;
  let quote = [];
  let inCode = false;
  let codeLanguage = '';
  let code = [];

  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) output.push(`<${list.type}>${list.items.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</${list.type}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) output.push(`<blockquote><p>${inlineMarkdown(quote.join(' '))}</p></blockquote>`);
    quote = [];
  };

  for (const line of lines) {
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      if (!inCode) {
        flushParagraph(); flushList(); flushQuote();
        inCode = true; codeLanguage = fence[1].trim() || 'text'; code = [];
      } else {
        output.push(`<div class="code-block"><div class="code-header"><span>${escapeHtml(codeLanguage)}</span><button class="copy-code" type="button">复制代码</button></div><pre><code>${highlight(code.join('\n'), codeLanguage)}</code></pre></div>`);
        inCode = false;
      }
      continue;
    }
    if (inCode) { code.push(line); continue; }

    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList(); flushQuote();
      const level = heading[1].length;
      const text = heading[2].trim();
      let id = slugify(text);
      if (headings.some(item => item.id === id)) id += `-${headings.length + 1}`;
      headings.push({ level, text, id });
      output.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      continue;
    }
    const ul = line.match(/^[-*]\s+(.+)$/);
    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ul || ol) {
      flushParagraph(); flushQuote();
      const type = ul ? 'ul' : 'ol';
      if (list && list.type !== type) flushList();
      list ||= { type, items: [] };
      list.items.push((ul || ol)[1]);
      continue;
    }
    const quoteLine = line.match(/^>\s?(.*)$/);
    if (quoteLine) {
      flushParagraph(); flushList(); quote.push(quoteLine[1]); continue;
    }
    if (!line.trim()) { flushParagraph(); flushList(); flushQuote(); continue; }
    paragraph.push(line.trim());
  }
  flushParagraph(); flushList(); flushQuote();
  return { html: output.join('\n'), headings };
}

function parsePost(source, filename) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: 缺少 front matter`);
  const meta = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    meta[key] = key === 'tags' ? value.replace(/^\[|\]$/g, '').split(',').map(tag => tag.trim()).filter(Boolean) : value;
  }
  for (const field of ['title', 'date', 'description']) if (!meta[field]) throw new Error(`${filename}: 缺少 ${field}`);
  const { html, headings } = markdownToHtml(match[2]);
  const textLength = match[2].replace(/```[\s\S]*?```/g, '').replace(/[#*`>\[\]()_-]/g, '').length;
  return {
    slug: filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''),
    ...meta,
    tags: meta.tags || [],
    readingTime: Math.max(1, Math.ceil(textLength / 350)),
    html,
    headings
  };
}

async function build() {
  const files = (await readdir(path.join(root, 'posts'))).filter(file => file.endsWith('.md'));
  const posts = await Promise.all(files.map(async file => parsePost(await readFile(path.join(root, 'posts', file), 'utf8'), file)));
  posts.sort((a, b) => b.date.localeCompare(a.date));
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(path.join(root, 'assets'), path.join(outDir, 'assets'), { recursive: true });
  await cp(path.join(root, 'index.html'), path.join(outDir, 'index.html'));
  await writeFile(path.join(outDir, 'posts.json'), JSON.stringify(posts), 'utf8');
  await writeFile(path.join(outDir, '.nojekyll'), '', 'utf8');
  console.log(`✓ 已构建 ${posts.length} 篇文章 → dist/`);
}

await build();

if (process.argv.includes('--watch')) {
  console.log('正在监听内容变化…');
  let timer;
  for (const target of ['posts', 'assets']) {
    watch(path.join(root, target), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => build().catch(console.error), 120);
    });
  }
  watch(path.join(root, 'index.html'), () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch(console.error), 120);
  });
}
