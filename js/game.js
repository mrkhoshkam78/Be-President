// game.js - Main loop, start flow, orchestration

let gameInterval = null;
const TICK_MS = 2200;

let selectedCountryId = null;
let selectedDifficultyId = null;

function selectCountry(countryId) {
  selectedCountryId = countryId;
  // Highlight
  document.querySelectorAll('.country-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`[data-country="${countryId}"]`);
  if (card) card.classList.add('selected');
  const nextBtn = $('btn-to-difficulty');
  if (nextBtn) nextBtn.disabled = false;
}

function goToDifficulty() {
  if (!selectedCountryId) return;
  $('screen-country').style.display = 'none';
  $('screen-difficulty').style.display = 'flex';
}

function selectDifficulty(diffId) {
  selectedDifficultyId = diffId;
  document.querySelectorAll('.diff-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`[data-diff="${diffId}"]`);
  if (card) card.classList.add('selected');
  const startBtn = $('btn-start-presidency');
  if (startBtn) startBtn.disabled = false;
}

function startPresidency() {
  if (!selectedCountryId || !selectedDifficultyId) return;
  startNewGame(selectedDifficultyId, selectedCountryId);
}

function startNewGame(difficultyId, countryId) {
  var list = (typeof PLAYABLE_COUNTRIES !== 'undefined' && PLAYABLE_COUNTRIES)
    ? PLAYABLE_COUNTRIES
    : (typeof window !== 'undefined' && window.PLAYABLE_COUNTRIES) ? window.PLAYABLE_COUNTRIES : null;
  if (!list || !list.length) {
    console.error('[BePresident] PLAYABLE_COUNTRIES empty at startNewGame');
    alert('داده کشورها بارگذاری نشده. صفحه را رفرش کنید و مطمئن شوید js/data.js لود شده است.');
    return;
  }
  if (typeof BePresidentBoot !== 'undefined' && !BePresidentBoot.assertReady()) {
    alert('اعتبارسنجی داده پایه ناموفق بود. Console را بررسی کنید.');
    return;
  }
  if (!countryId || !list.find(function(c){ return c.id === countryId; })) {
    console.error('Invalid countryId', countryId);
    if (typeof showToast === 'function') showToast('کشور نامعتبر — دوباره انتخاب کنید', 'error');
    return;
  }
  newGame(difficultyId, countryId);
  const state = getState();
  state.meta.isRunning = true;
  state.meta.speed = 1;
  if (typeof updateMilitaryPowers === 'function') updateMilitaryPowers(state);
  generateAdvisorSuggestions(state);
  setState(state);
  hideStartScreens();
  showPanel('map');
  refreshUI();
  startGameLoop();
  showToast(`${state.country.flag} ریاست‌جمهوری ${state.country.name} آغاز شد`, 'success');
}

function hideStartScreens() {
  ['start-screen', 'screen-country', 'screen-difficulty'].forEach(id => {
    const el = $(id);
    if (el) el.style.display = 'none';
  });
  const game = $('game-container');
  if (game) game.style.display = 'flex';
}

function showStartScreen() {
  stopGameLoop();
  selectedCountryId = null;
  selectedDifficultyId = null;
  ['screen-country', 'screen-difficulty'].forEach(id => {
    const el = $(id);
    if (el) el.style.display = 'none';
  });
  const start = $('start-screen');
  if (start) start.style.display = 'flex';
  const game = $('game-container');
  if (game) game.style.display = 'none';
  // Reset selections
  document.querySelectorAll('.country-card, .diff-card').forEach(c => c.classList.remove('selected'));
  const nextBtn = $('btn-to-difficulty');
  if (nextBtn) nextBtn.disabled = true;
  const startBtn = $('btn-start-presidency');
  if (startBtn) startBtn.disabled = true;
}

function goToCountrySelect() {
  var start = document.getElementById('start-screen');
  var screen = document.getElementById('screen-country');
  if (start) start.style.display = 'none';
  if (screen) screen.style.display = 'flex';
  try {
    renderCountryCards();
  } catch (err) {
    console.error('[BePresident] renderCountryCards error', err);
    var box = document.getElementById('country-cards');
    if (box) box.innerHTML = '<p style="color:#f87171">خطا در نمایش کشورها: ' + (err && err.message ? err.message : err) + '</p>';
  }
}

function startGameLoop() {
  stopGameLoop();
  const state = getState();
  if (!state) return;
  state.meta.isRunning = true;
  setState(state);

  gameInterval = setInterval(() => {
    const s = getState();
    if (!s || s.meta.speed === 0 || s.meta.gameOver) return;
    // Events use Notification Center — do not block the loop
    const ticks = s.meta.speed === 3 ? 3 : 1;
    for (let i = 0; i < ticks; i++) processTick();
    refreshUI();
  }, TICK_MS);
}

function stopGameLoop() {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
}

function setSpeed(speed) {
  const state = getState();
  if (!state) return;
  // pendingEvent no longer blocks speed — decide from Notification Center
  state.meta.speed = speed;
  setState(state);
  updateTimeControls(state);
  if (speed > 0 && !gameInterval) startGameLoop();
}

function processTick() {
  let state = getState();
  if (!state || state.meta.gameOver) return;

  const prevSnap = {
    inflation: state.economy.inflation,
    unemployment: state.economy.unemployment,
    satisfaction: state.population.satisfaction,
    gdpGrowth: state.economy.gdpGrowth,
    debt: state.economy.nationalDebt,
    gdp: state.economy.gdp,
    creditRating: state.economy.creditRating
  };

  state.time.month += 1;
  if (state.time.month > 12) {
    state.time.month = 1;
    state.time.year += 1;
  }
  state.time.day = 1;
  state.time.totalDays += 30;
  state.meta.tickCount += 1;

  state = processEconomyTick(state);
  state = processMilitaryTick(state);
  state = processIntelligenceTick(state);
  state = processDiplomacyTick(state);
  if (typeof processUpgradeProjects === 'function') state = processUpgradeProjects(state);
  if (typeof processProductionProjects === 'function') state = processProductionProjects(state);
  if (typeof updateWars === 'function') state = updateWars(state);
  if (typeof updateCrises === 'function') state = updateCrises(state);
  if (typeof maybeTriggerCrisis === 'function' && state.meta.tickCount % 3 === 0) state = maybeTriggerCrisis(state);
  if (typeof updateElectionState === 'function') state = updateElectionState(state);
  if (typeof computeStrengthsWeaknesses === 'function' && state.meta.tickCount % 2 === 0) computeStrengthsWeaknesses(state);
  if (typeof enforceMilitaryLimits === 'function') enforceMilitaryLimits(state);
  state = processEvents(state);

  // Projects
  state.projects = state.projects.filter(p => {
    if (p.type === 'infrastructure') {
      p.remaining -= 1;
      if (p.remaining <= 0) {
        if (p.effect.infrastructure) state.economy.infrastructure = Math.min(95, state.economy.infrastructure + p.effect.infrastructure);
        if (p.effect.production) state.economy.industrialProduction = Math.min(95, state.economy.industrialProduction + p.effect.production);
        logAction(state, 'پروژه زیرساخت تکمیل شد');
        state.alerts.push({ type: 'success', text: 'پروژه زیرساخت به پایان رسید.' });
        if (typeof addNews === 'function') {
          addNews(state, {
            type: 'domestic', category: 'economy', icon: '🏗️',
            title: 'پروژه زیرساخت تکمیل شد',
            summary: 'زیرساخت‌های جدید به بهره‌برداری رسید و ظرفیت تولید افزایش یافت.'
          });
        }
        addPresidentXP(5);
        return false;
      }
    }
    return true;
  });

  if (typeof generateContextualNews === 'function') {
    generateContextualNews(state, prevSnap);
  }

  generateAdvisorSuggestions(state);
  checkGameOver(state);

  if (state.meta.tickCount % 6 === 0) autoSaveIfNeeded(state);
  if (state.meta.tickCount % 4 === 0) addPresidentXP(2);

  setState(state);

  // Event decisions via Notification Center only
}


function checkGameOver(state) {
  if (state.population.satisfaction < 8 && state.economy.stability < 15) {
    state.meta.gameOver = true;
    state.meta.gameOverReason = 'سقوط محبوبیت و بی‌ثباتی شدید منجر به فروپاشی حکومت شد.';
    stopGameLoop();
    showToast('بازی تمام شد: ' + state.meta.gameOverReason, 'danger');
  }
  if (state.economy.nationalDebt > 900 && state.economy.gdp < 200) {
    state.meta.gameOver = true;
    state.meta.gameOverReason = 'بحران بدهی ملی غیرقابل کنترل.';
    stopGameLoop();
    showToast('بازی تمام شد: ' + state.meta.gameOverReason, 'danger');
  }
}

function renderCountryCards() {
  const container = $('country-cards');
  if (!container) {
    console.error('[BePresident] #country-cards not in DOM');
    return;
  }
  var list = (typeof PLAYABLE_COUNTRIES !== 'undefined' && PLAYABLE_COUNTRIES && PLAYABLE_COUNTRIES.length)
    ? PLAYABLE_COUNTRIES
    : (typeof window !== 'undefined' && window.PLAYABLE_COUNTRIES) ? window.PLAYABLE_COUNTRIES : null;
  if (!list || !list.length) {
    container.innerHTML = '<p class="muted" style="color:#f87171;padding:1rem">خطا: داده کشورها بارگذاری نشد.<br>مسیر <code>js/data.js</code> را بررسی کنید و صفحه را رفرش کنید.</p>';
    console.error('[BePresident] PLAYABLE_COUNTRIES missing at renderCountryCards', typeof PLAYABLE_COUNTRIES, typeof window !== 'undefined' ? typeof window.PLAYABLE_COUNTRIES : 'no window');
    return;
  }
  console.info('[BePresident] Rendering', list.length, 'countries');
  container.innerHTML = list.map(c => {
    const strengths = Array.isArray(c.strengths) ? c.strengths : [];
    const weaknesses = Array.isArray(c.weaknesses) ? c.weaknesses : [];
    const popM = ((c.population || 0) / 1e6).toFixed(0);
    return `
    <div class="country-card" data-country="${c.id}" onclick="selectCountry('${c.id}')">
      <div class="flag">${c.flag || '🏳️'}</div>
      <h3>${c.name || c.id}</h3>
      <div class="c-region muted">${c.region || ''}</div>
      <p class="c-desc">${c.description || ''}</p>
      <div class="c-stats">
        <span title="جمعیت">👥 ${popM}M</span>
        <span title="GDP پایه">💰 ${c.baseGDP || 0}</span>
        <span title="قدرت نظامی">⚔️ ${c.militaryPower || 40}</span>
      </div>
      <div class="c-tags">
        ${strengths.slice(0,2).map(s => `<span class="tag good">${s}</span>`).join('')}
        ${weaknesses.slice(0,1).map(w => `<span class="tag bad">${w}</span>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function showEventModal(pending) {
  // V3.6: Events go to Notification Center — no blocking modal
  if (!pending) return;
  const st = typeof getState === 'function' ? getState() : null;
  if (st && typeof pushNotification === 'function') {
    pushNotification(st, {
      category: 'Domestic',
      severity: pending.type === 'positive' ? 'success' : 'warning',
      title: (pending.icon || '📢') + ' ' + pending.title,
      body: pending.description,
      line2: 'از مرکز اعلان‌ها تصمیم بگیرید',
      pendingEventId: pending.id
    });
    if (typeof setState === 'function') setState(st);
  }
}

function chooseEvent(choiceId) {
  let state = getState();
  state = resolveEventChoice(state, choiceId);
  setState(state);
  $('event-modal').classList.remove('show');
  refreshUI();
  if (state.meta.speed === 0) setSpeed(1);
}

function initApp() {
  // 1) Validate base data before any UI that needs countries
  if (typeof BePresidentBoot !== 'undefined') {
    const ok = BePresidentBoot.init();
    if (!ok) return; // fatal error UI already shown
  } else if (typeof PLAYABLE_COUNTRIES === 'undefined' || !PLAYABLE_COUNTRIES.length) {
    console.error('[BePresident] PLAYABLE_COUNTRIES missing at init');
    alert('خطا: داده کشورها بارگذاری نشد. فایل data.js را بررسی کنید.');
    return;
  }

  console.info('[BePresident] Init OK — countries:', PLAYABLE_COUNTRIES.length);

  // 2) Continue button only if valid save meta exists
  try {
    const meta = typeof getSaveMeta === 'function' ? getSaveMeta() : null;
    if (meta && meta.countryId) {
      const loadBtn = $('btn-continue');
      if (loadBtn) {
        loadBtn.style.display = 'inline-block';
        loadBtn.textContent = 'ادامه (' + (meta.countryName || meta.countryId) + ' — ' + (meta.year || '') + '/' + (meta.month || '') + ')';
      }
    }
  } catch (e) {
    console.warn('[BePresident] save meta read failed', e);
  }

  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => setSpeed(parseInt(btn.dataset.speed)));
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      if (panel) showPanel(panel);
    });
  });
}

// Globals
window.selectCountry = selectCountry;
window.goToDifficulty = goToDifficulty;
window.selectDifficulty = selectDifficulty;
window.startPresidency = startPresidency;
window.goToCountrySelect = goToCountrySelect;
window.startNewGame = startNewGame;
window.setSpeed = setSpeed;
window.showStartScreen = showStartScreen;
window.chooseEvent = chooseEvent;
window.showPanel = showPanel;

document.addEventListener('DOMContentLoaded', initApp);
