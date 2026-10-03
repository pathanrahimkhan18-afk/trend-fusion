/**
 * TrendFusion — Animations Module (FIXED)
 *
 * Fixes applied:
 *  1. Lenis double-tick removed — was being driven by BOTH its own RAF loop
 *     AND gsap.ticker simultaneously, causing scroll to stutter or lock entirely.
 *     Now driven ONLY by gsap.ticker (the recommended pattern for GSAP + Lenis).
 *
 *  2. gsap.ticker timestamp is in seconds; Lenis.raf() expects milliseconds.
 *     Fixed: pass `time * 1000` not `time` to lenisInstance.raf().
 *
 *  3. ScrollTrigger.refresh() added after Lenis init so trigger positions
 *     are calculated against the correct scroll container.
 *
 *  4. Page transitions now use event delegation (one listener on document)
 *     instead of iterating links at init time — captures dynamically added
 *     links (product cards, nav items injected after DOMContentLoaded).
 *     Also skips javascript: hrefs and tel: links.
 *
 *  5. animateProductCardsIn now accepts a NodeList / array of elements so
 *     the products page can target only newly appended cards, not all cards.
 *
 *  6. initialiseScrollRevealAnimations calls ScrollTrigger.refresh()
 *     after registering triggers so GSAP re-measures after layout settles.
 *
 * Dependencies: gsap@3.12.5, ScrollTrigger plugin, lenis@1.1.3
 */

window.TF = window.TF || {};

window.TF.Animations = (() => {

  // ─── Lenis Smooth Scroll ──────────────────────────────────
  const initialiseSmoothScroll = () => {
    if (typeof Lenis === 'undefined') return;

    const lenisInstance = new Lenis({
      lerp       : 0.08,
      smoothWheel: true,
      syncTouch  : false,
    });

    // FIX: Single driver — GSAP ticker only, no separate RAF loop.
    // FIX: gsap.ticker time is in seconds; Lenis.raf() needs milliseconds.
    if (typeof gsap !== 'undefined') {
      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    if (typeof ScrollTrigger !== 'undefined') {
      lenisInstance.on('scroll', ScrollTrigger.update);
    }

    window.TF._lenisInstance = lenisInstance;
    return lenisInstance;
  };

  // ─── Page Load Reveal ─────────────────────────────────────
  const playPageLoadReveal = () => {
    if (typeof gsap === 'undefined') return;

    const tl     = gsap.timeline();
    const loader = document.getElementById('tf-loader');

    if (loader) {
      tl.to(loader, {
        opacity : 0,
        duration: 0.5,
        ease    : 'power2.out',
        onComplete: () => { loader.style.display = 'none'; },
      });
    }

    const revealEls = document.querySelectorAll('[data-reveal]');
    if (revealEls.length) {
      tl.from(revealEls, {
        y        : 50,
        opacity  : 0,
        duration : 0.9,
        stagger  : 0.1,
        ease     : 'power4.out',
        clearProps: 'transform,opacity',
      }, loader ? '-=0.2' : 0);
    }

    return tl;
  };

  // ─── Scroll-triggered Reveals ─────────────────────────────
  const initialiseScrollRevealAnimations = () => {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('[data-scroll-reveal]').forEach((el) => {
      if (el.dataset.scrollRevealDone) return;
      el.dataset.scrollRevealDone = '1';

      gsap.from(el, {
        scrollTrigger: {
          trigger      : el,
          start        : 'top 90%',
          toggleActions: 'play none none none',
          scroller     : window,
        },
        y        : 40,
        opacity  : 0,
        duration : 0.85,
        ease     : 'power3.out',
        clearProps: 'transform,opacity',
      });
    });

    // FIX: Refresh so positions are calculated after full layout paint
    ScrollTrigger.refresh();
  };

  // ─── Product Card Stagger ─────────────────────────────────
  /**
   * FIX: Accepts selector string OR NodeList/Array so "Load More" can pass
   * only the new cards rather than re-animating the entire grid.
   */
  const animateProductCardsIn = (target = '.product-card') => {
    if (typeof gsap === 'undefined') return;

    const elements = typeof target === 'string'
      ? document.querySelectorAll(target)
      : target;

    if (!elements || elements.length === 0) return;

    gsap.fromTo(
      elements,
      { y: 35, opacity: 0 },
      {
        y        : 0,
        opacity  : 1,
        duration : 0.65,
        stagger  : 0.07,
        ease     : 'power3.out',
        clearProps: 'transform,opacity',
      }
    );
  };

  // ─── Page Transition Overlay ──────────────────────────────
  const initialisePageTransitions = () => {
    const overlay = document.getElementById('tf-transition');
    if (!overlay || typeof gsap === 'undefined') return;

    // Reveal current page
    gsap.set(overlay, { scaleY: 1, transformOrigin: 'top' });
    gsap.to(overlay, {
      scaleY  : 0,
      duration: 0.75,
      ease    : 'power4.inOut',
      delay   : 0.05,
    });

    // FIX: Delegated listener — works for dynamic/ajax-rendered links too
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const skip =
        href.startsWith('#') ||
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        anchor.target === '_blank';

      if (skip) return;

      e.preventDefault();

      if (window.TF._lenisInstance) window.TF._lenisInstance.stop();

      gsap.to(overlay, {
        scaleY  : 1,
        duration: 0.55,
        ease    : 'power4.inOut',
        transformOrigin: 'bottom',
        onComplete: () => { window.location.href = href; },
      });
    });
  };

  // ─── Navbar Scroll Behaviour ──────────────────────────────
  const initialiseNavbarScrollBehaviour = () => {
    const nav = document.getElementById('tf-nav');
    if (!nav) return;

    const THRESHOLD = 80;
    const updateNav = (y) => nav.classList.toggle('nav-scrolled', y > THRESHOLD);

    // FIX: Prefer Lenis scroll event (accurate virtual position) over window.scrollY
    if (window.TF._lenisInstance) {
      window.TF._lenisInstance.on('scroll', ({ scroll }) => updateNav(scroll));
    } else {
      window.addEventListener('scroll', () => updateNav(window.scrollY), { passive: true });
    }
  };

  // ─── Master Init ─────────────────────────────────────────
  const initialiseAllAnimations = () => {
    initialiseSmoothScroll();
    initialiseNavbarScrollBehaviour(); // After Lenis so it can use lenis.on('scroll')
    playPageLoadReveal();

    // FIX: rAF delay so layout is painted before ScrollTrigger measures positions
    requestAnimationFrame(() => {
      initialiseScrollRevealAnimations();
    });

    initialisePageTransitions();
  };

  // ─── Public API ───────────────────────────────────────────
  return {
    initialiseAllAnimations,
    animateProductCardsIn,
    playPageLoadReveal,
    initialiseScrollRevealAnimations,
  };

})();
