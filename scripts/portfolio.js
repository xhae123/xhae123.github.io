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
const hiringNote = `<div class="hiring-note"><p>I’d like to work with a team that thinks about which problems to solve, not just what to build. I enjoy building, getting things into users’ hands, and improving them based on what happens. <span class="hiring-invitation">If that’s the kind of engineer you’re looking for, I’d love to hear from you. I’m open to remote roles with teams worldwide.</span></p><p class="hiring-email">xhae000@gmail.com</p></div>`;
const aboutCopy = `<p>I enjoy <strong>working through problems</strong>. When something is frustrating, I want to know why. When I see a possible fix, I want to try building it. Software lets me turn those ideas into something real quickly. That’s what got me hooked on development.</p><p>I’m studying Software Convergence at Kyung Hee University. I co-founded Raspy, shipped our product, and ran it at live sports tournaments. At <strong>Afinit, a Series E fintech company</strong>, I worked on company-wide AI development infrastructure. I also led a university festival platform used by students and pop-up pub operators. My work has included deciding <strong>what to build</strong>, not just implementing a feature list, and adapting it to how people actually use it.</p><p>Most of my work is in backend systems and infrastructure, but I’ve also built apps and developer tools when the problem called for them. I like <strong>learning unfamiliar technology and digging into what’s blocking me</strong>. I treat the problems I take on as my own. Working code isn’t the finish line; I want to know <strong>whether it’s actually useful</strong>.</p>`;

export const works = [
  {
    slug: 'adelante', name: 'Kyung Hee University Festival Platform', type: 'Festival platform', role: 'Development Lead', date: '2026',
    lead: 'Built one platform for festival discovery and on-site pub operations.',
    summary: 'Proposed building and operating the festival service in-house. Led development across festival discovery, pub table management, and waitlists.',
    evidence: '17,308 estimated unique visitors · used by 13 pop-up pubs',
    overview: {
      context: 'Kyung Hee University Fall Festival · Student Council collaboration',
      bullets: [
        { contribution: 'Led a platform that supported on-site operations as well as festival discovery. Defined product direction and priorities with the Student Council; owned system design, deployment, and live operations.' },
        { contribution: 'Connected performance and booth discovery with table and waitlist management. Built the operational system used by 13 pop-up pubs during the festival.' },
        { contribution: 'Designed highly available infrastructure for five AWS ECS services under concentrated, three-day traffic. Distributed services across two Availability Zones, configured ALB routing and API autoscaling, and managed infrastructure with Terraform.' },
        { contribution: 'Investigated growing database waits in load tests before adding capacity. Compared request execution models under identical resource limits; introducing virtual threads improved throughput by 2.7× in the controlled comparison.' },
        { contribution: 'The three-day festival recorded 17,308 estimated unique visitors and 1,634,031 requests. Across 13 pubs, cumulative table occupancy reached 1,386 hours and 45 minutes.' },
      ],
    },
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
    overview: {
      context: afinitCompany,
      bullets: [
        { contribution: 'Worked on platform engineering for the company’s goal of enabling each employee to build and operate a customer-facing service with AI. Contributed to the design and development of workflow automation and shared AI development infrastructure.' },
        { contribution: 'Improved the AI development harness in the company-wide monorepo. Refined agent context and development rules, reinforcing execution workflows where instructions alone were unreliable, then incorporated the changes into the shared environment.' },
        { contribution: 'Built a QA tool for validating AI-created services before deployment. Dogfooding it at an internal hackathon with roughly 50 services exposed a gap between the tool and actual validation needs, showing why scope had to be defined before implementation.' },
        { contribution: 'Proposed a human-on-the-loop direction based on using the agent collaboration environment: autonomous collaboration with human oversight rather than intervention at every step. The team adopted it as a long-term direction.' },
      ],
    },
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
    overview: {
      context: 'Raspy · Match, a platform for sports records and social connections',
      bullets: [
        { contribution: 'Co-founded Match and participated in incorporation. Built the initial frontend, backend, and infrastructure and shipped to app stores; later led the development team, managing priorities, code review, and release quality.' },
        { contribution: 'Built a real-time tournament system with WebSocket score synchronization and automatic brackets. Operated it at events with hundreds of participants, including Dongdaemun university tournaments and Yonsei–Korea University exchanges.' },
        { contribution: 'Implemented blue-green deployments, monitoring, and incident alerts because a service failure could halt matches on site. Improved the slow feed by separating shared data retrieval from user-specific data.' },
        { contribution: 'Observed participants on site and prioritized usability over additional features. Later distinguished event-driven acquisition from organic return visits, assessed the community’s sustainability, and helped decide to close the business.' },
      ],
    },
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
  const isHome = route === '/';
  const navigation = primaryNavigation(active === 'writing' ? 'writing' : 'portfolio');
  const header = isHome
    ? `<header class="identity"><a class="identity-home" href="/" aria-label="Woojin Kim home"><h1>woojin kim</h1><span>software engineer</span></a>${navigation}</header>`
    : `<header class="header"><a class="name" href="/">Woojin Kim</a>${navigation}</header>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="google-site-verification" content="sNrpo16A0vUj7vHmVNEmAGZj85cGykaOeHO44krbqDU">
<title>${escape(title)} · Woojin Kim</title><meta name="description" content="Woojin Kim, software engineer. Startup co-founder, Series E fintech AI infrastructure, product development, and programming education.">
<link rel="canonical" href="https://xhae123.github.io${route}"><meta property="og:title" content="${escape(title)} · Woojin Kim"><meta property="og:type" content="website"><meta property="og:url" content="https://xhae123.github.io${route}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/portfolio.css?v=gray-2"><link rel="stylesheet" href="/navigation.css?v=gray-2">${active === 'writing' ? '<link rel="stylesheet" href="/blog.css?v=gray-2">' : ''}
</head><body${isHome ? ' class="folio-home"' : active === 'writing' ? ' class="writing-page"' : ''}><a class="skip" href="#main">Skip to content</a><div class="page">
${header}
<main id="main">${content}</main><footer><span>Woojin Kim</span><span>Software Engineer</span></footer></div></body></html>`;
}

function home(items) {
  const overview = slug => {
    const { context, bullets, links } = works.find(w => w.slug === slug).overview;
    return { id: `case-${slug}`, company: context, bullets, links };
  };
  const entries = [
    {
      name: 'Afinit', date: '2026.01 — 2026.07', kind: 'work',
      role: 'AI-native Software Engineer (Intern)',
      ...overview('afinit'),
    },
    {
      name: 'Kyung Hee University Festival Platform', date: '2026', kind: 'project',
      role: 'Development Lead',
      ...overview('adelante'),
      company: '',
    },
    {
      name: 'LikeLion KHU — Organizer & Backend Session Lead', date: '2026.03 — 2026.12', kind: 'activity',
      role: 'Kyung Hee University chapter',
      company: 'The Kyung Hee University chapter of the inter-university development community, founded in 2026.',
      bullets: [
        { contribution: 'Designed the new chapter’s backend curriculum and ran sessions across both semesters.' },
        { contribution: 'Created project-based learning where beginners and experienced members could grow together.' },
        { contribution: 'Ran a system-design study group connecting implementation experience with design reasoning and explanation for members preparing for employment.' },
      ],
    },
    {
      name: 'LikeLion IT club official website', date: '2026.08 launch', kind: 'project',
      role: 'PM & Product Owner',
      scope: 'The chapter’s official service for recruitment, member profiles, and activity records.',
      bullets: [
        { contribution: 'Set the product goal: establish the new chapter’s official channel and preserve records for future cohorts. As PM and product owner, defined the launch scope and led design and development to release in about a month.' },
        { contribution: 'Planned an operational service rather than a brochure site. Built project, activity, and member records with content and recruitment management so routine updates would not depend on developers.' },
        { contribution: 'Structured asynchronous collaboration so team members and AI shared context and acceptance criteria. Documented how to hand over work context, verification results, and administrative access.' },
        { contribution: 'Defined success criteria around application conversion and member participation, not simply going live. Specified post-launch measurements and review timing.' },
      ],
    },
    {
      name: 'Real-Time Intervention System for Digital Distraction During Study', date: '2026', kind: 'project',
      role: 'Project Lead · Research & Development',
      id: 'jansol',
      scope: 'An Android app that detects distractions during study and helps users return.',
      bullets: [
        { contribution: 'Used student surveys and expert interviews to define phone distraction during study. Owned product design, team leadership, and end-to-end app development, intervening at the moment of distraction to help users return.' },
        { contribution: 'Without training data, prioritized shipping a rule-based app over building a personalization model. Captured distraction, intervention, and return events to create the foundation for later experiments.' },
        { contribution: 'Registered 152 users through Google Play internal testing, with 47 weekly active users and 9,214 intervention events over four weeks.' },
        { contribution: 'Analyzed user responses and bias in the collected behavior data. Compared personalization policies through simulation to assess the next development step.' },
      ],
    },
    {
      name: '8th Education Public Data AI Utilization Competition — Bronze Prize', date: '2026.08', kind: 'award',
      role: 'Ministry of Education · Korea Institute for Curriculum and Evaluation',
      bullets: [
        { contribution: 'Built a service translating coding test scores into curriculum-level learning diagnostics for subsequent lessons.' },
        { contribution: 'Designed assessment and diagnosis around the national curriculum; owned problem definition, planning, development, and presentation.' },
      ],
    },
    {
      name: 'Netty Open Source Contributions', date: '2026', kind: 'open-source',
      role: 'Java · networking framework',
      externalContribution: true,
      bullets: [
        { contribution: 'Analyzed a DNS resolver shutdown bug affecting a cache shared by other resolvers. Submitted a fix with regression tests.' },
        { contribution: 'Reviewed edge cases in WebSocket shutdown and direct-memory configuration handling, proposing fixes and verification approaches.' },
      ],
      links: [['https://github.com/netty/netty', 'GitHub']],
    },
    {
      name: 'Raspy', date: '2025.05 — 2025.12', kind: 'work',
      role: 'Co-founder & Development Lead',
      ...overview('raspy'),
      company: 'A startup developing and operating Match, a sports platform for match records, social connections, and tournament operations, with a long-term goal of expanding into venue rentals.',
    },
    {
      name: 'JamCoding Academy, Bundang', date: '2025.06 — Present', kind: 'work',
      role: 'Programming & Algorithms Instructor',
      company: 'A programming academy for students preparing for software-specialized high schools, science high schools, and universities abroad.',
      bullets: [
        { contribution: 'Teach three regular classes preparing students for admissions and programming competitions. Tailor learning plans to individual levels and goals, covering C++, Python, data structures, and algorithms.' },
        { contribution: 'Teach students to analyze problems and explain their reasoning rather than reproduce solutions. Adjust pacing, examples, and explanations around where understanding breaks down.' },
        { contribution: 'Students have earned awards in the Korean Olympiad in Informatics (KOI) and USACO, and gained admission to science high schools through software-focused selection.' },
      ],
    },
    {
      name: 'Open Source Developer Competition — Bronze Prize', date: '2025.12', kind: 'award',
      role: 'Ministry of Science and ICT',
      bullets: [
        { contribution: 'Awarded for Mock Fox, a standalone API mock server generator.' },
      ],
    },
    {
      name: 'Youth SW Companion Hackathon — University Mentor', date: '2025.07', kind: 'activity',
      role: 'Ministry of Science and ICT',
      bullets: [
        { contribution: 'Reviewed architecture and technical feasibility to help teams turn ideas into implementable services.' },
        { contribution: 'Mentored teams through diagnosis and resolution of technical problems during development.' },
        { contribution: 'Evaluated final products for quality and technical merit and provided engineering feedback.' },
      ],
    },
    {
      name: 'KVS (KHU Valley Start-up) — Growth Team Prize', date: '2024.11', kind: 'award',
      role: 'Kyung Hee University LINC 3.0',
      bullets: [
        { contribution: 'Planned a gifting platform connecting online purchase with offline use, including service flows, implementation scope, and a commercialization roadmap.' },
      ],
    },
    {
      name: 'Tourism Data Service Development Competition — Excellence Prize', date: '2024.10', kind: 'award',
      role: 'Korea Tourism Organization · Kakao',
      bullets: [
        { contribution: 'Built a camping curation service consolidating fragmented tourism information into relevant recommendations.' },
        { contribution: 'Implemented public tourism data integration and behavior-based recommendations.' },
      ],
    },
    {
      name: 'Youth Digital Problem-Solving Project — University Mentor', date: '2024.08 — 2024.11', kind: 'activity',
      role: 'Korea Foundation for the Advancement of Science and Creativity',
      bullets: [
        { contribution: 'Helped youth teams translate social problems and product ideas into software, defining necessary features and implementation approaches.' },
        { contribution: 'Visualized complex logic for nontechnical learners and worked through development challenges together.' },
      ],
    },
    {
      name: 'Gangwon Open Military Startup Competition — Grand Prize', date: '2023.10', kind: 'award',
      role: 'Kangwon National University · ROK Army II Corps',
      bullets: [
        { contribution: 'Planned and prototyped a home-services marketplace addressing information asymmetry.' },
      ],
    },
    {
      name: 'SQLD (SQL Developer)', date: '2023.08', kind: 'certificate',
      role: 'Korea Data Agency',
      text: 'Certified SQL Developer.',
    },
    {
      name: 'Kyung Hee University', date: '2022.03 — 2028.02', kind: 'education',
      role: 'Software Convergence · Undergraduate',
      text: 'Expected graduation: February 2028.',
    },
  ];
  // Selected original repositories; forks and student exercise repositories are excluded.
  // Repository source, README and licenses checked against GitHub on 2026-10-04.
  entries.push(
    {
      name: 'Mock Fox', date: '2025', kind: 'open-source', role: 'Standalone mock server generator',
      bullets: [
        { contribution: 'Built a tool that turns API specifications into runnable mock servers so frontend work can proceed without waiting for backend implementation.' },
        { contribution: 'Led the project and implemented the Go core engine. Generated standalone executables from API specifications so users could run mock APIs without installing a runtime.' },
      ],
      links: [['https://github.com/The-Plain-OSS/mock-fox', 'GitHub']],
    },
    {
      name: 'ProtoDiff', date: '2025', kind: 'open-source', role: 'gRPC schema drift detection in Kubernetes',
      bullets: [
        { contribution: 'Built a tool detecting contract mismatches between deployed gRPC services and a schema registry. Combined Kubernetes discovery with gRPC Reflection to compare live schemas.' },
        { contribution: 'Implemented the inspection engine and results dashboard end to end. Inspects live service schemas without adding sidecars.' },
      ],
      links: [['https://github.com/xhae123/protodiff', 'GitHub']],
    },
    {
      name: 'issue-blog', date: '2026', kind: 'open-source', role: 'Open-source personal blog engine powered by GitHub Issues',
      bullets: [
        { contribution: 'Built a blog engine that manages posts through GitHub Issues without a separate server or database, with installation and publishing workflows for coding agents.' },
      ],
      links: [['https://github.com/xhae123/issue-blog', 'GitHub']],
    },
    {
      name: 'hi-web', date: '2026', kind: 'open-source', role: 'Web literacy learning platform',
      bullets: [
        { contribution: 'Built a browser-based learning platform with Korean and English curricula, helping learners understand, edit, and verify AI-generated websites without installing tools.' },
      ],
      links: [['https://github.com/xhae123/hi-web', 'GitHub']],
    },
  );
  const renderEntry = e => {
    if (['award', 'activity'].includes(e.kind)) return `<article class="folio-entry compact-entry${e.kind === 'award' ? ' award-entry' : ''}" data-kind="${escape(e.kind)}"><header class="folio-entry-summary"><h3>${escape(e.name)}</h3><p class="folio-role">${escape(e.role)}</p><p class="folio-date">${escape(e.date)}</p></header></article>`;
    const isWork = e.kind === 'work';
    const description = `<ul class="folio-bullets">${e.bullets.map(({ contribution, evidence }) => `<li><span class="contribution">${markedContribution(contribution, e.name)}</span>${evidence ? `<ul class="contribution-evidence"><li>${escape(evidence)}</li></ul>` : ''}</li>`).join('')}</ul>`;
    return `<article class="folio-entry${isWork ? ' folio-entry-primary' : ''}"${e.id ? ` id="${escape(e.id)}"` : ''} data-kind="${escape(e.kind)}"><header class="folio-entry-summary"><h3>${escape(e.name)}</h3>${e.role ? `<p class="folio-role">${escape(e.role)}</p>` : ''}<p class="folio-date${e.kind === 'open-source' ? ' folio-date-linked' : ''}">${escape(e.date)}${e.kind === 'open-source' && e.links?.length ? `<span class="folio-entry-links">${e.links.map(([href,label]) => `<a href="${escape(href)}">${escape(label)} <span aria-hidden="true">↗</span></a>`).join('')}</span>` : ''}</p></header><div class="folio-entry-body">${e.company ? `<p class="folio-company">${escape(e.company)}</p>` : ''}${e.scope ? `<p class="folio-scope">${escape(e.scope)}</p>` : ''}${description}${e.kind !== 'open-source' && e.links?.length ? `<div class="folio-entry-links">${e.links.map(([href,label]) => `<a href="${href}">${escape(label)} <span aria-hidden="true">↗</span></a>`).join('')}</div>` : ''}</div></article>`;
  };
  const workOrder = ['Afinit', 'Raspy', 'JamCoding Academy, Bundang'];
  const sections = [
    ['work', 'Work Experience', 'Employment', ['work']],
    ['projects', 'Selected Projects', 'Products', ['project']],
    ['community', 'Awards & Activities', '', ['award', 'activity']],
    ['background', 'Education', 'Education & Certifications', ['education', 'certificate']],
    ['open-source', 'Open Source', '', ['open-source']],
  ];
  const sectionHeading = (id, title) => `<div class="folio-group-heading"><h2 id="${id}-title">${escape(title.toLowerCase())}</h2></div>`;
  const renderGroup = (id, title, kinds) => {
    const selected = entries.filter(e => kinds.includes(e.kind));
    if (id === 'community') selected.sort((a, b) => b.date.localeCompare(a.date));
    if (id === 'work') selected.sort((a, b) => {
      const rank = e => workOrder.includes(e.name) ? workOrder.indexOf(e.name) : workOrder.length;
      return rank(a) - rank(b);
    });
    const label = sections.find(s => s[0] === id)[2];
    const contents = selected.map(renderEntry).join('');
    return `<section class="folio-group${id === 'work' ? ' folio-group-primary' : ''}" id="${id}" aria-labelledby="${id}-title">${sectionHeading(id, title, label)}${contents}</section>`;
  };
  return shell('Software Engineer', '/', `<section class="folio-intro" id="about-me" aria-labelledby="about-me-title"><h2 id="about-me-title">about me</h2><div class="about-copy">${aboutCopy}</div>${hiringNote}</section>
  ${items.length ? `<section class="recent-writing" id="recent-writing" aria-labelledby="recent-writing-title"><div class="recent-writing-heading"><h2 id="recent-writing-title"><a href="/writing/">recent posts</a></h2></div><div class="recent-writing-list">${[...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(item => `<a class="recent-article" href="${post(item.slug)}">${item.cover?.src ? `<img src="${escape(item.cover.src)}" alt="" width="104" height="64" loading="lazy">` : '<span class="recent-article-placeholder" aria-hidden="true">↗</span>'}<div class="recent-article-copy"><div class="recent-article-meta"><time datetime="${escape(item.date.slice(0, 10))}">${escape(item.date.slice(0, 10).replaceAll('-', '.'))}</time>${item.category ? `<span aria-hidden="true">·</span><span class="recent-article-category">${escape(item.category.toLowerCase())}</span>` : ''}</div><h3>${escape(item.title)}</h3></div></a>`).join('')}</div><a class="recent-writing-more" href="/writing/">view all <span aria-hidden="true">↗</span></a></section>` : ''}
  ${sections.slice(0, -2).map(([id, title, label, kinds]) => renderGroup(id, title, kinds)).join('')}
  <section class="folio-background" id="background" aria-labelledby="background-title">${sectionHeading('background', 'Education', 'Education & Certifications')}${entries.filter(e => ['education','certificate'].includes(e.kind)).reverse().map(e => `<div class="background-row"><div><h3>${escape(e.name)}</h3><p>${escape(e.role)}${e.kind === 'education' ? ' · expected graduation' : ''}</p></div><span>${escape(e.date)}</span></div>`).join('')}</section>
  ${renderGroup('open-source', 'Open Source', ['open-source'])}
  `);
}
function about() {
  return shell('About', '/about/', `<section class="page-intro"><p class="eyebrow">ABOUT</p><h1>Woojin Kim</h1></section><div class="prose">${aboutCopy}
  <h2>Experience</h2><dl class="timeline"><div><dt>2026.01 — 2026.07</dt><dd><a href="/work/afinit/">Afinit ↗</a><small>AI-native Software Engineer (Intern)</small></dd></div><div><dt>2025.05 — 2025.12</dt><dd><a href="/work/raspy/">Raspy ↗</a><small>Co-founder & Development Lead</small></dd></div><div><dt>2025.06 — Present</dt><dd>JamCoding Academy, Bundang<small>Programming / Algorithm Instructor</small></dd></div></dl>
  <h2>Learning together</h2><h3>LikeLion KHU</h3><p class="meta">Organizer · Backend Session Lead / 2026.03 — 2026.12</p><p>Ran project-based sessions for beginners and experienced members to grow at their own levels. Later shifted toward system-design presentations and discussions so members could explain their design choices in their own words.</p><p>Also led the new chapter’s official website, launching project and activity records, recruitment, content management, and authentication in August 2026.</p><h3>Teaching algorithms</h3><p>Teach C++, Python, data structures, and algorithms according to each student’s level and goals. Students have earned KOI and USACO awards and admission to science high schools through software-focused selection.</p>
  <h2>Awards</h2><ul><li>8th Education Public Data AI Utilization Competition — Bronze Prize</li><li>2025 Open Source Developer Competition — Bronze Prize / Mock Fox</li></ul>
  <h2>Education</h2><p>Kyung Hee University · Software Convergence<br><span class="meta">2022.03 — 2028.02 (expected)</span></p><h2>Contact</h2><p><a href="mailto:xhae000@gmail.com">xhae000@gmail.com</a><br><a href="https://github.com/xhae123">github.com/xhae123</a></p></div>`, 'about');
}

function writing(items) {
  const cats = [...Object.keys(blogCategoryIcons), ...items.map(i => i.category)].filter((cat, index, all) => cat && all.indexOf(cat) === index && items.some(i => i.category === cat));
  const categories = cats.map(cat => `<button data-cat="${escape(cat)}" aria-pressed="false">${escape(cat.toLowerCase())}<span class="n">${items.filter(i => i.category === cat).length}</span></button>`).join('');
  const feed = items.map(i => `<a class="item" data-cat="${escape(i.category || '')}" href="${post(i.slug)}"><div class="i-main"><h2 class="i-title">${escape(i.title)}</h2>${i.excerpt ? `<p class="i-lead">${escape(i.excerpt)}</p>` : ''}<p class="i-meta"><time datetime="${escape(i.date.slice(0, 10))}">${escape(i.date.slice(0, 10).replaceAll('-', '.'))}</time>${i.category ? `<span class="sep">·</span><span class="i-category">${escape(i.category.toLowerCase())}</span>` : ''}</p></div>${i.cover?.src ? `<div class="i-thumb"><img src="${escape(i.cover.src)}" alt="" loading="lazy"></div>` : ''}</a>`).join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Writing · Woojin Kim</title><meta name="description" content="Engineering notes by Woojin Kim"><link rel="canonical" href="https://xhae123.github.io/writing/"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css?v=gray-2"><link rel="stylesheet" href="/navigation.css?v=gray-2"><link rel="stylesheet" href="/blog.css?v=gray-2"></head><body class="writing-archive"><a class="blog-skip" href="#feed">Skip to content</a><div class="wrap"><aside class="rail"><div class="rail-identity"><a class="rail-name" href="/">woojin kim</a>${primaryNavigation()}</div><a class="rail-portfolio" href="/#about-me">← about me</a><nav class="rail-cats" id="rail-cats" aria-label="Post categories"><button class="is-on" data-cat="*" aria-pressed="true">ALL<span class="n">${items.length}</span></button>${categories}</nav></aside><main class="feed" id="feed"><h1 class="visually-hidden">Writing</h1><section id="feed-list" aria-label="Blog posts">${feed}</section><p class="feed-empty" id="feed-empty" hidden>No posts in this category yet.</p></main></div><script src="/app.js?v=archive-2"></script></body></html>`;
}

export async function writePortfolio(items) {
  const pages = [['index.html', home(items)], ['about/index.html', about()], ['writing/index.html', writing(items)]];
  for (const w of works) pages.push([`work/${w.slug}/index.html`, shell(w.name, `/work/${w.slug}/`, `<a class="back" href="/#case-${w.slug}">← Portfolio</a><section class="page-intro"><p class="eyebrow">${escape(w.type)} / ${w.date}</p><h1>${w.name}</h1><p class="intro">${w.lead}</p><p class="meta">${w.role}</p></section><div class="prose">${w.body}</div>${w.related.length ? `<section class="related"><h2>Related posts</h2>${w.related.map(([s,t]) => `<a class="writing-row" href="${post(s)}">${t} ↗</a>`).join('')}</section>` : ''}<nav class="next-work" aria-label="Other experience">${works.filter(x => x !== w).map(x => `<a href="/work/${x.slug}/">${x.name} ↗</a>`).join('')}</nav>`, 'work')]);
  for (const [file, html] of pages) {
    const dir = file.slice(0, file.lastIndexOf('/'));
    if (dir) await mkdir(dir, { recursive: true });
    await writeFile(file, localizePostUrls(html));
  }
}
