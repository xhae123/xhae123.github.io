// Read-only checks against the locally generated site. No network or rebuild.
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import * as cheerio from 'cheerio';

const documents = new Map();
const document = async file => {
  if (!documents.has(file)) documents.set(file, cheerio.load(await readFile(file, 'utf8')));
  return documents.get(file);
};

// Every local link and image must resolve to a generated file (and fragment).
async function requireLocalTargets($, file) {
  for (const el of $('a[href], img[src]').toArray()) {
    const href = $(el).attr('href') || $(el).attr('src');
    if (!href.startsWith('/') && !href.startsWith('#')) continue;
    const [path, fragment] = href.split('#');
    const pathname = path.split('?')[0];
    const target = pathname ? `.${decodeURIComponent(pathname)}${pathname.endsWith('/') ? 'index.html' : ''}` : file;
    await access(target);
    if (fragment) {
      const other = await document(target);
      assert.ok(other('[id]').toArray().some(node => other(node).attr('id') === decodeURIComponent(fragment)), `${file}: ${href}`);
    }
  }
}

// Each page applies a stored theme before its stylesheets load and offers one toggle.
function requireThemeSupport($, file) {
  assert.equal($('meta[name="color-scheme"]').attr('content'), 'light dark', `${file}: follows the system theme by default`);
  const early = $('head').children().toArray();
  const script = early.findIndex(el => el.tagName === 'script' && $(el).text().includes("localStorage.getItem('theme')"));
  const stylesheet = early.findIndex(el => el.tagName === 'link' && $(el).attr('rel') === 'stylesheet');
  assert.ok(script >= 0 && script < stylesheet, `${file}: stored theme is applied before the stylesheets`);
  assert.equal($('button[data-theme-toggle][hidden]').length, 1, `${file}: one theme toggle, hidden until scripted`);
  assert.equal($('link[href*="highlight.js"]').length, 0, `${file}: syntax colors come from the themed stylesheet`);
}

// theme.css writes the dark palette twice (system setting and stored choice).
const themeCss = await readFile('theme.css', 'utf8');
const declarations = block => block.split(';').map(line => line.trim()).filter(Boolean);
const palettes = [...themeCss.matchAll(/:root(\S*)\s*\{([^}]*)\}/g)].map(([, selector, body]) => [selector, declarations(body)]);
assert.deepEqual(palettes.map(([selector]) => selector), ['', ':not([data-theme="light"])', '[data-theme="dark"]'], 'theme.css: light palette, then both dark selectors');
assert.deepEqual(palettes[1][1], palettes[2][1], 'theme.css: both dark palettes are identical');
const names = list => list.map(line => line.split(':')[0]);
const fonts = ['--sans', '--mono'];
assert.deepEqual(names(palettes[1][1]), names(palettes[0][1]).filter(name => !fonts.includes(name)), 'theme.css: dark palette redefines every light color');

const sources = (await readdir('content/posts')).filter(f => f.endsWith('.md'));
const slugs = sources.map(f => f.slice(0, -3));

for (const file of ['index.html']) {
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
  requireThemeSupport($, file);
  await requireLocalTargets($, file);
}

// The archive is the home page.
const home = await document('index.html');
assert.equal(home('html').attr('lang'), 'ko', 'Home is Korean');
assert.equal(home('.rail-name').text(), 'woojin kim');
assert.equal(home('link[rel="canonical"]').attr('href'), 'https://xhae123.github.io/', 'Archive is the canonical home page');
assert.equal(home('meta[property="og:locale"]').attr('content'), 'ko_KR');
assert.equal(home('.rail-portfolio, #about-me, .folio-home, .identity').length, 0, 'No trace of the former portfolio home');
const oldArchive = await document('writing/index.html');
assert.equal(oldArchive('meta[http-equiv="refresh"]').attr('content'), '0;url=/', 'Old /writing/ URL redirects to the home page');
for (const el of home('.rail-cats button').toArray()) {
  if (home(el).attr('data-cat') === '*') {
    assert.match(home(el).text(), /^전체\d+$/);
    continue;
  }
  assert.equal(home(el).text(), home(el).text().toLowerCase(), 'Category UI uses lowercase labels');
}
assert.ok(home('.rail-cats button[data-cat="AI"]').length, 'Category identifiers stay unchanged for filtering');
assert.equal(home('.rail-cats .ic, .i-meta .ic').length, 0, 'Category icons are removed');
assert.deepEqual(home('.feed .item').toArray().map(el => home(el).attr('href')).sort(),
  slugs.map(slug => `/posts/${slug}/`).sort(), 'Every source post is listed exactly once');

// Each source file becomes one Korean article page.
for (const slug of slugs) {
  const file = `posts/${slug}/index.html`;
  const $ = await document(file);
  const source = await readFile(`content/posts/${slug}.md`, 'utf8');
  const title = source.match(/^title:\s*(.+)$/m)[1].trim();
  assert.equal($('html').attr('lang'), 'ko', `${file}: document language`);
  assert.equal($('meta[property="og:locale"]').attr('content'), 'ko_KR', `${file}: locale`);
  assert.equal($('title').text(), `woojin kim · ${title}`, `${file}: page title`);
  assert.equal($('h1').length, 1, `${file}: one page heading`);
  assert.equal($('.post-title').text(), title, `${file}: article title`);
  assert.equal($('.site-header').length, 0, `${file}: header-free article layout`);
  assert.equal($('link[rel="canonical"]').attr('href'), `https://xhae123.github.io/posts/${slug}/`);
  assert.equal($('.post-top-back').text(), '← 글 목록');
  assert.equal($('.post-top-back').attr('href'), '/');
  assert.equal($('.post-back a').attr('href'), '/');
  assert.ok($('meta[name="description"]').attr('content').trim().length > 0, `${file}: description`);
  const jsonLd = JSON.parse($('script[type="application/ld+json"]').text());
  assert.equal(jsonLd.headline, title, `${file}: structured headline`);
  assert.equal(jsonLd.inLanguage, 'ko', `${file}: structured language`);
  const ids = $('[id]').toArray().map(el => $(el).attr('id'));
  assert.equal(new Set(ids).size, ids.length, `${file}: unique IDs`);
  $('.toc a').each((_, el) => {
    const heading = $('.post-body [id]').filter((_, h) => $(h).attr('id') === $(el).attr('data-target'));
    assert.equal($(el).text(), heading.text(), `${file}: contents label matches its heading`);
  });
  assert.equal($('img[src^="/assets/en/"]').length, 0, `${file}: no English figure variants`);
  requireThemeSupport($, file);
  await requireLocalTargets($, file);
  const item = home(`.feed .item[href="/posts/${slug}/"]`);
  assert.equal(item.find('.i-title').text(), title, `${file}: archive title`);
  assert.equal($('.post-category').text(), item.attr('data-cat').toLowerCase(), `${file}: category matches archive`);
}

// Posts first lived at URLs derived from their Korean titles. Those must keep redirecting.
const legacyRoutes = JSON.parse(await readFile('content/legacy-routes.json', 'utf8'));
for (const [legacy, slug] of Object.entries(legacyRoutes)) {
  assert.ok(slugs.includes(slug), `${legacy}: redirect target exists`);
  const $ = await document(`posts/${legacy}/index.html`);
  assert.equal($('meta[name="post-redirect"]').attr('content'), `/posts/${slug}/`, `${legacy}: redirect target`);
}

// The former portfolio pages are gone.
for (const removed of ['about/index.html', 'work']) {
  await assert.rejects(access(removed), `${removed}: removed`);
}

console.log(`Site checks passed: ${slugs.length} posts, ${Object.keys(legacyRoutes).length} legacy redirects.`);
