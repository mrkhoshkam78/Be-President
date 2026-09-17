// election.js - Election Engine V3.0.1
// Elections every 3 years. Result based on performance + limited randomness.

function updateElectionState(state) {
  if (!state.election) return state;
  const el = state.election;
  const y = state.time.year;
  const m = state.time.month;

  // Update approval from current indicators
  const sat = state.population?.satisfaction || 50;
  const growth = state.economy?.gdpGrowth || 0;
  const unemp = state.economy?.unemployment || 8;
  const infl = state.economy?.inflation || 3;
  const debtRatio = state.economy?.gdp > 0 ? (state.economy.nationalDebt / state.economy.gdp) * 100 : 50;

  let approval = sat * 0.45;
  approval += Math.max(-15, Math.min(15, growth * 3));
  approval -= Math.max(0, (unemp - 5) * 1.5);
  approval -= Math.max(0, (infl - 3) * 1.2);
  approval -= Math.max(0, (debtRatio - 60) * 0.08);
  if (state.wars && state.wars.length) approval -= state.wars.length * 4;
  if (state.crises && state.crises.length) approval -= state.crises.length * 3;

  el.approval = Math.round(Math.max(15, Math.min(92, approval)));
  el.performance = {
    economic: Math.round(Math.max(10, Math.min(95, 50 + growth * 8 - (unemp - 5) * 2 - (infl - 3)))),
    military: Math.round(Math.max(10, Math.min(95, (state.military?.defensePower || 40) * 0.7 + 20))),
    diplomatic: Math.round(Math.max(10, Math.min(95, 50 + (Object.values(state.diplomacy?.relations || {}).reduce((a, b) => a + (typeof b === 'number' ? b : b?.overall || 50), 0) / Math.max(1, Object.keys(state.diplomacy?.relations || {}).length) - 50) * 0.6))),
    domestic: Math.round(Math.max(10, Math.min(95, sat * 0.9)))
  };

  // Check if election approaching
  const monthsTo = (el.nextElectionYear - y) * 12 + (el.nextElectionMonth - m);
  if (monthsTo <= 6 && monthsTo > 0 && !el.phase) {
    el.phase = 'campaign';
    if (typeof addNews === 'function') {
      addNews(state, {
        type: 'domestic',
        category: 'politics',
        icon: '🗳️',
        title: `انتخابات ریاست‌جمهوری در ${monthsTo} ماه آینده`,
        summary: `دوره فعلی ریاست‌جمهوری رو به پایان است. نرخ تأیید فعلی: ${el.approval}٪`,
        line2: 'عملکرد اقتصادی، نظامی و دیپلماتیک دولت در نتیجه انتخابات تأثیر مستقیم خواهد داشت.',
        important: true
      });
    }
  }

  if (monthsTo <= 0 || (y > el.nextElectionYear) || (y === el.nextElectionYear && m >= el.nextElectionMonth)) {
    runElection(state);
  }
  return state;
}

function runElection(state) {
  const el = state.election;
  const base = el.approval || 50;
  // Limited randomness ±12
  const randomFactor = (Math.random() * 24 - 12);
  const score = base + randomFactor + (el.performance.economic - 50) * 0.15 + (el.performance.domestic - 50) * 0.1;

  const won = score >= 48; // threshold

  el.history.push({
    year: state.time.year,
    approval: el.approval,
    score: Math.round(score),
    result: won ? 'win' : 'loss',
    performance: { ...el.performance }
  });

  if (won) {
    el.termStartYear = state.time.year;
    el.nextElectionYear = state.time.year + 3;
    el.nextElectionMonth = state.time.month;
    el.phase = null;
    state.president.level = (state.president.level || 1) + 1;
    if (typeof addNews === 'function') {
      addNews(state, {
        type: 'domestic',
        category: 'politics',
        icon: '🏛️',
        title: 'پیروزی در انتخابات ریاست‌جمهوری',
        summary: `رئیس‌جمهور با کسب ${Math.round(score)}٪ حمایت برای دوره جدید انتخاب شد.`,
        line2: 'دوره جدید ریاست‌جمهوری آغاز شد. انتظارات مردم از ادامه اصلاحات و ثبات افزایش یافته است.',
        important: true
      });
    }
    if (typeof showToast === 'function') showToast('پیروزی در انتخابات! دوره جدید آغاز شد', 'success');
  } else {
    state.meta.gameOver = true;
    state.meta.gameOverReason = 'شکست در انتخابات ریاست‌جمهوری';
    el.phase = null;
    if (typeof addNews === 'function') {
      addNews(state, {
        type: 'domestic',
        category: 'politics',
        icon: '📉',
        title: 'شکست در انتخابات — پایان دوره ریاست‌جمهوری',
        summary: `با کسب تنها ${Math.round(score)}٪ حمایت، رئیس‌جمهور فعلی از قدرت کنار رفت.`,
        line2: 'انتقال قدرت به دولت جدید انجام شد. بازی به پایان رسید.',
        important: true
      });
    }
    if (typeof showToast === 'function') showToast('شکست در انتخابات — Game Over', 'error');
  }
  return state;
}

window.updateElectionState = updateElectionState;
window.runElection = runElection;
