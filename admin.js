'use strict';

/* ══════════════════════════════════════
   ADMIN PASSWORD (change here)
══════════════════════════════════════ */
const ADMIN_PASSWORD = 'admin123';
const SESSION_KEY    = 'am_admin_ok';

/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
let data = null;
let currentTab = 'profile';
let editingProjectId = null;

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    showApp();
  }

  // Login form
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pass = document.getElementById('admin-pass').value;
    const err  = document.getElementById('login-error');
    if (pass === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      err.textContent = '';
      showApp();
    } else {
      err.textContent = 'Неверный пароль';
      document.getElementById('admin-pass').focus();
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    document.getElementById('admin-app').hidden = true;
    document.getElementById('login-screen').style.display = '';
    document.getElementById('admin-pass').value = '';
  });

  // Tabs
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Save
  document.getElementById('save-btn').addEventListener('click', saveData);

  // Project actions
  document.getElementById('add-project-btn').addEventListener('click', () => openProjectModal(null));
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-save-btn').addEventListener('click', saveProject);
  document.getElementById('modal-delete-btn').addEventListener('click', deleteProject);
  document.querySelector('.modal__backdrop').addEventListener('click', closeModal);
  document.getElementById('add-metric-btn').addEventListener('click', addMetricRow);

  // Skills
  document.getElementById('add-skill-btn').addEventListener('click', addSkill);
  document.getElementById('new-skill-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
  });
});

async function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-app').hidden = false;
  await fetchData();
  fillAllForms();
  renderProjectsList();
  renderSkillsTags();
  setStatus('');
}

/* ══════════════════════════════════════
   API
══════════════════════════════════════ */
async function fetchData() {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) throw new Error();
    data = await res.json();
  } catch {
    // Fallback
    try {
      const res = await fetch('/data/content.json');
      data = await res.json();
    } catch {
      data = getDefaultData();
    }
  }
}

async function saveData() {
  collectAllForms();
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  setStatus('Сохраняю…');
  try {
    const res = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    });
    if (!res.ok) throw new Error('Server error ' + res.status);
    setStatus('✓ Сохранено', 'ok');
    setTimeout(() => setStatus(''), 3000);
  } catch (err) {
    setStatus('✗ Ошибка: ' + err.message, 'err');
  } finally {
    btn.disabled = false;
  }
}

/* ══════════════════════════════════════
   TABS
══════════════════════════════════════ */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('nav-item--active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('tab-content--active', c.id === `tab-${tab}`);
  });
  const titles = {
    profile:  'Профиль',
    skills:   'Навыки',
    projects: 'Проекты',
    pricing:  'Конструктор цен',
    contacts: 'Контакты',
  };
  document.getElementById('tab-title').textContent = titles[tab] || tab;
}

/* ══════════════════════════════════════
   FILL FORMS FROM DATA
══════════════════════════════════════ */
function fillAllForms() {
  if (!data) return;
  fillProfile();
  fillPricing();
  fillContacts();
}

function fillProfile() {
  const p = data.profile || {};
  setVal('p-monogram',  p.monogram    || '');
  setVal('p-name',      p.name        || '');
  setVal('p-status',    p.status      || '');
  setVal('p-role',      p.role        || '');
  setVal('p-roleAccent',p.roleAccent  || '');
  setVal('p-subtitle',  p.subtitle    || '');
  setVal('p-university',p.university  || '');
  setVal('p-program',   p.program     || '');
  setVal('p-graduation',p.graduation  || '');
  setVal('p-bio1',      p.bio1        || '');
  setVal('p-bio2',      p.bio2        || '');
  setVal('p-heroStack', (p.heroStack || []).join(', '));
}

function fillPricing() {
  const pr = (data.pricing || {}).baseRates || {};
  const pd = (data.pricing || {}).deliverablesCosts || {};
  setVal('pr-audit',        pr.audit        || 0);
  setVal('pr-architecture', pr.architecture || 0);
  setVal('pr-consulting',   pr.consulting   || 0);
  setVal('pr-product',      pr.product      || 0);
  setVal('pr-ai',           pr.ai           || 0);
  setVal('pd-report',          pd.report          || 0);
  setVal('pd-presentation',    pd.presentation    || 0);
  setVal('pd-diagrams',        pd.diagrams        || 0);
  setVal('pd-prototype',       pd.prototype       || 0);
  setVal('pd-recommendations', pd.recommendations || 0);
  setVal('pd-support',         pd.support         || 0);
}

function fillContacts() {
  const c = data.contacts || {};
  setVal('c-telegram', c.telegram || '');
  setVal('c-email',    c.email    || '');
  setVal('c-linkedin', c.linkedin || '');
  setVal('c-github',   c.github   || '');
}

/* ══════════════════════════════════════
   COLLECT FORMS INTO DATA
══════════════════════════════════════ */
function collectAllForms() {
  if (!data) return;
  collectProfile();
  collectPricing();
  collectContacts();
}

function collectProfile() {
  if (!data.profile) data.profile = {};
  const p = data.profile;
  p.monogram   = getVal('p-monogram');
  p.name       = getVal('p-name');
  p.status     = getVal('p-status');
  p.role       = getVal('p-role');
  p.roleAccent = getVal('p-roleAccent');
  p.subtitle   = getVal('p-subtitle');
  p.university = getVal('p-university');
  p.program    = getVal('p-program');
  p.graduation = getVal('p-graduation');
  p.bio1       = getVal('p-bio1');
  p.bio2       = getVal('p-bio2');
  p.heroStack  = getVal('p-heroStack').split(',').map(s => s.trim()).filter(Boolean);
}

function collectPricing() {
  if (!data.pricing) data.pricing = {};
  data.pricing.baseRates = {
    audit:        num('pr-audit'),
    architecture: num('pr-architecture'),
    consulting:   num('pr-consulting'),
    product:      num('pr-product'),
    ai:           num('pr-ai'),
  };
  data.pricing.deliverablesCosts = {
    report:          num('pd-report'),
    presentation:    num('pd-presentation'),
    diagrams:        num('pd-diagrams'),
    prototype:       num('pd-prototype'),
    recommendations: num('pd-recommendations'),
    support:         num('pd-support'),
  };
}

function collectContacts() {
  data.contacts = {
    telegram: getVal('c-telegram'),
    email:    getVal('c-email'),
    linkedin: getVal('c-linkedin'),
    github:   getVal('c-github'),
  };
}

/* ══════════════════════════════════════
   SKILLS
══════════════════════════════════════ */
function renderSkillsTags() {
  const container = document.getElementById('skills-tags-container');
  if (!container || !data.skills) return;
  container.innerHTML = '';
  const catLabels = { ba:'BA', arch:'Arch', sec:'Sec', ai:'AI', dev:'Dev' };
  data.skills.forEach((s, idx) => {
    const tag = document.createElement('span');
    tag.className = 'admin-tag';
    tag.innerHTML = `${escHtml(s.name)} <span class="admin-tag__cat">[${catLabels[s.category] || s.category}]</span><span class="admin-tag__rm">×</span>`;
    tag.title = 'Нажмите чтобы удалить';
    tag.addEventListener('click', () => {
      data.skills.splice(idx, 1);
      renderSkillsTags();
    });
    container.appendChild(tag);
  });
}

function addSkill() {
  const nameEl = document.getElementById('new-skill-name');
  const catEl  = document.getElementById('new-skill-cat');
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }
  if (!data.skills) data.skills = [];
  data.skills.push({ name, category: catEl.value });
  nameEl.value = '';
  nameEl.focus();
  renderSkillsTags();
}

/* ══════════════════════════════════════
   PROJECTS
══════════════════════════════════════ */
function renderProjectsList() {
  const list = document.getElementById('projects-list');
  if (!list || !data.projects) return;
  list.innerHTML = '';
  data.projects.forEach(p => {
    const row = document.createElement('div');
    row.className = 'project-row';
    row.innerHTML = `
      ${p.featured ? `<span class="project-row__featured">featured</span>` : ''}
      <span class="project-row__title">${escHtml(p.title)}</span>
      <span class="project-row__stack">${(p.stack || []).slice(0,3).join(' · ')}</span>
      <div class="project-row__actions">
        <button class="btn btn--outline btn--sm" data-id="${p.id}">Изменить</button>
      </div>`;
    row.querySelector('[data-id]').addEventListener('click', () => openProjectModal(p.id));
    list.appendChild(row);
  });
}

function openProjectModal(id) {
  editingProjectId = id;
  const modal = document.getElementById('project-modal');
  const p = id ? data.projects.find(x => x.id === id) : null;

  document.getElementById('modal-heading').textContent = p ? 'Редактировать проект' : 'Новый проект';
  document.getElementById('modal-project-id').value = id || '';
  setVal('m-title',       p?.title       || '');
  setVal('m-problem',     p?.problem     || '');
  setVal('m-description', p?.description || '');
  setVal('m-stack',       (p?.stack || []).join(', '));
  setVal('m-github',      p?.github      || '');
  setVal('m-demo',        p?.demo        || '');
  document.getElementById('m-featured').checked = !!(p?.featured);
  document.getElementById('modal-delete-btn').style.display = p ? '' : 'none';

  // Metrics
  const ml = document.getElementById('metrics-list');
  ml.innerHTML = '';
  (p?.metrics || []).forEach(m => addMetricRow(m.value, m.label));

  modal.hidden = false;
  document.getElementById('m-title').focus();
}

function addMetricRow(val = '', label = '') {
  const ml = document.getElementById('metrics-list');
  if (ml.children.length >= 3) return;
  const row = document.createElement('div');
  row.className = 'metric-row';
  row.innerHTML = `
    <input type="text" class="form-input metric-val" placeholder="↓ 73%" value="${escAttr(val)}" style="max-width:100px"/>
    <input type="text" class="form-input metric-lbl" placeholder="attack surface" value="${escAttr(label)}"/>
    <button class="metric-rm" title="Удалить">×</button>`;
  row.querySelector('.metric-rm').addEventListener('click', () => row.remove());
  ml.appendChild(row);
}

function saveProject() {
  const title = getVal('m-title').trim();
  if (!title) { document.getElementById('m-title').focus(); return; }

  const metrics = [...document.querySelectorAll('.metric-row')].map(r => ({
    value: r.querySelector('.metric-val').value.trim(),
    label: r.querySelector('.metric-lbl').value.trim(),
  })).filter(m => m.value);

  const stack = getVal('m-stack').split(',').map(s => s.trim()).filter(Boolean);

  if (editingProjectId) {
    const p = data.projects.find(x => x.id === editingProjectId);
    if (p) {
      p.title       = title;
      p.problem     = getVal('m-problem');
      p.description = getVal('m-description');
      p.stack       = stack;
      p.github      = getVal('m-github');
      p.demo        = getVal('m-demo');
      p.featured    = document.getElementById('m-featured').checked;
      p.metrics     = metrics;
    }
  } else {
    const maxId = data.projects.reduce((m, p) => Math.max(m, p.id), 0);
    data.projects.push({
      id:          maxId + 1,
      featured:    document.getElementById('m-featured').checked,
      title,
      problem:     getVal('m-problem'),
      description: getVal('m-description'),
      stack,
      github:      getVal('m-github'),
      demo:        getVal('m-demo'),
      metrics,
      tags:        [],
    });
  }

  closeModal();
  renderProjectsList();
}

function deleteProject() {
  if (!editingProjectId) return;
  if (!confirm('Удалить этот проект?')) return;
  data.projects = data.projects.filter(p => p.id !== editingProjectId);
  closeModal();
  renderProjectsList();
}

function closeModal() {
  document.getElementById('project-modal').hidden = true;
  editingProjectId = null;
}

/* ══════════════════════════════════════
   STATUS
══════════════════════════════════════ */
function setStatus(msg, type = '') {
  const el = document.getElementById('save-status');
  el.textContent = msg;
  el.className = 'save-status' + (type ? ` save-status--${type}` : '');
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
function num(id)   { return parseFloat(getVal(id)) || 0; }
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) { return String(s).replace(/"/g,'&quot;'); }

function getDefaultData() {
  return {
    profile: { monogram:'АМ', name:'Aleksandr M.', role:'Архитектор решений', roleAccent:'', status:'Open to projects', subtitle:'', university:'', program:'', graduation:'2026', bio1:'', bio2:'', heroStack:[] },
    contacts: { telegram:'', email:'', linkedin:'', github:'' },
    skills: [],
    projects: [],
    pricing: {
      baseRates: { audit:12000, architecture:20000, consulting:2500, product:15000, ai:18000 },
      scopeMultipliers: { small:1.0, medium:1.8, large:3.2, enterprise:5.5 },
      deliverablesCosts: { report:3000, presentation:4000, diagrams:3500, prototype:8000, recommendations:2000, support:5000 },
      timelineMultipliers: { urgent:1.8, standard:1.0, flexible:0.85 },
    },
  };
}
