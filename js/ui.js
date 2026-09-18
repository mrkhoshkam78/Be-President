// ui.js - Gaming UI updates

let currentPanel = 'map';

function $(id) { return document.getElementById(id); }

/** Populate all country dropdowns from central PLAYABLE_COUNTRIES (exclude player). Single Source of Truth. */
function populateCountrySelects(state) {
  if (!state) state = getState();
  if (!state) return;
  const playerId = state.country?.id;
  const all = (typeof PLAYABLE_COUNTRIES !== 'undefined')
    ? PLAYABLE_COUNTRIES.filter(c => c.id !== playerId)
    : [];
  const relations = state.diplomacy?.relations || {};
  const atWar = new Set((state.wars || []).map(w => w.opponent));
  const allies = new Set();
  (state.alliances?.military || []).forEach(a => (a.members || []).forEach(m => { if (m !== playerId) allies.add(m); }));
  (state.alliances?.economic || []).forEach(a => (a.members || []).forEach(m => { if (m !== playerId) allies.add(m); }));

  const makeOptions = (extraFilter) => {
    return all.filter(extraFilter || (() => true)).map(c => {
      const rel = relations[c.id];
      const val = typeof getRelationValue === 'function' ? getRelationValue(rel) : (typeof rel === 'number' ? rel : 50);
      const warTag = atWar.has(c.id) ? ' ⚔️' : '';
      const allyTag = allies.has(c.id) ? ' 🤝' : '';
      const mp = c.militaryPower != null ? c.militaryPower : '—';
      return `<option value="${c.id}">${c.flag || ''} ${c.name} · روابط ${Math.round(val)} · نظامی ${mp}${warTag}${allyTag}</option>`;
    }).join('');
  };

  const warOptions = makeOptions(c => !allies.has(c.id)); // allies not attackable by default
  const normalOptions = makeOptions();

  const targets = {
    'covert-target': normalOptions,
    'agree-target': normalOptions,
    'war-target': warOptions,
    'ally-target': normalOptions,
    'loan-source-country': normalOptions,
    'loan-target-country': normalOptions
  };
  Object.keys(targets).forEach(selId => {
    const sel = $(selId);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">انتخاب کشور...</option>` + targets[selId];
    if (current && [...sel.options].some(o => o.value === current)) sel.value = current;
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
  updateUpgradesPanel(state);
  updateEconomyPanel(state);
  updatePopulationPanel(state);
  updateMilitaryPanel(state);
  updateWarsPanel(state);
  updateIntelPanel(state);
  updateDiplomacyPanel(state);
  updateSanctionsPanel(state);
  updateAdvisorPanel(state);
  updatePresidentPanel(state);
  updateStatsPanel(state);
  updateNewsPanel(state);
  updateTimeControls(state);
}

function updateHUD(state) {
  const e = state.economy;
  const pop = state.population;
  $('hud-flag').textContent = state.country.flag || '🏳️';
  $('hud-country').textContent = state.country.name;
  $('hud-date').textContent = `${state.time.year}/${String(state.time.month).padStart(2,'0')}`;
  $('hud-budget').textContent = formatMoney(e.budget);
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
  const atWar = new Set((state.wars || []).map(w => w.opponent));
  others.forEach(c => {
    const raw = rel[c.id];
    const r = typeof getRelationValue === 'function' ? getRelationValue(raw) : (typeof raw === 'number' ? raw : 40);
    const status = typeof getRelationStatus === 'function' ? getRelationStatus(r) : { class: 'rel-neutral' };
    const pos = (typeof MAP_POSITIONS !== 'undefined' && MAP_POSITIONS[c.id])
      ? MAP_POSITIONS[c.id] : { top: 40 + Math.random()*20, left: 30 + Math.random()*40 };
    const glowClass = r >= 70 ? 'neon-ally' : r <= 30 ? 'neon-hostile' : 'neon-neutral';
    const warClass = atWar.has(c.id) ? ' at-war' : '';
    html += `
      <div class="map-node ${glowClass}${warClass}" data-country="${c.id}" style="top:${pos.top}%;left:${pos.left}%;"
           title="${c.name} · روابط ${Math.round(r)}" onclick="onMapCountryClick('${c.id}')"
           onmouseenter="onMapCountryHover('${c.id}', true)" onmouseleave="onMapCountryHover('${c.id}', false)">
        <div class="node-flag">${c.flag || '🏳️'}</div>
        <div class="node-name">${c.name}</div>
        <div class="node-rel ${status.class || ''}">${Math.round(r)}</div>
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
    const rating = typeof getCreditRatingLabel === 'function'
      ? getCreditRatingLabel(e.creditRating || 60)
      : { label: String(e.creditRating || '—'), class: 'rating-bbb' };
    const fm = typeof formatMoney === 'function' ? formatMoney : (n) => String(n);
    box.innerHTML = [
      ['GDP', fm(e.gdp)], ['رشد', e.gdpGrowth.toFixed(2) + '%'],
      ['تورم', e.inflation.toFixed(1) + '%'], ['بیکاری', e.unemployment.toFixed(1) + '%'],
      ['بودجه', fm(e.budget)], ['درآمد', fm(e.revenue)],
      ['هزینه', fm(e.spending)], ['کسری', fm(e.deficit)],
      ['بدهی', fm(e.nationalDebt)], ['مالیات', e.taxRate + '%'],
      ['رتبه اعتباری', `<span class="rating-badge ${rating.class}">${rating.label}</span>`]
    ].map(([l, v]) => `<div class="stat-box"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');
  }
  // Credit box
  const cr = $('credit-rating-box');
  if (cr) {
    const rating = typeof getCreditRatingLabel === 'function'
      ? getCreditRatingLabel(e.creditRating || 60)
      : { label: String(e.creditRating || '—'), class: '' };
    const ratio = e.gdp > 0 ? ((e.nationalDebt / e.gdp) * 100).toFixed(0) : '—';
    cr.innerHTML = `<div class="list-card cat-economy">
      <div class="list-card-header">
        <span class="ico">📊</span>
        <span>رتبه اعتباری کشور</span>
        <span class="rating-badge ${rating.class}">${rating.label}</span>
      </div>
      <div class="list-card-meta">
        <span>امتیاز: <strong>${e.creditRating || '—'}</strong></span>
        <span>نسبت بدهی به GDP: <strong>${ratio}%</strong></span>
      </div>
    </div>`;
  }
  // Budget logic explanation
  let logic = $('budget-logic-box');
  if (!logic) {
    const ecoPanel = $('economy');
    if (ecoPanel) {
      logic = document.createElement('div');
      logic.id = 'budget-logic-box';
      logic.className = 'section';
      const stats = $('eco-stats');
      if (stats && stats.parentNode) stats.parentNode.insertBefore(logic, stats.nextSibling);
      else ecoPanel.appendChild(logic);
    }
  }
  if (logic) {
    const e = state.economy;
    const taxRev = Math.round((e.gdp || 0) * ((e.taxRate || 20) / 100) * 0.35 * 10) / 10;
    const milSpend = e.milBudgetAmount || state.military?.budgetAmount || 12;
    logic.innerHTML = `<h3>📊 منطق بودجه (ماهانه تقریبی)</h3>
      <div class="budget-flow">
        <div class="bf-row"><span>درآمد مالیاتی ≈ GDP × نرخ مالیات × ضریب وصول</span><strong class="positive">+${typeof formatMoney==='function'?formatMoney(e.revenue||taxRev): (e.revenue||taxRev)}</strong></div>
        <div class="bf-row"><span>درآمد منابع / تجارت</span><strong class="positive">+${typeof formatMoney==='function'?formatMoney(e.resourceIncome||0):(e.resourceIncome||0)}</strong></div>
        <div class="bf-row"><span>هزینه جاری + نظامی + پروژه‌ها</span><strong class="negative">−${typeof formatMoney==='function'?formatMoney(e.spending||0):(e.spending||0)}</strong></div>
        <div class="bf-row total"><span>بودجه نقدی فعلی</span><strong class="${(e.budget||0)>=0?'positive':'negative'}">${typeof formatMoney==='function'?formatMoney(e.budget):e.budget}</strong></div>
        <div class="bf-row"><span>بدهی ملی / نسبت به GDP</span><strong>${typeof formatMoney==='function'?formatMoney(e.nationalDebt):e.nationalDebt} (${e.gdp>0?((e.nationalDebt/e.gdp)*100).toFixed(0):'—'}%)</strong></div>
      </div>
      <p class="muted" style="font-size:0.78rem;margin-top:0.5rem">بودجه هر ماه از درآمد (مالیات + منابع + تجارت) منهای هزینه‌ها به‌روز می‌شود. وام، جنگ و بحران بودجه را کم یا زیاد می‌کنند. ارتقا و تولید تجهیزات مستقیماً از بودجه نقدی کسر می‌شود.</p>`;
  }

  // Fill loan country selects
  fillLoanCountrySelects(state);
  renderLoansList(state);
  previewLoanTaken();
  previewLoanGiven();
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
        extra = `<div class="list-card-meta" style="font-size:0.72rem">
          سیاسی ${val.political|0} · اقتصادی ${val.economic|0} · نظامی ${val.military|0} · اعتماد ${val.trust|0}
        </div>`;
      }
      const barClass = overall >= 70 ? 'excellent' : overall >= 55 ? 'good' : overall >= 40 ? 'neutral' : overall >= 25 ? 'poor' : 'hostile';
      const badgeClass = overall >= 70 ? 'ally' : overall <= 30 ? 'hostile' : 'neutral';
      return `<div class="list-card cat-diplomacy">
        <div class="list-card-header">
          <span class="ico">${country?.flag || '🌐'}</span>
          <span>${country?.name || id}</span>
          <span class="status-badge ${badgeClass}" style="margin-right:auto">${status.text}</span>
        </div>
        <div class="list-card-meta">
          <span>رابطه: <strong>${overall.toFixed(0)}</strong></span>
        </div>
        <div class="rel-bar-wrap"><div class="rel-bar ${barClass}" style="width:${Math.min(100, overall)}%"></div></div>
        ${extra}
        <div class="list-card-actions">
          <button class="btn" onclick="actionImproveRelation('${id}')">بهبود رابطه</button>
        </div>
      </div>`;
    }).join('');
  }
  const agr = $('agreements-list');
  if (agr) {
    if (!state.diplomacy.agreements.length) agr.innerHTML = '<span class="muted">توافقی فعال نیست</span>';
    else agr.innerHTML = state.diplomacy.agreements.map(a =>
      `<div class="list-card cat-diplomacy">
        <div class="list-card-header">
          <span class="ico">🌐</span>
          <span>${getAgreementName(a.type)} با ${a.targetName || a.target}</span>
          <span class="status-badge active">فعال ✅</span>
        </div>
        <div class="list-card-meta">
          ${a.value ? `<span>ارزش: <strong>${a.value}</strong></span>` : ''}
          ${a.years ? `<span>مدت: ${a.years} سال</span>` : ''}
        </div>
      </div>`
    ).join('');
  }
}


function updateSanctionsPanel(state) {
  const list = $('sanctions-list');
  if (!list) return;
  if (!state.diplomacy.sanctions.length) {
    list.innerHTML = '<div class="list-card" style="border-color:#86efac"><div class="list-card-header"><span class="ico">✅</span><span>هیچ تحریمی فعال نیست</span></div></div>';
  } else {
    list.innerHTML = state.diplomacy.sanctions.map(s =>
      `<div class="list-card cat-crisis">
        <div class="list-card-header">
          <span class="ico">🚫</span>
          <span>تحریم از ${s.fromName || s.from}</span>
          <span class="status-badge hostile">شدت ${s.severity}</span>
        </div>
        <div class="list-card-actions">
          <button class="btn" onclick="actionLiftSanction('${s.from}')">مذاکره رفع تحریم</button>
        </div>
      </div>`
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

/** Central money / number formatter for Budget, GDP, Debt, Costs etc. */
function formatMoney(n, opts = {}) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(Number(n));
  const sign = n < 0 ? '-' : '';
  const withDollar = opts.dollar !== false;
  const prefix = withDollar ? '$' : '';
  if (abs >= 1e12) return sign + prefix + (abs / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return sign + prefix + (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return sign + prefix + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) {
    // thousands with commas
    return sign + prefix + Math.round(abs).toLocaleString('en-US');
  }
  return sign + prefix + (Math.round(abs * 10) / 10).toLocaleString('en-US');
}

function formatNumber(n) {
  return formatMoney(n, { dollar: false });
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
  document.querySelectorAll('.map-node').forEach(n => n.classList.remove('map-selected'));
  const node = document.querySelector(`.map-node[data-country="${countryId}"]`);
  if (node) node.classList.add('map-selected');

  const panel = $('map-country-detail');
  if (!panel) return;

  const isPlayer = countryId === state.country.id;
  const country = (typeof PLAYABLE_COUNTRIES !== 'undefined' ? PLAYABLE_COUNTRIES : [])
    .find(c => c.id === countryId) || state.country;

  let relHtml = '';
  let agreementsHtml = '';
  let sanctionsHtml = '';

  if (isPlayer) {
    relHtml = '<span class="status-badge ally">کشور شما</span>';
  } else {
    const rel = state.diplomacy.relations[countryId];
    const val = typeof getRelationValue === 'function' ? getRelationValue(rel) : (typeof rel === 'number' ? rel : 50);
    const status = getRelationStatus(val);
    const barClass = val >= 70 ? 'excellent' : val >= 55 ? 'good' : val >= 40 ? 'neutral' : val >= 25 ? 'poor' : 'hostile';
    relHtml = `<div class="list-card-meta"><span>رابطه: <strong>${Math.round(val)}</strong> — ${status.text}</span></div>
      <div class="rel-bar-wrap"><div class="rel-bar ${barClass}" style="width:${Math.min(100,val)}%"></div></div>`;
  }

  const agreements = (state.diplomacy.agreements || []).filter(a => a.target === countryId || a.targetId === countryId);
  if (agreements.length) {
    agreementsHtml = '<div style="margin-top:0.5rem"><strong>توافق‌ها:</strong> ' +
      agreements.map(a => getAgreementName(a.type)).join('، ') + '</div>';
  }
  const sanctions = (state.diplomacy.sanctions || []).filter(s => s.from === countryId || s.to === countryId);
  if (sanctions.length) {
    sanctionsHtml = '<div style="margin-top:0.35rem;color:var(--danger)"><strong>تحریم:</strong> فعال (' + sanctions.length + ')</div>';
  }

  panel.style.display = 'block';
  panel.innerHTML = `
    <h3>${country.flag || ''} ${country.name}</h3>
    <div class="list-card-meta" style="flex-direction:column;align-items:stretch;gap:0.35rem">
      <div class="tip-row"><span>GDP پایه</span><strong>${country.baseGDP || '—'}</strong></div>
      <div class="tip-row"><span>جمعیت</span><strong>${country.population ? (country.population/1e6).toFixed(0)+'M' : '—'}</strong></div>
      <div class="tip-row"><span>قدرت نظامی</span><strong>${country.militaryPower || (country.military ? '—' : '—')}</strong></div>
      <div class="tip-row"><span>قدرت اقتصادی</span><strong>${country.economyPower || '—'}</strong></div>
      <div class="tip-row"><span>منطقه</span><strong>${country.region || '—'}</strong></div>
    </div>
    ${relHtml}
    ${agreementsHtml}
    ${sanctionsHtml}
    ${!isPlayer ? `<div class="list-card-actions" style="margin-top:0.6rem">
      <button class="btn" onclick="actionImproveRelation('${countryId}')">بهبود رابطه</button>
      <button class="btn btn-outline" onclick="showPanel('diplomacy')">دیپلماسی</button>
    </div>` : ''}
  `;
}

function onMapCountryHover(countryId, entering) {
  // CSS :hover handles visual; optional future tooltip
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
  const catLabels = {
    economy: '💰 اقتصادی', politics: '🏛️ سیاسی', military: '⚔️ نظامی',
    diplomacy: '🌐 دیپلماتیک', crisis: '⚠️ بحران', tech: '🔬 فناوری', general: '📰 عمومی'
  };
  feed.innerHTML = items.map(n => `
    <div class="news-item ${n.important ? 'news-important' : ''} ${n.read ? 'read' : 'unread'}" onclick="openNewsItem('${n.id}')">
      <div class="news-icon">${n.icon || '📰'}</div>
      <div class="news-body">
        <div class="news-title">${n.title}</div>
        <div class="news-summary">${n.summary || ''}</div>
        <div class="news-meta">
          <span>📅 ${n.year}/${String(n.month).padStart(2,'0')}</span>
          <span class="news-cat">${n.type === 'domestic' ? 'داخلی' : 'جهانی'} · ${catLabels[n.category] || n.category}</span>
          ${(n.countries && n.countries.length) ? '<span>🌍 مرتبط</span>' : ''}
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


// ========== LOAN UI (v2.2) ==========
function fillLoanCountrySelects(state) {
  if (!state) return;
  const ids = Object.keys(state.diplomacy.relations || {});
  const opts = ids.map(id => {
    const c = (typeof PLAYABLE_COUNTRIES !== 'undefined' ? PLAYABLE_COUNTRIES : []).find(x => x.id === id);
    return `<option value="${id}">${c ? c.flag + ' ' + c.name : id}</option>`;
  }).join('');
  const src = $('loan-source-country');
  const tgt = $('loan-target-country');
  if (src) src.innerHTML = opts;
  if (tgt) tgt.innerHTML = opts;
}

function previewLoanTaken() {
  const amount = parseFloat(($('loan-amount') || {}).value) || 20;
  const years = parseInt(($('loan-years') || {}).value) || 5;
  const source = ($('loan-source') || {}).value || 'domestic_bank';
  const state = getState();
  let rate = 5.5;
  if (source === 'imf') rate = 3.2;
  else if (source === 'foreign_country') rate = 4.0;
  const credit = state?.economy?.creditRating || 60;
  if (credit < 40) rate += 6;
  else if (credit < 55) rate += 3.5;
  else if (credit < 70) rate += 1.5;
  else if (credit >= 85) rate -= 0.8;
  rate = Math.round(rate * 10) / 10;
  const monthly = typeof calcMonthlyPayment === 'function' ? calcMonthlyPayment(amount, rate, years) : (amount / (years * 12) * 1.2);
  const total = Math.round(monthly * years * 12 * 10) / 10;
  const el = $('loan-taken-preview');
  if (el) el.innerHTML = `نرخ بهره تقریبی: <strong>${rate}%</strong> · قسط ماهانه: <strong>${monthly.toFixed(2)}</strong> · کل بازپرداخت: <strong>${total}</strong>`;
  // Show/hide country select
  const row = $('loan-source-country-row');
  if (row) row.style.display = source === 'foreign_country' ? 'flex' : 'none';
}

function previewLoanGiven() {
  const amount = parseFloat(($('loan-give-amount') || {}).value) || 10;
  const years = parseInt(($('loan-give-years') || {}).value) || 5;
  const rate = parseFloat(($('loan-give-rate') || {}).value) || 5;
  const monthly = typeof calcMonthlyPayment === 'function' ? calcMonthlyPayment(amount, rate, years) : (amount / (years * 12) * 1.15);
  const total = Math.round(monthly * years * 12 * 10) / 10;
  const el = $('loan-given-preview');
  if (el) el.innerHTML = `قسط ماهانه دریافتی: <strong>${monthly.toFixed(2)}</strong> · کل بازگشت: <strong>${total}</strong>`;
}

function actionRequestLoan() {
  const state = getState();
  if (!state) return;
  const source = ($('loan-source') || {}).value || 'domestic_bank';
  const amount = parseFloat(($('loan-amount') || {}).value) || 20;
  const years = parseInt(($('loan-years') || {}).value) || 5;
  const opts = { source, amount, years };
  if (source === 'foreign_country') {
    opts.sourceCountryId = ($('loan-source-country') || {}).value;
    const c = (PLAYABLE_COUNTRIES || []).find(x => x.id === opts.sourceCountryId);
    opts.sourceName = c ? c.name : 'کشور خارجی';
  }
  const result = requestLoan(state, opts);
  if (!result.success) { showToast(result.message, 'danger'); return; }
  setState(result.state);
  refreshUI();
  showToast('وام دریافت شد', 'success');
}

function actionGiveLoan() {
  const state = getState();
  if (!state) return;
  const targetCountryId = ($('loan-target-country') || {}).value;
  const amount = parseFloat(($('loan-give-amount') || {}).value) || 10;
  const years = parseInt(($('loan-give-years') || {}).value) || 5;
  const rate = parseFloat(($('loan-give-rate') || {}).value) || 5;
  const result = giveLoan(state, { targetCountryId, amount, years, rate });
  if (!result.success) { showToast(result.message, 'danger'); return; }
  setState(result.state);
  refreshUI();
  showToast('وام اعطا شد', 'success');
}

function renderLoansList(state) {
  const box = $('loans-list');
  if (!box) return;
  const taken = (state.economy.loansTaken || []).filter(l => l.status === 'active' || l.status === 'defaulted');
  const given = (state.economy.loansGiven || []).filter(l => l.status === 'active' || l.status === 'defaulted');
  if (!taken.length && !given.length) {
    box.innerHTML = '<span class="muted">وام فعالی وجود ندارد</span>';
    return;
  }
  let html = '';
  taken.forEach(l => {
    const pct = l.monthsTotal ? Math.round((l.monthsPaid / l.monthsTotal) * 100) : 0;
    html += `<div class="list-card cat-economy">
      <div class="list-card-header">
        <span class="ico">📥</span>
        <span>وام از ${l.sourceName}</span>
        <span class="status-badge ${l.status === 'active' ? 'active' : 'defaulted'}">${l.status === 'active' ? 'فعال' : 'نکول'}</span>
      </div>
      <div class="list-card-meta">
        <span>مبلغ: <strong>${l.amount}</strong></span>
        <span>بهره: ${l.rate}%</span>
        <span>قسط: ${l.monthlyPayment}</span>
        <span>باقیمانده: ${l.remaining?.toFixed?.(1) || l.remaining}</span>
      </div>
      <div class="progress-bar"><div style="width:${pct}%"></div></div>
    </div>`;
  });
  given.forEach(l => {
    const pct = l.monthsTotal ? Math.round((l.monthsPaid / l.monthsTotal) * 100) : 0;
    html += `<div class="list-card cat-diplomacy">
      <div class="list-card-header">
        <span class="ico">📤</span>
        <span>وام به ${l.targetFlag || ''} ${l.targetName}</span>
        <span class="status-badge ${l.status === 'active' ? 'active' : l.status === 'defaulted' ? 'defaulted' : 'paid'}">${l.status === 'active' ? 'فعال' : l.status === 'defaulted' ? 'نکول' : 'پرداخت‌شده'}</span>
      </div>
      <div class="list-card-meta">
        <span>مبلغ: <strong>${l.amount}</strong></span>
        <span>بهره: ${l.rate}%</span>
        <span>قسط دریافتی: ${l.monthlyPayment}</span>
      </div>
      <div class="progress-bar"><div style="width:${pct}%"></div></div>
    </div>`;
  });
  box.innerHTML = html;
}

// Source select change
document.addEventListener('change', function(e) {
  if (e.target && e.target.id === 'loan-source') previewLoanTaken();
});

window.actionRequestLoan = actionRequestLoan;
window.actionGiveLoan = actionGiveLoan;
window.previewLoanTaken = previewLoanTaken;
window.previewLoanGiven = previewLoanGiven;

// ========== V3.0.1 Panels ==========

function updateUpgradesPanel(state) {
  const grid = $('upgrades-grid');
  if (!grid) return;
  const ups = state.upgrades || {};
  const defs = (typeof UPGRADE_DEFS !== 'undefined') ? UPGRADE_DEFS : {};
  let html = '';
  Object.keys(defs).forEach(id => {
    const def = defs[id];
    const up = ups[id] || { level: 1, min: 1, max: 100 };
    const level = up.level || 1;
    const max = up.max || 100;
    const pct = Math.round((level / max) * 100);
    const check = (typeof canUpgrade === 'function') ? canUpgrade(state, id) : { ok: false, cost: 0 };
    const costStr = typeof formatMoney === 'function' ? formatMoney(check.cost || 0) : (check.cost || 0);
    const maxed = level >= max;
    html += `<div class="upgrade-card ${maxed ? 'maxed' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>${def.name || id}</strong>
        <span class="muted">${def.category || ''}</span>
      </div>
      <div style="margin:0.3rem 0;font-size:1.1rem">Level <strong>${level}</strong> / ${max}</div>
      <div class="level-bar"><div class="level-fill" style="width:${pct}%"></div></div>
      <p class="muted" style="font-size:0.85rem;margin:0.4rem 0">${def.description || ''}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem">
        <span>هزینه: <strong>${maxed ? '—' : costStr}</strong></span>
        <button class="btn btn-sm ${maxed ? '' : 'btn-success'}" 
          onclick="actionPerformUpgrade('${id}')" 
          ${maxed || !check.ok ? 'disabled' : ''}
          title="${maxed ? 'Maximum Level Reached' : (check.reason || '')}">
          ${maxed ? 'حداکثر سطح' : 'ارتقا'}
        </button>
      </div>
    </div>`;
  });
  grid.innerHTML = html || '<p class="muted">سیستم ارتقا در دسترس نیست</p>';

  // Election status
  const elBox = $('election-status');
  if (elBox && state.election) {
    const el = state.election;
    const monthsTo = (el.nextElectionYear - state.time.year) * 12 + (el.nextElectionMonth - state.time.month);
    elBox.innerHTML = `
      <div class="stat-card"><span class="lbl">تأیید عمومی</span><span class="val">${el.approval || 50}%</span></div>
      <div class="stat-card"><span class="lbl">انتخابات بعدی</span><span class="val">${monthsTo > 0 ? monthsTo + ' ماه' : 'در جریان'}</span></div>
      <div class="stat-card"><span class="lbl">عملکرد اقتصادی</span><span class="val">${el.performance?.economic || 50}</span></div>
      <div class="stat-card"><span class="lbl">عملکرد نظامی</span><span class="val">${el.performance?.military || 50}</span></div>
      <div class="stat-card"><span class="lbl">عملکرد دیپلماتیک</span><span class="val">${el.performance?.diplomatic || 50}</span></div>
      <div class="stat-card"><span class="lbl">رضایت داخلی</span><span class="val">${el.performance?.domestic || 50}</span></div>
    `;
  }
}

function actionPerformUpgrade(id) {
  let state = getState();
  if (!state || typeof performUpgrade !== 'function') return;
  const res = performUpgrade(state, id);
  setState(state);
  refreshUI();
  if (res.success) showToast(res.message, 'success');
  else showToast(res.message || 'ارتقاء ناموفق', 'error');
}

function updateWarsPanel(state) {
  const warsBox = $('active-wars-list');
  if (warsBox) {
    const wars = state.wars || [];
    if (!wars.length) {
      warsBox.innerHTML = '<p class="muted">هیچ جنگ فعالی وجود ندارد</p>';
    } else {
      warsBox.innerHTML = wars.map(w => `
        <div class="list-card cat-military">
          <div class="list-card-header">
            <span>${w.opponentFlag || ''} ${w.opponentName}</span>
            <span class="status-badge active">${w.status}</span>
          </div>
          <div class="list-card-meta">
            <span>قدرت شما: ${w.playerPower}</span>
            <span>قدرت دشمن: ${w.enemyPower}</span>
            <span>احتمال پیروزی: ${Math.round(w.winChance)}%</span>
            <span>مدت: ${w.durationMonths || 0} ماه</span>
            <span>تلفات: ${w.casualties || 0}</span>
            <span>هزینه: ${typeof formatMoney === 'function' ? formatMoney(w.costAccumulated || 0) : (w.costAccumulated || 0)}</span>
          </div>
          <div style="margin-top:0.4rem">
            <button class="btn btn-sm" onclick="actionCeasefire('${w.id}')">پیشنهاد آتش‌بس</button>
            <button class="btn btn-sm btn-danger" onclick="actionEndWar('${w.id}')">پایان جنگ</button>
          </div>
        </div>
      `).join('');
    }
  }

  // Alliances
  const allyBox = $('alliances-list');
  if (allyBox) {
    const mil = state.alliances?.military || [];
    const eco = state.alliances?.economic || [];
    let html = '';
    mil.forEach(a => {
      html += `<div class="list-card"><strong>🛡️ ${a.name}</strong> — اعضا: ${a.members?.length || 0} — قدرت: ${a.strength}
        <button class="btn btn-sm" onclick="actionLeaveAlliance('${a.id}')">خروج</button></div>`;
    });
    eco.forEach(a => {
      html += `<div class="list-card"><strong>💰 ${a.name}</strong> — اعضا: ${a.members?.length || 0} — قدرت: ${a.strength}
        <button class="btn btn-sm" onclick="actionLeaveAlliance('${a.id}')">خروج</button></div>`;
    });
    allyBox.innerHTML = html || '<p class="muted">اتحاد فعالی وجود ندارد</p>';
  }

  // Crises
  const crisBox = $('crises-list');
  if (crisBox) {
    const crises = state.crises || [];
    crisBox.innerHTML = crises.length ? crises.map(c => `
      <div class="list-card cat-news">
        <strong>🌍 ${c.name}</strong> — شدت: ${c.severity} — مدت: ${c.duration || 0} ماه
        <div style="margin-top:0.3rem">
          <button class="btn btn-sm" onclick="actionCrisisDecision('${c.id}','quarantine')">قرنطینه</button>
          <button class="btn btn-sm" onclick="actionCrisisDecision('${c.id}','stimulus')">حمایت اقتصادی</button>
          <button class="btn btn-sm" onclick="actionCrisisDecision('${c.id}','international_coop')">همکاری بین‌المللی</button>
          <button class="btn btn-sm" onclick="actionCrisisDecision('${c.id}','ignore')">عدم مداخله</button>
        </div>
      </div>
    `).join('') : '<p class="muted">بحران فعالی وجود ندارد</p>';
  }
}

function actionStartWar() {
  const target = $('war-target')?.value;
  if (!target) { showToast('کشور هدف را انتخاب کنید', 'error'); return; }
  let state = getState();
  const res = typeof startWar === 'function' ? startWar(state, target) : { success: false, message: 'سیستم جنگ در دسترس نیست' };
  setState(state);
  refreshUI();
  showToast(res.message || (res.success ? 'جنگ آغاز شد' : 'ناموفق'), res.success ? 'warning' : 'error');
}

function actionCeasefire(warId) {
  let state = getState();
  if (typeof proposeCeasefire === 'function') proposeCeasefire(state, warId);
  setState(state);
  refreshUI();
  showToast('آتش‌بس پیشنهاد شد', 'info');
}

function actionEndWar(warId) {
  let state = getState();
  if (typeof endWar === 'function') endWar(state, warId, 'peace');
  setState(state);
  refreshUI();
  showToast('جنگ پایان یافت', 'info');
}

function actionCreateAlliance(type) {
  const target = $('ally-target')?.value;
  if (!target) { showToast('کشور را انتخاب کنید', 'error'); return; }
  let state = getState();
  if (typeof createAlliance === 'function') createAlliance(state, type, [target]);
  setState(state);
  refreshUI();
  showToast('اتحاد ایجاد شد', 'success');
}

function actionLeaveAlliance(id) {
  let state = getState();
  if (typeof leaveAlliance === 'function') leaveAlliance(state, id);
  setState(state);
  refreshUI();
  showToast('از اتحاد خارج شدید', 'info');
}

function actionCrisisDecision(crisisId, decision) {
  let state = getState();
  if (typeof crisisDecision === 'function') crisisDecision(state, crisisId, decision);
  setState(state);
  refreshUI();
  showToast('تصمیم بحران اعمال شد', 'info');
}

function updateNewsPanel(state) {
  const feed = $('news-feed');
  if (!feed) return;
  const news = state.news || [];
  if (!news.length) {
    feed.innerHTML = '<p class="muted">خبری وجود ندارد</p>';
    return;
  }
  feed.innerHTML = news.slice(0, 40).map(n => `
    <div class="news-item ${n.important ? 'important' : ''} ${n.read ? 'read' : ''}" onclick="markNewsItemRead('${n.id}')">
      <div class="news-icon">${n.icon || '📰'}</div>
      <div class="news-body">
        <div class="news-title">${n.title}</div>
        <div class="news-summary">${n.summary || ''}</div>
        ${n.line2 ? `<div class="news-line2 muted" style="font-size:0.88rem;margin-top:0.25rem">${n.line2}</div>` : ''}
        <div class="news-meta muted">${n.year}/${String(n.month).padStart(2,'0')} · ${n.type || ''}</div>
      </div>
    </div>
  `).join('');
}

function markNewsItemRead(id) {
  let state = getState();
  if (typeof markNewsRead === 'function') markNewsRead(state, id);
  setState(state);
  updateNewsBadge();
  updateNewsPanel(state);
}

window.actionPerformUpgrade = actionPerformUpgrade;
window.actionStartWar = actionStartWar;
window.actionCeasefire = actionCeasefire;
window.actionEndWar = actionEndWar;
window.actionCreateAlliance = actionCreateAlliance;
window.actionLeaveAlliance = actionLeaveAlliance;
window.actionCrisisDecision = actionCrisisDecision;
window.markNewsItemRead = markNewsItemRead;


// ===== V3.3.0 UI Enhancements =====

function updateUpgradesPanel(state) {
  const grid = $('upgrades-grid');
  if (!grid) return;
  const ups = state.upgrades || {};
  const defs = (typeof UPGRADE_DEFS !== 'undefined') ? UPGRADE_DEFS : {};
  let html = '';
  Object.keys(defs).forEach(id => {
    const def = defs[id];
    const up = ups[id] || { level: 1, min: 1, max: 100 };
    const level = up.level || 1;
    const max = up.max || 100;
    const pct = Math.round((level / max) * 100);
    const maxed = level >= max;
    const c1 = typeof canUpgrade === 'function' ? canUpgrade(state, id, 1) : { ok: false, cost: 0 };
    const c5 = typeof canUpgrade === 'function' ? canUpgrade(state, id, 5) : { ok: false, cost: 0 };
    const c10 = typeof canUpgrade === 'function' ? canUpgrade(state, id, 10) : { ok: false, cost: 0 };
    const fm = typeof formatMoney === 'function' ? formatMoney : String;
    html += `<div class="upgrade-card ${maxed ? 'maxed' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>${def.name || id}</strong>
        <span class="muted tag">${def.category || ''}</span>
      </div>
      <div style="margin:0.35rem 0;font-size:1.15rem">Level <strong>${level}</strong> / ${max}</div>
      <div class="level-bar"><div class="level-fill" style="width:${pct}%"></div></div>
      <p class="muted" style="font-size:0.82rem;margin:0.35rem 0">${def.description || ''}</p>
      <div class="upgrade-actions" style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.5rem">
        <button class="btn btn-sm btn-success" onclick="actionPerformUpgrade('${id}',1)" ${maxed || !c1.ok ? 'disabled' : ''} title="${c1.reason || ''}">
          +1 (${maxed ? '—' : fm(c1.cost)})
        </button>
        <button class="btn btn-sm" onclick="actionPerformUpgrade('${id}',5)" ${maxed || !c5.ok ? 'disabled' : ''} title="${c5.reason || ''}">
          +5 (${maxed ? '—' : fm(c5.cost)})
        </button>
        <button class="btn btn-sm" onclick="actionPerformUpgrade('${id}',10)" ${maxed || !c10.ok ? 'disabled' : ''} title="${c10.reason || ''}">
          +10 (${maxed ? '—' : fm(c10.cost)})
        </button>
      </div>
      ${maxed ? '<div class="tag good" style="margin-top:0.4rem">Maximum Level Reached</div>' : ''}
    </div>`;
  });
  grid.innerHTML = html || '<p class="muted">—</p>';

  const elBox = $('election-status');
  if (elBox && state.election) {
    const el = state.election;
    const monthsTo = (el.nextElectionYear - state.time.year) * 12 + (el.nextElectionMonth - state.time.month);
    elBox.innerHTML = `
      <div class="stat-card"><span class="lbl">تأیید</span><span class="val">${el.approval || 50}%</span></div>
      <div class="stat-card"><span class="lbl">انتخابات</span><span class="val">${monthsTo > 0 ? monthsTo + ' ماه' : 'نزدیک'}</span></div>
      <div class="stat-card"><span class="lbl">اقتصاد</span><span class="val">${el.performance?.economic || 50}</span></div>
      <div class="stat-card"><span class="lbl">نظامی</span><span class="val">${el.performance?.military || 50}</span></div>
      <div class="stat-card"><span class="lbl">دیپلماسی</span><span class="val">${el.performance?.diplomatic || 50}</span></div>
      <div class="stat-card"><span class="lbl">داخلی</span><span class="val">${el.performance?.domestic || 50}</span></div>`;
  }
}

function actionPerformUpgrade(id, levels) {
  levels = levels || 1;
  let state = getState();
  if (!state || typeof performUpgrade !== 'function') return;
  const res = performUpgrade(state, id, levels);
  setState(state);
  refreshUI();
  showToast(res.message || (res.success ? 'ارتقاء انجام شد' : 'ناموفق'), res.success ? 'success' : 'error');
}

function updateWarsPanel(state) {
  const warsBox = $('active-wars-list');
  if (warsBox) {
    const wars = state.wars || [];
    if (!wars.length) warsBox.innerHTML = '<p class="muted">هیچ جنگ فعالی وجود ندارد</p>';
    else {
      warsBox.innerHTML = wars.map(w => `
        <div class="list-card cat-military">
          <div class="list-card-header">
            <span>${w.opponentFlag || ''} ${w.opponentName}</span>
            <span class="status-badge active">${w.status}</span>
          </div>
          <div class="list-card-meta">
            <span>قدرت شما: ${w.playerPower}</span>
            <span>دشمن: ${w.enemyPower}</span>
            <span>شانس: ${Math.round(w.winChance)}%</span>
            <span>${w.durationMonths || 0} ماه</span>
            <span>تلفات: ${w.casualties || 0}</span>
            <span>هزینه: ${typeof formatMoney === 'function' ? formatMoney(w.costAccumulated || 0) : w.costAccumulated}</span>
          </div>
          <div style="margin-top:0.35rem">
            <button class="btn btn-sm" onclick="actionCeasefire('${w.id}')">آتش‌بس</button>
            <button class="btn btn-sm btn-danger" onclick="actionEndWar('${w.id}')">پایان</button>
          </div>
        </div>`).join('');
    }
  }
  // Military assets overview
  const assetsBox = $('military-assets');
  if (assetsBox) {
    const m = state.military || {};
    const eq = m.equipment || {};
    const items = [
      { ico: '🪖', name: 'ارتش (نفرات نسبی)', val: Math.round(m.army || 0), unit: '/100' },
      { ico: '✈️', name: 'نیروی هوایی', val: Math.round(m.airForce || 0), unit: '/100' },
      { ico: '🚢', name: 'نیروی دریایی', val: Math.round(m.navy || 0), unit: '/100' },
      { ico: '🛡️', name: 'سامانه دفاعی', val: Math.round(m.defenseSystems || 0), unit: '/100' },
      { ico: '🚀', name: 'موشک', val: eq.missiles || 0, unit: 'واحد' },
      { ico: '🛡️', name: 'تانک', val: eq.tanks || 0, unit: 'واحد' },
      { ico: '🚛', name: 'نفربر زرهی', val: eq.apc || 0, unit: 'واحد' },
      { ico: '📡', name: 'پدافند هوایی', val: eq.antiAir || 0, unit: 'واحد' },
      { ico: '🛰️', name: 'ضدموشک', val: eq.antiMissile || 0, unit: 'واحد' },
      { ico: '🎖️', name: 'نیروهای ویژه', val: eq.specialForces || 0, unit: 'واحد' },
      { ico: '👥', name: 'نیروی انسانی', val: Math.round((m.manpower || 0)/1000), unit: 'هزار' },
      { ico: '⚡', name: 'آمادگی', val: Math.round(m.readiness || 0), unit: '%' }
    ];
    assetsBox.innerHTML = items.map(it => `
      <div class="asset-card">
        <div class="asset-ico">${it.ico}</div>
        <div class="asset-info">
          <div class="asset-name">${it.name}</div>
          <div class="asset-val">${it.val} <span class="muted">${it.unit}</span></div>
        </div>
      </div>`).join('');
  }

  // Equipment stock
  const eqBox = $('equipment-stock');
  if (eqBox) {
    const eq = state.military?.equipment || {};
    const L = typeof getDynamicLimits === 'function' ? getDynamicLimits(state) : {};
    eqBox.innerHTML = [
      ['موشک', eq.missiles || 0, L.maxMissiles],
      ['تانک', eq.tanks || 0, L.maxTanks],
      ['نفربر', eq.apc || 0, L.maxAPC],
      ['پدافند', eq.antiAir || 0, L.maxAntiAir],
      ['ضدموشک', eq.antiMissile || 0, L.maxAntiMissile],
      ['ویژه', eq.specialForces || 0, L.maxSpecialForces]
    ].map(([n, v, mx]) => `<div class="stat-box"><div class="lbl">${n}</div><div class="val">${v}${mx != null ? ' / ' + mx : ''}</div></div>`).join('');
  }
  const ms = $('missile-stock');
  if (ms) ms.textContent = 'موجودی: ' + (state.military?.equipment?.missiles || 0);

  // Alliances
  const allyBox = $('alliances-list');
  if (allyBox) {
    const mil = state.alliances?.military || [];
    const eco = state.alliances?.economic || [];
    let html = '';
    mil.forEach(a => { html += `<div class="list-card"><strong>🛡️ ${a.name}</strong> — ${a.members?.length || 0} عضو <button class="btn btn-sm" onclick="actionLeaveAlliance('${a.id}')">خروج</button></div>`; });
    eco.forEach(a => { html += `<div class="list-card"><strong>💰 ${a.name}</strong> — ${a.members?.length || 0} عضو <button class="btn btn-sm" onclick="actionLeaveAlliance('${a.id}')">خروج</button></div>`; });
    allyBox.innerHTML = html || '<p class="muted">اتحاد فعالی نیست</p>';
  }
  const crisBox = $('crises-list');
  if (crisBox) {
    const crises = state.crises || [];
    crisBox.innerHTML = crises.length ? crises.map(c => `
      <div class="list-card cat-news"><strong>🌍 ${c.name}</strong> — شدت ${c.severity}
        <div style="margin-top:0.3rem">
          <button class="btn btn-sm" onclick="actionCrisisDecision('${c.id}','quarantine')">قرنطینه</button>
          <button class="btn btn-sm" onclick="actionCrisisDecision('${c.id}','stimulus')">حمایت</button>
          <button class="btn btn-sm" onclick="actionCrisisDecision('${c.id}','international_coop')">همکاری</button>
          <button class="btn btn-sm" onclick="actionCrisisDecision('${c.id}','ignore')">عدم مداخله</button>
        </div></div>`).join('') : '<p class="muted">بحران فعالی نیست</p>';
  }
  // Leaders when target selected
  const tgt = $('war-target')?.value;
  const lb = $('leaders-box');
  if (lb) {
    if (tgt && typeof getCountryLeaders === 'function') {
      const leaders = getCountryLeaders(tgt);
      lb.innerHTML = '<strong>اهداف ترور:</strong> ' + leaders.map(l =>
        `<button class="btn btn-sm" onclick="actionMilOp('assassination','${l.name}')">${l.position}: ${l.name}</button>`
      ).join(' ');
    } else lb.innerHTML = '';
  }
}

function actionMilOp(type, targetName) {
  const target = $('war-target')?.value;
  if (!target) { showToast('کشور هدف را انتخاب کنید', 'error'); return; }
  let state = getState();
  const opts = { missileCount: parseInt($('missile-count')?.value || '1', 10), targetName };
  const res = typeof executeMilitaryAction === 'function'
    ? executeMilitaryAction(state, target, type, opts)
    : { success: false, message: 'سیستم عملیات در دسترس نیست' };
  setState(state);
  refreshUI();
  showToast(res.message || (res.success ? 'عملیات انجام شد' : 'ناموفق'), res.operationSuccess === false ? 'warning' : (res.success ? 'success' : 'error'));
  // Combat breakdown panel
  const bd = $('combat-breakdown');
  const war = (state.wars || []).find(w => w.opponent === target);
  if (bd && war && war.lastBreakdown) {
    const b = war.lastBreakdown;
    bd.style.display = 'block';
    bd.innerHTML = `<h4>📊 تحلیل عملیات</h4>
      <div class="bd-grid">
        <span>حمله</span><strong>${b.finalAttack}</strong>
        <span>دفاع دشمن</span><strong>${b.finalDefense}</strong>
        <span>فناوری</span><strong>×${b.techMod}</strong>
        <span>اطلاعات</span><strong>×${b.intelMod}</strong>
        <span>تجهیزات</span><strong>×${b.equipMod}</strong>
        <span>خستگی جنگ</span><strong>×${b.fatigue}</strong>
        <span>سختی</span><strong>${b.difficulty}</strong>
        <span>شانس موفقیت</span><strong>${b.chance}%</strong>
      </div>`;
  }
}

function actionProduce(type) {
  const amount = parseInt($('prod-amount')?.value || '1', 10);
  let state = getState();
  const res = typeof produceEquipment === 'function' ? produceEquipment(state, type, amount) : { success: false, message: 'سیستم تولید نیست' };
  setState(state);
  refreshUI();
  showToast(res.message || '', res.success ? 'success' : 'error');
}

function toggleNotificationCenter() {
  const el = $('notification-center');
  if (!el) return;
  const show = el.style.display === 'none';
  el.style.display = show ? 'block' : 'none';
  if (show) renderNotificationList();
}

function renderNotificationList() {
  const state = getState();
  const list = $('notification-list');
  if (!list || !state) return;
  const items = state.notifications || [];
  if (!items.length) { list.innerHTML = '<p class="muted">اعلانی نیست</p>'; return; }
  list.innerHTML = items.slice(0, 40).map(n => {
    const choices = (n.choices && n.choices.length && state.pendingEvent) ? n.choices : null;
    const choiceHtml = choices ? `<div class="ntf-choices" onclick="event.stopPropagation()">
      ${choices.map(ch => `<button class="btn btn-sm" onclick="chooseEvent('${ch.id}')">${ch.label}</button>`).join('')}
    </div>` : '';
    return `<div class="ntf-item severity-${n.severity || 'info'} ${n.read ? 'read' : 'unread'}" onclick="actionReadNtf('${n.id}')">
      <div class="ntf-title">${n.title || ''}</div>
      <div class="ntf-body">${n.body || ''}</div>
      ${n.line2 ? `<div class="ntf-line2 muted">${n.line2}</div>` : ''}
      ${choiceHtml}
      <div class="ntf-meta muted">${n.category || ''} · ${n.year || ''}/${String(n.month||1).padStart(2,'0')}</div>
    </div>`;
  }).join('');
}

function actionReadNtf(id) {
  let state = getState();
  if (typeof markNotificationRead === 'function') markNotificationRead(state, id);
  setState(state);
  updateBellBadge(state);
  renderNotificationList();
}

function actionMarkAllNtfRead() {
  let state = getState();
  if (typeof markAllNotificationsRead === 'function') markAllNotificationsRead(state);
  setState(state);
  updateBellBadge(state);
  renderNotificationList();
}

function updateBellBadge(state) {
  if (!state) state = getState();
  const badge = $('hud-bell-count');
  if (!badge) return;
  const n = state?.notificationsUnread || 0;
  badge.textContent = n > 99 ? '99+' : n;
  badge.style.display = n > 0 ? 'inline-block' : 'none';
}

function toggleCollapse(el) {
  const body = el.parentElement?.querySelector('.collapse-body');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  el.textContent = el.textContent.replace(/[▾▴]/, open ? '▸' : '▾');
}

// Patch refreshUI HUD bell
const _origUpdateHUD = typeof updateHUD === 'function' ? updateHUD : null;
function updateHUD(state) {
  if (_origUpdateHUD) _origUpdateHUD(state);
  else {
    const e = state.economy;
    const pop = state.population;
    if ($('hud-flag')) $('hud-flag').textContent = state.country.flag || '🏳️';
    if ($('hud-country')) $('hud-country').textContent = state.country.name;
    if ($('hud-date')) $('hud-date').textContent = `${state.time.year}/${String(state.time.month).padStart(2,'0')}`;
    if ($('hud-budget')) { $('hud-budget').textContent = typeof formatMoney === 'function' ? formatMoney(e.budget) : e.budget; }
    if ($('hud-growth')) $('hud-growth').textContent = (e.gdpGrowth >= 0 ? '+' : '') + e.gdpGrowth.toFixed(1) + '%';
    if ($('hud-sat')) $('hud-sat').textContent = pop.satisfaction.toFixed(0);
    if ($('hud-def')) $('hud-def').textContent = state.military?.defensePower || 0;
    if ($('hud-alerts')) $('hud-alerts').textContent = (state.alerts || []).length;
  }
  updateBellBadge(state);
}

window.actionPerformUpgrade = actionPerformUpgrade;
window.actionMilOp = actionMilOp;
window.actionProduce = actionProduce;
window.toggleNotificationCenter = toggleNotificationCenter;
window.actionReadNtf = actionReadNtf;
window.actionMarkAllNtfRead = actionMarkAllNtfRead;
window.toggleCollapse = toggleCollapse;


/* ─── V3.6 Side Menu Drawer ─── */
function toggleSideMenu() {
  const menu = document.getElementById('side-menu');
  const ov = document.getElementById('sidebar-overlay');
  if (!menu) return;
  const open = menu.classList.toggle('open');
  if (ov) {
    if (open) { ov.classList.add('open'); ov.style.display = 'block'; }
    else { ov.classList.remove('open'); setTimeout(() => { if (!menu.classList.contains('open')) ov.style.display = 'none'; }, 200); }
  }
  document.body.classList.toggle('menu-open', open);
}
function openSideMenu() {
  const menu = document.getElementById('side-menu');
  const ov = document.getElementById('sidebar-overlay');
  if (menu) menu.classList.add('open');
  if (ov) { ov.classList.add('open'); ov.style.display = 'block'; }
  document.body.classList.add('menu-open');
}
function closeSideMenu() {
  const menu = document.getElementById('side-menu');
  const ov = document.getElementById('sidebar-overlay');
  if (menu) menu.classList.remove('open');
  if (ov) { ov.classList.remove('open'); setTimeout(() => { if (ov && !document.getElementById('side-menu')?.classList.contains('open')) ov.style.display = 'none'; }, 200); }
  document.body.classList.remove('menu-open');
}
window.toggleSideMenu = toggleSideMenu;
window.openSideMenu = openSideMenu;
window.closeSideMenu = closeSideMenu;

/* Wrap showPanel to close menu on navigate */
(function patchShowPanel() {
  const orig = window.showPanel;
  if (typeof orig === 'function') {
    window.showPanel = function(id) {
      orig(id);
      closeSideMenu();
    };
  }
})();

/* ─── Military Development UI (Upgrade-style, no free-form numbers) ─── */
const MIL_FORCE_DEFS = [
  { id: 'army', name: 'ارتش', icon: '🪖', limKey: 'army' },
  { id: 'airForce', name: 'نیروی هوایی', icon: '✈️', limKey: 'airForce' },
  { id: 'navy', name: 'نیروی دریایی', icon: '🚢', limKey: 'navy' },
  { id: 'defenseSystems', name: 'سامانه دفاعی', icon: '🛡️', limKey: 'defenseSystems' }
];

function calcMilDevCost(state, levels) {
  levels = Math.max(1, levels || 1);
  const m = (typeof getDifficultyMultipliers === 'function') ? getDifficultyMultipliers() : { militaryCost: 1 };
  let total = 0;
  for (let i = 0; i < levels; i++) {
    total += 2.8 * (1 + i * 0.08) * (m.militaryCost || 1);
  }
  return Math.round(total * 10) / 10;
}

function updateMilitaryDevPanel(state) {
  if (!state) return;
  const grid = document.getElementById('mil-dev-grid');
  if (!grid) return;
  const budget = state.economy?.budget || 0;
  const fm = (n) => (typeof formatMoney === 'function' ? formatMoney(n) : n);

  grid.innerHTML = MIL_FORCE_DEFS.map(def => {
    const current = Math.round(state.military[def.id] || 0);
    const max = (typeof LIMITS !== 'undefined' && LIMITS[def.limKey]) ? LIMITS[def.limKey].max : 100;
    const maxed = current >= max;
    const c1 = calcMilDevCost(state, 1);
    const c5 = calcMilDevCost(state, 5);
    const ok1 = !maxed && budget >= c1;
    const ok5 = !maxed && budget >= c5 && current + 5 <= max;
    // max affordable levels
    let maxAff = 0;
    let acc = 0;
    for (let i = 0; i < Math.min(20, max - current); i++) {
      const step = 2.8 * (1 + i * 0.08) * ((typeof getDifficultyMultipliers === 'function' ? getDifficultyMultipliers().militaryCost : 1) || 1);
      if (acc + step > budget) break;
      acc += step;
      maxAff++;
    }
    const pct = Math.min(100, (current / max) * 100);
    return `<div class="upgrade-card mil-dev-card ${maxed ? 'maxed' : ''}">
      <div class="list-card-header">${def.icon} ${def.name}</div>
      <div class="muted" style="font-size:0.78rem">سطح ${current} / ${max}</div>
      <div class="level-bar"><div class="level-fill" style="width:${pct}%"></div></div>
      <div class="muted" style="font-size:0.75rem">بودجه موجود: ${fm(budget)} · حداکثر قابل خرید: ${maxAff || 0}</div>
      <div class="mil-cost-row">
        <button class="btn btn-sm btn-success" ${ok1 ? '' : 'disabled'} onclick="actionDevelopForceLevel('${def.id}',1)">+1 (${maxed ? '—' : fm(c1)})</button>
        <button class="btn btn-sm" ${ok5 ? '' : 'disabled'} onclick="actionDevelopForceLevel('${def.id}',5)">+5 (${maxed ? '—' : fm(c5)})</button>
        ${maxed ? '<span class="tag good">حداکثر سطح</span>' : (!ok1 ? '<span class="tag bad">بودجه ناکافی</span>' : '')}
      </div>
    </div>`;
  }).join('');

  // Budget monthly controls (preset buttons, not free input)
  const budBox = document.getElementById('mil-budget-controls');
  if (budBox) {
    const cur = state.military.budgetAmount || 12;
    const presets = [6, 10, 14, 18, 24, 30];
    budBox.innerHTML = `<div class="upgrade-card">
      <div class="list-card-header">💰 بودجه نظامی ماهانه: <strong>${cur}</strong></div>
      <p class="muted" style="font-size:0.75rem;margin:0.3rem 0">این مبلغ هر ماه از هزینه‌ها کسر می‌شود و روی آمادگی نیرو اثر دارد.</p>
      <div class="mil-cost-row">
        ${presets.map(p => `<button class="btn btn-sm ${p === cur ? 'btn-success' : ''}" onclick="actionSetMilBudgetPreset(${p})">${p}</button>`).join('')}
      </div>
    </div>`;
  }
}

let _milDevLock = false;
function actionDevelopForceLevel(forceType, levels) {
  if (_milDevLock) return;
  _milDevLock = true;
  try {
    let state = getState();
    if (!state) return;
    levels = Math.max(1, Math.min(10, levels || 1));
    const cost = calcMilDevCost(state, levels);
    if ((state.economy.budget || 0) < cost) {
      showToast('بودجه کافی نیست', 'error');
      return;
    }
    // Map levels to developForce amount scale (legacy API uses amount points)
    const amount = levels * 5;
    if (typeof developForce === 'function') {
      const res = developForce(state, forceType, amount);
      if (!res.success) {
        showToast(res.message || 'ناموفق', 'error');
        return;
      }
      // Adjust cost to our calculated cost for consistency
      // developForce already deducted its own cost - sync if needed is internal
      setState(state);
      refreshUI();
      if (typeof updateMilitaryDevPanel === 'function') updateMilitaryDevPanel(getState());
      showToast(res.message || ('توسعه ' + forceType + ' آغاز شد'), 'success');
    }
  } finally {
    setTimeout(() => { _milDevLock = false; }, 400);
  }
}

function actionSetMilBudgetPreset(val) {
  let state = getState();
  if (!state) return;
  val = Math.max(3, Math.min(45, Number(val) || 12));
  if (typeof setMilitaryBudget === 'function') {
    state = setMilitaryBudget(state, val) || state;
  } else {
    state.military.budgetAmount = val;
  }
  setState(state);
  refreshUI();
  updateMilitaryDevPanel(getState());
  showToast('بودجه نظامی: ' + val, 'success');
}

function actionResearchMilLevel(points) {
  let state = getState();
  if (!state) return;
  points = points || 1;
  if (typeof researchMilitaryTech === 'function') {
    const res = researchMilitaryTech(state, points * 3);
    if (!res.success) { showToast(res.message || 'ناموفق', 'error'); return; }
    setState(state);
    refreshUI();
    showToast('تحقیق نظامی انجام شد', 'success');
  }
}

window.actionDevelopForceLevel = actionDevelopForceLevel;
window.actionSetMilBudgetPreset = actionSetMilBudgetPreset;
window.actionResearchMilLevel = actionResearchMilLevel;
window.updateMilitaryDevPanel = updateMilitaryDevPanel;
window.calcMilDevCost = calcMilDevCost;

/* Hook military panel into refreshUI */
(function patchRefreshMilitary() {
  const orig = window.refreshUI;
  if (typeof orig === 'function') {
    window.refreshUI = function() {
      orig();
      try {
        const st = getState();
        if (st) updateMilitaryDevPanel(st);
      } catch (e) {}
    };
  }
})();
