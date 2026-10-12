import * as cheerio from 'cheerio';

// The article source owns content, not CSS. Validate before syntax highlighting
// adds its own trusted presentation classes to code blocks.
export function requireSemanticArticle(html, context) {
  const $ = cheerio.load(html, {}, false);
  const forbidden = $('style, link, script, iframe, object, embed, font, b');
  if (forbidden.length) {
    throw new Error(`${context}: article source cannot contain <${forbidden[0].tagName}>. Use Markdown and semantic HTML.`);
  }
  $('*').each((_, el) => {
    const attrs = el.attribs || {};
    for (const name of Object.keys(attrs)) {
      if (name === 'style' || name === 'color' || name === 'bgcolor' || name === 'face' || /^on/i.test(name)) {
        throw new Error(`${context}: article source cannot set presentation attribute ${name}.`);
      }
    }
    const classes = (attrs.class || '').split(/\s+/).filter(Boolean);
    // Preserve the existing semantic sidebar and fenced-code language hints.
    const allowed = el.tagName === 'aside' ? c => c === 'sidebar'
      : el.tagName === 'code' ? c => /^language-[\w-]+$/.test(c)
      : () => false;
    if (classes.some(c => !allowed(c))) {
      throw new Error(`${context}: article source cannot introduce CSS classes (${classes.join(' ')}).`);
    }
  });
}

export function requireSharedEmphasis(css) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/\.post-body--[\w-]+/.test(source)) {
    throw new Error('Article CSS cannot introduce a post-body modifier. All posts share the same presentation.');
  }
  // Check selector segments, including rules nested in @media. These two rules
  // are the shared prose emphasis and its shared blockquote treatment.
  const allowed = new Set(['.post-body strong', '.post-body blockquote strong']);
  for (const segment of source.split(/[{}]/)) {
    for (const selector of segment.split(',')) {
      const normalized = selector.trim().replace(/\s+/g, ' ');
      if (/\bstrong\b/i.test(normalized) && !allowed.has(normalized)) {
        throw new Error(`Article emphasis must use the shared rule; rejected selector: ${normalized}`);
      }
    }
  }
}

export function requireSharedArticleFrame(html, context) {
  const $ = cheerio.load(html);
  const body = $('#post-body');
  if (body.length !== 1 || body.attr('class') !== 'post-body') {
    throw new Error(`${context}: the article body must use only the shared post-body class.`);
  }
}
