// crisis.js - Global Crisis Engine V3.0.1
// Active mainly in Medium & Realistic. Chain events.

const CRISIS_TYPES = {
  regional_war: { name: 'جنگ منطقه‌ای', severity: 2, chain: ['economic_pressure'] },
  world_war: { name: 'جنگ جهانی', severity: 5, chain: ['economic_crisis', 'energy_crisis'] },
  economic_crisis: { name: 'بحران اقتصادی جهانی', severity: 3, chain: ['unemployment_spike', 'debt_pressure'] },
  pandemic: { name: 'همه‌گیری / ویروس', severity: 4, chain: ['production_drop', 'health_cost', 'unemployment_spike'] },
  energy_crisis: { name: 'بحران انرژی', severity: 3, chain: ['inflation_spike', 'production_drop'] },
  food_crisis: { name: 'بحران غذایی', severity: 3, chain: ['satisfaction_drop', 'inflation_spike'] },
  financial_crisis: { name: 'بحران مالی', severity: 4, chain: ['debt_pressure', 'investment_drop'] },
  supply_chain: { name: 'بحران زنجیره تأمین', severity: 2, chain: ['production_drop', 'inflation_spike'] },
  cyber: { name: 'بحران سایبری', severity: 2, chain: ['intel_pressure'] }
};

function maybeTriggerCrisis(state) {
  const diff = state.meta?.difficulty || 'medium';
  if (diff === 'easy') return state; // limited in Easy

  const chanceBase = diff === 'realistic' ? 0.04 : 0.02;
  if (Math.random() > chanceBase) return state;

  const types = Object.keys(CRISIS_TYPES);
  // Avoid world_war in medium mostly
  let pool = types;
  if (diff === 'medium') pool = types.filter(t => t !== 'world_war');
  const type = pool[Math.floor(Math.random() * pool.length)];
  return startCrisis(state, type);
}

function startCrisis(state, typeId) {
  if (!state.crises) state.crises = [];
  const def = CRISIS_TYPES[typeId];
  if (!def) return state;
  if (state.crises.some(c => c.type === typeId && c.active)) return state;

  const crisis = {
    id: 'crisis_' + typeId + '_' + Date.now(),
    type: typeId,
    name: def.name,
    severity: def.severity,
    active: true,
    startYear: state.time.year,
    startMonth: state.time.month,
    duration: 0,
    chain: def.chain || [],
    decisions: []
  };
  state.crises.push(crisis);

  // Initial impact
  applyCrisisImpact(state, crisis, 1);

  if (typeof addNews === 'function') {
    addNews(state, {
      type: 'global',
      category: 'crisis',
      icon: '🌍',
      title: `بحران جهانی: ${def.name}`,
      summary: `یک بحران ${def.name} در سطح بین‌المللی آغاز شده و می‌تواند زنجیره‌ای از مشکلات اقتصادی و اجتماعی ایجاد کند.`,
      line2: 'تصمیمات دولت در مدیریت این بحران بر رضایت مردم، بودجه و روابط بین‌المللی اثر مستقیم خواهد داشت.',
      important: true
    });
  }
  return state;
}

function applyCrisisImpact(state, crisis, strength = 1) {
  const s = crisis.severity * strength * 0.3;
  switch (crisis.type) {
    case 'pandemic':
      state.economy.gdpGrowth = Math.max(-5, (state.economy.gdpGrowth || 1) - 0.8 * s);
      state.economy.unemployment = Math.min(40, (state.economy.unemployment || 5) + 1.2 * s);
      state.economy.budget -= 6 * s;
      state.population.satisfaction = Math.max(5, (state.population.satisfaction || 50) - 3 * s);
      break;
    case 'economic_crisis':
    case 'financial_crisis':
      state.economy.gdpGrowth = Math.max(-5, (state.economy.gdpGrowth || 1) - 1.0 * s);
      state.economy.foreignInvestment = Math.max(0, (state.economy.foreignInvestment || 15) - 4 * s);
      state.economy.nationalDebt = (state.economy.nationalDebt || 100) + 8 * s;
      break;
    case 'energy_crisis':
      state.economy.inflation = Math.min(30, (state.economy.inflation || 3) + 1.5 * s);
      state.economy.gdpGrowth -= 0.5 * s;
      break;
    case 'world_war':
    case 'regional_war':
      state.economy.budget -= 10 * s;
      state.population.satisfaction -= 4 * s;
      break;
    default:
      state.economy.gdpGrowth -= 0.4 * s;
      state.population.satisfaction -= 2 * s;
  }
}

function updateCrises(state) {
  if (!state.crises) return state;
  state.crises.forEach(c => {
    if (!c.active) return;
    c.duration = (c.duration || 0) + 1;
    applyCrisisImpact(state, c, 0.4);
    // Chance to resolve or chain
    if (c.duration > 8 && Math.random() < 0.15) {
      c.active = false;
      state.crisisHistory = state.crisisHistory || [];
      state.crisisHistory.push({ ...c, endYear: state.time.year });
    }
  });
  state.crises = state.crises.filter(c => c.active);
  return state;
}

function crisisDecision(state, crisisId, decisionId) {
  // Simple decisions: quarantine, stimulus, close_borders, international_coop, ignore
  const c = state.crises?.find(x => x.id === crisisId);
  if (!c) return { success: false };
  c.decisions.push(decisionId);
  if (decisionId === 'quarantine' || decisionId === 'close_borders') {
    state.economy.gdpGrowth -= 0.5;
    state.population.satisfaction -= 2;
    c.severity = Math.max(1, c.severity - 0.5);
  } else if (decisionId === 'stimulus' || decisionId === 'health_budget') {
    state.economy.budget -= 12;
    state.population.satisfaction += 3;
    c.severity = Math.max(1, c.severity - 0.8);
  } else if (decisionId === 'international_coop') {
    state.economy.budget -= 5;
    c.severity = Math.max(1, c.severity - 0.6);
  }
  // ignore: no change, severity may rise
  return { success: true };
}

window.maybeTriggerCrisis = maybeTriggerCrisis;
window.updateCrises = updateCrises;
window.crisisDecision = crisisDecision;
window.startCrisis = startCrisis;
