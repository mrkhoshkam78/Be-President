// save.js - LocalStorage Save / Load / New Game

const SAVE_KEY = 'be_president_v2_save';
const META_KEY = 'be_president_v2_meta';

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
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { success: false, message: 'ذخیره‌ای یافت نشد' };
    let state = JSON.parse(raw);
    if (!state.meta || !state.economy || !state.time) {
      return { success: false, message: 'فایل ذخیره نامعتبر' };
    }
    // Simple migration from v2.0
    if (!state.meta.version || state.meta.version < '2.1') {
      if (!state.news) state.news = [];
      if (state.newsUnread == null) state.newsUnread = 0;
      if (!state.diplomacy.relationsMode) {
        state.diplomacy.relationsMode = state.meta.difficulty === 'realistic' ? 'multi' : 'simple';
      }
      state.meta.version = '2.1';
    }
    setState(state);
    hideStartScreens();
    showPanel('map');
    refreshUI();
    startGameLoop();
    return { success: true, state, message: 'بازی بارگذاری شد' };
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
