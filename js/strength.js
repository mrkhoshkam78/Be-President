// strength.js - Dynamic Strength & Weakness Engine V3.3.0
// Computed from upgrades, economy, military, population, debt, tech — used in gameplay

function computeStrengthsWeaknesses(state) {
  if (!state) return { strengths: [], weaknesses: [] };
  const strengths = [];
  const weaknesses = [];
  const e = state.economy || {};
  const m = state.military || {};
  const up = state.upgrades || {};
  const tech = state.tech?.level || 40;
  const intel = state.intelligence?.level || 30;
  const sat = state.population?.satisfaction || 50;
  const debtRatio = e.gdp > 0 ? (e.nationalDebt / e.gdp) * 100 : 50;
  const growth = e.gdpGrowth || 0;
  const infl = e.inflation || 3;
  const unemp = e.unemployment || 6;

  // Strengths
  if ((up.technology?.level || 0) >= 60 || tech >= 70) strengths.push({ id: 'tech', label: 'فناوری پیشرفته', score: tech });
  if ((up.economicDevelopment?.level || 0) >= 55 || growth >= 3.5) strengths.push({ id: 'growth', label: 'رشد اقتصادی قوی', score: growth * 10 });
  if ((up.militaryPower?.level || 0) >= 55 || (m.attackPower || 0) >= 60) strengths.push({ id: 'military', label: 'قدرت نظامی بالا', score: up.militaryPower?.level || 40 });
  if ((up.defense?.level || 0) >= 50 || (m.defenseSystems || 0) >= 60) strengths.push({ id: 'defense', label: 'سامانه دفاعی قوی', score: m.defenseSystems || 40 });
  if ((up.intelligence?.level || 0) >= 50 || intel >= 60) strengths.push({ id: 'intel', label: 'شبکه اطلاعاتی قدرتمند', score: intel });
  if ((up.infrastructure?.level || 0) >= 60 || (e.infrastructure || 0) >= 70) strengths.push({ id: 'infra', label: 'زیرساخت پیشرفته', score: e.infrastructure || 50 });
  if (sat >= 65) strengths.push({ id: 'popular', label: 'رضایت مردمی بالا', score: sat });
  if ((e.foreignInvestment || 0) >= 25) strengths.push({ id: 'fdi', label: 'جذب سرمایه خارجی', score: e.foreignInvestment });
  if ((e.naturalResources || 0) >= 65) strengths.push({ id: 'resources', label: 'منابع طبیعی غنی', score: e.naturalResources });
  if ((up.government?.level || 0) >= 50) strengths.push({ id: 'governance', label: 'حکومت‌داری کارآمد', score: up.government.level });

  // Weaknesses
  if (debtRatio > 90) weaknesses.push({ id: 'debt', label: 'بدهی ملی سنگین', score: debtRatio });
  if (infl > 10) weaknesses.push({ id: 'inflation', label: 'تورم بالا', score: infl });
  if (unemp > 10) weaknesses.push({ id: 'unemployment', label: 'بیکاری گسترده', score: unemp });
  if (sat < 40) weaknesses.push({ id: 'unrest', label: 'نارضایتی اجتماعی', score: 100 - sat });
  if ((e.infrastructure || 50) < 40) weaknesses.push({ id: 'infra_weak', label: 'زیرساخت ضعیف', score: 100 - (e.infrastructure || 40) });
  if (tech < 35) weaknesses.push({ id: 'tech_lag', label: 'عقب‌ماندگی فناوری', score: 100 - tech });
  if ((m.readiness || 50) < 40) weaknesses.push({ id: 'readiness', label: 'آمادگی نظامی پایین', score: 100 - (m.readiness || 40) });
  if ((state.wars || []).length >= 2) weaknesses.push({ id: 'overstretch', label: 'درگیری‌های متعدد', score: (state.wars.length) * 30 });
  if ((state.crises || []).length > 0) weaknesses.push({ id: 'crisis', label: 'بحران فعال', score: 50 + state.crises.length * 15 });
  if (growth < 0) weaknesses.push({ id: 'recession', label: 'رکود اقتصادی', score: Math.abs(growth) * 20 });

  // Keep top 4 of each
  strengths.sort((a, b) => b.score - a.score);
  weaknesses.sort((a, b) => b.score - a.score);
  state.derived = state.derived || {};
  state.derived.strengths = strengths.slice(0, 5);
  state.derived.weaknesses = weaknesses.slice(0, 5);
  // Also update country display fields for overview
  state.country.strengths = state.derived.strengths.map(s => s.label);
  state.country.weaknesses = state.derived.weaknesses.map(w => w.label);
  return { strengths: state.derived.strengths, weaknesses: state.derived.weaknesses };
}

/** Modifier used by other systems (e.g. war success, diplomacy) */
function getStrengthModifier(state, key) {
  const list = state.derived?.strengths || [];
  const found = list.find(s => s.id === key);
  return found ? Math.min(1.25, 1 + found.score / 400) : 1;
}

function getWeaknessPenalty(state, key) {
  const list = state.derived?.weaknesses || [];
  const found = list.find(w => w.id === key);
  return found ? Math.max(0.7, 1 - found.score / 350) : 1;
}

window.computeStrengthsWeaknesses = computeStrengthsWeaknesses;
window.getStrengthModifier = getStrengthModifier;
window.getWeaknessPenalty = getWeaknessPenalty;
