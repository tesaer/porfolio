'use strict';

/* ════════════════════════════════════════
   DATA LOADING
════════════════════════════════════════ */
let siteData = null;

async function loadData() {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) throw new Error('API error');
    siteData = await res.json();
  } catch {
    // Fallback: try loading file directly (for file:// or when server not running)
    try {
      const res = await fetch('/data/content.json');
      siteData = await res.json();
    } catch {
      console.warn('Could not load content.json, using defaults');
      siteData = null;
    }
  }
  renderAll();
}

/* ════════════════════════════════════════
   RENDER FUNCTIONS
════════════════════════════════════════ */
function renderAll() {
  if (!siteData) return;
  renderHero();
  renderAbout();
  renderSkills();
  renderPortfolio();
  renderPricingOptions();
  renderContacts();
  updateTelegramLinks();
  document.getElementById('footer-year').textContent = new Date().getFullYear();
}

function renderHero() {
  const p = siteData.profile;
  if (!p) return;

  setText('logo-monogram', p.monogram);
  setText('footer-monogram', p.monogram);
  setText('hero-status-text', p.status);

  // Title
  const titleEl = document.getElementById('hero-title-el');
  if (titleEl) {
    const parts = p.role.split(p.roleAccent || '');
    if (parts.length === 2) {
      titleEl.innerHTML = `${parts[0]}<span class="hero__title-accent" id="hero-title-accent">${p.roleAccent}</span>${parts[1]}`;
    } else {
      titleEl.textContent = p.role;
    }
  }

  setHTML('hero-subtitle-el', (p.subtitle || '').replace('\n', '<br/>'));

  // Stack pills
  const pillsEl = document.getElementById('hero-stack-pills');
  if (pillsEl && p.heroStack) {
    pillsEl.innerHTML = p.heroStack
      .map(s => `<span class="pill pill--mono">${escHtml(s)}</span>`)
      .join('');
  }

  // Edu badge
  setText('hero-edu-badge', `BSc Business Informatics · ${p.graduation || '2026'}`);
}

function renderAbout() {
  const p = siteData.profile;
  if (!p) return;
  setHTML('about-bio1', p.bio1 || '');
  setHTML('about-bio2', p.bio2 || '');
  setText('about-university',  p.university  || '');
  setText('about-program',     p.program     || '');
  setText('about-graduation',  p.graduation  || '');
}

function renderSkills() {
  const grid = document.getElementById('skillsGrid');
  if (!grid || !siteData.skills) return;
  grid.innerHTML = siteData.skills
    .map(s => `<span class="skill-tag" data-cat="${escHtml(s.category)}">${escHtml(s.name)}</span>`)
    .join('');
  initSkillFilter();
}

function renderPortfolio() {
  const grid = document.getElementById('portfolioGrid');
  if (!grid || !siteData.projects) return;

  grid.innerHTML = siteData.projects.map((p, i) => {
    const delay = i * 100;
    const featuredClass = p.featured ? 'project-card--featured' : '';
    const tagHtml = (p.tags || []).map(t => {
      const cls = t.color === 'burgundy' ? 'pill--burgundy' : t.color === 'olive' ? 'pill--olive' : '';
      return `<span class="pill pill--mono ${cls}">${escHtml(t.label)}</span>`;
    }).join('');
    const metricsHtml = (p.metrics || []).map(m =>
      `<div class="metric"><span class="metric__val">${escHtml(m.value)}</span><span class="metric__label">${escHtml(m.label)}</span></div>`
    ).join('');
    const stackHtml = (p.stack || []).map(s =>
      `<span class="pill pill--mono pill--sm">${escHtml(s)}</span>`
    ).join('');
    const ghLink = p.github ? `<a href="${escHtml(p.github)}" class="icon-link" title="GitHub" aria-label="GitHub репозиторий">${ghSvg()}</a>` : '';
    const demoLink = p.demo ? `<a href="${escHtml(p.demo)}" class="icon-link" title="Demo" aria-label="Демо проекта">${extSvg()}</a>` : '';

    return `
      <article class="project-card ${featuredClass}" data-delay="${delay}" id="project-${p.id}">
        <div class="project-card__header">
          <div class="project-card__tags">${tagHtml}</div>
          <div class="project-card__links">${ghLink}${demoLink}</div>
        </div>
        <h3 class="project-card__title">${escHtml(p.title)}</h3>
        <p class="project-card__problem"><span class="mono text-muted">Бизнес-задача:</span> ${escHtml(p.problem)}</p>
        <p class="project-card__desc">${escHtml(p.description)}</p>
        ${metricsHtml ? `<div class="project-card__metrics">${metricsHtml}</div>` : ''}
        <div class="project-card__stack">${stackHtml}</div>
      </article>`;
  }).join('');

  // Re-run intersection observer for new elements
  observeAnimations();
}

function renderPricingOptions() {
  const pricing = siteData.pricing;
  if (!pricing || !pricing.baseRates) return;

  const grid = document.getElementById('service-radio-grid');
  if (!grid) return;

  const labels = {
    audit:        ['IT-аудит & Security Review', 'Аудит архитектуры, угроз и соответствий'],
    architecture: ['Pre-Sale Architecture Design', 'Проектирование решений, C4, API'],
    consulting:   ['Консультация / Менторинг',    'Почасовой разбор задач, code review'],
    product:      ['Продуктовое управление',       'CustDev, roadmap, метрики, OKR'],
    ai:           ['AI/LLM-разработка',            'RAG-пайплайны, fine-tuning, интеграции'],
  };

  grid.innerHTML = Object.entries(pricing.baseRates).map(([key, rate], i) => {
    const [name, desc] = labels[key] || [key, ''];
    const checked = i === 0 ? 'checked' : '';
    const rateLabel = key === 'consulting' ? `${rate.toLocaleString('ru')} ₽/ч` : `от ${rate.toLocaleString('ru')} ₽`;
    return `
      <div class="radio-card">
        <input type="radio" name="service" id="svc-${key}" value="${key}" ${checked}/>
        <label for="svc-${key}" class="radio-card__label">
          <span class="radio-card__name">${name}</span>
          <span class="radio-card__desc">${desc}</span>
          <span class="radio-card__price">${rateLabel}</span>
        </label>
      </div>`;
  }).join('');

  initPriceCalculator();
}

function renderContacts() {
  const c = siteData.contacts;
  if (!c) return;

  const channels = document.getElementById('contact-channels');
  if (!channels) return;

  const list = [
    { key: 'telegram',  label: 'Telegram',  href: `https://t.me/${c.telegram}`,       val: `@${c.telegram}`,    cls: '' },
    { key: 'email',     label: 'Email',     href: `mailto:${c.email}`,                val: c.email,             cls: 'contact-channel__icon--olive' },
    { key: 'linkedin',  label: 'LinkedIn',  href: `https://linkedin.com/in/${c.linkedin}`, val: `linkedin.com/in/${c.linkedin}`, cls: 'contact-channel__icon--olive' },
    { key: 'github',    label: 'GitHub',    href: `https://github.com/${c.github}`,   val: `github.com/${c.github}`, cls: '' },
  ];

  channels.innerHTML = list.map(ch => `
    <a href="${escHtml(ch.href)}" ${ch.key !== 'email' ? 'target="_blank" rel="noopener"' : ''} class="contact-channel" id="ch-${ch.key}">
      <div class="contact-channel__icon ${ch.cls}">${contactIcon(ch.key)}</div>
      <div>
        <div class="contact-channel__label">${ch.label}</div>
        <div class="contact-channel__value">${escHtml(ch.val)}</div>
      </div>
      <svg class="contact-channel__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </a>`).join('');
}

function updateTelegramLinks() {
  const c = siteData.contacts;
  if (!c || !c.telegram) return;
  const url = `https://t.me/${c.telegram}`;
  ['header-tg-btn', 'mobile-tg-btn', 'contact-tg-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = url;
  });
}

/* ════════════════════════════════════════
   PRICE CALCULATOR
════════════════════════════════════════ */
function initPriceCalculator() {
  const pricing = siteData.pricing;
  if (!pricing) return;

  function calculate() {
    const serviceEl = document.querySelector('input[name="service"]:checked');
    const scopeEl   = document.querySelector('input[name="scope"]:checked');
    const timelineEl= document.querySelector('input[name="timeline"]:checked');

    const serviceKey  = serviceEl  ? serviceEl.value  : null;
    const scopeKey    = scopeEl    ? scopeEl.value    : 'small';
    const timelineKey = timelineEl ? timelineEl.value : 'standard';

    if (!serviceKey) {
      document.getElementById('price-estimate').textContent = '—';
      document.getElementById('price-range-note').textContent = 'Выберите направление';
      return;
    }

    const base      = pricing.baseRates[serviceKey]         || 0;
    const scopeMult = pricing.scopeMultipliers[scopeKey]    || 1;
    const timeMult  = pricing.timelineMultipliers[timelineKey] || 1;

    // Extras
    let extras = 0;
    document.querySelectorAll('#deliverables-grid input[type=checkbox]:checked').forEach(cb => {
      extras += pricing.deliverablesCosts[cb.value] || 0;
    });

    const subtotal = Math.round(base * scopeMult);
    const total    = Math.round((subtotal + extras) * timeMult);

    setHTML('bd-base',     `${base.toLocaleString('ru')} ₽`);
    setHTML('bd-scope',    `× ${scopeMult}`);
    setHTML('bd-extras',   extras ? `+ ${extras.toLocaleString('ru')} ₽` : '—');
    setHTML('bd-timeline', `× ${timeMult}`);
    setHTML('bd-total',    `${total.toLocaleString('ru')} ₽`);
    setHTML('price-estimate', `${total.toLocaleString('ru')} ₽`);

    const isConsulting = serviceKey === 'consulting';
    document.getElementById('price-range-note').textContent = isConsulting
      ? 'почасовая ставка, итог за сессию'
      : 'ориентировочно, без НДС';

    // Highlight active steps
    document.querySelectorAll('.step-block').forEach(b => b.classList.remove('active'));
    document.getElementById('step-service').classList.add('active');
    if (scopeKey)    document.getElementById('step-scope').classList.add('active');
    if (extras > 0)  document.getElementById('step-deliverables').classList.add('active');
    if (timelineKey) document.getElementById('step-timeline').classList.add('active');
  }

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.name === 'service' || t.name === 'scope' || t.name === 'timeline' ||
        t.closest('#deliverables-grid')) {
      calculate();
    }
  });

  calculate();
}

/* ════════════════════════════════════════
   SKILL FILTER
════════════════════════════════════════ */
function initSkillFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => { b.classList.remove('filter-btn--active'); b.setAttribute('aria-selected', false); });
      btn.classList.add('filter-btn--active');
      btn.setAttribute('aria-selected', true);
      const filter = btn.dataset.filter;
      document.querySelectorAll('.skill-tag').forEach(tag => {
        const match = filter === 'all' || tag.dataset.cat === filter;
        tag.classList.toggle('hidden', !match);
        tag.classList.toggle('highlighted', match && filter !== 'all');
      });
    });
  });
}

/* ════════════════════════════════════════
   INTERSECTION OBSERVER
════════════════════════════════════════ */
function observeAnimations() {
  const targets = document.querySelectorAll(
    '.vector-card:not(.visible), .project-card:not(.visible), .price-card:not(.visible), .fade-up:not(.visible)'
  );
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay || '0', 10);
        setTimeout(() => entry.target.classList.add('visible'), delay);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  targets.forEach(el => io.observe(el));
}

/* ════════════════════════════════════════
   STICKY HEADER
════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  document.getElementById('header').classList.toggle('scrolled', window.scrollY > 16);
}, { passive: true });

/* ════════════════════════════════════════
   ACTIVE NAV
════════════════════════════════════════ */
(function () {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav__link');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const a = document.querySelector(`.nav__link[href="#${e.target.id}"]`);
        if (a) a.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px' });
  sections.forEach(s => io.observe(s));
})();

/* ════════════════════════════════════════
   BURGER
════════════════════════════════════════ */
(function () {
  const burger = document.getElementById('burger');
  const nav    = document.getElementById('mobileNav');
  const close  = () => {
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', false);
    nav.classList.remove('open');
    nav.setAttribute('aria-hidden', true);
    document.body.style.overflow = '';
  };
  burger.addEventListener('click', () => {
    const open = burger.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    nav.classList.toggle('open', open);
    nav.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  nav.querySelectorAll('a, button').forEach(el => el.addEventListener('click', close));
  document.addEventListener('click', e => {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) close();
  });
})();

/* ════════════════════════════════════════
   SMOOTH SCROLL
════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setHTML(id, val) { const el = document.getElementById(id); if (el) el.innerHTML = val; }
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function ghSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`;
}
function extSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>`;
}
function contactIcon(key) {
  const icons = {
    telegram: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
    email:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    linkedin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    github:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`,
  };
  return icons[key] || '';
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  observeAnimations();
  loadData();
});
