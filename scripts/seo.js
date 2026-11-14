import { existsSync } from 'node:fs';
import path from 'node:path';

export const siteUrl = 'https://xhae123.github.io';
const siteId = `${siteUrl}/#website`;
const personId = `${siteUrl}/#person`;
const preview = `${siteUrl}/assets/seo/site-preview.png`;
const person = {
  '@type': 'Person', '@id': personId, name: 'Woojin Kim',
  alternateName: ['김우진', 'xhae123'], url: `${siteUrl}/`,
  sameAs: ['https://github.com/xhae123'], jobTitle: 'Software Engineer',
};

const pages = {
  '/': { title: '블로그', description: '개발하면서 배운 것과 생각한 것을 기록합니다.' },
};

function setMeta($, attr, key, value) {
  $(`meta[${attr}="${key}"]`).remove();
  const element = $('<meta>');
  element.attr(attr, key).attr('content', value);
  $.root().append(element);
}

export function improveSearchMetadata($, canonical) {
  const route = new URL(canonical).pathname;
  const article = route.startsWith('/posts/');
  let existing;
  const structured = $('script[type="application/ld+json"]').first().text();
  if (structured) existing = JSON.parse(structured);
  const originalTitle = $('title').text().replace(/^woojin kim · /, '').replace(/ · xhae123's notes$/, '');
  const title = article ? (existing?.headline || originalTitle) : (pages[route]?.title || originalTitle);
  // Articles keep the description the build derived from their opening paragraph.
  const description = article
    ? $('meta[name="description"]').attr('content')
    : pages[route]?.description || $('meta[name="description"]').attr('content');
  $('title').text(`woojin kim · ${title}`);
  setMeta($, 'name', 'description', description);
  setMeta($, 'name', 'author', 'Woojin Kim');
  setMeta($, 'name', 'robots', 'index, follow, max-image-preview:large');
  setMeta($, 'property', 'og:site_name', 'Woojin Kim');
  setMeta($, 'property', 'og:title', article ? title : `Woojin Kim · ${title}`);
  setMeta($, 'property', 'og:description', description);
  setMeta($, 'property', 'og:type', article ? 'article' : 'website');
  setMeta($, 'property', 'og:locale', 'ko_KR');
  setMeta($, 'property', 'og:url', canonical);
  let image = article ? $('meta[property="og:image"]').attr('content') || preview : preview;
  // Social cards require a raster image. Use an existing PNG sibling when an
  // article's first figure is SVG; otherwise use the site card.
  if (/\.svg(?:\?|$)/i.test(image)) {
    const sibling = new URL(image).pathname.replace(/\.svg$/i, '.png');
    image = existsSync(path.join(process.cwd(), sibling.slice(1))) ? `${siteUrl}${sibling}` : preview;
  }
  setMeta($, 'property', 'og:image', image);
  setMeta($, 'property', 'og:image:alt', article && image !== preview ? `${title} 본문 그림` : 'Woojin Kim — software engineer. Backend systems, infrastructure, and AI developer tools.');
  if (image === preview) {
    setMeta($, 'property', 'og:image:width', '1200');
    setMeta($, 'property', 'og:image:height', '630');
  }
  setMeta($, 'name', 'twitter:card', 'summary_large_image');
  setMeta($, 'name', 'twitter:title', article ? title : `Woojin Kim · ${title}`);
  setMeta($, 'name', 'twitter:description', description);
  setMeta($, 'name', 'twitter:image', image);

  let data;
  if (article && existing) {
    data = { ...existing, description, image, inLanguage: 'ko',
      author: person, isPartOf: { '@id': siteId },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical } };
  } else {
    data = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', '@id': siteId, url: `${siteUrl}/`, name: 'Woojin Kim',
        alternateName: ['woojin kim', 'xhae123'], inLanguage: 'ko', publisher: { '@id': personId } },
      person,
      { '@type': route === '/' ? 'CollectionPage' : 'WebPage',
        '@id': canonical, url: canonical, name: `Woojin Kim · ${title}`, description, inLanguage: 'ko',
        isPartOf: { '@id': siteId },
        about: { '@id': personId } },
    ] };
  }
  $('script[type="application/ld+json"]').remove();
  $.root().append(`<script type="application/ld+json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`);
}
