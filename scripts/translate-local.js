// Offline translation only. Never fetch or update GitHub Issues.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import * as cheerio from 'cheerio';
import { localizePostUrls } from './post-routes.js';

const translations = await Promise.all((await readdir('translations/en/posts')).filter(f => f.endsWith('.json')).map(async f => JSON.parse(await readFile(`translations/en/posts/${f}`, 'utf8'))));
const titles = new Map(translations.map(t => [t.slug, t.title]));
const figureManifest = JSON.parse(await readFile('translations/en/figures.json', 'utf8'));
const figurePath = figure => `/assets/en/${figure.id}.${figure.format || 'png'}`;
const figures = new Map(figureManifest.figures.flatMap(f => [
  ...f.sources.map(source => [`/assets/${source}`, f]),
  [figurePath(f), f],
]));
const localizeImage = src => {
  const local = (src || '').replace(/^https:\/\/xhae123\.github\.io(?=\/)/, '').split('?')[0];
  const figure = figures.get(local);
  return figure ? `${src.startsWith('https://') ? 'https://xhae123.github.io' : ''}${figurePath(figure)}` : src;
};
for (const translation of translations) {
  const file = `posts/${translation.slug}/index.html`;
  const $ = cheerio.load(await readFile(file, 'utf8'));
  const body = $('.post-body');
  const original = { blocks: body.children().length, images: body.find('img').toArray().map(e => localizeImage($(e).attr('src'))), headings: body.find('h2,h3,h4').toArray().map(e => $(e).attr('id')), code: body.find('pre').length };
  for (const [index, html] of Object.entries(translation.blocks)) {
    const block = body.children().eq(Number(index));
    if (!block.length) throw new Error(`${file}: missing block ${index}`);
    block.html(html);
  }
  const replacements = Object.entries(translation.replacements || {}).sort((a,b) => b[0].length - a[0].length);
  const translateNodes = node => {
    if (node.type === 'text') for (const [from, to] of replacements) node.data = node.data.replaceAll(from, to);
    for (const child of node.children || []) translateNodes(child);
  };
  translateNodes(body[0]);
  body.find('img').each((_, el) => {
    const src = $(el).attr('src');
    const figure = figures.get((src || '').split('?')[0]);
    if (figure) $(el).attr({ src: localizeImage(src), alt: figure.alt });
  });
  const remaining = body.text().replace(/\[?9정\d{2}-\d{2}\]?/g, '');
  if (/[가-힣]/.test(remaining)) throw new Error(`${file}: untranslated text: ${remaining.match(/[^\n]*[가-힣][^\n]*/g)?.join('\n')}`);
  const current = { blocks: body.children().length, images: body.find('img').toArray().map(e => $(e).attr('src')), headings: body.find('h2,h3,h4').toArray().map(e => $(e).attr('id')), code: body.find('pre').length };
  if (JSON.stringify(original) !== JSON.stringify(current)) throw new Error(`${file}: translation changed block, image, heading, or code structure`);
  $('html').attr('lang', 'en');
  $('title').text(`woojin kim · ${translation.title}`);
  $('.post-title').text(translation.title);
  $('meta[property="og:title"],meta[name="twitter:title"]').attr('content', translation.title);
  $('meta[property="og:locale"]').attr('content', 'en_US');
  $('meta[name="author"],meta[property="article:author"]').attr('content', 'Woojin Kim');
  $('meta[property="og:image"],meta[name="twitter:image"]').each((_, el) => $(el).attr('content', localizeImage($(el).attr('content'))));
  const excerpt = body.find('p').filter((_, el) => $(el).text().trim()).first().text().replace(/\s+/g, ' ').trim();
  const description = excerpt.length > 320 ? `${excerpt.slice(0, 317).replace(/\s+\S*$/, '')}…` : excerpt;
  $('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').attr('content', description);
  $('script[type="application/ld+json"]').each((_, el) => {
    const data = JSON.parse($(el).text());
    data.headline = translation.title;
    data.description = description;
    if (data.author) data.author.name = 'Woojin Kim';
    if (typeof data.image === 'string') data.image = localizeImage(data.image);
    $(el).text(JSON.stringify(data).replaceAll('<', '\\u003c'));
  });
  $('.toc-title').text('contents');
  $('.toc').attr('aria-label', 'Table of contents');
  $('.toc a').each((_, el) => {
    const target = $(el).attr('data-target') || decodeURIComponent(($(el).attr('href') || '').slice(1));
    const heading = body.find('[id]').filter((_, h) => $(h).attr('id') === target);
    if (heading.length) $(el).text(heading.text());
  });
  $('.post-top-back').text('← all posts');
  $('.post-back a').text('← back to posts');
  $('.post-nav').attr('aria-label', 'Previous and next posts');
  $('.post-nav-label').each((_, el) => $(el).text(/이전|previous/i.test($(el).text()) ? 'previous post' : 'next post'));
  $('.post-nav a').each((_, el) => {
    const slug = decodeURIComponent(($(el).attr('href') || '').split('/').filter(Boolean).at(-1) || '');
    if (titles.has(slug)) $(el).find('.post-nav-title').text(titles.get(slug));
  });
  $('img[alt]').each((_, el) => { if (/[가-힣]/.test($(el).attr('alt'))) $(el).attr('alt', `Illustration: ${translation.title}`); });
  await writeFile(file, localizePostUrls($.html()));
  console.log(`Translated: ${translation.title}`);
}
console.log(`${translations.length} articles translated locally. GitHub Issues unchanged.`);
