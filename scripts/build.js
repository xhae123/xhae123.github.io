import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import hljs from 'highlight.js';
import { XMLParser } from 'fast-xml-parser';

const RSS = 'https://v2.velog.io/rss/@xe0';
const SITE_URL = 'https://xhae123.github.io';
const SITE_NAME = "xhae123's notes";
const SITE_DESC = '개발하면서 배운 것과 생각한 것을 기록합니다.';
const AUTHOR = '김우진';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

async function fetchFeed() {
  const res = await fetch(RSS, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'xhae123-notes-builder' },
  });
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: '__cdata',
  });
  const parsed = parser.parse(xml);
  const channelItems = parsed?.rss?.channel?.item || [];
  const arr = Array.isArray(channelItems) ? channelItems : [channelItems];
  return arr.map((it) => ({
    title: unwrap(it.title),
    link: unwrap(it.link),
    pubDate: unwrap(it.pubDate),
    description: unwrap(it.description),
    content: unwrap(it['content:encoded']) || unwrap(it.description),
  }));
}

function unwrap(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    if (v.__cdata) return String(v.__cdata);
    if ('#text' in v) return String(v['#text']);
    return String(v);
  }
  return String(v);
}

async function main() {
  console.log('Fetching velog RSS...');
  const items = await fetchFeed();
  console.log(`Found ${items.length} items`);
  if (items.length === 0) {
    throw new Error('RSS returned 0 items — aborting to prevent wiping content');
  }

  await rm('posts', { recursive: true, force: true });
  await mkdir('posts', { recursive: true });

  for (const item of items) {
    const slug = getSlug(item.link);
    const dir = path.join('posts', slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), renderPost(item, items));
    console.log(`  wrote posts/${slug}/index.html`);
  }

  await writeFile('index.html', renderIndex(items));
  await writeFile('sitemap.xml', renderSitemap(items));
  await writeFile('robots.txt', renderRobots());
  console.log('Done.');
}

function getSlug(link) {
  const url = new URL(link);
  const parts = url.pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || '');
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

  // Links: velog internal → /posts/<slug>/, other external → new tab
  $('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (/^https?:\/\/(www\.)?velog\.io\/@xe0\//.test(href)) {
      try {
        const u = new URL(href);
        const parts = u.pathname.split('/').filter(Boolean);
        const internal = decodeURIComponent(parts[parts.length - 1] || '');
        if (internal) {
          $el.attr('href', `/posts/${encodeURIComponent(internal)}/`);
          $el.removeAttr('target');
        }
      } catch {}
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

function siteHeader() {
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
      const slug = getSlug(item.link);
      const title = item.title || '';
      const date = formatDate(item.pubDate);
      const lead = firstParagraph(item.content || item.description);
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
${siteHeader()}
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
  const slug = getSlug(item.link);
  const idx = items.findIndex((i) => getSlug(i.link) === slug);
  const newer = idx > 0 ? items[idx - 1] : null;
  const older = idx < items.length - 1 ? items[idx + 1] : null;

  const title = item.title || '';
  const date = formatDate(item.pubDate);
  const raw = item.content || item.description || '';
  const { body, tocItems } = processContent(raw);
  const excerpt = firstParagraph(raw).slice(0, 160);
  const ogImage = firstImage(raw);
  const canonical = `${SITE_URL}/posts/${encodeURIComponent(slug)}/`;
  const pubISO = new Date(item.pubDate).toISOString();

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
          ? `<a class="post-nav-item post-nav-item--prev" href="/posts/${encodeURIComponent(getSlug(older.link))}/">
        <span class="post-nav-label">이전 글</span>
        <span class="post-nav-title">${esc(older.title)}</span>
      </a>`
          : '<span></span>'
      }
      ${
        newer
          ? `<a class="post-nav-item post-nav-item--next" href="/posts/${encodeURIComponent(getSlug(newer.link))}/">
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
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" />
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
      lastmod: (items[0] ? new Date(items[0].pubDate) : new Date()).toISOString().split('T')[0],
    },
    ...items.map((item) => ({
      loc: `${SITE_URL}/posts/${encodeURIComponent(getSlug(item.link))}/`,
      lastmod: new Date(item.pubDate).toISOString().split('T')[0],
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
