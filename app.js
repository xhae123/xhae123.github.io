(() => {
  // Shared figure galleries. Native scrolling also works without this enhancement.
  document.querySelectorAll('[data-gallery]').forEach((gallery, galleryIndex) => {
    const track = gallery.querySelector(':scope > ol');
    const slides = track ? Array.from(track.children) : [];
    if (slides.length < 2) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!gallery.id) gallery.id = `article-gallery-${galleryIndex + 1}`;
    track.id = `${gallery.id}-screens`;
    gallery.setAttribute('aria-roledescription', 'carousel');
    const controls = document.createElement('nav');
    controls.dataset.galleryOverlay = '';
    controls.setAttribute('aria-label', 'Product tour navigation');
    const status = document.createElement('div');
    status.dataset.galleryStatus = '';
    const count = document.createElement('span');
    count.dataset.galleryCount = '';
    count.setAttribute('role', 'status');
    count.setAttribute('aria-atomic', 'true');
    const dots = document.createElement('div');
    dots.dataset.galleryDots = '';
    const arrows = document.createElement('div');
    arrows.dataset.galleryArrows = '';
    const button = (label, text = '') => {
      const element = document.createElement('button');
      element.type = 'button';
      element.setAttribute('aria-label', label);
      element.setAttribute('aria-controls', track.id);
      element.textContent = text;
      return element;
    };
    const previous = button('Previous screen');
    const next = button('Next screen');
    previous.innerHTML = '<span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m14 6-6 6 6 6"/></svg></span>';
    next.innerHTML = '<span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m10 6 6 6-6 6"/></svg></span>';
    const playback = button('Pause automatic slideshow');
    playback.dataset.galleryPlayback = '';
    const progress = document.createElement('div');
    progress.dataset.galleryProgress = '';
    progress.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    progress.append(fill);
    status.append(count, playback);
    arrows.append(previous, next);
    controls.append(status, dots, arrows, progress);
    gallery.append(controls);

    const duration = 6000;
    let current = -1;
    let elapsed = 0;
    let lastTick = null;
    let playbackFrame = 0;
    let inView = false;
    let hovered = false;
    let held = false;
    let keyboardFocused = false;
    let userPaused = reducedMotion.matches;
    let settling = false;
    let settleTimer;
    const selectors = slides.map((slide, index) => {
      const title = slide.querySelector('figcaption p')?.textContent.trim() || `Screen ${index + 1}`;
      const selector = button(`Show screen ${index + 1}: ${title}`);
      selector.addEventListener('click', () => goTo(index));
      dots.append(selector);
      slide.querySelector('img')?.addEventListener('load', syncPlayback);
      return selector;
    });
    function renderProgress() {
      fill.style.transform = `scaleX(${Math.min(1, elapsed / duration)})`;
    }
    function canPlay() {
      const img = slides[current]?.querySelector('img');
      return inView && !document.hidden && !userPaused && !hovered && !held && !keyboardFocused
        && !settling && img?.complete && img.naturalWidth > 0;
    }
    function syncPlayback() {
      const playing = canPlay();
      count.setAttribute('aria-live', playing ? 'off' : 'polite');
      if (playing && !playbackFrame) {
        lastTick = null;
        playbackFrame = requestAnimationFrame(tick);
      } else if (!playing) {
        cancelAnimationFrame(playbackFrame);
        playbackFrame = 0;
        lastTick = null;
      }
    }
    function tick(time) {
      playbackFrame = 0;
      if (!canPlay()) { lastTick = null; return; }
      if (lastTick !== null) elapsed += time - lastTick;
      lastTick = time;
      renderProgress();
      if (elapsed >= duration) {
        // Wrap directly to the beginning instead of scrolling past every slide.
        goTo((current + 1) % slides.length, current === slides.length - 1);
      } else {
        playbackFrame = requestAnimationFrame(tick);
      }
    }
    function renderPlaybackButton() {
      playback.setAttribute('aria-label', userPaused ? 'Resume automatic slideshow' : 'Pause automatic slideshow');
      playback.innerHTML = userPaused
        ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6Z"/></svg>'
        : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M14 4v12"/></svg>';
    }
    function update(index) {
      if (index === current) return;
      current = index;
      elapsed = 0;
      lastTick = null;
      renderProgress();
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      count.setAttribute('aria-label', `Screen ${index + 1} of ${slides.length}`);
      previous.disabled = index === 0;
      next.disabled = index === slides.length - 1;
      selectors.forEach((selector, i) => selector.setAttribute('aria-pressed', String(i === index)));
      syncPlayback();
    }
    function settled() {
      settling = false;
      update(Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth))));
      syncPlayback();
    }
    function goTo(index, instant = false) {
      index = Math.max(0, Math.min(slides.length - 1, index));
      elapsed = 0;
      lastTick = null;
      renderProgress();
      const left = index * track.clientWidth;
      instant = instant || reducedMotion.matches || Math.abs(left - track.scrollLeft) < 1;
      settling = !instant;
      clearTimeout(settleTimer);
      track.scrollTo({ left, behavior: instant ? 'instant' : 'smooth' });
      if (instant) update(index);
      else settleTimer = setTimeout(settled, 180);
      syncPlayback();
    }
    let frame;
    track.addEventListener('scroll', () => {
      settling = true;
      syncPlayback();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settled, 120);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        update(Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth))));
        frame = null;
      });
    }, { passive: true });
    previous.addEventListener('click', () => goTo(current - 1));
    next.addEventListener('click', () => goTo(current + 1));
    playback.addEventListener('click', () => {
      userPaused = !userPaused;
      renderPlaybackButton();
      syncPlayback();
    });
    gallery.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const targets = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1 };
      if (!(event.key in targets)) return;
      event.preventDefault();
      goTo(targets[event.key]);
    });

    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.65;
      syncPlayback();
    }, { threshold: [0, 0.65] }).observe(controls);

    gallery.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') { hovered = true; syncPlayback(); }
    });
    gallery.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse') { hovered = false; syncPlayback(); }
    });
    gallery.addEventListener('pointerdown', () => {
      held = true;
      keyboardFocused = false;
      syncPlayback();
    }, { capture: true, passive: true });
    for (const event of ['pointerup', 'pointercancel']) {
      window.addEventListener(event, () => { held = false; syncPlayback(); }, { passive: true });
    }
    gallery.addEventListener('keydown', () => {
      keyboardFocused = true;
      syncPlayback();
    }, { capture: true });
    gallery.addEventListener('focusin', () => {
      keyboardFocused = document.activeElement.matches(':focus-visible');
      syncPlayback();
    });
    gallery.addEventListener('focusout', () => queueMicrotask(() => {
      keyboardFocused = gallery.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
      syncPlayback();
    }));
    reducedMotion.addEventListener('change', event => {
      if (event.matches) { userPaused = true; renderPlaybackButton(); }
      syncPlayback();
    });
    document.addEventListener('visibilitychange', syncPlayback);
    function followHash() {
      let target;
      try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
      const index = slides.findIndex(slide => slide === target || slide.contains(target));
      if (index >= 0) {
        goTo(index, true);
      }
    }
    window.addEventListener('hashchange', followHash);
    let trackWidth = track.clientWidth;
    new ResizeObserver(() => {
      if (track.clientWidth === trackWidth) return;
      trackWidth = track.clientWidth;
      goTo(current, true);
    }).observe(track);
    gallery.dataset.enhanced = '';
    renderPlaybackButton();
    update(0);
    followHash();
  });

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

  // Category filtering on the archive; button controls also remain supported.
  const railCats = document.getElementById('rail-cats');
  if (railCats) {
    const buttons = Array.from(railCats.querySelectorAll('button'));
    const select = railCats.querySelector('select');
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
      if (select) select.value = cat;
      buttons.forEach((b) => {
        b.classList.toggle('is-on', b.dataset.cat === cat);
        b.setAttribute('aria-pressed', String(b.dataset.cat === cat));
      });
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
    if (select) {
      select.addEventListener('change', () => {
        applyFilter(select.value);
        syncUrl(select.value);
      });
    }

    const initial = new URLSearchParams(window.location.search).get('cat');
    const validCats = select ? Array.from(select.options, option => option.value) : buttons.map((b) => b.dataset.cat);
    if (initial && validCats.includes(initial)) applyFilter(initial);
  }
})();
