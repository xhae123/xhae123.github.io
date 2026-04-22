(() => {
  const RSS_URL = 'https://v2.velog.io/rss/@xe0';
  const API = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const headerEl = document.getElementById('site-header');
  if (headerEl) {
    const onScroll = () => {
      headerEl.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  const listEl = document.getElementById('post-list');
  const postEl = document.getElementById('post');

  if (listEl) renderList();
  if (postEl) renderPost();

  async function fetchFeed() {
    const res = await fetch(API, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Feed error');
    return data.items || [];
  }

  function slugFromLink(link) {
    try {
      const url = new URL(link);
      const parts = url.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    } catch {
      return '';
    }
  }

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function firstImage(html) {
    if (!html) return null;
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  function firstParagraph(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const paras = tmp.querySelectorAll('p');
    for (const p of paras) {
      const text = (p.textContent || '').trim();
      if (text.length >= 20) return text;
    }
    return stripHtml(html);
  }

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  }

  function formatShortDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
  }

  function groupByYear(items) {
    const groups = new Map();
    for (const item of items) {
      const d = new Date(item.pubDate);
      const year = isNaN(d.getTime()) ? 'unknown' : d.getFullYear();
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year).push(item);
    }
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }

  async function renderList() {
    try {
      const items = await fetchFeed();
      if (!items.length) {
        listEl.innerHTML = '<div class="error">NO ENTRIES YET</div>';
        return;
      }
      const html = items
        .map((item, i) => {
          const slug = slugFromLink(item.link);
          const title = escapeHtml(item.title || '(제목 없음)');
          const date = formatDate(item.pubDate);
          const lead = escapeHtml(firstParagraph(item.content || item.description));
          return `
            <article class="entry" style="--i:${i}">
              <a class="entry-link" href="./post.html?slug=${encodeURIComponent(slug)}">
                <p class="entry-date">${date}</p>
                <div class="entry-body">
                  <h2 class="entry-title">${title}</h2>
                  <p class="entry-lead">${lead}</p>
                  <span class="entry-more">계속 읽기 →</span>
                </div>
              </a>
            </article>
          `;
        })
        .join('');
      listEl.innerHTML = html;
    } catch (err) {
      listEl.innerHTML = `<div class="error">FAILED TO LOAD</div>`;
      console.error(err);
    }
  }

  async function renderPost() {
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    if (!slug) {
      postEl.innerHTML = '<div class="error">INVALID URL</div>';
      return;
    }
    try {
      const items = await fetchFeed();
      const idx = items.findIndex((it) => slugFromLink(it.link) === slug);
      if (idx < 0) {
        postEl.innerHTML = '<div class="error">NOT FOUND</div>';
        return;
      }
      const item = items[idx];
      const title = escapeHtml(item.title || '');
      const date = formatDate(item.pubDate);
      document.title = `${item.title} · 김우진`;

      postEl.innerHTML = `
        <header class="post-header">
          <p class="post-meta">${date}</p>
          <h1 class="post-title">${title}</h1>
        </header>
        <div class="post-body" id="post-body"></div>
      `;
      const body = document.getElementById('post-body');
      body.innerHTML = item.content || item.description || '';
      sanitizeLinks(body);
      highlightCode(body);
      buildToc(body);
      renderPostNav(items, idx);
    } catch (err) {
      postEl.innerHTML = `<div class="error">FAILED TO LOAD</div>`;
      console.error(err);
    }
  }

  function renderPostNav(items, idx) {
    const navEl = document.getElementById('post-nav');
    if (!navEl) return;
    const newer = idx > 0 ? items[idx - 1] : null;
    const older = idx < items.length - 1 ? items[idx + 1] : null;
    if (!newer && !older) return;
    const makeLink = (item, side) => {
      if (!item) return '<span></span>';
      const slug = slugFromLink(item.link);
      const title = escapeHtml(item.title || '');
      const label = side === 'prev' ? '이전 글' : '다음 글';
      return `
        <a class="post-nav-item post-nav-item--${side}" href="./post.html?slug=${encodeURIComponent(slug)}">
          <span class="post-nav-label">${label}</span>
          <span class="post-nav-title">${title}</span>
        </a>
      `;
    };
    navEl.innerHTML = makeLink(older, 'prev') + makeLink(newer, 'next');
  }

  function buildToc(bodyEl) {
    const tocEl = document.getElementById('toc');
    if (!tocEl) return;
    const headings = bodyEl.querySelectorAll('h1, h2, h3');
    if (headings.length < 2) return;

    const used = new Set();
    const items = [];
    headings.forEach((h) => {
      if (!h.id) h.id = ensureUnique(slugify(h.textContent || 'section'), used);
      else used.add(h.id);
      items.push({ id: h.id, text: h.textContent || '', level: h.tagName.toLowerCase() });
    });

    const listHtml = items
      .map(
        (it) => `
      <li class="toc-item toc-item--${it.level}">
        <a href="#${it.id}" data-target="${it.id}">${escapeHtml(it.text)}</a>
      </li>`
      )
      .join('');

    tocEl.innerHTML = `
      <p class="toc-title">목차</p>
      <ul class="toc-list">${listHtml}</ul>
    `;

    const links = tocEl.querySelectorAll('a[data-target]');
    const linkById = new Map();
    links.forEach((a) => linkById.set(a.dataset.target, a));

    const setActive = (id) => {
      links.forEach((a) => a.classList.toggle('is-active', a.dataset.target === id));
    };

    let activeId = items[0].id;
    const visible = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
          else visible.delete(e.target.id);
        });
        if (visible.size) {
          const topId = [...visible.entries()].sort((a, b) => {
            const ea = document.getElementById(a[0]).getBoundingClientRect().top;
            const eb = document.getElementById(b[0]).getBoundingClientRect().top;
            return ea - eb;
          })[0][0];
          if (topId !== activeId) {
            activeId = topId;
            setActive(activeId);
          }
        }
      },
      { rootMargin: '-80px 0px -65% 0px', threshold: [0, 1] }
    );
    headings.forEach((h) => observer.observe(h));
    setActive(activeId);
  }

  function slugify(text) {
    return (
      text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}\-]/gu, '')
        .slice(0, 60) || 'section'
    );
  }

  function ensureUnique(base, used) {
    let id = base;
    let i = 2;
    while (used.has(id)) id = `${base}-${i++}`;
    used.add(id);
    return id;
  }

  function highlightCode(root) {
    const blocks = root.querySelectorAll('pre code');
    if (!blocks.length) return;
    const run = () => {
      blocks.forEach((el) => {
        const cls = el.className || '';
        const m = cls.match(/language-([\w-]+)/i);
        const lang = m ? m[1].toLowerCase() : null;
        try {
          if (window.hljs) {
            if (lang && window.hljs.getLanguage && window.hljs.getLanguage(lang)) {
              el.classList.add(`language-${lang}`);
            }
            window.hljs.highlightElement(el);
          }
        } catch (e) {
          console.warn('highlight failed', e);
        }
        const pre = el.closest('pre');
        if (pre && lang) pre.setAttribute('data-lang', lang);
      });
    };
    if (window.hljs) run();
    else window.addEventListener('load', run, { once: true });
  }

  function sanitizeLinks(root) {
    root.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (/^https?:\/\/(www\.)?velog\.io\/@xe0\//.test(href)) {
        const internalSlug = slugFromLink(href);
        if (internalSlug) {
          a.setAttribute('href', `./post.html?slug=${encodeURIComponent(internalSlug)}`);
          a.removeAttribute('target');
        }
      } else if (/^https?:/.test(href)) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }
})();
