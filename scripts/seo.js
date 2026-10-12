import { existsSync } from 'node:fs';
import path from 'node:path';

export const siteUrl = 'https://xhae123.github.io';
const siteId = `${siteUrl}/#website`;
const personId = `${siteUrl}/#person`;
const preview = `${siteUrl}/assets/seo/site-preview.png`;
const person = {
  '@type': 'Person', '@id': personId, name: 'Woojin Kim',
  alternateName: ['김우진', 'xhae123'], url: `${siteUrl}/about/`,
  sameAs: ['https://github.com/xhae123'], jobTitle: 'Software Engineer',
};

const pages = {
  '/': { title: 'software engineer', description: 'Woojin Kim builds backend systems, infrastructure, and AI developer tools. Explore his engineering work, open-source contributions, and technical writing.' },
  '/about/': { title: 'about', description: 'Meet Woojin Kim, a software engineer and startup co-founder working across backend systems, AI development infrastructure, and product engineering.' },
  '/writing/': { title: 'writing', description: 'Engineering notes by Woojin Kim on system design, Java, databases, cloud infrastructure, AI-assisted development, and building products for real users.' },
  '/work/adelante/': { title: 'Kyung Hee University Festival Platform', description: 'Leading the design and live operation of a university festival platform: AWS ECS, service boundaries, performance validation, and tools for student-run pubs.' },
  '/work/afinit/': { title: 'Afinit', description: 'Engineering work at Afinit on company-wide AI development infrastructure, agent workflows, shared development tools, and pre-deployment quality assurance.' },
  '/work/raspy/': { title: 'Raspy', description: 'Co-founding Raspy and leading Match: mobile apps, real-time tournament operations, backend infrastructure, and lessons from live sports events.' },
};

const descriptions = {
  'university-festival-platform': "Designing and operating Kyung Hee University's festival platform: ECS, service boundaries, concurrency, reliable notifications, and lessons from live use.",
  'netty-direct-memory-limit': 'A Netty contribution tracing direct memory limits from JVM options to buffer allocation, with the reasoning behind the fix and its compatibility boundaries.',
  'java-virtual-threads': 'Controlled load tests show how Java virtual threads improved API throughput, why a larger database pool performed worse, and how measurements guided the choice.',
  'curriculum-level-learning-diagnostics': 'Turning coding-test results into learning diagnostics with curriculum achievement standards, structured error records, and carefully bounded AI assistance.',
  'llm-pipeline-token-optimization': 'Designing an LLM pipeline for technical article cards: ingestion, selection, writing, deterministic assembly, and the decisions that reduce wasted tokens.',
  'ai-era-team-projects': 'A comparison of university team projects and AI-assisted work, exploring how implementation changes collaboration, learning, and the role of shared context.',
  'design-context-to-code': 'Automating branded Instagram cards with AI by moving from image generation to document layouts, explicit design context, and reusable production rules.',
  'building-the-data-before-the-model': 'Building Zansol, an Android focus app, with on-device nudges and behavioral data before machine learning. Why evidence came before personalization.',
  'production-database-migration': 'Moving a production database under latency, memory, and downtime constraints, with a planned cutover and the decisions behind an irreversible deletion.',
  'automating-personal-messaging': 'Using an AI agent to assist with personal messaging through scheduled execution, thin Skills, shared judgment rules, and a practical approval workflow.',
  'specifications-as-code': 'What writing Claude Code Skills taught me about executable boundaries, deterministic rules, and where natural-language specifications stop being reliable.',
  'functional-programming-in-spring': 'Exploring functional programming in Kotlin and Spring: pure domain logic, JPA constraints, transaction behavior, and essential versus accidental complexity.',
  'transaction-boundaries-and-outbox': 'Narrowing a reward API transaction with the outbox pattern, separating external I/O from database work, and measuring the effect on latency and throughput.',
  'sql-in-the-age-of-vibe-coding': 'Why explicit SQL can make AI-generated backend code easier to verify: predictable I/O, memory behavior, type safety, and the trade-offs with JPA.',
  'six-months-building-a-startup': 'Lessons from co-founding a sports platform: shipping and live operations, observing users, working with a team, and deciding when to stop.',
  'grpc-schema-drift-in-kubernetes': 'Detecting gRPC schema drift by comparing running Kubernetes services with the Buf Schema Registry, including extraction, normalization, and concurrency.',
  'fixing-n-plus-one-with-caching': 'Separating shared feed data from user-specific state with Caffeine caching to address an N+1 problem, with measured results and cache consistency trade-offs.',
};

function setMeta($, attr, key, value) {
  $(`meta[${attr}="${key}"]`).remove();
  const element = $('<meta>');
  element.attr(attr, key).attr('content', value);
  $.root().append(element);
}

export function improveSearchMetadata($, canonical) {
  const route = new URL(canonical).pathname;
  const article = route.startsWith('/posts/');
  let existing;
  const structured = $('script[type="application/ld+json"]').first().text();
  if (structured) existing = JSON.parse(structured);
  const originalTitle = $('title').text().replace(/^woojin kim · /, '').replace(/ · xhae123's notes$/, '');
  const title = article ? (existing?.headline || originalTitle) : (pages[route]?.title || originalTitle);
  const description = article
    ? descriptions[route.split('/')[2]] || $('meta[name="description"]').attr('content')
    : pages[route]?.description || $('meta[name="description"]').attr('content');
  $('title').text(`woojin kim · ${title}`);
  setMeta($, 'name', 'description', description);
  setMeta($, 'name', 'author', 'Woojin Kim');
  setMeta($, 'name', 'robots', 'index, follow, max-image-preview:large');
  setMeta($, 'property', 'og:site_name', 'Woojin Kim');
  setMeta($, 'property', 'og:title', article ? title : `Woojin Kim · ${title}`);
  setMeta($, 'property', 'og:description', description);
  setMeta($, 'property', 'og:type', article ? 'article' : 'website');
  setMeta($, 'property', 'og:locale', 'en_US');
  setMeta($, 'property', 'og:url', canonical);
  let image = article ? $('meta[property="og:image"]').attr('content') || preview : preview;
  // Social cards require a raster image. Use an existing PNG sibling when an
  // article's first figure is SVG; otherwise use the site card.
  if (/\.svg(?:\?|$)/i.test(image)) {
    const sibling = new URL(image).pathname.replace(/\.svg$/i, '.png');
    image = existsSync(path.join(process.cwd(), sibling.slice(1))) ? `${siteUrl}${sibling}` : preview;
  }
  setMeta($, 'property', 'og:image', image);
  setMeta($, 'property', 'og:image:alt', article && image !== preview ? `Figure from ${title}` : 'Woojin Kim — software engineer. Backend systems, infrastructure, and AI developer tools.');
  if (image === preview) {
    setMeta($, 'property', 'og:image:width', '1200');
    setMeta($, 'property', 'og:image:height', '630');
  }
  setMeta($, 'name', 'twitter:card', 'summary_large_image');
  setMeta($, 'name', 'twitter:title', article ? title : `Woojin Kim · ${title}`);
  setMeta($, 'name', 'twitter:description', description);
  setMeta($, 'name', 'twitter:image', image);

  let data;
  if (article && existing) {
    data = { ...existing, description, image, inLanguage: 'en',
      author: person, isPartOf: { '@id': siteId },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical } };
  } else {
    data = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', '@id': siteId, url: `${siteUrl}/`, name: 'Woojin Kim',
        alternateName: ['woojin kim', 'xhae123'], inLanguage: 'en', publisher: { '@id': personId } },
      person,
      { '@type': route === '/about/' ? 'ProfilePage' : route === '/writing/' ? 'CollectionPage' : 'WebPage',
        '@id': canonical, url: canonical, name: `Woojin Kim · ${title}`, description, inLanguage: 'en',
        isPartOf: { '@id': siteId },
        ...(route === '/about/' ? { mainEntity: { '@id': personId } } : { about: { '@id': personId } }) },
    ] };
  }
  $('script[type="application/ld+json"]').remove();
  $.root().append(`<script type="application/ld+json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`);
}
