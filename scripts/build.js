import { writeFile, mkdir, rm, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import hljs from 'highlight.js';
import { marked } from 'marked';
import { writeArchive, primaryNavigation } from './archive.js';
import { legacyRedirect, localizePostUrls, postRoutes } from './post-routes.js';
import { requireSemanticArticle, requireSharedEmphasis, requireSharedArticleFrame } from './article-presentation.js';
import { applyArticleSections } from './article-sections.js';

// Source of truth: Markdown files in content/posts/. The file name is the URL slug;
// front matter carries title, date, category, and an optional updated date.
// Files in content/drafts/ are never published.
const POSTS_DIR = 'content/posts';
const DRAFTS_DIR = 'content/drafts';

const SITE_URL = 'https://xhae123.github.io';
const SITE_NAME = "xhae123's notes";
const SITE_DESC = '개발하면서 배운 것과 생각한 것을 기록합니다.';
const AUTHOR = 'Woojin Kim';
const GOOGLE_SITE_VERIFICATION = 'sNrpo16A0vUj7vHmVNEmAGZj85cGykaOeHO44krbqDU';

// Cache-busting versions for local static assets. Set in main() from file hashes
// so a CSS/JS change can never be served stale alongside freshly-built HTML.
let STYLES_VER = '';
let APP_VER = '';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Home categories: derived from an issue's GitHub labels (first match wins).
// Icons are 16px, 1.4px stroke, currentColor — lifted verbatim from the approved
// mockup (mockups/icons.js) so the home page renders the same marks server-side.
const CATS = ['AI', 'Backend', 'Infra', 'Product', 'Thoughts'];
const CAT_ICONS = {
  AI: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4.6" y="4.6" width="6.8" height="6.8" rx="1.6"/>
    <path d="M6.2 4.6V2.6M9.8 4.6V2.6M6.2 13.4v-2M9.8 13.4v-2M4.6 6.2h-2M4.6 9.8h-2M13.4 6.2h-2M13.4 9.8h-2"/>
  </svg>`,
  Backend: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
    <ellipse cx="8" cy="3.9" rx="5.2" ry="2.1"/>
    <path d="M2.8 3.9v8.2c0 1.16 2.33 2.1 5.2 2.1s5.2-.94 5.2-2.1V3.9"/>
    <path d="M2.8 8c0 1.16 2.33 2.1 5.2 2.1S13.2 9.16 13.2 8"/>
  </svg>`,
  Infra: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2.6" y="2.8" width="10.8" height="4.2" rx="1.3"/>
    <rect x="2.6" y="9" width="10.8" height="4.2" rx="1.3"/>
    <path d="M5 4.9h.01M5 11.1h.01" stroke-width="1.8"/>
    <path d="M8.2 4.9H11M8.2 11.1H11" opacity=".55"/>
  </svg>`,
  Product: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M8 1.9 13.4 5v6L8 14.1 2.6 11V5L8 1.9Z"/>
    <path d="M2.6 5 8 8.1 13.4 5M8 8.1v6"/>
  </svg>`,
  Thoughts: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M13.4 7.9c0 2.6-2.4 4.7-5.4 4.7-.55 0-1.08-.07-1.58-.2L3.2 13.5l.75-2.4C3.16 10.3 2.6 9.15 2.6 7.9c0-2.6 2.4-4.7 5.4-4.7s5.4 2.1 5.4 4.7Z"/>
  </svg>`,
};

marked.setOptions({ gfm: true, breaks: true });

// Minimal front matter: `key: value` lines between two `---` fences. Values are
// taken verbatim after the first colon, so titles may contain colons and quotes.
function parseFrontMatter(source, file) {
  const m = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i === -1) throw new Error(`${file}: invalid front matter line: ${line}`);
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: source.slice(m[0].length).trim() };
}

// Images pasted as GitHub attachment URLs live on GitHub's CDN, not in this repo.
// Localize only those hosts into /assets/ (author-linked external images are left alone).
// Filename = sha1(url) so it's stable across builds → download once, reuse forever.
const ATTACHMENT_RE =
  /https:\/\/(?:private-)?user-images\.githubusercontent\.com\/[^\s"')]+|https:\/\/github\.com\/user-attachments\/assets\/[^\s"')]+/g;
const EXT_BY_TYPE = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

let assetIndex = null; // sha1-prefix -> existing filename in assets/
async function loadAssetIndex() {
  if (assetIndex) return assetIndex;
  assetIndex = new Map();
  try {
    for (const f of await readdir('assets')) {
      const dot = f.indexOf('.');
      assetIndex.set(dot === -1 ? f : f.slice(0, dot), f);
    }
  } catch {}
  return assetIndex;
}

async function localizeImages(html) {
  const urls = [...new Set(html.match(ATTACHMENT_RE) || [])];
  if (urls.length === 0) return html;
  const idx = await loadAssetIndex();
  await mkdir('assets', { recursive: true });
  let out = html;
  for (const url of urls) {
    const hash = createHash('sha1').update(url).digest('hex').slice(0, 16);
    let fname = idx.get(hash);
    if (!fname) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'blog-builder' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const type = (res.headers.get('content-type') || '').split(';')[0].trim();
        fname = `${hash}.${EXT_BY_TYPE[type] || 'png'}`;
        await writeFile(path.join('assets', fname), Buffer.from(await res.arrayBuffer()));
        idx.set(hash, fname);
        console.log(`  localized ${url.slice(0, 64)} -> assets/${fname}`);
      } catch (e) {
        console.warn(`  WARN could not localize ${url}: ${e.message}`);
        continue; // leave the original URL so the build never breaks
      }
    }
    out = out.split(url).join(`/assets/${fname}`);
  }
  return out;
}

// Every post gets a cover: its own first image if it has one, otherwise a
// generated Toss-style SVG picked deterministically from slug (stable across
// builds). Placeholder covers are shown as a hero at the top of the post.
const COVER_COUNT = 50;
function normalizeSrc(src) {
  return src.startsWith(SITE_URL) ? src.slice(SITE_URL.length) || '/' : src;
}
function pickCover(slug) {
  const n = parseInt(createHash('sha1').update(slug).digest('hex').slice(0, 8), 16) % COVER_COUNT;
  return `/assets/covers/cover-${String(n + 1).padStart(2, '0')}.svg`;
}
function coverFor(slug, html) {
  const img = firstImage(html);
  return img ? { src: normalizeSrc(img), placeholder: false } : { src: pickCover(slug), placeholder: true };
}

// Basename without extension — matches loadAssetIndex()'s key convention.
function assetKey(name) {
  const b = name.split('/').pop();
  const d = b.indexOf('.');
  return d === -1 ? b : b.slice(0, d);
}

// Which assets does this source reference? Used for GC. Covers both
// /assets/<name> links and attachment URLs (keyed by their sha1 name).
function collectAssetRefs(body, set) {
  const re = new RegExp(`(?:${SITE_URL})?/assets/([^\\s"')]+)`, 'g');
  let m;
  while ((m = re.exec(body))) set.add(assetKey(m[1]));
  for (const url of body.match(ATTACHMENT_RE) || []) {
    set.add(createHash('sha1').update(url).digest('hex').slice(0, 16));
  }
}

async function loadPosts() {
  const items = [];
  const referenced = new Set(); // asset keys referenced by any post or draft
  for (const file of (await readdir(DRAFTS_DIR).catch(() => [])).filter((f) => f.endsWith('.md'))) {
    // Drafts are not published, but their images are protected from GC.
    collectAssetRefs(await readFile(path.join(DRAFTS_DIR, file), 'utf8'), referenced);
  }
  for (const file of (await readdir(POSTS_DIR)).filter((f) => f.endsWith('.md')).sort()) {
    const slug = file.slice(0, -3);
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`${file}: the file name must be a lowercase URL slug`);
    const { meta, body } = parseFrontMatter(await readFile(path.join(POSTS_DIR, file), 'utf8'), file);
    if (!meta.title) throw new Error(`${file}: missing title`);
    if (!meta.date || isNaN(Date.parse(meta.date))) throw new Error(`${file}: missing or invalid date`);
    if (meta.updated && isNaN(Date.parse(meta.updated))) throw new Error(`${file}: invalid updated date`);
    if (meta.category && !CATS.includes(meta.category)) throw new Error(`${file}: unknown category ${meta.category}`);
    collectAssetRefs(body, referenced);
    const html = await applyArticleSections(await localizeImages(marked.parse(body)), slug);
    collectAssetRefs(html, referenced);
    requireSemanticArticle(html, file);
    items.push({
      title: meta.title,
      slug,
      date: meta.date,
      modifiedDate: meta.updated || meta.date,
      html,
      cover: coverFor(slug, html),
      category: meta.category || null,
    });
  }
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  return { items, referenced };
}

// Delete asset files no post or draft references anymore. Skips pruning if the
// referenced set is empty — a safety net against wiping /assets/ on a bad build.
async function pruneAssets(referenced) {
  if (referenced.size === 0) return;
  let entries;
  try {
    entries = await readdir('assets', { withFileTypes: true });
  } catch {
    return;
  }
  let removed = 0;
  for (const d of entries) {
    if (!d.isFile()) continue; // skip subdirs like assets/covers/
    if (!referenced.has(assetKey(d.name))) {
      await rm(path.join('assets', d.name));
      console.log(`  pruned orphan asset: assets/${d.name}`);
      removed++;
    }
  }
  if (removed) console.log(`Pruned ${removed} orphan asset(s).`);
}

async function main() {
  requireSharedEmphasis(await readFile('blog.css', 'utf8'));
  const ver = async (f) => createHash('sha1').update(await readFile(f)).digest('hex').slice(0, 8);
  STYLES_VER = await ver('styles.css');
  APP_VER = await ver('app.js');

  const { items, referenced } = await loadPosts();
  console.log(`Found ${items.length} posts in ${POSTS_DIR}`);
  if (items.length === 0) {
    throw new Error('0 posts — aborting to prevent wiping content');
  }

  await rm('posts', { recursive: true, force: true });
  await mkdir('posts', { recursive: true });

  for (const item of items) {
    const dir = path.join('posts', item.slug);
    await mkdir(dir, { recursive: true });
    const page = localizePostUrls(renderPost(item, items));
    requireSharedArticleFrame(page, item.slug);
    await writeFile(path.join(dir, 'index.html'), page);
    console.log(`  wrote posts/${item.slug}/index.html`);
  }

  for (const [legacy, slug] of Object.entries(postRoutes)) {
    if (!items.some(item => item.slug === slug)) continue;
    const dir = path.join('posts', legacy);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), legacyRedirect(slug));
  }

  await writeArchive(items.map(item => ({ ...item, excerpt: firstParagraph(item.html) })));
  await writeFile('sitemap.xml', renderSitemap(items));
  await writeFile('robots.txt', renderRobots());
  await pruneAssets(referenced);
  console.log('Done.');
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

// Home feed date format: "2026. 7. 20." (no zero-padding on month/day).
function formatDateKr(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function firstImage(html) {
  if (!html) return null;
  const $ = cheerio.load(html);
  return $('img').first().attr('src') || null;
}

function firstParagraph(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  // A line break separates sentences; keep that boundary as a space.
  $('br').replaceWith(' ');
  const clean = (value) => value.replace(/\s+/g, ' ').trim();
  let text = '';
  $('p').each((_, el) => {
    if (text) return;
    const t = clean($(el).text());
    if (t.length >= 20) text = t;
  });
  if (!text) text = clean($.root().text()).slice(0, 200);
  return text;
}

function slugifyHeading(text) {
  return (
    String(text)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}\-]/gu, '')
      .slice(0, 60) || 'section'
  );
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function processContent(html) {
  const $ = cheerio.load(html, { decodeEntities: false });

  // IDs + TOC
  const used = new Set();
  const tocItems = [];
  $('h1, h2, h3').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const base = $el.attr('id') || slugifyHeading(text);
    let id = base;
    let i = 2;
    while (used.has(id)) id = `${base}-${i++}`;
    used.add(id);
    $el.attr('id', id);
    tocItems.push({ id, text, level: el.tagName.toLowerCase() });
  });

  // Highlight code blocks
  $('pre code').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    const m = cls.match(/language-([\w-]+)/i);
    const lang = m ? m[1].toLowerCase() : null;
    const code = $el.text();
    try {
      const result =
        lang && hljs.getLanguage(lang)
          ? hljs.highlight(code, { language: lang, ignoreIllegals: true })
          : hljs.highlightAuto(code);
      $el.html(result.value);
      $el.addClass('hljs');
      // Label a block only with the language its author declared. A guessed
      // language still colors the code but is never shown as its name.
      if (lang) $el.parent('pre').attr('data-lang', lang);
    } catch {
      // leave as-is
    }
  });

  // Our own absolute image URLs → relative, so they resolve locally and when deployed.
  $('img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || '';
    if (src.startsWith(SITE_URL)) $el.attr('src', src.slice(SITE_URL.length) || '/');
    $el.attr('loading', 'lazy');
  });

  // Links: our own absolute URLs → relative (same tab); other external → new tab.
  $('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (href.startsWith(SITE_URL)) {
      $el.attr('href', href.slice(SITE_URL.length) || '/');
      $el.removeAttr('target');
    } else if (/^https?:/.test(href)) {
      $el.attr('target', '_blank');
      $el.attr('rel', 'noopener noreferrer');
    }
  });

  return { body: $.html(), tocItems };
}

function head({ title, description, canonical, ogImage, ogType, extraHead = '' }) {
  return `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}" />
  <title>woojin kim · ${esc(title.replace(/ · Woojin Kim$/, ''))}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="${esc(SITE_NAME)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:locale" content="ko_KR" />${
    ogImage ? `\n  <meta property="og:image" content="${esc(ogImage)}" />` : ''
  }
  <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />${
    ogImage ? `\n  <meta name="twitter:image" content="${esc(ogImage)}" />` : ''
  }
  <link rel="preconnect" href="https://cdn.jsdelivr.net" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" />
  <link rel="stylesheet" href="/styles.css?v=gray-2-${STYLES_VER}" />
  <link rel="stylesheet" href="/navigation.css?v=gray-2" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=woojin-w-2" />${extraHead}`;
}

function siteHeader() {
  return `  <header class="site-header" id="site-header">
    <div class="container">
      <a class="site-label" href="/">Woojin Kim</a>
      ${primaryNavigation('writing')}
    </div>
  </header>`;
}

function renderIndex(items) {
  const total = items.length;
  const counts = Object.fromEntries(CATS.map((c) => [c, items.filter((i) => i.category === c).length]));

  const catButtons = [
    `        <button class="is-on" data-cat="*">All<span class="n">${total}</span></button>`,
    ...CATS.map(
      (c) =>
        `        <button data-cat="${esc(c)}"><span class="ic">${CAT_ICONS[c]}</span>${esc(c)}<span class="n">${counts[c]}</span></button>`
    ),
  ].join('\n');

  const feedItems = items
    .map((item, i) => {
      const slug = item.slug;
      const title = item.title || '';
      const date = formatDateKr(item.date);
      const lead = firstParagraph(item.html);
      const cat = item.category;
      const metaCat = cat
        ? `<span class="sep">·</span><span class="ic">${CAT_ICONS[cat]}</span>${esc(cat)}`
        : '';
      return `      <a class="item" data-cat="${esc(cat || '')}" style="--i:${i}" href="/posts/${encodeURIComponent(slug)}/">
        <div class="i-main">
          <h2 class="i-title">${esc(title)}</h2>
          ${lead ? `<p class="i-lead">${esc(lead)}</p>` : ''}
          <p class="i-meta">${esc(date)}${metaCat}</p>
        </div>
        <div class="i-thumb"><img src="${esc(item.cover.src)}" alt="" loading="lazy" /></div>
      </a>`;
    })
    .join('\n');

  const canonical = `${SITE_URL}/`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: canonical,
    description: SITE_DESC,
    author: { '@type': 'Person', name: AUTHOR },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
${head({
  title: SITE_NAME,
  description: SITE_DESC,
  canonical,
  ogImage: null,
  ogType: 'website',
  extraHead: `\n  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
})}
</head>
<body>
  <div class="wrap">
    <aside class="rail">
      <a class="rail-name" href="/">${esc(SITE_NAME)}</a>
      <div class="rail-links">
        <a href="https://github.com/xhae123" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
          xhae123
        </a>
        <a href="mailto:xhae000@gmail.com">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1.5" y="3" width="13" height="10" rx="1.6"/><path d="M2 4.2l6 4.3 6-4.3"/></svg>
          xhae000@gmail.com
        </a>
      </div>
      <nav class="rail-cats" id="rail-cats">
${catButtons}
      </nav>
    </aside>
    <main class="feed">
      <section id="feed-list">
${feedItems}
      </section>
      <p class="feed-empty" id="feed-empty" hidden>No posts in this category yet.</p>
    </main>
  </div>
  <script src="/app.js?v=${APP_VER}"></script>
</body>
</html>
`;
}

function renderPost(item, items) {
  const slug = item.slug;
  const idx = items.findIndex((i) => i.slug === slug);
  const newer = idx > 0 ? items[idx - 1] : null;
  const older = idx < items.length - 1 ? items[idx + 1] : null;

  const title = item.title || '';
  const date = item.date.slice(0, 10).replaceAll('-', '.');
  const raw = item.html || '';
  const { body, tocItems } = processContent(raw);
  const excerpt = firstParagraph(raw).slice(0, 160);
  const ogImage = item.cover.src.startsWith('/') ? `${SITE_URL}${item.cover.src}` : item.cover.src;
  const canonical = `${SITE_URL}/posts/${encodeURIComponent(slug)}/`;
  const pubISO = new Date(item.date).toISOString();
  const modifiedISO = new Date(Math.max(Date.parse(item.date), Date.parse(item.modifiedDate || item.date))).toISOString();

  const tocHtml =
    tocItems.length >= 2
      ? `
      <p class="toc-title">목차</p>
      <ul class="toc-list">
${tocItems
  .map(
    (t) =>
      `        <li class="toc-item toc-item--${t.level}"><a href="#${t.id}" data-target="${t.id}">${esc(t.text)}</a></li>`
  )
  .join('\n')}
      </ul>`
      : '';

  const prevNextHtml =
    newer || older
      ? `
    <nav class="post-nav" aria-label="이전/다음 글">
      ${
        older
          ? `<a class="post-nav-item post-nav-item--prev" href="/posts/${encodeURIComponent(older.slug)}/">
        <span class="post-nav-label">이전 글</span>
        <span class="post-nav-title">${esc(older.title)}</span>
      </a>`
          : '<span></span>'
      }
      ${
        newer
          ? `<a class="post-nav-item post-nav-item--next" href="/posts/${encodeURIComponent(newer.slug)}/">
        <span class="post-nav-label">다음 글</span>
        <span class="post-nav-title">${esc(newer.title)}</span>
      </a>`
          : '<span></span>'
      }
    </nav>`
      : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: excerpt,
    datePublished: pubISO,
    dateModified: modifiedISO,
    author: { '@type': 'Person', name: AUTHOR },
    url: canonical,
    mainEntityOfPage: canonical,
    ...(ogImage ? { image: ogImage } : {}),
  };

  return `<!DOCTYPE html>
<html lang="ko">
<head>
${head({
  title: `${title} · ${SITE_NAME}`,
  description: excerpt,
  canonical,
  ogImage,
  ogType: 'article',
  extraHead: `
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" />
  <link rel="stylesheet" href="/blog.css?v=gray-2" />
  <meta property="article:published_time" content="${pubISO}" />
  <meta property="article:modified_time" content="${modifiedISO}" />
  ${item.category ? `<meta property="article:section" content="${esc(item.category)}" />` : ''}
  <meta property="article:author" content="${esc(AUTHOR)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
})}
</head>
<body>
  <main class="post-layout">
    <div class="post-main">
      <article class="post" id="post">${
        item.cover.placeholder
          ? `\n        <div class="post-cover"><img src="${esc(item.cover.src)}" alt="" /></div>`
          : ''
      }
        <header class="post-header">
          <a class="post-top-back" href="/">← 글 목록</a>
          <p class="post-meta"><time datetime="${pubISO.slice(0, 10)}">${esc(date)}</time>${item.category ? `<span aria-hidden="true"> · </span><span class="post-category">${esc(item.category.toLowerCase())}</span>` : ''}</p>
          <h1 class="post-title">${esc(title)}</h1>
        </header>
        <div class="post-body" id="post-body">
${body}
        </div>
      </article>${prevNextHtml}
      <nav class="post-back">
        <a href="/">← 글 목록으로</a>
      </nav>
    </div>
    <aside class="toc" id="toc" aria-label="목차">${tocHtml}
    </aside>
  </main>
  <script src="/app.js?v=${APP_VER}"></script>
</body>
</html>
`;
}

function renderSitemap(items) {
  const entries = [
    {
      loc: `${SITE_URL}/`,
    },
    ...items.map((item) => ({
      loc: `${SITE_URL}/posts/${encodeURIComponent(item.slug)}/`,
      lastmod: new Date(Math.max(Date.parse(item.date), Date.parse(item.modifiedDate || item.date))).toISOString().split('T')[0],
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
}

function renderRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
