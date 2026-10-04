// Deployment migration: dry-run by default. --apply updates only matched owner posts.
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import gfmPlugin from 'turndown-plugin-gfm';
import { marked } from 'marked';

const repository = 'xhae123/xhae123.github.io';
const site = 'https://xhae123.github.io';
const gh = args => JSON.parse(execFileSync('gh', ['api', ...args], { encoding: 'utf8' }));
const issues = gh([`repos/${repository}/issues?state=all&per_page=100`]);
const maps = await Promise.all((await readdir('translations/en/posts')).filter(f => f.endsWith('.json')).map(async f => JSON.parse(await readFile(`translations/en/posts/${f}`, 'utf8'))));
const slugify = title => title.trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const markdown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*' });
markdown.use(gfmPlugin.gfm);
markdown.addRule('stable-headings', {
  filter: ['h1', 'h2', 'h3', 'h4'],
  replacement: (_, node) => `\n\n${node.outerHTML}\n\n`,
});
markdown.addRule('exact-code', {
  filter: node => node.nodeName === 'PRE' && node.firstElementChild?.nodeName === 'CODE',
  replacement: (_, node) => {
    const code = node.firstElementChild;
    const language = code.className.match(/language-([\w-]+)/)?.[1] || node.getAttribute('data-lang') || '';
    const fence = '`'.repeat(Math.max(3, ...[...code.textContent.matchAll(/`+/g)].map(m => m[0].length + 1)));
    return `\n\n${fence}${language}\n${code.textContent.replace(/\n$/, '')}\n${fence}\n\n`;
  },
});
const signature = html => {
  const $ = cheerio.load(html);
  return {
    text: $('body').text().replace(/\s+/g, ''),
    tags: $('body').children().toArray().map(el => el.tagName),
    images: $('img').toArray().map(el => [$(el).attr('src'), $(el).attr('alt') || '']),
    headings: $('h1,h2,h3,h4').toArray().map(el => [$(el).attr('id'), $(el).text()]),
    code: $('pre code').toArray().map(el => $(el).text().trimEnd()),
  };
};
const updates = [];
for (const translation of maps) {
  const matches = issues.filter(i => !i.pull_request && i.user.login === 'xhae123' && i.state === 'closed' && !i.labels.some(l => l.name === 'excluded') && (slugify(i.title) === translation.legacySlug || i.body?.includes(`<!-- slug: ${translation.slug} -->`)));
  assert.equal(matches.length, 1, `${translation.slug}: exactly one source issue`);
  const issue = matches[0];
  const $ = cheerio.load(await readFile(`posts/${translation.slug}/index.html`, 'utf8'));
  $('.post-body img').each((_, el) => { if ($(el).attr('src').startsWith('/')) $(el).attr('src', `${site}${$(el).attr('src')}`); });
  $('.post-body a').each((_, el) => { if ($(el).attr('href')?.startsWith('/')) $(el).attr('href', `${site}${$(el).attr('href')}`); });
  $('.post-body pre code').each((_, el) => $(el).text($(el).text()));
  const original = $('.post-body').html();
  const blocks = $('.post-body').children().toArray().map(el => {
    const html = $.html(el);
    const candidate = markdown.turndown(html);
    try { assert.deepEqual(signature(marked.parse(candidate, { breaks: true })), signature(html)); return candidate; }
    catch { return html; } // Preserve any block that Markdown cannot round-trip exactly.
  });
  const body = blocks.join('\n\n');
  assert.deepEqual(signature(marked.parse(body, { breaks: true })), signature(original), `${translation.slug}: content, figures, code and anchors preserved`);
  const date = $('meta[property="article:published_time"]').attr('content');
  updates.push({ number: issue.number, title: translation.title, body: `<!-- date: ${date} -->\n<!-- slug: ${translation.slug} -->\n\n${body}`, original: issue });
}
assert.equal(new Set(updates.map(u => u.number)).size, maps.length);
const backup = await mkdtemp(path.join(tmpdir(), 'portfolio-issue-migration-'));
await writeFile(path.join(backup, 'original-issues.json'), JSON.stringify(updates.map(u => u.original), null, 2));
await writeFile(path.join(backup, 'english-updates.json'), JSON.stringify(updates.map(({ original, ...update }) => update), null, 2));
console.log(`Validated ${updates.length} English posts. Backup and prepared updates: ${backup}`);
if (process.argv.includes('--apply')) {
  for (const { number, title, body } of updates) {
    execFileSync('gh', ['api', `repos/${repository}/issues/${number}`, '--method', 'PATCH', '--input', '-'], { input: JSON.stringify({ title, body }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });
    console.log(`Updated issue #${number}: ${title}`);
  }
} else console.log('Dry run only; no GitHub Issues modified.');
