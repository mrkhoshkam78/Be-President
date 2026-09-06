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
  $('start-screen').style.display = 'none';
  $('screen-country').style.display = 'flex';
  renderCountryCards();
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
    // If pending event, keep paused
    if (s.pendingEvent) {
      s.meta.speed = 0;
      setState(s);
      showEventModal(s.pendingEvent);
      return;
    }
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
  if (state.pendingEvent) {
    showToast('ابتدا در مورد رویداد تصمیم بگیرید', 'warning');
    return;
  }
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

  if (state.pendingEvent) {
    state.meta.speed = 0;
    setState(state);
    showEventModal(state.pendingEvent);
  }
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
  if (!container) return;
  container.innerHTML = PLAYABLE_COUNTRIES.map(c => `
    <div class="country-card" data-country="${c.id}" onclick="selectCountry('${c.id}')">
      <div class="c-flag">${c.flag}</div>
      <h3>${c.name}</h3>
      <div class="c-region">${c.region}</div>
      <p class="c-desc">${c.description}</p>
      <div class="c-stats">
        <span>👥 ${(c.population/1e6).toFixed(0)}M</span>
        <span>💰 ${c.baseGDP}</span>
        <span>⚔️ ${c.militaryPower || 40}</span>
      </div>
      <div class="c-tags">
        ${c.strengths.slice(0,2).map(s => `<span class="tag good">${s}</span>`).join('')}
        ${c.weaknesses.slice(0,1).map(w => `<span class="tag bad">${w}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function showEventModal(pending) {
  const modal = $('event-modal');
  if (!modal || !pending) return;
  $('event-icon').textContent = pending.icon || '📢';
  $('event-title').textContent = pending.title;
  $('event-desc').textContent = pending.description;
  const choicesBox = $('event-choices');
  choicesBox.innerHTML = pending.choices.map(c => `
    <button class="event-choice-btn" onclick="chooseEvent('${c.id}')">
      <strong>${c.label}</strong>
      <span class="choice-pros">✓ ${c.pros}</span>
      <span class="choice-cons">✗ ${c.cons}</span>
    </button>
  `).join('');
  modal.classList.add('show');
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
  const meta = getSaveMeta();
  if (meta) {
    const loadBtn = $('btn-continue');
    if (loadBtn) {
      loadBtn.style.display = 'inline-block';
      loadBtn.textContent = `ادامه (${meta.countryName || meta.year}/${meta.month} — ${meta.difficulty})`;
    }
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
