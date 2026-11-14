import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { finalizeDocumentHead } from './page-head.js';

// Version the actual shared stylesheet so a style correction replaces cached CSS.
const stylesheetVersions = Object.fromEntries(['styles', 'blog'].map(name => [
  name, `shared-${createHash('sha1').update(readFileSync(new URL(`../${name}.css`, import.meta.url))).digest('hex').slice(0, 8)}`,
]));

export const postRoutes = JSON.parse(readFileSync(new URL('../content/legacy-routes.json', import.meta.url), 'utf8'));
// Posts first lived at URLs derived from their Korean titles; those paths now redirect.
export const englishPostSlug = slug => postRoutes[slug] || slug;

// Covers both human-readable URLs and percent-encoded links, including absolute URLs.
export function localizePostUrls(html) {
  html = html.replace(/^[ \t]+$/gm, '');
  for (const [legacy, slug] of Object.entries(postRoutes)) {
    for (const source of [legacy, encodeURIComponent(legacy)]) {
      html = html.replaceAll(`/posts/${source}/`, `/posts/${slug}/`);
    }
  }
  return finalizeDocumentHead(html.replaceAll('gray-2', 'rose-1')
    .replace(/\/(styles|blog)\.css\?v=[^"'\s<>]+/g, (_, name) => `/${name}.css?v=${stylesheetVersions[name]}`)
    .replace(/href="\/favicon\.svg(?:\?[^"<>]*)?"/g, 'href="/favicon.svg?v=woojin-w-2"')
    .replace(/<title>([^<]*)<\/title>/g, (_, current) => {
      let title = current.replace(/ · Woojin Kim$/, '').replace(/^woojin kim · /, '');
      if (title === 'Writing') title = title.toLowerCase();
      return `<title>woojin kim · ${title}</title>`;
    }));
}

export function legacyRedirect(slug) {
  const target = `/posts/${slug}/`;
  return localizePostUrls(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><meta name="post-redirect" content="${target}"><link rel="canonical" href="https://xhae123.github.io${target}"><meta http-equiv="refresh" content="0;url=${target}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>글 주소가 바뀌었어요 · Woojin Kim</title></head><body><p>글 주소가 바뀌었어요. <a href="${target}">바뀐 주소로 이동하기</a></p><script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script></body></html>`);
}
