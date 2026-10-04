import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import * as cheerio from 'cheerio';

const maps = await Promise.all((await readdir('translations/en/posts')).filter(f => f.endsWith('.json')).map(async f => JSON.parse(await readFile(`translations/en/posts/${f}`, 'utf8'))));
assert.equal(maps.length, 16, 'All existing articles are translated');
const pages = ['index.html', 'about/index.html', 'writing/index.html', 'work/afinit/index.html', 'work/raspy/index.html', 'work/adelante/index.html', ...maps.map(t => `posts/${t.slug}/index.html`)];
const documents = new Map();
const figureManifest = JSON.parse(await readFile('translations/en/figures.json', 'utf8'));
const document = async file => {
  if (!documents.has(file)) documents.set(file, cheerio.load(await readFile(file, 'utf8')));
  return documents.get(file);
};
for (const file of pages) {
  const $ = await document(file);
  assert.equal($('html').attr('lang'), 'en', `${file}: document language`);
  assert.doesNotMatch($('title').text(), /[가-힣]/, `${file}: English title`);
  assert.match($('title').text(), /^woojin kim · /, `${file}: name-first title`);
  assert.equal($('link[rel="icon"]').attr('href'), '/favicon.svg?v=woojin-w-2', `${file}: shared favicon`);
  const visible = $('body').clone();
  visible.find('script,style').remove();
  // These are identifiers in the Korean national curriculum, not untranslated prose.
  assert.doesNotMatch(visible.text().replace(/\[?9정\d{2}-\d{2}\]?/g, ''), /[가-힣]/, `${file}: English content`);
  for (const el of $('meta[content], [aria-label], img[alt]').toArray()) {
    const value = $(el).attr('content') || $(el).attr('aria-label') || $(el).attr('alt') || '';
    if (/^https?:/.test(value)) continue;
    assert.doesNotMatch(value, /[가-힣]/, `${file}: English metadata/accessibility text`);
  }
  for (const el of $('a[href],img[src]').toArray()) {
    const href = $(el).attr('href') || $(el).attr('src');
    if (!href.startsWith('/') && !href.startsWith('#')) continue;
    const [path, fragment] = href.split('#');
    const pathname = path.split('?')[0];
    const target = pathname ? `.${decodeURIComponent(pathname)}${pathname.endsWith('/') ? 'index.html' : ''}` : file;
    await access(target);
    if (fragment) {
      const other = await document(target);
      assert.ok(other('[id]').toArray().some(e => other(e).attr('id') === decodeURIComponent(fragment)), `${file}: working fragment ${href}`);
    }
  }
}
for (const t of maps) {
  const $ = await document(`posts/${t.slug}/index.html`);
  assert.equal($('.post-title').text(), t.title);
  assert.equal($('.site-header').length, 0, 'Article pages retain their header-free layout');
  for (const index of Object.keys(t.blocks)) assert.ok($('.post-body').children().eq(Number(index)).length, `${t.slug}: preserved block ${index}`);
  const jsonLd = JSON.parse($('script[type="application/ld+json"]').text());
  assert.equal(jsonLd.headline, t.title);
  assert.equal(jsonLd.author.name, 'Woojin Kim');
  $('.toc a').each((_, el) => {
    const id = $(el).attr('data-target');
    const heading = $('.post-body [id]').filter((_, h) => $(h).attr('id') === id);
    assert.equal($(el).text(), heading.text(), `${t.slug}: translated contents label`);
  });
}
for (const figure of figureManifest.figures) {
  const extension = figure.format || 'png';
  await access(`assets/en/${figure.id}.${extension}`);
  if (extension === 'svg') {
    const svg = await readFile(`assets/en/${figure.id}.svg`, 'utf8');
    assert.doesNotMatch(svg, /[가-힣]/, `${figure.id}: English vector labels`);
    const original = await readFile(`assets/${figure.sources[0]}`, 'utf8');
    const nonText = source => cheerio.load(source, { xmlMode: true })('rect,path,line,circle,ellipse,polygon,polyline').toArray().map(el => JSON.stringify(el.attribs));
    assert.deepEqual(nonText(svg), nonText(original), `${figure.id}: original vector shapes preserved`);
  }
  for (const source of figure.sources) await access(`assets/${source}`);
  const article = maps.find(t => documents.get(`posts/${t.slug}/index.html`)('meta[property="article:published_time"]').attr('content').startsWith(figure.date));
  assert.ok(article, `${figure.id}: expected article date`);
  const $ = await document(`posts/${article.slug}/index.html`);
  assert.equal($(`.post-body img[src="/assets/en/${figure.id}.${extension}"]`).length, figure.sources.length, `${figure.id}: English figure references`);
  for (const source of figure.sources) assert.equal($(`.post-body img[src^="/assets/${source}"]`).length, 0, `${figure.id}: no original figure still displayed`);
}
const screenshots = ['c276cbc19d848bab.png', '9c1a64e1546cd7ce.png', '511785cac4cfceea.png', 'netty-pr-review.webp', 'llm-pipeline-09-served-cards.png'];
for (const screenshot of screenshots) {
  assert.ok([...documents.values()].some($ => $(`.post-body img[src]`).toArray().some(el => $(el).attr('src').split('?')[0] === `/assets/${screenshot}`)), `${screenshot}: original screenshot preserved`);
}
console.log(`English translation checks passed: ${pages.length} pages, 16 complete articles, local assets and links, metadata, and contents navigation.`);
