// upgrades.js - Upgrade Engine V3.0.1
// Standardized Level system for all main upgrades. Max = 100.

const UPGRADE_DEFS = {
  economicDevelopment: {
    id: 'economicDevelopment',
    name: 'توسعه اقتصادی',
    category: 'Economy',
    description: 'ارتقای پایه تولید، بهره‌وری و رشد بلندمدت اقتصاد',
    effectKey: 'economyPower'
  },
  militaryPower: {
    id: 'militaryPower',
    name: 'قدرت نظامی',
    category: 'Military',
    description: 'افزایش کلی توان رزمی و آمادگی نیروهای مسلح',
    effectKey: 'military'
  },
  technology: {
    id: 'technology',
    name: 'فناوری',
    category: 'Technology',
    description: 'پیشرفت تحقیق و توسعه و سطح فناوری ملی',
    effectKey: 'tech'
  },
  intelligence: {
    id: 'intelligence',
    name: 'اطلاعات',
    category: 'Intelligence',
    description: 'تقویت شبکه اطلاعاتی داخلی و خارجی',
    effectKey: 'intel'
  },
  infrastructure: {
    id: 'infrastructure',
    name: 'زیرساخت',
    category: 'Infrastructure',
    description: 'بهبود جاده‌ها، انرژی، ارتباطات و حمل‌ونقل',
    effectKey: 'infra'
  },
  defense: {
    id: 'defense',
    name: 'دفاع',
    category: 'Defense',
    description: 'سامانه‌های دفاعی و بازدارندگی',
    effectKey: 'defense'
  },
  government: {
    id: 'government',
    name: 'حکومت‌داری',
    category: 'Government',
    description: 'کارایی دولت، مبارزه با فساد و کیفیت نهادها',
    effectKey: 'gov'
  }
};

/**
 * Calculate upgrade cost based on type, current level, country size, economy, difficulty.
 * Formula: base * (1.08 ^ level) * sizeFactor * diffMultiplier
 * Higher levels become naturally more expensive.
 */
function calculateUpgradeCost(state, upgradeId) {
  const up = state.upgrades[upgradeId];
  if (!up) return Infinity;
  const level = up.level || 1;
  const m = (typeof getDifficultyMultipliers === 'function') ? getDifficultyMultipliers() : { infrastructureCost: 1, techCost: 1, militaryCost: 1 };
  const gdp = state.economy?.gdp || 100;
  const pop = state.country?.population || 50e6;

  // Size factor: larger economies pay more absolute but relative is similar
  const sizeFactor = Math.max(0.6, Math.min(2.5, Math.sqrt(gdp / 200) * 0.8 + Math.log10(pop / 1e6) * 0.15));

  let base = 80; // millions game units
  let growth = 1.085;
  let costMult = 1;

  switch (upgradeId) {
    case 'economicDevelopment':
      base = 100; growth = 1.09; costMult = m.infrastructureCost || 1;
      break;
    case 'militaryPower':
      base = 120; growth = 1.095; costMult = m.militaryCost || 1;
      break;
    case 'technology':
      base = 90; growth = 1.1; costMult = m.techCost || 1;
      break;
    case 'intelligence':
      base = 70; growth = 1.08; costMult = 1.1;
      break;
    case 'infrastructure':
      base = 110; growth = 1.088; costMult = m.infrastructureCost || 1;
      break;
    case 'defense':
      base = 100; growth = 1.092; costMult = m.militaryCost || 1;
      break;
    case 'government':
      base = 60; growth = 1.07; costMult = 0.9;
      break;
  }

  const raw = base * Math.pow(growth, level - 1) * sizeFactor * costMult;
  return Math.round(raw * 10) / 10;
}

function getUpgradeTime(upgradeId, level) {
  // months
  const base = 2 + Math.floor(level / 15);
  return Math.min(12, base);
}

function canUpgrade(state, upgradeId) {
  const up = state.upgrades?.[upgradeId];
  if (!up) return { ok: false, reason: 'ارتقای نامعتبر' };
  if (up.level >= (up.max || 100)) return { ok: false, reason: 'Maximum Level Reached' };
  const cost = calculateUpgradeCost(state, upgradeId);
  if ((state.economy?.budget || 0) < cost) return { ok: false, reason: 'بودجه کافی نیست', cost };
  return { ok: true, cost };
}

function performUpgrade(state, upgradeId) {
  const check = canUpgrade(state, upgradeId);
  if (!check.ok) return { success: false, message: check.reason };

  const up = state.upgrades[upgradeId];
  const cost = check.cost;
  const time = getUpgradeTime(upgradeId, up.level);

  state.economy.budget -= cost;

  // Immediate small boost + project for remaining
  applyUpgradeEffect(state, upgradeId, 0.4);

  state.projects = state.projects || [];
  state.projects.push({
    id: 'upg_' + upgradeId + '_' + Date.now(),
    type: 'upgrade',
    upgradeId,
    name: `ارتقای ${UPGRADE_DEFS[upgradeId]?.name || upgradeId}`,
    remaining: time,
    total: time,
    effect: { upgradeLevel: 1 }
  });

  if (typeof logAction === 'function') {
    logAction(state, `شروع ارتقای ${UPGRADE_DEFS[upgradeId]?.name} به سطح ${up.level + 1}`);
  }

  return {
    success: true,
    message: `ارتقای ${UPGRADE_DEFS[upgradeId]?.name} آغاز شد. هزینه: ${typeof formatMoney === 'function' ? formatMoney(cost) : cost}`,
    cost,
    time
  };
}

function applyUpgradeEffect(state, upgradeId, strength = 1) {
  const up = state.upgrades[upgradeId];
  if (!up) return;
  // Level already increased on complete; here apply continuous effects
  switch (upgradeId) {
    case 'economicDevelopment':
      state.economy.gdpGrowth = Math.min(9, (state.economy.gdpGrowth || 2) + 0.08 * strength);
      state.economy.industrialProduction = Math.min(100, (state.economy.industrialProduction || 50) + 0.6 * strength);
      break;
    case 'militaryPower':
      if (state.military) {
        state.military.army = Math.min(100, (state.military.army || 40) + 0.5 * strength);
        state.military.readiness = Math.min(100, (state.military.readiness || 50) + 0.4 * strength);
      }
      break;
    case 'technology':
      if (state.tech) state.tech.level = Math.min(100, (state.tech.level || 40) + 0.7 * strength);
      break;
    case 'intelligence':
      if (state.intelligence) {
        state.intelligence.level = Math.min(95, (state.intelligence.level || 30) + 0.6 * strength);
        state.intelligence.foreign = Math.min(95, (state.intelligence.foreign || 30) + 0.4 * strength);
      }
      break;
    case 'infrastructure':
      state.economy.infrastructure = Math.min(100, (state.economy.infrastructure || 40) + 0.8 * strength);
      break;
    case 'defense':
      if (state.military) {
        state.military.defenseSystems = Math.min(100, (state.military.defenseSystems || 30) + 0.7 * strength);
      }
      break;
    case 'government':
      state.population.satisfaction = Math.min(98, (state.population.satisfaction || 50) + 0.3 * strength);
      state.economy.stability = Math.min(95, (state.economy.stability || 50) + 0.4 * strength);
      break;
  }
}

function completeUpgradeProject(state, project) {
  if (project.upgradeId && state.upgrades[project.upgradeId]) {
    const up = state.upgrades[project.upgradeId];
    if (up.level < (up.max || 100)) {
      up.level += 1;
      applyUpgradeEffect(state, project.upgradeId, 1);
      if (typeof addNews === 'function') {
        addNews(state, {
          type: 'domestic',
          category: 'economy',
          icon: '📈',
          title: `ارتقای ${UPGRADE_DEFS[project.upgradeId]?.name || project.upgradeId} به سطح ${up.level}`,
          summary: `سطح جدید ${up.level} / ${up.max} به دست آمد. تأثیرات مثبت در بخش مربوطه اعمال شد.`,
          line2: 'ادامه سرمایه‌گذاری در این حوزه می‌تواند مزیت رقابتی بلندمدت ایجاد کند.',
          important: false
        });
      }
    }
  }
  return state;
}

// Hook into project completion if needed from economy tick
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
window.processUpgradeProjects = processUpgradeProjects;
