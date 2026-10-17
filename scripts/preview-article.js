import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import { applyArticleSections } from './article-sections.js';
import { requireSharedEmphasis, requireSharedArticleFrame } from './article-presentation.js';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error('Usage: node scripts/preview-article.js <post-slug>');
const file = `posts/${slug}/index.html`;
const $ = cheerio.load(await readFile(file, 'utf8'));
$('.post-body').html(await applyArticleSections($('.post-body').html(), slug));
const contents = $('.toc-list').empty();
$('.post-body h1, .post-body h2, .post-body h3').each((_, heading) => {
  const id = $(heading).attr('id');
  if (!id) throw new Error(`${slug}: missing heading ID`);
  const link = $('<a>').attr({ href: `#${id}`, 'data-target': id }).text($(heading).text());
  contents.append($('<li>').addClass(`toc-item toc-item--${heading.tagName}`).append(link));
});
for (const asset of ['blog.css', 'app.js']) {
  const source = await readFile(asset, 'utf8');
  if (asset.endsWith('.css')) requireSharedEmphasis(source);
  const version = createHash('sha1').update(source).digest('hex').slice(0, 8);
  const attribute = asset.endsWith('.css') ? 'href' : 'src';
  $(`[${attribute}^="/${asset}"]`).attr(attribute, `/${asset}?v=${version}`);
}
requireSharedArticleFrame($.html(), slug);
await writeFile(file, $.html());
console.log(`Local preview updated: http://127.0.0.1:4173/posts/${slug}/`);
