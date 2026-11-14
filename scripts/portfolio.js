import { mkdir, writeFile } from 'node:fs/promises';
import { blogCategoryIcons } from './blog-categories.js';
import { englishPostSlug, localizePostUrls } from './post-routes.js';

const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// One short signal per selected bullet; never mark whole sentences or invent claims.
const experienceHighlights = {
  'Afinit': ['shared AI development infrastructure', 'incorporated the changes into the shared environment', 'scope had to be defined before implementation'],
  'Raspy': ['shipped to app stores', 'a real-time tournament system', 'helped decide to close the business'],
  'JamCoding Academy, Bundang': ['Tailor learning plans to individual levels and goals', 'analyze problems and explain their reasoning', 'awards in the Korean Olympiad in Informatics (KOI) and USACO'],
  'Kyung Hee University Festival Platform': ['owned system design, deployment, and live operations', 'two Availability Zones', 'improved throughput by 2.7×', '17,308 estimated unique visitors'],
  'LikeLion IT club official website': ['defined the launch scope', 'routine updates would not depend on developers', 'success criteria around application conversion and member participation'],
  'Real-Time Intervention System for Digital Distraction During Study': ['Owned product design, team leadership, and end-to-end app development', 'shipping a rule-based app over building a personalization model', '9,214 intervention events over four weeks'],
};
const markedContribution = (text, name) => {
  const phrase = (experienceHighlights[name] || []).find(value => text.includes(value));
  if (!phrase) return escape(text);
  const at = text.indexOf(phrase);
  return `${escape(text.slice(0, at))}<mark>${escape(phrase)}</mark>${escape(text.slice(at + phrase.length))}`;
};
const post = (slug) => `/posts/${encodeURIComponent(englishPostSlug(slug))}/`;
const vt = '요청-처리량-27배-Java-Virtual-Thread-도입기';
const netty = 'Netty-오픈소스-기여-왜-Direct-Memory-한도를-확인할까';
const startup = '반년-동안-창업하며-배운-것들';
const ml = 'ML-프로젝트인데-ML을-안-넣기로-했습니다';
const cache = '익숙한-N1-문제-캐싱이-가져온-26배의-속도-차이';
const education = '코딩-시험-결과를-교육과정-단위의-진단으로-바꾸는-방법';
// Company scale, not this intern’s service traffic. Verified against Afinit’s
// homepage (Google Play downloads) and official Series E announcement, 2026-10-03.
const afinitCompany = 'A Series E fintech company behind True Balance, a financial platform in India with over 100 million cumulative downloads.';
const afinitFundingSource = 'https://www.afinit.com/post/어피닛-시리즈e-320억-투자-유치-완료';
const aboutCopy = `<p>I enjoy <strong>working through problems</strong>. When something is frustrating, I want to know why. When I see a possible fix, I want to try building it. Software lets me turn those ideas into something real quickly. That’s what got me hooked on development.</p><p>I’m studying Software Convergence at Kyung Hee University. I co-founded Raspy, shipped our product, and ran it at live sports tournaments. At <strong>Afinit, a Series E fintech company</strong>, I worked on company-wide AI development infrastructure. I also led a university festival platform used by students and pop-up pub operators. My work has included deciding <strong>what to build</strong>, not just implementing a feature list, and adapting it to how people actually use it.</p><p>Most of my work is in backend systems and infrastructure, but I’ve also built apps and developer tools when the problem called for them. I like <strong>learning unfamiliar technology and digging into what’s blocking me</strong>. I treat the problems I take on as my own. Working code isn’t the finish line; I want to know <strong>whether it’s actually useful</strong>.</p>`;

export const works = [
  {
    slug: 'adelante', name: 'Kyung Hee University Festival Platform', type: 'Festival platform', role: 'Development Lead', date: '2026',
    lead: 'Built one platform for festival discovery and on-site pub operations.',
    summary: 'Proposed building and operating the festival service in-house. Led development across festival discovery, pub table management, and waitlists.',
    evidence: '17,308 estimated unique visitors · used by 13 pop-up pubs',
    body: `<h2>Why we offered to build it</h2>
      <p>The Student Council outsourced the festival website each year, but student engagement was low and the site did little to solve problems at the event. Our team proposed building and operating the service ourselves.</p>
      <p>We wanted students to find performances and booths easily, pub operators to focus on their guests, and future teams to inherit both the system and its usage records.</p>
      <h2>My responsibilities</h2>
      <p>As development lead, I drove product and technical decisions from planning through implementation, deployment, and operations. My responsibilities included backend and infrastructure architecture, AWS and Terraform, delivery workflows, code review, observability, and incident response.</p>
      <h2>Load testing and bottleneck analysis</h2>
      <p>A read API’s p95 latency was about seven seconds in load tests. Rather than immediately increasing the connection pool, I compared execution with and without virtual threads under the same resource limits and pool size.</p>
      <p>Under the same conditions, throughput rose from 16.6 to 45.5 req/s, and p95 latency fell from 6.98 to 2.40 seconds.</p>
      <p>Increasing the pool later reduced throughput. Based on the measurements, I adopted virtual threads and kept the pool at four connections. Higher concurrency also increased external errors on the AI path, showing that throughput and admission control were separate concerns.</p>
      <p class="note">Controlled local Docker comparison: 0.5 vCPU, 1 GB, 40 virtual users, 150 seconds. These figures are separate from live festival traffic.</p>
      <a class="text-link" href="${post(vt)}">Read the experiment and results ↗</a>
      <h2>Three days in the field</h2>
      <p>Over three days, the platform recorded 1,634,031 requests and 17,308 estimated unique visitors. Cumulative pub table occupancy was 1,386 hours and 45 minutes.</p>
      <p>The platform operated September 28–30, 2026. The 13 pubs recorded 648 table sessions, 167 waitlist registrations, and 156 admission calls. Festival information received 44,360 views.</p>
      <p class="note">Requests include pages, images, and API calls in the same deployment. Table occupancy sums the duration of individual table sessions across the 13 pubs.</p>
      <p>Visits, information views, and admission calls exceeded our targets, but sticker verifications reached only 99 against a target of 300. Shipping a feature and generating participation were different problems.</p>
      <p class="note">Source: Adelante festival results report, October 2, 2026. Unique visitors are estimated from visitor identifiers. These are team-wide service outcomes, not individual results.</p>`,
    related: [[vt, '2.7× Request Throughput: Introducing Java Virtual Threads']],
  },
  {
    slug: 'afinit', name: 'Afinit', type: 'Company-wide AI development infrastructure', role: 'AI-native Software Engineer (Intern)', date: '2026.01 — 2026.07',
    lead: 'Built infrastructure supporting AI-assisted service development across the company.',
    summary: 'Worked in the AI transformation team supporting company-wide AI-assisted development. Improved the shared development harness and built a QA agent for pre-deployment validation.',
    evidence: 'Shared development harness · AI-native QA',
    body: `<p>${afinitCompany}</p>
      <p class="note">Based on public company materials · <a href="https://www.afinit.com/">Platform scale</a> · <a href="${afinitFundingSource}">Series E funding</a></p>
      <h2>Why I joined and what I worked on</h2>
      <p>Afinit’s work on financial access in India drew me to the company. I applied because I wanted to contribute to solving a problem that mattered beyond the software itself.</p>
      <p>The AI transformation team’s goal was an environment where each employee could build and operate a service with AI—not just automate personal tasks, but create customer-facing services. I worked on the platform engineering behind that goal.</p>
      <h2>Shared development environment</h2>
      <p>I improved the shared harness in the company monorepo, including system prompts, skills, and hooks. Rather than waiting for an assigned task, I identified problems during use, submitted fixes, and incorporated them through PRs reviewed by our team lead.</p>
      <p>For example, a skill was meant to enforce the PR template, but its instructions could be lost in a large context. I added a hook to reinforce compliance in the execution flow instead of relying solely on automatic skill selection.</p>
      <h2>Building and dogfooding the QA tool</h2>
      <p>I built a QA agent to validate employee-created services before deployment. Initially I focused on implementation, including a general-purpose VM-based execution environment, without narrowing down exactly what needed validation.</p>
      <p>Using it at an internal hackathon with roughly 50 services showed that a polished implementation could still fit the problem poorly. Had web regression testing been the defined goal, I could have started with something smaller, such as Playwright and help authoring tests.</p>
      <p>This experience changed my view of engineering: understanding the product problem and its usage context is part of the job, not something to leave outside implementation.</p>
      <h2>Proposing a direction for agent collaboration</h2>
      <p>While using a Slack-based agent collaboration environment, I proposed moving from human intervention at each step toward agents collaborating under human oversight. Human-on-the-loop became one of the team’s long-term directions.</p>
      <p class="note">I did not implement the agent collaboration system. My contribution was the direction proposed from hands-on use; evaluating its effectiveness and cost remained separate work.</p>`,
    related: [],
  },
  {
    slug: 'raspy', name: 'Raspy', type: 'Sports community', role: 'Co-founder & Development Lead', date: '2025.05 — 2025.12',
    lead: 'Co-founded a sports social platform and tournament system, leading product delivery and on-site operations.',
    summary: 'Participated in incorporation, built and launched the initial app, and later led the development team. Operated a system used to run live matches while helping determine product and business priorities.',
    evidence: 'Incorporation · app launch · live tournament operations',
    body: `<h2>A sports platform built around match records</h2>
      <p>We believed amateur matches deserved records, and that those records could connect people. We incorporated and launched the product. Our long-term plan was to grow the community, then expand into venue rentals.</p>
      <h2>Product development and field operations</h2>
      <p>I built the initial infrastructure, backend, and frontend. Once the development team formed, I led it through task definition and code review, while contributing to product priorities and business decisions.</p>
      <p>Match combined a sports social network with a system for running live matches. I implemented WebSocket score synchronization and automatic brackets, with blue-green deployments, monitoring, and alerts to reduce the risk of disrupting matches.</p>
      <p>We operated at tournaments involving hundreds of participants, including Dongdaemun university events, Yonsei–Korea University exchanges, and our own events. Watching people hesitate on screens or struggle to find buttons led me to prioritize usability over new features.</p>
      <h2>Restructuring feed queries</h2>
      <p>The feed felt slow during use, so I inspected its queries. It repeatedly fetched match data that didn’t depend on the user. I moved shared data into a Caffeine local cache and combined it with user-specific information at request time.</p>
      <p>In the comparison test, average latency fell from 820 ms to 38 ms, and database queries per request fell from 81 to one.</p>
      <p class="note">These are comparative results on test data, not overall production latency.</p>
      <a class="text-link" href="${post(cache)}">Read the cache design and measurements ↗</a>
      <h2>Retention and business sustainability</h2>
      <p>Tournaments and marketing brought users in, but organic return visits were insufficient. We first added features such as a feed, thinking the product wasn’t engaging enough; later we identified the community’s cold-start problem.</p>
      <p>The service worked, but we closed the business without establishing sustainability. We did not reach revenue or venue-rental expansion. I learned the difference between a functioning product and a sustainable business.</p>`,
    related: [[startup, 'What Six Months of Building a Startup Taught Me']],
  },
];

export function primaryNavigation() {
  return `<nav class="primary-nav" aria-label="External links"><a href="https://github.com/xhae123" aria-label="Woojin Kim on GitHub" title="GitHub"><svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a></nav>`;
}

function shell(title, route, content, active = '') {
  const navigation = primaryNavigation(active === 'writing' ? 'writing' : 'portfolio');
  const header = `<header class="header"><a class="name" href="/">Woojin Kim</a>${navigation}</header>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="google-site-verification" content="sNrpo16A0vUj7vHmVNEmAGZj85cGykaOeHO44krbqDU">
<title>${escape(title)} · Woojin Kim</title><meta name="description" content="Woojin Kim, software engineer. Startup co-founder, Series E fintech AI infrastructure, product development, and programming education.">
<link rel="canonical" href="https://xhae123.github.io${route}"><meta property="og:title" content="${escape(title)} · Woojin Kim"><meta property="og:type" content="website"><meta property="og:url" content="https://xhae123.github.io${route}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/portfolio.css?v=gray-2"><link rel="stylesheet" href="/navigation.css?v=gray-2">${active === 'writing' ? '<link rel="stylesheet" href="/blog.css?v=gray-2">' : ''}
</head><body${active === 'writing' ? ' class="writing-page"' : ''}><a class="skip" href="#main">Skip to content</a><div class="page">
${header}
<main id="main">${content}</main></div></body></html>`;
}

function about() {
  return shell('About', '/about/', `<section class="page-intro"><p class="eyebrow">ABOUT</p><h1>Woojin Kim</h1></section><div class="prose">${aboutCopy}
  <h2>Experience</h2><dl class="timeline"><div><dt>2026.01 — 2026.07</dt><dd><a href="/work/afinit/">Afinit ↗</a><small>AI-native Software Engineer (Intern)</small></dd></div><div><dt>2025.05 — 2025.12</dt><dd><a href="/work/raspy/">Raspy ↗</a><small>Co-founder & Development Lead</small></dd></div><div><dt>2025.06 — Present</dt><dd>JamCoding Academy, Bundang<small>Programming / Algorithm Instructor</small></dd></div></dl>
  <h2>Learning together</h2><h3>LikeLion KHU</h3><p class="meta">Organizer · Backend Session Lead / 2026.03 — 2026.12</p><p>Ran project-based sessions for beginners and experienced members to grow at their own levels. Later shifted toward system-design presentations and discussions so members could explain their design choices in their own words.</p><p>Also led the new chapter’s official website, launching project and activity records, recruitment, content management, and authentication in August 2026.</p><h3>Teaching algorithms</h3><p>Teach C++, Python, data structures, and algorithms according to each student’s level and goals. Students have earned KOI and USACO awards and admission to science high schools through software-focused selection.</p>
  <h2>Awards</h2><ul><li>8th Education Public Data AI Utilization Competition — Bronze Prize</li><li>2025 Open Source Developer Competition — Bronze Prize / Mock Fox</li></ul>
  <h2>Education</h2><p>Kyung Hee University · Software Convergence<br><span class="meta">2022.03 — 2028.02 (expected)</span></p><h2>Contact</h2><p><a href="mailto:xhae000@gmail.com">xhae000@gmail.com</a><br><a href="https://github.com/xhae123">github.com/xhae123</a></p></div>`, 'about');
}

function writingRedirect() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><meta name="post-redirect" content="/"><link rel="canonical" href="https://xhae123.github.io/"><meta http-equiv="refresh" content="0;url=/"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>Post moved · Woojin Kim</title></head><body><p>The archive has moved. <a href="/">Continue to the posts</a>.</p><script>location.replace('/' + location.search + location.hash);</script></body></html>`;
}

function writing(items) {
  const cats = [...Object.keys(blogCategoryIcons), ...items.map(i => i.category)].filter((cat, index, all) => cat && all.indexOf(cat) === index && items.some(i => i.category === cat));
  const categories = cats.map(cat => `<button data-cat="${escape(cat)}" aria-pressed="false">${escape(cat.toLowerCase())}<span class="n">${items.filter(i => i.category === cat).length}</span></button>`).join('');
  const feed = items.map(i => `<a class="item" data-cat="${escape(i.category || '')}" href="${post(i.slug)}"><div class="i-main"><h2 class="i-title">${escape(i.title)}</h2>${i.excerpt ? `<p class="i-lead">${escape(i.excerpt)}</p>` : ''}<p class="i-meta"><time datetime="${escape(i.date.slice(0, 10))}">${escape(i.date.slice(0, 10).replaceAll('-', '.'))}</time>${i.category ? `<span class="sep">·</span><span class="i-category">${escape(i.category.toLowerCase())}</span>` : ''}</p></div>${i.cover?.src ? `<div class="i-thumb"><img src="${escape(i.cover.src)}" alt="" loading="lazy"></div>` : ''}</a>`).join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Writing · Woojin Kim</title><meta name="description" content="Engineering notes by Woojin Kim"><link rel="canonical" href="https://xhae123.github.io/"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css?v=gray-2"><link rel="stylesheet" href="/navigation.css?v=gray-2"><link rel="stylesheet" href="/blog.css?v=gray-2"></head><body class="writing-archive"><a class="blog-skip" href="#feed">Skip to content</a><div class="wrap"><aside class="rail"><div class="rail-identity"><a class="rail-name" href="/">woojin kim</a>${primaryNavigation()}</div><nav class="rail-cats" id="rail-cats" aria-label="Post categories"><button class="is-on" data-cat="*" aria-pressed="true">ALL<span class="n">${items.length}</span></button>${categories}</nav></aside><main class="feed" id="feed"><h1 class="visually-hidden">Writing</h1><section id="feed-list" aria-label="Blog posts">${feed}</section><p class="feed-empty" id="feed-empty" hidden>No posts in this category yet.</p></main></div><script src="/app.js?v=archive-2"></script></body></html>`;
}

export async function writePortfolio(items) {
  const pages = [['index.html', writing(items)], ['about/index.html', about()], ['writing/index.html', writingRedirect()]];
  for (const w of works) pages.push([`work/${w.slug}/index.html`, shell(w.name, `/work/${w.slug}/`, `<a class="back" href="/">← all posts</a><section class="page-intro"><p class="eyebrow">${escape(w.type)} / ${w.date}</p><h1>${w.name}</h1><p class="intro">${w.lead}</p><p class="meta">${w.role}</p></section><div class="prose">${w.body}</div>${w.related.length ? `<section class="related"><h2>Related posts</h2>${w.related.map(([s,t]) => `<a class="writing-row" href="${post(s)}">${t} ↗</a>`).join('')}</section>` : ''}<nav class="next-work" aria-label="Other experience">${works.filter(x => x !== w).map(x => `<a href="/work/${x.slug}/">${x.name} ↗</a>`).join('')}</nav>`, 'work')]);
  for (const [file, html] of pages) {
    const dir = file.slice(0, file.lastIndexOf('/'));
    if (dir) await mkdir(dir, { recursive: true });
    await writeFile(file, localizePostUrls(html));
  }
}
