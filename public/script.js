/* ==========================================================================
   FLOW MAMA NORTHFIELDS — Interactions
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Current year in footer ---- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Nav shrink on scroll ---- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 20) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  const menuBtn = document.getElementById('navMenu');
  const mobileMenu = document.getElementById('mobileMenu');
  const closeMenu = () => {
    menuBtn.classList.remove('is-open');
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
  };
  menuBtn?.addEventListener('click', () => {
    const open = menuBtn.classList.toggle('is-open');
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
  });
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  /* ---- Reveal on scroll (for non-hero elements) ---- */
  const toReveal = document.querySelectorAll(
    '.section, .pillar, .part, .slot, .programme, .price-card, .quote, .gallery__item, .about__media, .classes__image'
  );
  toReveal.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  toReveal.forEach(el => io.observe(el));

  /* ---- Hero elements reveal on load ---- */
  // Add is-visible to hero reveals on page ready, respecting data-delay
  requestAnimationFrame(() => {
    document.querySelectorAll('.hero .reveal').forEach(el => {
      el.classList.add('is-visible');
    });
  });

  /* ---- Smooth scroll for anchor links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const el = document.querySelector(id);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  /* ---- Subtle parallax on hero floating shapes ---- */
  const floats = document.querySelectorAll('.float');
  if (floats.length && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      floats.forEach((f, i) => {
        const speed = 0.15 + (i * 0.05);
        f.style.translate = `0 ${y * speed}px`;
      });
    }, { passive: true });
  }

});
