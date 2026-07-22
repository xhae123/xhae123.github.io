(() => {
  // Sticky header scroll shadow
  const headerEl = document.getElementById('site-header');
  if (headerEl) {
    const onScroll = () => headerEl.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // TOC scroll-spy (works on pre-rendered TOC)
  const toc = document.getElementById('toc');
  if (toc) {
    const links = Array.from(toc.querySelectorAll('a[data-target]'));
    if (links.length) {
      const headings = links
        .map((a) => document.getElementById(a.dataset.target))
        .filter(Boolean);
      if (headings.length) {
        const setActive = (id) =>
          links.forEach((a) => a.classList.toggle('is-active', a.dataset.target === id));

        let activeId = headings[0].id;
        setActive(activeId);

        const visible = new Set();
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) visible.add(e.target.id);
              else visible.delete(e.target.id);
            });
            if (visible.size) {
              const sorted = Array.from(visible).sort((a, b) => {
                const ra = document.getElementById(a).getBoundingClientRect().top;
                const rb = document.getElementById(b).getBoundingClientRect().top;
                return ra - rb;
              });
              if (sorted[0] !== activeId) {
                activeId = sorted[0];
                setActive(activeId);
              }
            }
          },
          { rootMargin: '-80px 0px -65% 0px', threshold: [0, 1] }
        );
        headings.forEach((h) => observer.observe(h));
      }
    }
  }

  // Home category filter (rail on desktop, sticky toolbar on mobile)
  const railCats = document.getElementById('rail-cats');
  if (railCats) {
    const buttons = Array.from(railCats.querySelectorAll('button'));
    const items = Array.from(document.querySelectorAll('.item'));
    const emptyEl = document.getElementById('feed-empty');

    const applyFilter = (cat, { animate = false } = {}) => {
      let visible = 0;
      items.forEach((item) => {
        const show = cat === '*' || item.dataset.cat === cat;
        item.classList.toggle('is-hidden', !show);
        if (show) visible++;
        if (show && animate) {
          // Re-trigger the fade-up on surviving items without the load-time
          // stagger, so a category switch reads as one quick refresh, not a
          // hard cut.
          item.classList.add('is-refiltering');
          item.style.animation = 'none';
          void item.offsetHeight;
          item.style.animation = '';
        }
      });
      if (emptyEl) emptyEl.hidden = visible !== 0;
      buttons.forEach((b) => b.classList.toggle('is-on', b.dataset.cat === cat));
    };

    const syncUrl = (cat) => {
      const url = new URL(window.location.href);
      if (cat === '*') url.searchParams.delete('cat');
      else url.searchParams.set('cat', cat);
      window.history.replaceState(null, '', url.pathname + url.search);
    };

    buttons.forEach((b) => {
      b.addEventListener('click', () => {
        const cat = b.dataset.cat;
        applyFilter(cat, { animate: true });
        syncUrl(cat);
      });
    });

    const initial = new URLSearchParams(window.location.search).get('cat');
    const validCats = buttons.map((b) => b.dataset.cat);
    if (initial && validCats.includes(initial)) applyFilter(initial);
  }
})();
