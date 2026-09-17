// intelligence.js — Espionage with reliability, cost, detection (V3.8)

function ensureIntel(state) {
  if (!state.intelligence) {
    state.intelligence = { budget: 4, level: 30, domestic: 30, foreign: 30, counter: 30, operations: [], discoveredThreats: [] };
  }
  if (!state.intelligence.operations) state.intelligence.operations = [];
  if (!state.intelligence.reports) state.intelligence.reports = [];
  return state.intelligence;
}

function processIntelligenceTick(state) {
  const intel = ensureIntel(state);
  // Slow recovery of readiness
  intel.level = Math.min(95, (intel.level || 30) + 0.05);
  // Process ongoing ops
  intel.operations = (intel.operations || []).filter(op => {
    op.remaining = (op.remaining || 1) - 1;
    if (op.remaining <= 0) {
      resolveSpyMission(state, op);
      return false;
    }
    return true;
  });
  return state;
}

function adjustIntelBudget(state, amount) {
  amount = Math.max(1, Math.min(30, amount));
  state.intelligence.budget = amount;
  if (typeof logAction === 'function') logAction(state, 'بودجه اطلاعات: ' + amount);
  return state;
}

/**
 * Reliability 0–1 based on our intel level vs target counter-intel + relation distance
 */
function estimateReliability(state, targetId) {
  const our = (state.intelligence?.level || 30) + (state.intelligence?.foreign || 30) * 0.5;
  const target = (PLAYABLE_COUNTRIES || []).find(c => c.id === targetId);
  const counter = target ? (target.intelLevel || 30) * 1.1 : 40;
  const rel = state.diplomacy?.relations?.[targetId];
  const relVal = typeof getRelationValue === 'function' ? getRelationValue(rel) : (typeof rel === 'number' ? rel : 40);
  // closer relations → slightly better human intel
  let r = (our - counter * 0.6) / 80 + (relVal - 40) / 200;
  r = Math.max(0.15, Math.min(0.92, r));
  return Math.round(r * 100) / 100;
}

function gatherIntelligence(state, targetId) {
  ensureIntel(state);
  if (!targetId) return { success: false, message: 'هدف انتخاب نشده' };
  const cost = Math.max(2, Math.round((state.intelligence.budget || 4) * 0.6));
  if ((state.economy?.budget || 0) < cost) return { success: false, message: 'بودجه کافی نیست' };

  state.economy.budget -= cost;
  const reliability = estimateReliability(state, targetId);
  const target = (PLAYABLE_COUNTRIES || []).find(c => c.id === targetId);
  if (!target) return { success: false, message: 'کشور هدف نامعتبر' };

  // Detection chance
  const detectChance = Math.max(0.05, 0.35 - reliability * 0.25 + (target.intelLevel || 30) / 250);
  const detected = Math.random() < detectChance;

  // Build report with noise based on reliability
  function noise(trueVal, scale) {
    const err = (1 - reliability) * scale * (Math.random() * 2 - 1);
    return Math.round(Math.max(0, trueVal + err));
  }

  const report = {
    id: 'spy_' + Date.now(),
    targetId,
    targetName: target.name,
    targetFlag: target.flag,
    year: state.time.year,
    month: state.time.month,
    reliability,
    confidence: reliability >= 0.7 ? 'بالا' : reliability >= 0.45 ? 'متوسط' : 'پایین',
    detected,
    stale: false,
    estimates: {
      militaryPower: noise(target.militaryPower || 40, 25),
      economyPower: noise(target.economyPower || 40, 20),
      techLevel: noise(target.techLevel || 40, 18),
      intelLevel: noise(target.intelLevel || 40, 22),
      stability: noise(target.stability || 50, 20),
      army: noise(target.military?.army || 40, 20)
    },
    note: reliability < 0.4
      ? 'اطلاعات محدود و احتمالاً قدیمی یا نادرست است.'
      : reliability < 0.7
        ? 'برآورد قابل استفاده با حاشیه خطا.'
        : 'منبع نسبتاً قابل اعتماد.'
  };

  state.intelligence.reports = state.intelligence.reports || [];
  state.intelligence.reports.unshift(report);
  if (state.intelligence.reports.length > 40) state.intelligence.reports = state.intelligence.reports.slice(0, 40);

  if (detected) {
    // Relation penalty
    if (state.diplomacy?.relations?.[targetId] != null) {
      const rel = state.diplomacy.relations[targetId];
      if (typeof rel === 'number') state.diplomacy.relations[targetId] = Math.max(5, rel - 8);
      else if (rel) rel.trust = Math.max(0, (rel.trust || 50) - 10);
    }
    if (typeof pushNotification === 'function') {
      pushNotification(state, {
        severity: 'warning', category: 'intelligence',
        title: 'عملیات جاسوسی لو رفت',
        body: 'فعالیت اطلاعاتی در ' + target.name + ' شناسایی شد. روابط آسیب دید.'
      });
    }
  } else if (typeof pushNotification === 'function') {
    pushNotification(state, {
      severity: 'info', category: 'intelligence',
      title: 'گزارش اطلاعاتی: ' + target.name,
      body: 'اطمینان ' + report.confidence + ' (' + Math.round(reliability * 100) + '٪) — قدرت نظامی برآوردی: ' + report.estimates.militaryPower
    });
  }

  if (typeof logAction === 'function') logAction(state, 'جاسوسی از ' + target.name + ' — اطمینان ' + report.confidence);
  return { success: true, state, report };
}

function startCovertOperation(state, type, targetId) {
  ensureIntel(state);
  if (!targetId) return { success: false, message: 'هدف لازم است' };
  const cost = type === 'sabotage' ? 12 : type === 'disinfo' ? 8 : 10;
  if ((state.economy?.budget || 0) < cost) return { success: false, message: 'بودجه ناکافی' };
  state.economy.budget -= cost;
  const reliability = estimateReliability(state, targetId);
  const duration = 2 + Math.floor(Math.random() * 2);
  state.intelligence.operations.push({
    id: 'op_' + Date.now(),
    type: type || 'infiltrate',
    targetId,
    remaining: duration,
    reliability,
    cost
  });
  if (typeof logAction === 'function') logAction(state, 'عملیات مخفی ' + type + ' آغاز شد');
  return { success: true, state };
}

function resolveSpyMission(state, op) {
  const target = (PLAYABLE_COUNTRIES || []).find(c => c.id === op.targetId);
  const name = target ? target.name : op.targetId;
  const successP = 0.35 + (op.reliability || 0.4) * 0.5;
  const success = Math.random() < successP;
  const detected = Math.random() < (0.4 - (op.reliability || 0.4) * 0.25);

  if (success) {
    if (op.type === 'sabotage' && target) {
      // weaken relation war chance if at war
      const war = (state.wars || []).find(w => w.opponent === op.targetId);
      if (war) war.enemyPower = Math.max(10, (war.enemyPower || 50) - 4);
    }
    if (typeof pushNotification === 'function') {
      pushNotification(state, {
        severity: 'success', category: 'intelligence',
        title: 'عملیات مخفی موفق',
        body: 'عملیات ' + op.type + ' در ' + name + ' با موفقیت انجام شد.'
      });
    }
  } else if (typeof pushNotification === 'function') {
    pushNotification(state, {
      severity: 'warning', category: 'intelligence',
      title: 'شکست عملیات مخفی',
      body: 'عملیات در ' + name + ' ناموفق بود.' + (detected ? ' هویت عوامل لو رفت.' : '')
    });
  }
  if (detected && state.diplomacy?.relations?.[op.targetId] != null) {
    const rel = state.diplomacy.relations[op.targetId];
    if (typeof rel === 'number') state.diplomacy.relations[op.targetId] = Math.max(5, rel - 12);
  }
}

window.processIntelligenceTick = processIntelligenceTick;
window.adjustIntelBudget = adjustIntelBudget;
window.gatherIntelligence = gatherIntelligence;
window.startCovertOperation = startCovertOperation;
window.estimateReliability = estimateReliability;
window.ensureIntel = ensureIntel;
