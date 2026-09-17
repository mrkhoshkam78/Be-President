// save.js - LocalStorage Save / Load / New Game

const SAVE_KEY = 'be_president_v3_save';
const META_KEY = 'be_president_v3_meta';
const OLD_SAVE_KEY = 'be_president_v2_save';
const OLD_META_KEY = 'be_president_v2_meta';

function saveGame() {
  const state = getState();
  if (!state) return { success: false, message: 'هیچ بازی فعالی وجود ندارد' };
  try {
    state.meta.lastSaved = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    localStorage.setItem(META_KEY, JSON.stringify({
      difficulty: state.meta.difficulty,
      countryId: state.meta.countryId,
      countryName: state.country.name,
      year: state.time.year,
      month: state.time.month,
      day: state.time.day,
      savedAt: state.meta.lastSaved
    }));
    return { success: true, message: 'بازی ذخیره شد' };
  } catch (err) {
    return { success: false, message: 'خطا در ذخیره‌سازی' };
  }
}

function loadGame() {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    // Fallback to old v2 save
    if (!raw) raw = localStorage.getItem(OLD_SAVE_KEY);
    if (!raw) return { success: false, message: 'ذخیره‌ای یافت نشد' };
    let state = JSON.parse(raw);
    if (!state.meta || !state.economy || !state.time) {
      return { success: false, message: 'فایل ذخیره نامعتبر' };
    }
    // Migrations
    if (!state.meta.version || state.meta.version < '2.1') {
      if (!state.news) state.news = [];
      if (state.newsUnread == null) state.newsUnread = 0;
      if (!state.diplomacy.relationsMode) {
        state.diplomacy.relationsMode = state.meta.difficulty === 'realistic' ? 'multi' : 'simple';
      }
      state.meta.version = '2.1';
    }
    if (!state.meta.version || state.meta.version < '2.2') {
      if (!state.economy.loansTaken) state.economy.loansTaken = [];
      if (!state.economy.loansGiven) state.economy.loansGiven = [];
      if (state.economy.creditRating == null) {
        const d = state.economy.nationalDebt || 0;
        const g = state.economy.gdp || 100;
        state.economy.creditRating = Math.round(Math.max(25, Math.min(95, 75 - (d / Math.max(1, g)) * 20)));
      }
      state.meta.version = '2.2';
    }
    // V3.0.1 migration
    if (!state.meta.version || state.meta.version < '3.0.1') {
      if (!state.upgrades) {
        state.upgrades = {
          economicDevelopment: { level: 30, min: 1, max: 100 },
          militaryPower: { level: 30, min: 1, max: 100 },
          technology: { level: state.tech?.level || 40, min: 1, max: 100 },
          intelligence: { level: state.intelligence?.level || 30, min: 1, max: 100 },
          infrastructure: { level: state.economy?.infrastructure || 40, min: 1, max: 100 },
          defense: { level: state.military?.defenseSystems || 30, min: 1, max: 100 },
          government: { level: 30, min: 1, max: 100 }
        };
      }
      if (!state.election) {
        state.election = {
          nextElectionYear: state.time.year + 3,
          nextElectionMonth: state.time.month,
          termStartYear: state.time.year,
          approval: state.population?.satisfaction || 55,
          performance: { economic: 50, military: 50, diplomatic: 50, domestic: 50 },
          history: [],
          phase: null
        };
      }
      if (!state.wars) state.wars = [];
      if (!state.warHistory) state.warHistory = [];
      if (!state.alliances) state.alliances = { military: [], economic: [] };
      if (!state.crises) state.crises = [];
      if (!state.crisisHistory) state.crisisHistory = [];
      if (!state.dataRef) state.dataRef = { year: 2024, source: 'IMF/WB scaled V3' };
      state.meta.version = '3.0.1';
    }
    setState(state);
    hideStartScreens();
    showPanel('map');
    refreshUI();
    startGameLoop();
    return { success: true, state, message: 'بازی بارگذاری شد (V3.0.1)' };
  } catch (err) {
    return { success: false, message: 'خطا در بارگذاری' };
  }
}


function hasSave() { return !!localStorage.getItem(SAVE_KEY); }

function getSaveMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(META_KEY);
}

function newGame(difficultyId, countryId) {
  deleteSave();
  const state = resetState(difficultyId, countryId);
  setState(state);
  return state;
}

function autoSaveIfNeeded(state) {
  if (!state || !state.meta) return;
  const now = Date.now();
  if (!state.meta.lastSaved || (now - state.meta.lastSaved) > 120000) {
    saveGame();
  }
}
