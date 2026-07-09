import { writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import hljs from 'highlight.js';
import { marked } from 'marked';

// Source of truth: closed GitHub Issues authored by the repo owner (minus `excluded` label).
// Issue body = markdown. Publish = close the issue. Unpublish = reopen or add `excluded`.
const OWNER = 'xhae123';
const REPO = 'xhae123.github.io';
const TOKEN = process.env.GITHUB_TOKEN || '';

const SITE_URL = 'https://xhae123.github.io';
const SITE_NAME = "xhae123's notes";
const SITE_DESC = '개발하면서 배운 것과 생각한 것을 기록합니다.';
const AUTHOR = '김우진';
const GOOGLE_SITE_VERIFICATION = 'sNrpo16A0vUj7vHmVNEmAGZj85cGykaOeHO44krbqDU';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

marked.setOptions({ gfm: true, breaks: true });

// Metadata is smuggled in an HTML comment so it stays invisible in GitHub's issue
// view and in Velog if cross-posted. Only `date` is used (to preserve original
// publish dates on migration); new posts fall back to the issue's creation time.
function parseDate(body) {
  const m = body.match(/<!--\s*date:\s*([^>]+?)\s*-->/i);
  if (!m) return null;
  const v = m[1].trim();
  // Unparseable (e.g. the template's untouched YYYY-MM-DD placeholder) → fall
  // back to the issue's creation date instead of rendering an Invalid Date.
  return isNaN(new Date(v).getTime()) ? null : v;
}
function stripMeta(body) {
  return body.replace(/<!--\s*date:[^>]*-->/i, '').trim();
}

// Title → URL slug. Keep letters/numbers (incl. Korean), drop punctuation,
// spaces → hyphens. Preserves the existing URL style (no lowercasing).
function slugify(title) {
  return (
    String(title)
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'post'
  );
}

// Images dragged into a GitHub issue land on GitHub's attachment CDN, not our repo.
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

// Basename without extension — matches loadAssetIndex()'s key convention.
function assetKey(name) {
  const b = name.split('/').pop();
  const d = b.indexOf('.');
  return d === -1 ? b : b.slice(0, d);
}

// Which assets does this issue body reference? Used for GC. Covers both
// migrated /assets/<uuid> links and attachment URLs (keyed by their sha1 name).
function collectAssetRefs(body, set) {
  const re = new RegExp(`(?:${SITE_URL})?/assets/([^\\s"')]+)`, 'g');
  let m;
  while ((m = re.exec(body))) set.add(assetKey(m[1]));
  for (const url of body.match(ATTACHMENT_RE) || []) {
    set.add(createHash('sha1').update(url).digest('hex').slice(0, 16));
  }
}

async function fetchIssues() {
  const items = [];
  const referenced = new Set(); // asset keys referenced by ANY owner issue (any state)
  const seenSlugs = new Set();
  let page = 1;
  while (true) {
    // state=all so drafts/reopened issues still protect their images from GC.
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'blog-builder',
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    if (batch.length === 0) break;
    for (const iss of batch) {
      if (iss.pull_request) continue; // list endpoint returns PRs too
      if (iss.user?.login !== OWNER) continue; // only the owner's issues count

      const body = iss.body || '';
      collectAssetRefs(body, referenced); // keep images of every owner issue, incl. drafts

      // Publish only closed, non-excluded issues.
      if (iss.state !== 'closed') continue;
      if ((iss.labels || []).some((l) => (l.name || l) === 'excluded')) continue;

      let slug = slugify(iss.title);
      while (seenSlugs.has(slug)) slug = `${slug}-${iss.number}`;
      seenSlugs.add(slug);
      items.push({
        number: iss.number,
        title: iss.title.trim(),
        slug,
        date: parseDate(body) || iss.created_at,
        html: await localizeImages(marked.parse(stripMeta(body))),
      });
    }
    if (batch.length < 100) break;
    page++;
  }
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  return { items, referenced };
}

// Delete asset files no owner issue references anymore (image removed from a body,
// or its issue deleted). Skips pruning if the referenced set is empty — a safety
// net against wiping /assets/ on a bad build.
async function pruneAssets(referenced) {
  if (referenced.size === 0) return;
  let files;
  try {
    files = await readdir('assets');
  } catch {
    return;
  }
  let removed = 0;
  for (const f of files) {
    if (!referenced.has(assetKey(f))) {
      await rm(path.join('assets', f));
      console.log(`  pruned orphan asset: assets/${f}`);
      removed++;
    }
  }
  if (removed) console.log(`Pruned ${removed} orphan asset(s).`);
}

async function main() {
  console.log(`Fetching issues from ${OWNER}/${REPO}...`);
  const { items, referenced } = await fetchIssues();
  console.log(`Found ${items.length} published posts`);
  if (items.length === 0) {
    throw new Error('0 published issues — aborting to prevent wiping content');
  }

  await rm('posts', { recursive: true, force: true });
  await mkdir('posts', { recursive: true });

  for (const item of items) {
    const dir = path.join('posts', item.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), renderPost(item, items));
    console.log(`  wrote posts/${item.slug}/index.html`);
  }

  await writeFile('index.html', renderIndex(items));
  await writeFile('sitemap.xml', renderSitemap(items));
  await writeFile('robots.txt', renderRobots());
  await pruneAssets(referenced);
  console.log('Done.');
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

function firstImage(html) {
  if (!html) return null;
  const $ = cheerio.load(html);
  return $('img').first().attr('src') || null;
}

function firstParagraph(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  let text = '';
  $('p').each((_, el) => {
    if (text) return;
    const t = $(el).text().trim();
    if (t.length >= 20) text = t;
  });
  if (!text) text = $.root().text().trim().slice(0, 200);
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
    const base = slugifyHeading(text);
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
      if (lang) $el.parent('pre').attr('data-lang', lang);
      else if (result.language) $el.parent('pre').attr('data-lang', result.language);
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
  <title>${esc(title)}</title>
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
  <link rel="stylesheet" href="/styles.css" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />${extraHead}`;
}

function siteHeader(active = '') {
  return `  <header class="site-header" id="site-header">
    <div class="container">
      <a class="site-label" href="/">xhae123&#39;s notes</a>
    </div>
  </header>`;
}

function siteFooter() {
  return `  <footer class="site-footer">
    <div class="container">
      <div class="footer-links">
        <a class="footer-row" href="https://github.com/xhae123" target="_blank" rel="noopener noreferrer">
          <span class="footer-label">github</span>
          <span class="footer-value">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            xhae123
          </span>
        </a>
        <a class="footer-row" href="mailto:xhae000@gmail.com">
          <span class="footer-label">contact me</span>
          <span class="footer-value">xhae000@gmail.com</span>
        </a>
      </div>
    </div>
  </footer>`;
}

function renderIndex(items) {
  const entries = items
    .map((item, i) => {
      const slug = item.slug;
      const title = item.title || '';
      const date = formatDate(item.date);
      const lead = firstParagraph(item.html);
      return `      <article class="entry" style="--i:${i}">
        <a class="entry-link" href="/posts/${encodeURIComponent(slug)}/">
          <p class="entry-date">${esc(date)}</p>
          <div class="entry-body">
            <h2 class="entry-title">${esc(title)}</h2>
            <p class="entry-lead">${esc(lead)}</p>
            <span class="entry-more">계속 읽기 →</span>
          </div>
        </a>
      </article>`;
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
<html lang="ko">
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
${siteHeader('home')}
  <main class="container">
    <section class="post-list" id="post-list">
${entries}
    </section>
  </main>
${siteFooter()}
  <script src="/app.js"></script>
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
  const date = formatDate(item.date);
  const raw = item.html || '';
  const { body, tocItems } = processContent(raw);
  const excerpt = firstParagraph(raw).slice(0, 160);
  const ogImage = firstImage(raw);
  const canonical = `${SITE_URL}/posts/${encodeURIComponent(slug)}/`;
  const pubISO = new Date(item.date).toISOString();

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
    dateModified: pubISO,
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
  <meta property="article:published_time" content="${pubISO}" />
  <meta property="article:author" content="${esc(AUTHOR)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
})}
</head>
<body>
${siteHeader()}
  <main class="post-layout">
    <div class="post-main">
      <article class="post" id="post">
        <header class="post-header">
          <p class="post-meta">${esc(date)}</p>
          <h1 class="post-title">${esc(title)}</h1>
        </header>
        <div class="post-body" id="post-body">
${body}
        </div>
      </article>${prevNextHtml}
      <nav class="post-back">
        <a href="/">← 목록으로</a>
      </nav>
    </div>
    <aside class="toc" id="toc" aria-label="목차">${tocHtml}
    </aside>
  </main>
${siteFooter()}
  <script src="/app.js"></script>
</body>
</html>
`;
}

function renderSitemap(items) {
  const entries = [
    {
      loc: `${SITE_URL}/`,
      lastmod: (items[0] ? new Date(items[0].date) : new Date()).toISOString().split('T')[0],
    },
    ...items.map((item) => ({
      loc: `${SITE_URL}/posts/${encodeURIComponent(item.slug)}/`,
      lastmod: new Date(item.date).toISOString().split('T')[0],
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${e.loc}</loc><lastmod>${e.lastmod}</lastmod></url>`).join('\n')}
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
