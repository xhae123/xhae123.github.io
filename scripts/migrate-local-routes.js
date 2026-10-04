// Offline route migration. Original article content is retained at the English URL.
// Legacy paths become redirects; no GitHub Issues or deployment is touched.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { postRoutes, localizePostUrls, legacyRedirect } from './post-routes.js';

for (const [legacy, slug] of Object.entries(postRoutes)) {
  const target = `posts/${slug}/index.html`;
  let html;
  try { html = await readFile(target, 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    html = await readFile(`posts/${legacy}/index.html`, 'utf8');
    if (html.includes('name="post-redirect"')) throw new Error(`Missing article behind redirect: ${slug}`);
  }
  await mkdir(`posts/${slug}`, { recursive: true });
  await writeFile(target, localizePostUrls(html));
  await mkdir(`posts/${legacy}`, { recursive: true });
  await writeFile(`posts/${legacy}/index.html`, legacyRedirect(slug));
}
console.log(`English routes prepared for ${Object.keys(postRoutes).length} articles; legacy redirects retained.`);
