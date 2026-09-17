// upgrades.js - Upgrade Engine V3.3.0
// Level system Max=100, multi-level (+1/+5/+10), damage support, budget-gated

const UPGRADE_DEFS = {
  economicDevelopment: {
    id: 'economicDevelopment', name: 'توسعه اقتصادی', category: 'Economy',
    description: 'ارتقای پایه تولید، بهره‌وری و رشد بلندمدت اقتصاد', effectKey: 'economy'
  },
  militaryPower: {
    id: 'militaryPower', name: 'قدرت نظامی', category: 'Military',
    description: 'افزایش کلی توان رزمی و آمادگی نیروهای مسلح', effectKey: 'military'
  },
  technology: {
    id: 'technology', name: 'فناوری', category: 'Technology',
    description: 'پیشرفت تحقیق و توسعه و سطح فناوری ملی', effectKey: 'tech'
  },
  intelligence: {
    id: 'intelligence', name: 'اطلاعات', category: 'Intelligence',
    description: 'تقویت شبکه اطلاعاتی داخلی و خارجی', effectKey: 'intel'
  },
  infrastructure: {
    id: 'infrastructure', name: 'زیرساخت', category: 'Infrastructure',
    description: 'بهبود جاده‌ها، انرژی، ارتباطات و حمل‌ونقل', effectKey: 'infra'
  },
  defense: {
    id: 'defense', name: 'دفاع', category: 'Defense',
    description: 'سامانه‌های دفاعی و بازدارندگی', effectKey: 'defense'
  },
  government: {
    id: 'government', name: 'حکومت‌داری', category: 'Government',
    description: 'کارایی دولت، مبارزه با فساد و کیفیت نهادها', effectKey: 'gov'
  }
};

/**
 * Cost for upgrading from currentLevel to currentLevel+levels (not just *N).
 * Uses geometric sum of per-level costs.
 */
function calculateUpgradeCost(state, upgradeId, levels = 1) {
  const up = state.upgrades?.[upgradeId];
  if (!up) return Infinity;
  const start = up.level || 1;
  const max = up.max || 100;
  const actualLevels = Math.min(levels, max - start);
  if (actualLevels <= 0) return 0;

  const m = (typeof getDifficultyMultipliers === 'function') ? getDifficultyMultipliers() : {};
  const gdp = state.economy?.gdp || 100;
  const pop = state.country?.population || 50e6;
  const sizeFactor = Math.max(0.55, Math.min(2.8, Math.sqrt(gdp / 180) * 0.75 + Math.log10(Math.max(1, pop / 1e6)) * 0.12));
  const debtPressure = (state.economy?.gdp > 0)
    ? Math.min(1.6, 1 + Math.max(0, (state.economy.nationalDebt / state.economy.gdp) - 0.6) * 0.35)
    : 1;

  let base = 80, growth = 1.085, costMult = 1;
  switch (upgradeId) {
    case 'economicDevelopment': base = 95; growth = 1.088; costMult = m.infrastructureCost || 1; break;
    case 'militaryPower': base = 115; growth = 1.092; costMult = m.militaryCost || 1; break;
    case 'technology': base = 88; growth = 1.098; costMult = m.techCost || 1; break;
    case 'intelligence': base = 68; growth = 1.078; costMult = 1.05; break;
    case 'infrastructure': base = 105; growth = 1.086; costMult = m.infrastructureCost || 1; break;
    case 'defense': base = 98; growth = 1.09; costMult = m.militaryCost || 1; break;
    case 'government': base = 55; growth = 1.065; costMult = 0.9; break;
  }

  // Sum of geometric series: cost_L + cost_(L+1) + ... for actualLevels
  let total = 0;
  for (let i = 0; i < actualLevels; i++) {
    total += base * Math.pow(growth, start - 1 + i) * sizeFactor * costMult * debtPressure;
  }
  // Bulk discount for multi-level (not pure linear)
  if (actualLevels >= 10) total *= 0.88;
  else if (actualLevels >= 5) total *= 0.93;
  return Math.round(total * 10) / 10;
}

function getUpgradeTime(upgradeId, level, levels = 1) {
  const per = 1.5 + Math.floor(level / 20);
  return Math.min(18, Math.ceil(per * levels * 0.7 + levels * 0.4));
}

function canUpgrade(state, upgradeId, levels = 1) {
  const up = state.upgrades?.[upgradeId];
  if (!up) return { ok: false, reason: 'ارتقای نامعتبر' };
  const max = up.max || 100;
  if (up.level >= max) return { ok: false, reason: 'Maximum Level Reached', cost: 0 };
  const actual = Math.min(levels, max - up.level);
  if (actual <= 0) return { ok: false, reason: 'Maximum Level Reached', cost: 0 };
  const cost = calculateUpgradeCost(state, upgradeId, actual);
  if ((state.economy?.budget || 0) < cost) return { ok: false, reason: 'بودجه کافی نیست', cost, actual };
  // Economic stability soft gate
  if ((state.economy?.inflation || 0) > 18 && ['economicDevelopment', 'infrastructure'].includes(upgradeId)) {
    return { ok: false, reason: 'تورم بالا — ارتقای اقتصادی محدود شده', cost, actual };
  }
  return { ok: true, cost, actual };
}

function performUpgrade(state, upgradeId, levels = 1) {
  const check = canUpgrade(state, upgradeId, levels);
  if (!check.ok) return { success: false, message: check.reason, cost: check.cost };

  const up = state.upgrades[upgradeId];
  const actual = check.actual;
  const cost = check.cost;
  const time = getUpgradeTime(upgradeId, up.level, actual);

  state.economy.budget -= cost;
  // Immediate partial effect; rest via project
  applyUpgradeEffect(state, upgradeId, 0.35 * actual);
  up.level = Math.min(up.max || 100, up.level + actual);

  state.projects = state.projects || [];
  state.projects.push({
    id: 'upg_' + upgradeId + '_' + Date.now(),
    type: 'upgrade',
    upgradeId,
    levels: actual,
    name: `ارتقای ${UPGRADE_DEFS[upgradeId]?.name || upgradeId} (+${actual})`,
    remaining: time,
    total: time,
    effect: { upgradeLevel: actual }
  });

  if (typeof logAction === 'function') {
    logAction(state, `ارتقای ${UPGRADE_DEFS[upgradeId]?.name} به سطح ${up.level} (+${actual}) — هزینه ${cost}`);
  }
  if (typeof computeStrengthsWeaknesses === 'function') computeStrengthsWeaknesses(state);

  const costStr = typeof formatMoney === 'function' ? formatMoney(cost) : cost;
  return {
    success: true,
    message: `ارتقای ${UPGRADE_DEFS[upgradeId]?.name} (+${actual}) آغاز شد. هزینه: ${costStr}`,
    cost, time, newLevel: up.level
  };
}

function applyUpgradeEffect(state, upgradeId, strength = 1) {
  switch (upgradeId) {
    case 'economicDevelopment':
      state.economy.gdpGrowth = Math.min(9, (state.economy.gdpGrowth || 2) + 0.06 * strength);
      state.economy.industrialProduction = Math.min(100, (state.economy.industrialProduction || 50) + 0.5 * strength);
      break;
    case 'militaryPower':
      if (state.military) {
        state.military.army = Math.min(100, (state.military.army || 40) + 0.4 * strength);
        state.military.readiness = Math.min(100, (state.military.readiness || 50) + 0.35 * strength);
      }
      break;
    case 'technology':
      if (state.tech) state.tech.level = Math.min(100, (state.tech.level || 40) + 0.55 * strength);
      break;
    case 'intelligence':
      if (state.intelligence) {
        state.intelligence.level = Math.min(95, (state.intelligence.level || 30) + 0.5 * strength);
        state.intelligence.foreign = Math.min(95, (state.intelligence.foreign || 30) + 0.35 * strength);
      }
      break;
    case 'infrastructure':
      state.economy.infrastructure = Math.min(100, (state.economy.infrastructure || 40) + 0.65 * strength);
      break;
    case 'defense':
      if (state.military) state.military.defenseSystems = Math.min(100, (state.military.defenseSystems || 30) + 0.55 * strength);
      break;
    case 'government':
      state.population.satisfaction = Math.min(98, (state.population.satisfaction || 50) + 0.25 * strength);
      state.economy.stability = Math.min(95, (state.economy.stability || 50) + 0.35 * strength);
      break;
  }
}

/** Damage upgrade levels (war, crisis, sabotage). Level can go down; then re-upgradable. */
function damageUpgrade(state, upgradeId, amount = 1) {
  const up = state.upgrades?.[upgradeId];
  if (!up) return;
  const min = up.min || 1;
  up.level = Math.max(min, (up.level || 1) - amount);
  if (typeof computeStrengthsWeaknesses === 'function') computeStrengthsWeaknesses(state);
}

function completeUpgradeProject(state, project) {
  if (project.upgradeId && state.upgrades[project.upgradeId]) {
    applyUpgradeEffect(state, project.upgradeId, 0.65 * (project.levels || 1));
    if (typeof addNews === 'function') {
      const up = state.upgrades[project.upgradeId];
      addNews(state, {
        type: 'domestic', category: 'economy', icon: '📈',
        title: `ارتقای ${UPGRADE_DEFS[project.upgradeId]?.name || project.upgradeId} تکمیل شد`,
        summary: `سطح ${up.level} / ${up.max} به‌دست آمد.`,
        line2: 'تأثیرات مثبت در بخش مربوطه اعمال شد. ادامه سرمایه‌گذاری مزیت رقابتی ایجاد می‌کند.',
        important: false
      });
    }
    if (typeof computeStrengthsWeaknesses === 'function') computeStrengthsWeaknesses(state);
  }
  return state;
}

function processUpgradeProjects(state) {
  if (!state.projects) return state;
  state.projects = state.projects.filter(p => {
    if (p.type === 'upgrade' && p.remaining !== undefined) {
      p.remaining -= 1;
      if (p.remaining <= 0) {
        completeUpgradeProject(state, p);
        return false;
      }
    }
    return true;
  });
  return state;
}

window.UPGRADE_DEFS = UPGRADE_DEFS;
window.calculateUpgradeCost = calculateUpgradeCost;
window.canUpgrade = canUpgrade;
window.performUpgrade = performUpgrade;
window.damageUpgrade = damageUpgrade;
window.processUpgradeProjects = processUpgradeProjects;
