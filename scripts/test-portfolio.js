// Read-only checks against the locally generated portfolio. No network or rebuild.
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import * as cheerio from 'cheerio';

const pages = ['index.html', 'writing/index.html', 'about/index.html',
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

const $ = await document('index.html');
assert.equal($('#recent-writing-title a').attr('href'), '/writing/', 'Recent posts heading links to the full archive');
assert.equal($('#recent-writing-title').text(), 'recent posts');
assert.equal($('#recent-writing > .recent-writing-more').attr('href'), '/writing/', 'View all sits below the recent-post list');
assert.equal($('.recent-writing-heading > a').length, 0, 'No view-all link in the upper-right heading');
assert.equal($('.recent-article-meta time').length, 5, 'Each recent article displays its date');
assert.equal($('.recent-article-category').length, 5, 'Recent articles display categories beside their dates');
for (const el of $('.recent-article-category').toArray()) {
  assert.equal($(el).text(), $(el).text().toLowerCase(), 'Recent category labels are lowercase');
}
assert.doesNotMatch($('#about-me').text(), /Netty|Netty/);
assert.match($('#about-me').text(), /Afinit, a Series E fintech company/);
assert.match($('#about-me').text(), /working through problems/);
assert.match($('#about-me').text(), /Software lets me turn those ideas into something real quickly/);
assert.match($('#about-me').text(), /I treat the problems I take on as my own/);
assert.doesNotMatch($('#about-me').text(), /lost sight of|focused only on building/);
assert.doesNotMatch($('#work, #projects, #community, #open-source, #awards').text(), /Hook|Puppeteer|Thompson Sampling|connection pool|polling|EventLoop|Promise/);
assert.equal($('.case-study, .case-studies, #selected-work').length, 0);
assert.equal($('.folio-bullets').length, 11, 'Experience and OSS use bullets; awards and activities use compact entries');
assert.equal($('#work #case-afinit, #work #case-raspy, #projects #case-adelante').length, 3);
assert.equal($('#projects .folio-entry').length, 3);
assert.equal($('#projects #jansol').length, 1, 'Zansol is a selected project');
assert.equal($('#projects #jansol .folio-role').text(), 'Project Lead · Research & Development');
assert.equal($('#case-adelante .folio-role').text(), 'Development Lead');
assert.doesNotMatch($('main').text(), /Case studies/);
assert.equal($('.folio-entry').length, 19, 'Five selected open-source entries plus the remaining history');
assert.deepEqual($('main > section > h2, .recent-writing-heading h2, .folio-group-heading h2').toArray().map(el => $(el).text()),
  ['about me', 'recent posts', 'work experience', 'selected projects', 'awards & activities', 'education', 'open source']);
assert.equal($('#open-source .folio-entry').length, 5);
assert.equal($('.oss-directory').length, 0, 'Open source shares the standard entry layout');
assert.equal($('#open-source > .folio-entry').length, 5);
assert.deepEqual($('#open-source h3').toArray().map(el => $(el).text()), ['Netty Open Source Contributions', 'Mock Fox', 'ProtoDiff', 'issue-blog', 'hi-web']);
assert.equal($('.folio-index').length, 0, 'No page table of contents');
assert.equal($('.section-number').length, 0, 'Section headings use the same unnumbered pattern as about me');
assert.equal($('#awards').length, 0, 'Awards and community share one section');
assert.equal($('#community .award-entry').length, 5);
assert.equal($('.award-entry .folio-bullets, .award-entry .folio-entry-body').length, 0, 'Awards have no descriptions');
assert.deepEqual($('.award-entry .folio-date').toArray().map(el => $(el).text()), ['2026.08', '2025.12', '2024.11', '2024.10', '2023.10']);
assert.equal($('#community .folio-entry').length, 8);
assert.equal($('#community [data-kind="activity"]').length, 3);
const hackathonMentoring = $('#community .folio-entry').filter((_, el) => $(el).find('h3').text() === 'Youth SW Companion Hackathon — University Mentor');
assert.equal(hackathonMentoring.find('.folio-bullets').length, 0);
assert.equal(hackathonMentoring.find('.folio-role').text(), 'Ministry of Science and ICT');
const digitalMentoring = $('#community .folio-entry').filter((_, el) => $(el).find('h3').text() === 'Youth Digital Problem-Solving Project — University Mentor');
assert.equal(digitalMentoring.find('.folio-bullets').length, 0);
assert.equal(digitalMentoring.find('.folio-role').text(), 'Korea Foundation for the Advancement of Science and Creativity');
assert.equal($('#community .compact-entry').length, 8);
assert.equal($('#community .folio-entry-body, #community .folio-bullets').length, 0);
assert.equal($('#community h3 br, #community .folio-role br').length, 0, 'No forced line breaks in activity titles or institutions');
for (const el of $('#community h3, #community .folio-role').toArray()) {
  assert.doesNotMatch($(el).text(), /[\r\n\u2028\u2029]/, 'Activity text contains no manual line breaks');
}
assert.equal($('#work .folio-entry-primary').length, 3);
const officialSite = $('#projects .folio-entry').filter((_, el) => $(el).find('h3').text() === 'LikeLion IT club official website');
assert.equal(officialSite.length, 1, 'Official website is an independent selected project');
assert.equal(officialSite.find('.folio-role').text(), 'PM & Product Owner');
assert.match(officialSite.text(), /success criteria/);
assert.match(officialSite.text(), /content and recruitment management/);
assert.match(officialSite.text(), /release in about a month/);
const expectedAwards = [
  ['8th Education Public Data AI Utilization Competition — Bronze Prize', 'Ministry of Education · Korea Institute for Curriculum and Evaluation'],
  ['Open Source Developer Competition — Bronze Prize', 'Ministry of Science and ICT'],
  ['KVS (KHU Valley Start-up) — Growth Team Prize', 'Kyung Hee University LINC 3.0'],
  ['Tourism Data Service Development Competition — Excellence Prize', 'Korea Tourism Organization · Kakao'],
  ['Gangwon Open Military Startup Competition — Grand Prize', 'Kangwon National University · ROK Army II Corps'],
];
assert.deepEqual($('.award-entry').toArray().map(el => [$(el).find('h3').text(), $(el).find('.folio-role').text()]), expectedAwards);
assert.doesNotMatch($('#open-source').text(), /pending review|merged|awaiting merge/);
for (const repo of ['issue-blog', 'hi-web', 'protodiff']) {
  assert.equal($(`#open-source a[href="https://github.com/xhae123/${repo}"]`).length, 1);
}
assert.equal($('#open-source a[href="https://github.com/netty/netty"]').length, 1);
assert.equal($('#open-source a[href="https://github.com/The-Plain-OSS/mock-fox"]').length, 1);
assert.equal($('.folio-entry-links a').length, 5, 'Selected open-source repository links remain available');
assert.equal($('#open-source .folio-date .folio-entry-links a').length, 5, 'Repository links sit next to the year');
assert.equal($('#open-source .folio-entry-body .folio-entry-links').length, 0, 'No duplicate links below open-source descriptions');
assert.equal($('.folio-entry a[href^="/work/"], .folio-entry a[href^="/posts/"]').length, 0, 'No detail or retrospective links beneath entries');
assert.equal($('.background-row').length, 2, 'Education and certification remain visible');
assert.deepEqual($('#work h3').toArray().map(el => $(el).text()),
  ['Afinit', 'Raspy', 'JamCoding Academy, Bundang']);
assert.deepEqual($('#projects h3').toArray().map(el => $(el).text()),
  ['Kyung Hee University Festival Platform', 'LikeLion IT club official website', 'Real-Time Intervention System for Digital Distraction During Study']);
assert.match($('#case-afinit').text(), /AI-native Software Engineer \(Intern\)/);
assert.match($('#case-afinit').text(), /100 million cumulative downloads/);
assert.doesNotMatch($('main').text(), /100 million MAU/);
assert.match($('#case-adelante').text(), /estimated unique visitors/);
assert.match($('#case-adelante').text(), /table occupancy/);
assert.equal($('.numbers, .folio-nav, details').length, 0, 'No metric panels or collapsed history');
assert.ok($('#open-source h3').toArray().some(el => $(el).text() === 'Mock Fox'));
assert.ok($('#open-source h3').toArray().some(el => $(el).text() === 'ProtoDiff'));
assert.doesNotMatch($('#open-source').text(), /leafeep-mcp|sunwoo-jamcoding|jamcoding-site-fix|card-designer|auto-kakaotalk|kgemini|argos-eye|gradheat-analyzer/);
assert.ok($('.folio-bullets').toArray().every(el => $(el).children('li').length > 0));
assert.ok($('.folio-bullets li').toArray().every(el => $(el).text().trim().length > 0));
for (const el of $('.folio-bullets > li').toArray()) {
  assert.equal($(el).children('.contribution').length, 1, 'One contribution per top-level bullet');
  assert.ok($(el).children('.contribution').text().trim(), 'Contribution is not empty');
  if ($(el).children('.contribution-evidence').length) {
    assert.ok($(el).children('ul.contribution-evidence').text().trim(), 'Optional technical evidence is a nested bullet');
  }
}
assert.match($('#jansol').text(), /product design, team leadership, and end-to-end app development/);
assert.equal($('#jansol h3').text(), 'Real-Time Intervention System for Digital Distraction During Study');
assert.equal($('#case-raspy .folio-bullets > li').length, 4);
assert.match($('#case-raspy').text(), /real-time tournament system/);
assert.match($('#case-raspy').text(), /led the development team/);
assert.doesNotMatch($('#case-raspy').text(), /recreational sports|university sports community/);
assert.match($('#case-raspy').text(), /helped decide to close the business/);
assert.doesNotMatch($('#case-raspy').text(), /average latency fell from 820 ms to 38 ms/);
assert.match($('#case-afinit').text(), /gap between the tool and actual validation needs/);
assert.match($('#case-afinit').text(), /Proposed a human-on-the-loop direction/);
assert.match($('#case-afinit').text(), /reinforcing execution workflows.*incorporated the changes into the shared environment/);
assert.match($('#case-adelante').text(), /identical resource limits/);
assert.match($('#case-adelante').text(), /AWS ECS/);
assert.match($('#jansol').text(), /through simulation/);
const teaching = $('#work .folio-entry').filter((_, el) => $(el).find('h3').text() === 'JamCoding Academy, Bundang');
assert.equal(teaching.find('.folio-bullets > li').length, 3);
assert.match(teaching.text(), /three regular classes/);
assert.match($('#jansol').text(), /Registered 152 users/);
assert.doesNotMatch($('#jansol').text(), /Policy comparison is a synthetic simulation/);
assert.doesNotMatch($('main').text(), /\[object Object\]|undefined/);
const writing = await document('writing/index.html');
assert.equal($('#about-me .hiring-email').text(), 'xhae000@gmail.com');
assert.equal($('#about-me .hiring-note a').length, 0, 'Hiring contact is plain text, not a link');
assert.match($('#about-me .hiring-note').text(), /remote roles with teams worldwide/);
assert.equal(writing('.rail-name').text(), 'woojin kim');
assert.equal(writing('.rail-portfolio').attr('href'), '/#about-me', 'Archive offers an explicit route back to the portfolio');
assert.equal(writing('.rail-portfolio').text(), '← about me');
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
console.log(`Portfolio checks passed: 11 bullet-list entries, 8 compact awards/activities, 2 background entries, ${writing('.feed .item').length} posts.`);
