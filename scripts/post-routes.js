import { readFileSync } from 'node:fs';

export const postRoutes = JSON.parse(readFileSync(new URL('../translations/en/routes.json', import.meta.url), 'utf8'));
export const englishPostSlug = slug => postRoutes[slug] || slug;

// Covers both human-readable URLs and percent-encoded links, including absolute URLs.
export function localizePostUrls(html) {
  html = html.replace(/^[ \t]+$/gm, '');
  for (const [legacy, slug] of Object.entries(postRoutes)) {
    for (const source of [legacy, encodeURIComponent(legacy)]) {
      html = html.replaceAll(`/posts/${source}/`, `/posts/${slug}/`);
    }
  }
  return html.replaceAll('gray-2', 'rose-1')
    .replace(/\/(styles|blog)\.css\?v=[^"'\s<>]+/g, '/$1.css?v=lowercase-2')
    .replace(/href="\/favicon\.svg(?:\?[^"<>]*)?"/g, 'href="/favicon.svg?v=woojin-w-2"')
    .replace(/<title>([^<]*)<\/title>/g, (_, current) => {
      let title = current.replace(/ · Woojin Kim$/, '').replace(/^woojin kim · /, '');
      if (['Software Engineer', 'Writing', 'About', 'Post moved'].includes(title)) title = title.toLowerCase();
      return `<title>woojin kim · ${title}</title>`;
    });
}

export function legacyRedirect(slug) {
  const target = `/posts/${slug}/`;
  return localizePostUrls(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><meta name="post-redirect" content="${target}"><link rel="canonical" href="https://xhae123.github.io${target}"><meta http-equiv="refresh" content="0;url=${target}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>Post moved · Woojin Kim</title></head><body><p>This post has moved. <a href="${target}">Continue to the article</a>.</p><script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script></body></html>`);
}
