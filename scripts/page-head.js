import * as cheerio from 'cheerio';
import { improveSearchMetadata } from './seo.js';
import { installAnalytics } from './analytics.js';

// All full and offline generation paths already pass through the route
// normalizer. Change only the real document head; article HTML is preserved.
export function finalizeDocumentHead(html) {
  return html.replace(/(<head\b[^>]*>)([\s\S]*?)(<\/head>)/i, (match, open, contents, close) => {
    const $ = cheerio.load(contents, {}, false);
    if ($('meta[name="post-redirect"]').length) return match;
    const canonical = $('link[rel="canonical"]').attr('href');
    if (!canonical) return match;
    improveSearchMetadata($, canonical);
    installAnalytics($);
    return `${open}${$.html().replace(/^[ \t]+$/gm, '')}${close}`;
  });
}
