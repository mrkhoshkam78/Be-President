// ui.js - Gaming UI updates

let currentPanel = 'map';

function $(id) { return document.getElementById(id); }

/** Populate all country dropdowns from central PLAYABLE_COUNTRIES / relations (exclude player) */
function populateCountrySelects(state) {
  if (!state) state = getState();
  if (!state) return;
  const playerId = state.country?.id;
  const ids = Object.keys(state.diplomacy.relations || {});
  // Fallback to all playable except self
  const source = ids.length ? ids : (typeof PLAYABLE_COUNTRIES !== 'undefined' ? PLAYABLE_COUNTRIES.filter(c => c.id !== playerId).map(c => c.id) : []);
  const options = source.map(id => {
    const flag = typeof getCountryFlag === 'function' ? getCountryFlag(id) : '';
    const name = typeof getCountryName === 'function' ? getCountryName(id) : id;
    const rel = state.diplomacy.relations[id];
    const val = typeof getRelationValue === 'function' ? getRelationValue(rel) : (typeof rel === 'number' ? rel : 50);
    return `<option value="${id}">${flag} ${name} (${Math.round(val)})</option>`;
  }).join('');
  ['covert-target', 'agree-target'].forEach(selId => {
    const sel = $(selId);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">انتخاب کشور...</option>` + options;
    if (current && source.includes(current)) sel.value = current;
  });
}



function showPanel(panelId) {
  currentPanel = panelId;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const panel = $(panelId);
  if (panel) panel.classList.add('active');
  const btn = document.querySelector(`.nav-item[data-panel="${panelId}"]`);
  if (btn) btn.classList.add('active');
  refreshUI();
  if (panelId === 'actions') {
    switchActionCat(currentActionCat || 'economy');
  }
  if (panelId === 'news') {
    renderNewsFeed();
    updateNewsBadge();
  }
}


function refreshUI() {
  const state = getState();
  if (!state) return;
  populateCountrySelects(state);
  updateHUD(state);
  updateMap(state);
  updateOverview(state);
  updateEconomyPanel(state);
  updatePopulationPanel(state);
  updateMilitaryPanel(state);
  updateIntelPanel(state);
  updateDiplomacyPanel(state);
  updateSanctionsPanel(state);
  updateAdvisorPanel(state);
  updatePresidentPanel(state);
  updateStatsPanel(state);
  updateTimeControls(state);
}

function updateHUD(state) {
  const e = state.economy;
  const pop = state.population;
  $('hud-flag').textContent = state.country.flag || '🏳️';
  $('hud-country').textContent = state.country.name;
  $('hud-date').textContent = `${state.time.year}/${String(state.time.month).padStart(2,'0')}`;
  $('hud-budget').textContent = e.budget.toFixed(0);
  $('hud-budget').className = e.budget >= 0 ? 'positive' : 'negative';
  const g = e.gdpGrowth;
  $('hud-growth').textContent = (g >= 0 ? '+' : '') + g.toFixed(1) + '%';
  $('hud-growth').className = g >= 0 ? 'positive' : 'negative';
  $('hud-sat').textContent = pop.satisfaction.toFixed(0);
  $('hud-sat').className = pop.satisfaction >= 55 ? 'positive' : pop.satisfaction < 35 ? 'negative' : '';
  $('hud-def').textContent = state.military.defensePower;
  $('hud-alerts').textContent = (state.alerts || []).length;
}

function updateMap(state) {
  const world = $('map-world');
  if (!world) return;
  const rel = state.diplomacy.relations || {};
  const player = state.country;

  const others = (typeof PLAYABLE_COUNTRIES !== 'undefined' ? PLAYABLE_COUNTRIES : COUNTRIES)
    .filter(c => c.id !== player.id);
  const ppos = (typeof MAP_POSITIONS !== 'undefined' && MAP_POSITIONS[player.id])
    ? MAP_POSITIONS[player.id] : { top: 42, left: 42 };
  let html = `
    <div class="map-node player neon-player" data-country="${player.id}" style="top:${ppos.top}%;left:${ppos.left}%;">
      <div class="node-glow"></div>
      <div class="node-flag">${player.flag}</div>
      <div class="node-name">${player.name}</div>
      <div class="node-rel rel-excellent">شما</div>
    </div>`;
  others.forEach(c => {
    const raw = rel[c.id];
    const r = typeof getRelationValue === 'function' ? getRelationValue(raw) : (typeof raw === 'number' ? raw : 40);
    const status = getRelationStatus(r);
    const pos = (typeof MAP_POSITIONS !== 'undefined' && MAP_POSITIONS[c.id])
      ? MAP_POSITIONS[c.id] : { top: 40, left: 50 };
    const glowClass = r >= 70 ? 'neon-ally' : r <= 30 ? 'neon-hostile' : 'neon-neutral';
    html += `
      <div class="map-node ${glowClass}" data-country="${c.id}" style="top:${pos.top}%;left:${pos.left}%;"
           title="${c.name}" onclick="onMapCountryClick('${c.id}')">
        <div class="node-glow"></div>
        <div class="node-flag">${c.flag}</div>
        <div class="node-name">${c.name}</div>
        <div class="node-rel ${status.class}">${Math.round(r)}</div>
      </div>`;
  });
  world.innerHTML = html;


  // Quick stats
  const qs = $('map-quick-stats');
  if (qs) {
    const e = state.economy;
    qs.innerHTML = `
      <div><span>GDP</span><span class="v">${e.gdp.toFixed(0)}</span></div>
      <div><span>رشد</span><span class="v">${e.gdpGrowth.toFixed(1)}%</span></div>
      <div><span>تورم</span><span class="v">${e.inflation.toFixed(1)}%</span></div>
      <div><span>بیکاری</span><span class="v">${e.unemployment.toFixed(1)}%</span></div>
      <div><span>رضایت</span><span class="v">${state.population.satisfaction.toFixed(0)}</span></div>
      <div><span>ثبات</span><span class="v">${e.stability}</span></div>`;
  }

  // Alerts
  const ma = $('map-alerts');
  if (ma) {
    const alerts = state.alerts || [];
    if (!alerts.length) ma.innerHTML = '<span class="muted">هشداری نیست</span>';
    else ma.innerHTML = alerts.slice(0, 4).map(a =>
      `<div class="alert-mini ${a.type || ''}">${a.text}</div>`
    ).join('');
  }

  // Advisor mini
  const am = $('map-advisor-mini');
  if (am && state.advisorSuggestions && state.advisorSuggestions[0]) {
    am.innerHTML = `<strong>${state.advisorSuggestions[0].title}</strong><br><span class="muted">${state.advisorSuggestions[0].description.slice(0, 80)}...</span>`;
  }
}

function updateOverview(state) {
  const e = state.economy;
  const mil = state.military;
  const box = $('overview-stats');
  if (box) {
    box.innerHTML = [
      ['جمعیت', formatNumber(state.country.population)],
      ['GDP', e.gdp.toFixed(1)],
      ['رشد', e.gdpGrowth.toFixed(1) + '%'],
      ['بودجه', e.budget.toFixed(0)],
      ['بدهی', e.nationalDebt.toFixed(0)],
      ['رضایت', state.population.satisfaction.toFixed(0)],
      ['قدرت حمله', mil.attackPower],
      ['قدرت دفاع', mil.defensePower],
      ['فناوری', state.tech.level],
      ['زیرساخت', e.infrastructure]
    ].map(([l, v]) => `<div class="stat-box"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');
  }
  const sw = $('overview-sw');
  if (sw) {
    const s = (state.country.strengths || []).map(x => `<span class="tag good">${x}</span>`).join(' ');
    const w = (state.country.weaknesses || []).map(x => `<span class="tag bad">${x}</span>`).join(' ');
    sw.innerHTML = `<div style="margin-bottom:0.4rem">${s}</div><div>${w}</div>`;
  }
  const proj = $('overview-projects');
  if (proj) {
    if (!state.projects || !state.projects.length) proj.innerHTML = '<span class="muted">هیچ پروژه‌ای در جریان نیست</span>';
    else proj.innerHTML = state.projects.map(p =>
      `<div>${p.name} — ${p.remaining} ماه باقی‌مانده</div>`
    ).join('');
  }
}

function updateEconomyPanel(state) {
  const e = state.economy;
  const box = $('eco-stats');
  if (box) {
    box.innerHTML = [
      ['GDP', e.gdp.toFixed(1)], ['رشد', e.gdpGrowth.toFixed(2) + '%'],
      ['تورم', e.inflation.toFixed(1) + '%'], ['بیکاری', e.unemployment.toFixed(1) + '%'],
      ['بودجه', e.budget.toFixed(1)], ['درآمد', e.revenue.toFixed(1)],
      ['هزینه', e.spending.toFixed(1)], ['کسری', e.deficit.toFixed(1)],
      ['بدهی', e.nationalDebt.toFixed(1)], ['مالیات', e.taxRate + '%'],
      ['صادرات', e.exports.toFixed(1)], ['واردات', e.imports.toFixed(1)],
      ['تراز', e.tradeBalance.toFixed(1)], ['ارز', e.currencyStrength],
      ['سرمایه‌گذاری', e.foreignInvestment.toFixed(1)], ['تولید', e.industrialProduction],
      ['منابع', e.naturalResources], ['زیرساخت', e.infrastructure]
    ].map(([l, v]) => `<div class="stat-box"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');
  }
  const tax = $('tax-slider');
  if (tax) { tax.value = e.taxRate; $('tax-value').textContent = e.taxRate + '%'; }
}

function updatePopulationPanel(state) {
  const pop = state.population;
  const box = $('pop-stats');
  if (box) {
    box.innerHTML = [
      ['جمعیت', formatNumber(state.country.population)],
      ['رضایت', pop.satisfaction.toFixed(1)],
      ['شادی', pop.happiness],
      ['سلامت', pop.health],
      ['آموزش', pop.education],
      ['فقر', pop.povertyRate + '%']
    ].map(([l, v]) => `<div class="stat-box"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');
  }
}

function updateMilitaryPanel(state) {
  const mil = state.military;
  const box = $('mil-stats');
  if (box) {
    box.innerHTML = [
      ['ارتش', mil.army], ['هوایی', mil.airForce], ['دریایی', mil.navy],
      ['دفاع', mil.defenseSystems], ['بودجه', mil.budgetAmount.toFixed(1)],
      ['فناوری', mil.technology], ['آمادگی', mil.readiness],
      ['حمله', mil.attackPower], ['دفاع', mil.defensePower],
      ['نیرو', formatNumber(mil.manpower)]
    ].map(([l, v]) => `<div class="stat-box"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');
  }
}

function updateIntelPanel(state) {
  const intel = state.intelligence;
  const box = $('int-stats');
  if (box) {
    box.innerHTML = [
      ['بودجه', intel.budget.toFixed(1)], ['سطح', intel.level.toFixed(0)],
      ['داخلی', intel.domestic.toFixed(0)], ['خارجی', intel.foreign.toFixed(0)],
      ['ضدجاسوسی', intel.counter.toFixed(0)]
    ].map(([l, v]) => `<div class="stat-box"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');
  }
  const opList = $('intel-ops-list');
  if (opList) {
    if (!intel.operations.length) opList.innerHTML = '<span class="muted">عملیات فعالی نیست</span>';
    else opList.innerHTML = intel.operations.map(op =>
      `<div><strong>${op.type}</strong> → ${op.targetName} (${op.remaining} ماه | ${(op.successChance*100).toFixed(0)}%)</div>`
    ).join('');
  }
}

function updateDiplomacyPanel(state) {
  const list = $('relations-list');
  if (list) {
    const isMulti = state.diplomacy.relationsMode === 'multi';
    list.innerHTML = Object.entries(state.diplomacy.relations).map(([id, val]) => {
      const overall = typeof getRelationValue === 'function' ? getRelationValue(val) : (typeof val === 'number' ? val : (val.overall || 50));
      const status = getRelationStatus(overall);
      const country = getCountryById(id) || COUNTRIES.find(c => c.id === id);
      let extra = '';
      if (isMulti && typeof val === 'object') {
        extra = `<div class="rel-dims muted" style="font-size:0.7rem;margin-top:2px">
          سیاسی ${val.political|0} · اقتصادی ${val.economic|0} · نظامی ${val.military|0} · اعتماد ${val.trust|0} · تهدید ${val.threatLevel|0}
        </div>`;
      }
      return `<div class="rel-row">
        <span>${country?.flag || ''}</span>
        <span class="name">${country?.name || id}</span>
        <span class="${status.class}">${overall.toFixed(0)} — ${status.text}</span>
        <button class="btn-sm" onclick="actionImproveRelation('${id}')">بهبود</button>
        ${extra}
      </div>`;
    }).join('');
  }
  const agr = $('agreements-list');
  if (agr) {
    if (!state.diplomacy.agreements.length) agr.innerHTML = '<span class="muted">توافقی نیست</span>';
    else agr.innerHTML = state.diplomacy.agreements.map(a =>
      `<div>${getAgreementName(a.type)} با ${a.targetName}</div>`
    ).join('');
  }
}


function updateSanctionsPanel(state) {
  const list = $('sanctions-list');
  if (!list) return;
  if (!state.diplomacy.sanctions.length) {
    list.innerHTML = '<span class="muted positive">هیچ تحریمی فعال نیست</span>';
  } else {
    list.innerHTML = state.diplomacy.sanctions.map(s =>
      `<div style="margin-bottom:0.5rem">تحریم از ${s.fromName || s.from} (شدت ${s.severity})
       <button class="btn-sm" onclick="actionLiftSanction('${s.from}')">مذاکره رفع</button></div>`
    ).join('');
  }
}

function updateAdvisorPanel(state) {
  const container = $('advisor-cards');
  if (!container) return;
  const suggestions = state.advisorSuggestions || [];
  if (!suggestions.length) {
    container.innerHTML = '<p class="muted">در حال تحلیل...</p>';
    return;
  }
  container.innerHTML = suggestions.map((s, i) => `
    <div class="advisor-card">
      <div class="num">${i + 1}</div>
      <h4>${s.title}</h4>
      <p>${s.description}</p>
      <p><strong>دلیل:</strong> ${s.reason}</p>
      <p style="color:var(--success)"><strong>مزایا:</strong> ${s.pros}</p>
      <p style="color:var(--danger)"><strong>ریسک:</strong> ${s.risks}</p>
      <p><strong>تأثیر:</strong> ${s.impact}</p>
    </div>
  `).join('');
}

function updatePresidentPanel(state) {
  const p = state.president;
  if (!p) return;
  setText('pres-level', p.level);
  setText('pres-xp', `${p.xp} / ${p.xpToNext}`);
  setText('pres-points', p.skillPoints);
  const skillsBox = $('pres-skills');
  if (skillsBox) {
    const names = { management: 'مدیریت', economy: 'اقتصاد', diplomacy: 'دیپلماسی', military: 'فرماندهی', intelligence: 'اطلاعات' };
    const skillMax = (typeof LIMITS !== 'undefined' && LIMITS.skill) ? LIMITS.skill.max : 10;
    skillsBox.innerHTML = Object.entries(p.skills).map(([k, v]) => {
      const atMax = v >= skillMax;
      const noPts = p.skillPoints < 1;
      const disabled = atMax || noPts;
      const title = atMax ? 'حداکثر سطح مهارت' : (noPts ? 'امتیاز مهارت کافی نیست' : 'ارتقای مهارت');
      return `
      <div class="skill-row">
        <span class="sk-name">${names[k] || k}</span>
        <div class="sk-bar"><div class="bar-track"><div class="bar-fill" style="width:${(v / skillMax) * 100}%"></div></div></div>
        <span class="sk-val">${v} / ${skillMax}</span>
        <button class="btn-sm" onclick="upgradeSkill('${k}')" ${disabled ? 'disabled' : ''} title="${title}">+</button>
      </div>`;
    }).join('');
  }
}

function upgradeSkill(skill) {
  const state = getState();
  if (!state || !state.president || state.president.skillPoints < 1) return;
  const maxSkill = (typeof LIMITS !== 'undefined' && LIMITS.skill) ? LIMITS.skill.max : 10;
  if (state.president.skills[skill] >= maxSkill) return;
  state.president.skills[skill] = typeof clampValue === 'function' ? clampValue('skill', state.president.skills[skill] + 1) : state.president.skills[skill] + 1;
  state.president.skillPoints -= 1;
  setState(state);
  refreshUI();
  showToast(`مهارت ${skill} افزایش یافت`, 'success');
}

function updateStatsPanel(state) {
  const ev = $('stats-events');
  if (ev) {
    if (!state.events || !state.events.length) ev.innerHTML = '<span class="muted">—</span>';
    else ev.innerHTML = state.events.slice(0, 8).map(e =>
      `<div>${e.title}${e.choice ? ' → ' + e.choice : ''}</div>`
    ).join('');
  }
  const log = $('stats-log');
  if (log) {
    if (!state.actionsLog || !state.actionsLog.length) log.innerHTML = '—';
    else log.innerHTML = state.actionsLog.slice(0, 20).map(a =>
      `<div>[${a.time}] ${a.text}</div>`
    ).join('');
  }
}

function updateTimeControls(state) {
  document.querySelectorAll('.speed-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.speed) === state.meta.speed);
  });
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function formatNumber(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

function showToast(msg, type = 'info') {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast show toast-' + type;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Actions (reuse existing logic)
function actionChangeTax() {
  const val = parseInt($('tax-slider').value);
  let state = getState();
  state = changeTaxRate(state, val);
  setState(state);
  refreshUI();
  showToast('نرخ مالیات به ' + val + '% تغییر کرد');
}

function actionInvestInfra() {
  const amount = parseInt($('infra-amount').value) || 10;
  let state = getState();
  const result = investInfrastructure(state, amount);
  if (!result.success) { showToast(result.message, 'danger'); return; }
  setState(result.state);
  refreshUI();
  showToast('پروژه زیرساخت آغاز شد', 'success');
}

function actionMilBudget() {
  const val = parseFloat($('mil-budget-input').value) || 12;
  let state = getState();
  state = adjustMilitaryBudget(state, val);
  setState(state);
  refreshUI();
  showToast('بودجه نظامی تنظیم شد');
}

function actionDevelopForce(type) {
  const amount = parseInt($('force-amount').value) || 8;
  let state = getState();
  const result = developForce(state, type, amount);
  if (!result.success) { showToast(result.message, 'danger'); return; }
  setState(result.state);
  refreshUI();
  showToast('توسعه نیرو آغاز شد', 'success');
}

function actionResearchMil() {
  const points = parseInt($('research-points').value) || 5;
  let state = getState();
  const result = researchMilitaryTech(state, points);
  if (!result.success) { showToast(result.message, 'danger'); return; }
  setState(result.state);
  refreshUI();
  showToast('تحقیق نظامی انجام شد', 'success');
}

function actionTrain() {
  let state = getState();
  const result = setReadinessFocus(state, 'train');
  if (!result.success) { showToast(result.message, 'danger'); return; }
  setState(result.state);
  refreshUI();
  showToast('تمرینات انجام شد', 'success');
}

function actionIntelBudget() {
  const val = parseFloat($('intel-budget-input').value) || 4;
  let state = getState();
  state = setIntelligenceBudget(state, val);
  setState(state);
  refreshUI();
  showToast('بودجه اطلاعات تنظیم شد');
}

function actionGatherIntel() {
  let state = getState();
  const result = gatherIntel(state);
  if (!result.success) { showToast(result.message, 'danger'); return; }
  setState(result.state);
  refreshUI();
  showToast('اطلاعات جمع‌آوری شد', 'success');
}

function actionStartCovert(type) {
  const targetId = $('covert-target').value;
  if (!targetId) { showToast('هدف را انتخاب کنید', 'warning'); return; }
  let state = getState();
  const result = startCovertOperation(state, type, targetId);
  if (!result.success) { showToast(result.message, 'danger'); return; }
  setState(result.state);
  refreshUI();
  showToast('عملیات مخفی آغاز شد', 'success');
}

function actionImproveRelation(targetId) {
  let state = getState();
  const result = improveRelations(state, targetId, 6);
  if (!result.success) { showToast(result.message, 'danger'); return; }
  setState(result.state);
  refreshUI();
  showToast('روابط بهبود یافت', 'success');
}

function actionProposeAgreement(type) {
  const targetId = $('agree-target').value;
  if (!targetId) { showToast('کشور را انتخاب کنید', 'warning'); return; }
  let state = getState();
  const result = proposeAgreement(state, targetId, type);
  if (!result.success) { showToast(result.message, 'danger'); return; }
  setState(result.state);
  refreshUI();
  showToast(result.agreed ? 'توافق امضا شد!' : 'پیشنهاد رد شد', result.agreed ? 'success' : 'warning');
}

function actionLiftSanction(fromId) {
  let state = getState();
  const result = liftSanction(state, fromId);
  if (!result.success) { showToast(result.message, 'danger'); return; }
  setState(result.state);
  refreshUI();
  showToast('تحریم رفع شد', 'success');
}

function actionSave() {
  const result = saveGame();
  showToast(result.message, result.success ? 'success' : 'danger');
}

function actionLoad() {
  const result = loadGame();
  showToast(result.message, result.success ? 'success' : 'danger');
}


function onMapCountryClick(countryId) {
  const state = getState();
  if (!state) return;
  // Highlight and show quick info; switch to diplomacy with focus
  document.querySelectorAll('.map-node').forEach(n => n.classList.remove('map-selected'));
  const node = document.querySelector(`.map-node[data-country="${countryId}"]`);
  if (node) node.classList.add('map-selected');
  const name = typeof getCountryName === 'function' ? getCountryName(countryId) : countryId;
  const rel = state.diplomacy.relations[countryId];
  const val = typeof getRelationValue === 'function' ? getRelationValue(rel) : 50;
  showToast(`${name} — روابط: ${Math.round(val)}`, 'info');
}

function onMapCountryHover(countryId, entering) {
  // reserved for future tooltip; class handled by CSS :hover
}


window.upgradeSkill = upgradeSkill;
window.actionChangeTax = actionChangeTax;
window.actionInvestInfra = actionInvestInfra;
window.actionMilBudget = actionMilBudget;
window.actionDevelopForce = actionDevelopForce;
window.actionResearchMil = actionResearchMil;
window.actionTrain = actionTrain;
window.actionIntelBudget = actionIntelBudget;
window.actionGatherIntel = actionGatherIntel;
window.actionStartCovert = actionStartCovert;
window.actionImproveRelation = actionImproveRelation;
window.actionProposeAgreement = actionProposeAgreement;
window.actionLiftSanction = actionLiftSanction;
window.actionSave = actionSave;
window.actionLoad = actionLoad;

// ========== ACTIONS PANEL (categorized) ==========
let currentActionCat = 'economy';
let selectedActionId = null;

function switchActionCat(cat) {
  currentActionCat = cat;
  document.querySelectorAll('.action-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.cat === cat);
  });
  selectedActionId = null;
  renderActionList();
  const detail = $('action-detail');
  if (detail) detail.style.display = 'none';
}

function renderActionList() {
  const list = $('action-list');
  if (!list || typeof ACTION_CATEGORIES === 'undefined') return;
  const cat = ACTION_CATEGORIES.find(c => c.id === currentActionCat);
  if (!cat) return;
  list.innerHTML = cat.actions.map(a => `
    <div class="action-card ${selectedActionId === a.id ? 'selected' : ''}" onclick="selectAction('${a.id}')">
      <div class="ac-icon">${a.icon}</div>
      <div class="ac-body">
        <div class="ac-title">${a.name}</div>
        <div class="ac-desc">${a.desc}</div>
        <div class="ac-meta">
          <span>⏱ ${a.time}</span>
          <span>⚡ ${a.impact}</span>
          <span class="risk-${a.risk === 'بالا' ? 'high' : a.risk === 'متوسط' ? 'med' : 'low'}">ریسک: ${a.risk}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function selectAction(actionId) {
  selectedActionId = actionId;
  renderActionList();
  const cat = ACTION_CATEGORIES.find(c => c.id === currentActionCat);
  const action = cat && cat.actions.find(a => a.id === actionId);
  if (!action) return;
  const detail = $('action-detail');
  if (!detail) return;
  detail.style.display = 'block';
  $('ad-icon').textContent = action.icon;
  $('ad-title').textContent = action.name;
  $('ad-desc').textContent = action.desc;
  $('ad-cost').textContent = action.cost;
  $('ad-time').textContent = action.time;
  $('ad-impact').textContent = action.impact;
  $('ad-risk').textContent = action.risk;

  const controls = $('ad-controls');
  controls.innerHTML = buildActionControls(actionId);
}

function buildActionControls(actionId) {
  const state = getState();
  if (!state) return '';
  switch (actionId) {
    case 'change_tax': {
      const tMin = LIMITS?.taxRate?.min ?? 8, tMax = LIMITS?.taxRate?.max ?? 45;
      return `<label>نرخ مالیات: <span id="tax-value-a">${state.economy.taxRate}%</span> <span class="limit-label">(${tMin}–${tMax})</span></label>
        <input type="range" id="tax-slider-a" min="${tMin}" max="${tMax}" value="${state.economy.taxRate}"
          oninput="document.getElementById('tax-value-a').textContent=this.value+'%'" />`;
    }
    case 'invest_infra':
      return `<label>مبلغ سرمایه‌گذاری:</label>
        <input type="number" id="infra-amount-a" value="10" min="5" max="50" />`;
    case 'mil_budget': {
      const mn = LIMITS?.milBudgetAmount?.min ?? 3, mx = LIMITS?.milBudgetAmount?.max ?? 45;
      return `<label>بودجه نظامی: <span class="limit-label">${mn}–${mx}</span></label>
        <input type="number" id="mil-budget-a" value="${state.military.budgetAmount || 12}" min="${mn}" max="${mx}" step="0.5" />`;
    }
    case 'develop_force': {
      const army = state.military.army || 0;
      const mx = LIMITS?.army?.max ?? 100;
      return `<label>نوع نیرو:</label>
        <select id="force-type-a">
          <option value="army">ارتش (${army}/${mx})</option>
          <option value="airForce">هوایی (${state.military.airForce||0}/${mx})</option>
          <option value="navy">دریایی (${state.military.navy||0}/${mx})</option>
        </select>
        <label>میزان:</label><input type="number" id="force-amount-a" value="8" min="3" max="20" />
        ${isAtMax('army', army) && isAtMax('airForce', state.military.airForce) && isAtMax('navy', state.military.navy) ? '<p class="limit-max">همه نیروها در حداکثر هستند</p>' : ''}`;
    }
    case 'research_mil':
      return `<label>امتیاز تحقیق:</label><input type="number" id="research-points-a" value="5" min="2" max="15" />`;
    case 'intel_budget': {
      const mn = LIMITS?.intelBudget?.min ?? 1, mx = LIMITS?.intelBudget?.max ?? 20;
      return `<label>بودجه اطلاعات: <span class="limit-label">${mn}–${mx}</span></label>
        <input type="number" id="intel-budget-a" value="${state.intelligence.budget || 4}" min="${mn}" max="${mx}" step="0.5" />`;
    }
    case 'covert':
      const opts = Object.keys(state.diplomacy.relations).map(id =>
        `<option value="${id}">${getCountryFlag(id)} ${getCountryName(id)}</option>`).join('');
      return `<label>نوع عملیات:</label>
        <select id="covert-type-a"><option value="spy">جاسوسی</option><option value="sabotage">خرابکاری</option><option value="influence">نفوذ</option></select>
        <label>هدف:</label><select id="covert-target-a">${opts}</select>`;
    case 'improve_rel':
    case 'propose_agree':
    case 'sanction':
      const opts2 = Object.keys(state.diplomacy.relations).map(id =>
        `<option value="${id}">${getCountryFlag(id)} ${getCountryName(id)}</option>`).join('');
      let extra = '';
      if (actionId === 'propose_agree') {
        extra = `<label>نوع توافق:</label>
          <select id="agree-type-a">
            <option value="trade">تجاری</option><option value="economic">اقتصادی</option>
            <option value="energy">انرژی</option><option value="defense">دفاعی</option>
            <option value="military">نظامی</option>
          </select>`;
      }
      return `<label>کشور هدف:</label><select id="dip-target-a">${opts2}</select>${extra}`;
    case 'social_policy':
    case 'employment':
    case 'public_services':
    case 'trade_policy':
    case 'train':
    case 'gather_intel':
      return `<p class="muted">این اقدام با هزینه ثابت اجرا می‌شود.</p>`;
    default:
      return '';
  }
}

function executeSelectedAction() {
  if (!selectedActionId) return;
  const state = getState();
  if (!state) return;
  let result = null;

  switch (selectedActionId) {
    case 'change_tax': {
      const val = parseInt($('tax-slider-a')?.value || state.economy.taxRate);
      result = { success: true, state: changeTaxRate(state, val) };
      showToast('نرخ مالیات به ' + val + '% تغییر کرد');
      break;
    }
    case 'invest_infra': {
      const amount = parseInt($('infra-amount-a')?.value) || 10;
      result = investInfrastructure(state, amount);
      if (result.success) showToast('پروژه زیرساخت آغاز شد', 'success');
      break;
    }
    case 'mil_budget': {
      const val = parseFloat($('mil-budget-a')?.value) || 12;
      result = { success: true, state: adjustMilitaryBudget(state, val) };
      showToast('بودجه نظامی تنظیم شد');
      break;
    }
    case 'develop_force': {
      const type = $('force-type-a')?.value || 'army';
      const amount = parseInt($('force-amount-a')?.value) || 8;
      result = developForce(state, type, amount);
      if (result.success) showToast('توسعه نیرو آغاز شد', 'success');
      break;
    }
    case 'research_mil': {
      const points = parseInt($('research-points-a')?.value) || 5;
      result = researchMilitaryTech(state, points);
      if (result.success) showToast('تحقیق نظامی انجام شد', 'success');
      break;
    }
    case 'train': {
      result = setReadinessFocus(state, 'train');
      if (result.success) showToast('تمرینات انجام شد', 'success');
      break;
    }
    case 'intel_budget': {
      const val = parseFloat($('intel-budget-a')?.value) || 4;
      result = { success: true, state: setIntelligenceBudget(state, val) };
      showToast('بودجه اطلاعات تنظیم شد');
      break;
    }
    case 'gather_intel': {
      result = gatherIntel(state);
      if (result.success) showToast('اطلاعات جمع‌آوری شد', 'success');
      break;
    }
    case 'covert': {
      const type = $('covert-type-a')?.value || 'spy';
      const targetId = $('covert-target-a')?.value;
      if (!targetId) { showToast('هدف را انتخاب کنید', 'warning'); return; }
      result = startCovertOperation(state, type, targetId);
      if (result.success) showToast('عملیات مخفی آغاز شد', 'success');
      break;
    }
    case 'improve_rel': {
      const targetId = $('dip-target-a')?.value;
      if (!targetId) { showToast('کشور را انتخاب کنید', 'warning'); return; }
      result = improveRelations(state, targetId, 6);
      if (result.success) showToast('روابط بهبود یافت', 'success');
      break;
    }
    case 'propose_agree': {
      const targetId = $('dip-target-a')?.value;
      const type = $('agree-type-a')?.value || 'trade';
      if (!targetId) { showToast('کشور را انتخاب کنید', 'warning'); return; }
      result = proposeAgreement(state, targetId, type);
      if (result.success) showToast(result.agreed ? 'توافق امضا شد!' : 'پیشنهاد رد شد', result.agreed ? 'success' : 'warning');
      break;
    }
    case 'sanction': {
      const targetId = $('dip-target-a')?.value;
      if (!targetId) { showToast('کشور را انتخاب کنید', 'warning'); return; }
      result = imposeSanction(state, targetId);
      if (result.success) showToast('تحریم اعلام شد', 'warning');
      break;
    }
    case 'social_policy': {
      if (state.economy.budget < 10) { showToast('بودجه کافی نیست', 'danger'); return; }
      state.economy.budget -= 10;
      state.population.satisfaction = Math.min(95, state.population.satisfaction + 4);
      result = { success: true, state };
      showToast('سیاست اجتماعی اجرا شد', 'success');
      if (typeof addNews === 'function') addNews(state, { type: 'domestic', category: 'politics', icon: '🤝', title: 'سیاست اجتماعی جدید اجرا شد', summary: 'خدمات اجتماعی گسترش یافت.' });
      break;
    }
    case 'employment': {
      if (state.economy.budget < 15) { showToast('بودجه کافی نیست', 'danger'); return; }
      state.economy.budget -= 15;
      state.economy.unemployment = Math.max(2, state.economy.unemployment - 1.2);
      result = { success: true, state };
      showToast('برنامه اشتغال اجرا شد', 'success');
      break;
    }
    case 'public_services': {
      if (state.economy.budget < 12) { showToast('بودجه کافی نیست', 'danger'); return; }
      state.economy.budget -= 12;
      state.population.satisfaction = Math.min(95, state.population.satisfaction + 3);
      state.population.health = Math.min(95, (state.population.health || 60) + 2);
      result = { success: true, state };
      showToast('خدمات عمومی تقویت شد', 'success');
      break;
    }
    case 'trade_policy': {
      state.economy.exports += 2;
      state.economy.tradeBalance += 1.5;
      result = { success: true, state };
      showToast('سیاست تجاری به‌روز شد', 'success');
      break;
    }
    default:
      showToast('اقدام پشتیبانی نشده', 'warning');
      return;
  }

  if (result && !result.success) {
    showToast(result.message || 'خطا', 'danger');
    return;
  }
  if (result && result.state) setState(result.state);
  else setState(state);
  refreshUI();
}

// ========== NEWS PANEL ==========
let currentNewsFilter = 'all';

function filterNews(filter) {
  currentNewsFilter = filter;
  document.querySelectorAll('.news-filter').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  renderNewsFeed();
}

function renderNewsFeed() {
  const feed = $('news-feed');
  if (!feed) return;
  const state = getState();
  if (!state || !state.news || !state.news.length) {
    feed.innerHTML = '<div class="muted" style="padding:1.5rem;text-align:center">هنوز خبری ثبت نشده است</div>';
    return;
  }
  let items = state.news;
  if (currentNewsFilter === 'domestic' || currentNewsFilter === 'global') {
    items = items.filter(n => n.type === currentNewsFilter);
  } else if (currentNewsFilter !== 'all') {
    items = items.filter(n => n.category === currentNewsFilter);
  }
  feed.innerHTML = items.map(n => `
    <div class="news-item ${n.important ? 'news-important' : ''} ${n.read ? 'read' : 'unread'}" onclick="openNewsItem('${n.id}')">
      <div class="news-icon">${n.icon}</div>
      <div class="news-body">
        <div class="news-title">${n.title}</div>
        <div class="news-summary">${n.summary}</div>
        <div class="news-meta">
          <span>${n.year}/${String(n.month).padStart(2,'0')}</span>
          <span class="news-cat">${n.type === 'domestic' ? 'داخلی' : 'جهانی'} · ${n.category}</span>
          ${n.important ? '<span class="breaking">فوری</span>' : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function openNewsItem(id) {
  const state = getState();
  if (!state) return;
  markNewsRead(state, id);
  setState(state);
  renderNewsFeed();
  updateNewsBadge();
}

function markAllNewsReadUI() {
  const state = getState();
  if (!state) return;
  markAllNewsRead(state);
  setState(state);
  renderNewsFeed();
  updateNewsBadge();
  showToast('همه اخبار خوانده شد');
}

function updateNewsBadge() {
  const badge = $('news-badge');
  const state = getState();
  if (!badge || !state) return;
  const n = state.newsUnread || 0;
  if (n > 0) {
    badge.style.display = 'inline-block';
    badge.textContent = n > 9 ? '9+' : n;
  } else {
    badge.style.display = 'none';
  }
}

// Hook into refreshUI
const _origRefreshUI = typeof refreshUI === 'function' ? refreshUI : null;
window.refreshUI = function() {
  if (_origRefreshUI) _origRefreshUI();
  if (currentPanel === 'actions') {
    renderActionList();
  }
  if (currentPanel === 'news') {
    renderNewsFeed();
  }
  updateNewsBadge();
};

window.switchActionCat = switchActionCat;
window.selectAction = selectAction;
window.executeSelectedAction = executeSelectedAction;
window.filterNews = filterNews;
window.openNewsItem = openNewsItem;
window.markAllNewsReadUI = markAllNewsReadUI;
