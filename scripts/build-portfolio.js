// Rebuild the portfolio from existing local posts without fetching or deleting content.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import * as cheerio from 'cheerio';
import { writePortfolio } from './portfolio.js';
import { englishPostSlug, localizePostUrls } from './post-routes.js';

const categories = new Map();
for (const file of ['writing/index.html', 'index.html']) {
  try {
    const $ = cheerio.load(await readFile(file, 'utf8'));
    $('a.item').each((_, el) => {
      const slug = decodeURIComponent($(el).attr('href')).split('/').filter(Boolean).at(-1);
      categories.set(`/posts/${englishPostSlug(slug)}/`, $(el).attr('data-cat'));
    });
  } catch { /* First run has no writing archive yet. */ }
}
const items = [];
for (const dir of await readdir('posts', { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const $ = cheerio.load(await readFile(`posts/${dir.name}/index.html`, 'utf8'));
  if ($('meta[name="post-redirect"]').length) continue;
  const category = categories.get(`/posts/${dir.name}/`) || $('meta[property="article:section"]').attr('content') || '';
  if (category) {
    if (!$('meta[property="article:section"]').length) $('head').append('<meta property="article:section">');
    $('meta[property="article:section"]').attr('content', category);
  }
  const date = $('meta[property="article:published_time"]').attr('content');
  $('.post-meta').empty().append(`<time datetime="${date.slice(0, 10)}">${date.slice(0, 10).replaceAll('-', '.')}</time>`);
  if (category) $('.post-meta').append('<span aria-hidden="true"> · </span>').append($('<span class="post-category"></span>').text(category.toLowerCase()));
  $('.post-top-back').text('← all posts');
  $('.post-back a').text('← back to posts');
  $('.toc-title').text('contents');
  $('.post-nav-label').each((_, el) => $(el).text($(el).text().toLowerCase()));
  await writeFile(`posts/${dir.name}/index.html`, localizePostUrls($.html()));
  const image = $('meta[property="og:image"]').attr('content') || $('.post-content img, .post-cover img').first().attr('src');
  const cover = image ? { src: image.replace(/^https:\/\/xhae123\.github\.io(?=\/)/, '') } : undefined;
  items.push({ slug: dir.name, title: $('h1.post-title').text(), date, excerpt: $('meta[name="description"]').attr('content'), category, cover });
}
items.sort((a,b) => b.date.localeCompare(a.date));
await writePortfolio(items);
const routes = [{ route: '/', date: items[0]?.date.slice(0, 10) }, ...['writing/', 'about/', 'work/afinit/', 'work/raspy/', 'work/adelante/'].map(route => ({ route: `/${route}` })), ...items.map(item => ({ route: `/posts/${item.slug}/`, date: item.date.slice(0, 10) }))];
await writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(({ route, date }) => `  <url><loc>https://xhae123.github.io${route}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
console.log(`Portfolio built locally; ${items.length} existing posts preserved.`);
