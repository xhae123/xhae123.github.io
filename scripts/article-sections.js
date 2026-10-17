import { readdir, readFile } from 'node:fs/promises';
import * as cheerio from 'cheerio';
import { requireSemanticArticle } from './article-presentation.js';

// Local section sources override only the matching H2 and its contents. The
// Issue still owns the title, publication state, metadata, and other sections.
export async function applyArticleSections(html, slug) {
  const directory = new URL(`../content/article-sections/${slug}/`, import.meta.url);
  let files;
  try {
    files = (await readdir(directory)).filter(file => file.endsWith('.html')).sort();
  } catch (error) {
    if (error.code === 'ENOENT') return html;
    throw error;
  }
  const $ = cheerio.load(html, {}, false);
  for (const file of files) {
    const id = file.slice(0, -5);
    const replacement = await readFile(new URL(file, directory), 'utf8');
    requireSemanticArticle(replacement, `${slug}/${file}`);
    const fragment = cheerio.load(replacement, {}, false);
    const first = fragment.root().children().first();
    if (!first.is('h2') || first.attr('id') !== id || fragment('h2').length !== 1 || fragment('h1').length) {
      throw new Error(`${slug}/${file}: section must start with its matching H2`);
    }
    const heading = $('h2').filter((_, element) => {
      const textId = $(element).text().trim().toLowerCase().replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}\-]/gu, '').slice(0, 60);
      return ($(element).attr('id') || textId) === id;
    });
    if (heading.length !== 1) throw new Error(`${slug}: expected one section with ID ${id}`);
    let sibling = heading[0].next;
    while (sibling && !['h1', 'h2'].includes(sibling.tagName)) {
      const next = sibling.next;
      $(sibling).remove();
      sibling = next;
    }
    heading.replaceWith(replacement);
  }
  return $.html();
}
