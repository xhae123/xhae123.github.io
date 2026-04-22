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
})();
