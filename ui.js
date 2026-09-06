// ui.js - Gaming UI updates

let currentPanel = 'map';

function $(id) { return document.getElementById(id); }

function showPanel(panelId) {
  currentPanel = panelId;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const panel = $(panelId);
  if (panel) panel.classList.add('active');
  const btn = document.querySelector(`.nav-item[data-panel="${panelId}"]`);
  if (btn) btn.classList.add('active');
  refreshUI();
}

function refreshUI() {
  const state = getState();
  if (!state) return;
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

  let html = `
    <div class="map-node player pos-player">
      <div class="node-flag">${player.flag}</div>
      <div class="node-name">${player.name}</div>
    </div>`;

  COUNTRIES.forEach(c => {
    const r = rel[c.id] ?? 40;
    const status = getRelationStatus(r);
    html += `
      <div class="map-node pos-${c.id}" title="${c.name}">
        <div class="node-flag">${c.flag}</div>
        <div class="node-name">${c.name}</div>
        <div class="node-rel ${status.class}">${r.toFixed(0)}</div>
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
    list.innerHTML = Object.entries(state.diplomacy.relations).map(([id, val]) => {
      const status = getRelationStatus(val);
      const country = COUNTRIES.find(c => c.id === id);
      return `<div class="rel-row">
        <span>${country?.flag || ''}</span>
        <span class="name">${country?.name || id}</span>
        <span class="${status.class}">${val.toFixed(0)} — ${status.text}</span>
        <button class="btn-sm" onclick="actionImproveRelation('${id}')">بهبود</button>
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
    skillsBox.innerHTML = Object.entries(p.skills).map(([k, v]) => `
      <div class="skill-row">
        <span class="sk-name">${names[k] || k}</span>
        <div class="sk-bar"><div class="bar-track"><div class="bar-fill" style="width:${v * 10}%"></div></div></div>
        <span class="sk-val">${v}</span>
        <button onclick="upgradeSkill('${k}')" ${p.skillPoints < 1 || v >= 10 ? 'disabled' : ''}>+</button>
      </div>
    `).join('');
  }
}

function upgradeSkill(skill) {
  const state = getState();
  if (!state || !state.president || state.president.skillPoints < 1) return;
  if (state.president.skills[skill] >= 10) return;
  state.president.skills[skill] += 1;
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
