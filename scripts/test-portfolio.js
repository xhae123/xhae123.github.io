// Read-only checks against the locally generated portfolio. No network or rebuild.
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import * as cheerio from 'cheerio';

const pages = ['index.html', 'about/index.html',
  'work/afinit/index.html', 'work/raspy/index.html', 'work/adelante/index.html'];
const documents = new Map();
const document = async file => {
  if (!documents.has(file)) documents.set(file, cheerio.load(await readFile(file, 'utf8')));
  return documents.get(file);
};

for (const file of pages) {
  const $ = await document(file);
  assert.match($('title').text(), /^woojin kim · /, `${file}: name-first page title`);
  assert.equal($('link[rel="icon"]').attr('href'), '/favicon.svg?v=woojin-w-2', `${file}: shared favicon`);
  assert.equal($('footer').length, 0, `${file}: no name/signature footer`);
  assert.equal($('h1').length, 1, `${file}: one page heading`);
  assert.deepEqual($('.primary-nav a').toArray().map(el => $(el).attr('href')), ['https://github.com/xhae123'], `${file}: GitHub logo link`);
  assert.equal($('header a[href^="mailto:"]').length, 0, `${file}: no email menu`);
  assert.equal($('link[href^="/navigation.css"]').length, 1);
  const ids = $('[id]').toArray().map(el => $(el).attr('id'));
  assert.equal(new Set(ids).size, ids.length, `${file}: unique IDs`);
  for (const el of $('a[href]').toArray()) {
    const href = $(el).attr('href');
    if (!href.startsWith('/') && !href.startsWith('#')) continue;
    const [path, fragment] = href.split('#');
    const target = path ? `.${decodeURIComponent(path)}${path.endsWith('/') ? 'index.html' : ''}` : file;
    await access(target);
    if (fragment) {
      const targetDoc = await document(target);
      assert.ok(targetDoc('[id]').toArray().some(node => targetDoc(node).attr('id') === fragment), `${file}: ${href}`);
    }
  }
}

const writing = await document('index.html');
assert.equal(writing('.rail-name').text(), 'woojin kim');
assert.equal(writing('link[rel="canonical"]').attr('href'), 'https://xhae123.github.io/', 'Archive is the canonical home page');
const oldArchive = await document('writing/index.html');
assert.equal(oldArchive('meta[http-equiv="refresh"]').attr('content'), '0;url=/', 'Old /writing/ URL redirects to the home page');
assert.equal(writing('.rail-name').text(), 'woojin kim');
for (const el of writing('.rail-cats button').toArray()) {
  if (writing(el).attr('data-cat') === '*') {
    assert.match(writing(el).text(), /^ALL\d+$/);
    continue;
  }
  assert.equal(writing(el).text(), writing(el).text().toLowerCase(), 'Category UI uses lowercase labels');
}
assert.ok(writing('.rail-cats button[data-cat="AI"]').length, 'Category identifiers stay unchanged for filtering');
assert.ok(writing('.feed .item').length > 0, 'Blog archive remains accessible');
assert.equal(writing('.rail-cats .ic, .i-meta .ic').length, 0, 'Category icons are removed');
for (const el of writing('.feed .item').toArray()) {
  const href = writing(el).attr('href');
  const article = await document(`${href.slice(1)}index.html`);
  assert.equal(article('.post-category').text(), writing(el).attr('data-cat').toLowerCase(), 'Detail category matches archive');
  assert.equal(article('.post-top-back').text(), '← all posts');
  for (const label of article('.toc-title, .post-nav-label, .post-back a').toArray()) {
    assert.equal(article(label).text(), article(label).text().toLowerCase(), 'Detail UI labels are lowercase');
  }
}
console.log(`Portfolio checks passed: ${writing('.feed .item').length} posts.`);
