// wars.js - Advanced War & Military Action System V3.3.0
const ATTACK_TYPES = {
  ground: { name: 'حمله زمینی', icon: '🪖', costMult: 1.0, equip: null },
  air: { name: 'حمله هوایی', icon: '✈️', costMult: 1.3, equip: null },
  missile: { name: 'حمله موشکی', icon: '🚀', costMult: 0.8, equip: 'missiles' },
  naval: { name: 'حمله دریایی', icon: '🚢', costMult: 1.4, equip: null },
  military_facilities: { name: 'تأسیسات نظامی', icon: '🏭', costMult: 1.2, equip: null },
  economic_facilities: { name: 'تأسیسات اقتصادی', icon: '🏗️', costMult: 1.1, equip: null },
  residential: { name: 'مناطق مسکونی', icon: '🏙️', costMult: 0.9, equip: null },
  assassination: { name: 'ترور هدفمند', icon: '🎯', costMult: 1.5, equip: null }
};


/** Central war difficulty modifiers — single source, not duplicated */
function getWarDifficultyMods(state) {
  const d = (state && state.meta && state.meta.difficulty) || 'medium';
  if (d === 'easy') {
    return { playerPower: 1.25, enemyPower: 0.75, cost: 0.7, casualty: 0.55, recovery: 1.4, variance: 8, intelWeight: 0.5 };
  }
  if (d === 'realistic') {
    return { playerPower: 1.0, enemyPower: 1.15, cost: 1.45, casualty: 1.5, recovery: 0.7, variance: 12, intelWeight: 1.2 };
  }
  return { playerPower: 1.0, enemyPower: 1.0, cost: 1.0, casualty: 1.0, recovery: 1.0, variance: 10, intelWeight: 1.0 };
}

/**
 * Multi-factor combat resolution. Returns breakdown for UI debug.
 * NOT simply: random > enemyPower
 */
function resolveCombat(state, war, attackType, options) {
  options = options || {};
  const dm = getWarDifficultyMods(state);
  const m = state.military || {};
  const eq = m.equipment || {};
  const tech = (state.tech && state.tech.level) || 40;
  const intel = (state.intelligence && state.intelligence.level) || 30;
  const upMil = (state.upgrades && state.upgrades.militaryPower && state.upgrades.militaryPower.level) || 30;
  const upDef = (state.upgrades && state.upgrades.defense && state.upgrades.defense.level) || 30;
  const upTech = (state.upgrades && state.upgrades.technology && state.upgrades.technology.level) || 30;
  const upIntel = (state.upgrades && state.upgrades.intelligence && state.upgrades.intelligence.level) || 30;

  // Base attack power by type (no double-counting: use force OR equipment, not both fully)
  let attackPower = 40;
  let typeMod = 1;
  const missileCount = Math.max(1, options.missileCount || 1);

  switch (attackType) {
    case 'ground':
      attackPower = (m.army || 40) * 0.55 + (eq.tanks || 0) * 1.2 + (eq.apc || 0) * 0.6 + upMil * 0.15;
      typeMod = 1.0;
      break;
    case 'air':
      attackPower = (m.airForce || 30) * 0.7 + tech * 0.2 + upTech * 0.15 - (war.enemyPower * 0.05);
      typeMod = 1.1;
      break;
    case 'missile':
      attackPower = (eq.missiles || 0) * 0.8 + missileCount * 4 + tech * 0.25 + upTech * 0.2;
      typeMod = 0.95 + Math.min(0.3, missileCount * 0.03);
      break;
    case 'naval':
      attackPower = (m.navy || 25) * 0.75 + tech * 0.15 + upMil * 0.1;
      typeMod = 1.05;
      break;
    case 'military_facilities':
      attackPower = intel * 0.4 + tech * 0.3 + (m.attackPower || 40) * 0.3 + upIntel * 0.2;
      typeMod = 1.15;
      break;
    case 'economic_facilities':
      attackPower = intel * 0.35 + tech * 0.25 + (m.attackPower || 40) * 0.25;
      typeMod = 1.0;
      break;
    case 'residential':
      attackPower = (m.attackPower || 40) * 0.5 + (eq.missiles || 0) * 0.3;
      typeMod = 0.85; // militarily weaker efficiency, high political cost
      break;
    case 'assassination':
      attackPower = intel * 0.7 + upIntel * 0.35 + ((eq.specialForces || 0) * 8);
      typeMod = 0.7 + (intel / 200);
      break;
    default:
      attackPower = (m.attackPower || 40) * 0.6 + upMil * 0.2;
  }

  // Defense facing the attack
  let defensePower = (war.enemyPower || 50) * 0.55;
  if (attackType === 'air') defensePower += 8; // AA assumed
  if (attackType === 'missile') defensePower += 5;
  if (attackType === 'assassination') defensePower = 40 + (war.enemyPower || 50) * 0.25;

  // Modifiers
  const techMod = 0.85 + (tech / 100) * 0.35 + (upTech / 100) * 0.15;
  const intelMod = 0.9 + (intel / 100) * 0.2 * dm.intelWeight + (upIntel / 100) * 0.1;
  const equipMod = 0.9 + Math.min(0.25, ((eq.tanks || 0) + (eq.missiles || 0) + (eq.antiAir || 0)) / 80);
  const fatigue = Math.max(0.7, 1 - ((war.durationMonths || 0) * 0.02));
  const allyBonus = ((state.alliances && state.alliances.military) || []).length > 0 ? 1.06 : 1.0;

  const finalAttack = attackPower * typeMod * techMod * intelMod * equipMod * fatigue * allyBonus * dm.playerPower;
  const finalDefense = defensePower * dm.enemyPower;

  // Controlled variance
  const variance = (Math.random() * 2 - 1) * dm.variance;
  const score = finalAttack - finalDefense + variance;
  const chance = Math.max(8, Math.min(92, 50 + score * 0.9));
  const success = Math.random() * 100 < chance;

  return {
    success: success,
    chance: Math.round(chance),
    breakdown: {
      attackPower: Math.round(attackPower),
      defensePower: Math.round(defensePower),
      techMod: Math.round(techMod * 100) / 100,
      intelMod: Math.round(intelMod * 100) / 100,
      equipMod: Math.round(equipMod * 100) / 100,
      fatigue: Math.round(fatigue * 100) / 100,
      allyBonus: allyBonus,
      difficulty: (state.meta && state.meta.difficulty) || 'medium',
      finalAttack: Math.round(finalAttack),
      finalDefense: Math.round(finalDefense),
      variance: Math.round(variance * 10) / 10,
      chance: Math.round(chance)
    }
  };
}

function ensureEquipment(state) {
  if (!state.military) state.military = {};
  if (!state.military.equipment) {
    state.military.equipment = { missiles: 12, tanks: 8, apc: 15, antiAir: 6, antiMissile: 3, specialForces: 0 };
  }
  return state.military.equipment;
}

function startWar(state, targetId, reason) {
  reason = reason || 'تنش‌های مرزی';
  if (!state.wars) state.wars = [];
  if (state.wars.some(function(w) { return w.opponent === targetId && w.status !== 'peace'; })) {
    return { success: false, message: 'جنگ فعال با این کشور وجود دارد' };
  }
  var target = (typeof PLAYABLE_COUNTRIES !== 'undefined') ? PLAYABLE_COUNTRIES.find(function(c) { return c.id === targetId; }) : null;
  if (!target) return { success: false, message: 'کشور نامعتبر' };
  var allies = {};
  (state.alliances && state.alliances.military || []).forEach(function(a) {
    (a.members || []).forEach(function(m) { allies[m] = true; });
  });
  if (allies[targetId]) return { success: false, message: 'حمله به متحد مجاز نیست' };

  var playerPower = (state.military && state.military.attackPower || 40) + (state.military && state.military.defensePower || 40) / 2;
  var enemyPower = (target.militaryPower || 50) + Math.random() * 15;
  var war = {
    id: 'war_' + targetId + '_' + Date.now(),
    opponent: targetId, opponentName: target.name, opponentFlag: target.flag,
    status: 'conflict', startYear: state.time.year, startMonth: state.time.month,
    durationMonths: 0, playerPower: Math.round(playerPower), enemyPower: Math.round(enemyPower),
    casualties: 0, costAccumulated: 0, goals: ['دفاع از منافع ملی'],
    winChance: Math.max(12, Math.min(88, 48 + (playerPower - enemyPower) * 0.45)),
    reason: reason, operations: []
  };
  state.wars.push(war);
  state.economy.budget -= 6;
  state.population.satisfaction = Math.max(8, (state.population.satisfaction || 50) - 3);
  if (state.diplomacy && state.diplomacy.relations && state.diplomacy.relations[targetId] != null) {
    var r = state.diplomacy.relations[targetId];
    if (typeof r === 'number') state.diplomacy.relations[targetId] = Math.max(5, r - 22);
    else if (r.overall != null) r.overall = Math.max(5, r.overall - 22);
  }
  if (typeof pushNotification === 'function') {
    pushNotification(state, { severity: 'critical', category: 'war', title: 'آغاز درگیری نظامی', body: 'درگیری با ' + target.name + ' آغاز شد.', line2: 'ادامه جنگ بر بودجه و رضایت اثر می‌گذارد.' });
  } else if (typeof addNews === 'function') {
    addNews(state, { type: 'military', category: 'war', icon: '⚔️', important: true, title: 'آغاز درگیری نظامی', summary: 'نیروهای دو کشور وارد درگیری شدند.', line2: 'تأثیر بر تجارت و هزینه‌های نظامی.' });
  }
  return { success: true, war: war };
}

function executeMilitaryAction(state, targetId, attackType, options) {
  options = options || {};
  var atk = ATTACK_TYPES[attackType];
  if (!atk) return { success: false, message: 'نوع حمله نامعتبر' };
  var war = (state.wars || []).find(function(w) { return w.opponent === targetId && w.status !== 'peace'; });
  if (!war) {
    var started = startWar(state, targetId, atk.name);
    if (!started.success) return started;
    war = started.war;
  }
  var equip = ensureEquipment(state);
  var missileCount = Math.max(1, Math.min(options.missileCount || 1, equip.missiles || 0));
  if (atk.equip === 'missiles' && (equip.missiles || 0) < missileCount) {
    return { success: false, message: 'موشک کافی نیست (موجودی: ' + (equip.missiles || 0) + ')' };
  }
  var cost = Math.round((4 + Math.random() * 5) * atk.costMult * (attackType === 'missile' ? missileCount * 0.6 : 1) * 10) / 10;
  if ((state.economy.budget || 0) < cost) return { success: false, message: 'بودجه کافی نیست' };

  var dm = getWarDifficultyMods(state);
  cost = Math.round(cost * dm.cost * 10) / 10;
  if ((state.economy.budget || 0) < cost) return { success: false, message: 'بودجه کافی نیست (پس از ضریب سختی)' };

  var combat = resolveCombat(state, war, attackType, options);
  var success = combat.success;
  var chance = combat.chance;
  state.economy.budget -= cost;
  war.costAccumulated = (war.costAccumulated || 0) + cost;
  war.lastBreakdown = combat.breakdown;
  if (atk.equip === 'missiles') equip.missiles = Math.max(0, (equip.missiles || 0) - missileCount);

  var resultMsg = '';
  if (success) {
    war.winChance = Math.min(90, (war.winChance || 50) + 2);
    if (attackType === 'military_facilities') { war.enemyPower = Math.max(15, war.enemyPower - 4 - Math.random() * 4); resultMsg = 'تأسیسات نظامی آسیب دید.'; }
    else if (attackType === 'economic_facilities') { war.enemyPower = Math.max(15, war.enemyPower - 2); resultMsg = 'تأسیسات اقتصادی آسیب دید.'; }
    else if (attackType === 'residential') {
      state.population.satisfaction = Math.max(5, (state.population.satisfaction || 50) - 5);
      war.winChance = Math.max(10, war.winChance - 3);
      resultMsg = 'حمله مسکونی — پیامد سیاسی منفی.';
    } else if (attackType === 'assassination') {
      resultMsg = options.targetName ? 'ترور ' + options.targetName + ' موفق.' : 'ترور هدفمند موفق.';
      war.enemyPower = Math.max(15, war.enemyPower - 5);
      if (state.diplomacy && state.diplomacy.relations && state.diplomacy.relations[targetId] != null) {
        var rr = state.diplomacy.relations[targetId];
        if (typeof rr === 'number') state.diplomacy.relations[targetId] = Math.max(5, rr - 15);
      }
    } else {
      war.enemyPower = Math.max(15, war.enemyPower - 2 - Math.random() * 3);
      war.casualties = (war.casualties || 0) + Math.round(30 + Math.random() * 120);
      resultMsg = atk.name + ' موفق.';
    }
  } else {
    war.casualties = (war.casualties || 0) + Math.round(50 + Math.random() * 150);
    state.population.satisfaction = Math.max(5, (state.population.satisfaction || 50) - 1.5);
    resultMsg = atk.name + ' ناموفق.';
    if (attackType === 'assassination' && state.diplomacy && state.diplomacy.relations && state.diplomacy.relations[targetId] != null) {
      var r2 = state.diplomacy.relations[targetId];
      if (typeof r2 === 'number') state.diplomacy.relations[targetId] = Math.max(5, r2 - 20);
      resultMsg = 'ترور شکست خورد — تنش دیپلماتیک.';
    }
  }
  war.operations = war.operations || [];
  war.operations.push({ type: attackType, success: success, cost: cost, chance: Math.round(chance), year: state.time.year, month: state.time.month, missileUsed: attackType === 'missile' ? missileCount : 0 });
  if (typeof pushNotification === 'function') {
    pushNotification(state, { severity: success ? 'info' : 'warning', category: 'war', title: atk.icon + ' ' + atk.name + ' — ' + (success ? 'موفق' : 'ناموفق'), body: resultMsg, line2: 'هزینه: ' + cost });
  }
  return { success: true, operationSuccess: success, message: resultMsg, cost: cost, chance: Math.round(chance), equipLeft: Object.assign({}, equip) };
}

function updateWars(state) {
  if (!state.wars || !state.wars.length) return state;
  state.wars.forEach(function(w) {
    if (w.status === 'peace' || w.status === 'ceasefire') return;
    w.durationMonths = (w.durationMonths || 0) + 1;
    var monthlyCost = 2.5 + Math.random() * 3.5 + (w.status === 'escalation' ? 3 : 0);
    state.economy.budget -= monthlyCost;
    w.costAccumulated = (w.costAccumulated || 0) + monthlyCost;
    state.economy.gdpGrowth = Math.max(-5, (state.economy.gdpGrowth || 1) - 0.12);
    state.economy.inflation = Math.min(30, (state.economy.inflation || 3) + 0.06);
    state.population.satisfaction = Math.max(5, (state.population.satisfaction || 50) - 0.35);
    w.casualties = (w.casualties || 0) + Math.round(40 + Math.random() * 160);
    if (w.status === 'conflict' && w.durationMonths > 2) w.status = 'war';
    if (w.status === 'war' && w.durationMonths > 6 && Math.random() < 0.28) w.status = 'escalation';
    if (w.status === 'escalation' && Math.random() < 0.18) w.status = 'negotiation';
    if (w.durationMonths > 8 && Math.random() < 0.1) {
      var roll = Math.random() * 100;
      if (roll < w.winChance) endWar(state, w.id, 'victory');
      else if (roll > 92) endWar(state, w.id, 'defeat');
    }
  });
  if (typeof enforceMilitaryLimits === 'function') enforceMilitaryLimits(state);
  return state;
}

function proposeCeasefire(state, warId) {
  var w = state.wars.find(function(x) { return x.id === warId; });
  if (!w) return { success: false, message: 'جنگ یافت نشد' };
  w.status = 'ceasefire';
  if (typeof pushNotification === 'function') pushNotification(state, { severity: 'info', category: 'war', title: 'آتش‌بس', body: 'آتش‌بس با ' + w.opponentName });
  return { success: true };
}

function endWar(state, warId, result) {
  result = result || 'peace';
  var idx = state.wars.findIndex(function(x) { return x.id === warId; });
  if (idx < 0) return;
  var w = state.wars[idx];
  if (w._resolved) return; // prevent double resolve
  w._resolved = true;
  w.status = 'peace'; w.result = result;
  state.warHistory = state.warHistory || [];
  state.warHistory.push(Object.assign({}, w, { endYear: state.time.year }));
  if (result === 'victory') {
    state.population.satisfaction = Math.min(95, (state.population.satisfaction || 50) + 5);
    state.president.xp = (state.president.xp || 0) + 35;
    if (typeof applyConquest === 'function') {
      applyConquest(state, w.opponent, w);
    }
  } else if (result === 'defeat') {
    state.population.satisfaction = Math.max(10, (state.population.satisfaction || 50) - 10);
    state.economy.gdpGrowth -= 0.8;
    if (typeof damageUpgrade === 'function') { damageUpgrade(state, 'militaryPower', 2); damageUpgrade(state, 'defense', 1); }
  }
  state.wars.splice(idx, 1);
  if (typeof pushNotification === 'function') {
    pushNotification(state, { severity: result === 'victory' ? 'success' : 'warning', category: 'war', title: result === 'victory' ? 'پیروزی و الحاق' : 'پایان جنگ', body: 'جنگ با ' + w.opponentName + ' پایان یافت.' + (result === 'victory' ? ' قلمرو ضمیمه شد.' : '') });
  }
}

/** Transfer defeated country into player territories + loot (once). */
function applyConquest(state, opponentId, war) {
  if (!opponentId) return;
  state.territories = state.territories || [];
  if (state.territories.some(function(t) { return t.id === opponentId; })) return; // already owned

  var c = (typeof PLAYABLE_COUNTRIES !== 'undefined' ? PLAYABLE_COUNTRIES : []).find(function(x) { return x.id === opponentId; });
  if (!c) return;

  // Annex
  state.territories.push({
    id: opponentId,
    name: c.name,
    flag: c.flag,
    annexedYear: state.time.year,
    annexedMonth: state.time.month,
    population: c.population,
    baseGDP: c.baseGDP
  });

  // Population / GDP gains (partial — occupation efficiency)
  var popGain = Math.round((c.population || 0) * 0.35);
  var gdpGain = Math.round((c.baseGDP || 0) * 0.25 * 10) / 10;
  state.country.population = (state.country.population || 0) + popGain;
  state.economy.gdp = Math.round((state.economy.gdp + gdpGain) * 10) / 10;

  // Resource loot
  if (c.resources && state.resources) {
    Object.keys(c.resources).forEach(function(k) {
      state.resources[k] = Math.min(100, (state.resources[k] || 0) + Math.round((c.resources[k] || 0) * 0.2));
    });
  }

  // War reparations
  var reparations = Math.round((c.baseBudget || 10) * 1.5 * 10) / 10;
  state.economy.budget = Math.round((state.economy.budget + reparations) * 10) / 10;

  // Military equipment salvage
  if (state.military && state.military.equipment) {
    state.military.equipment.tanks = (state.military.equipment.tanks || 0) + Math.round(2 + Math.random() * 5);
    state.military.equipment.missiles = (state.military.equipment.missiles || 0) + Math.round(1 + Math.random() * 3);
  }

  // Clear relations / agreements / alliances involving opponent
  if (state.diplomacy) {
    if (state.diplomacy.relations) delete state.diplomacy.relations[opponentId];
    state.diplomacy.agreements = (state.diplomacy.agreements || []).filter(function(a) {
      return a.target !== opponentId && a.targetId !== opponentId;
    });
    state.diplomacy.sanctions = (state.diplomacy.sanctions || []).filter(function(s) {
      return s.from !== opponentId && s.to !== opponentId;
    });
  }
  if (state.alliances) {
    ['military', 'economic'].forEach(function(k) {
      (state.alliances[k] || []).forEach(function(a) {
        if (a.members) a.members = a.members.filter(function(m) { return m !== opponentId; });
      });
    });
  }

  // World ownership map for map coloring
  state.worldOwnership = state.worldOwnership || {};
  state.worldOwnership[opponentId] = state.country.id;

  if (typeof logAction === 'function') {
    logAction(state, 'الحاق ' + c.name + ' — غرامت ' + reparations + '، GDP +' + gdpGain);
  }
}

function getCountryLeaders(countryId) {
  var c = typeof PLAYABLE_COUNTRIES !== 'undefined' ? PLAYABLE_COUNTRIES.find(function(x) { return x.id === countryId; }) : null;
  if (!c) return [];
  return [
    { id: 'president', position: 'رئیس کشور', name: 'رهبر ' + c.name, importance: 95, security: 70 + (c.intelLevel || 40) * 0.25, impact: 'diplomatic' },
    { id: 'defense_minister', position: 'وزیر دفاع', name: 'وزیر دفاع ' + c.name, importance: 75, security: 55 + (c.militaryPower || 40) * 0.2, impact: 'military' },
    { id: 'chief_staff', position: 'رئیس ستاد', name: 'فرمانده کل ' + c.name, importance: 80, security: 60 + (c.militaryPower || 40) * 0.25, impact: 'military' },
    { id: 'intel_chief', position: 'رئیس اطلاعات', name: 'رئیس اطلاعات ' + c.name, importance: 70, security: 75 + (c.intelLevel || 40) * 0.2, impact: 'intelligence' }
  ];
}

window.ATTACK_TYPES = ATTACK_TYPES;
window.startWar = startWar;
window.executeMilitaryAction = executeMilitaryAction;
window.updateWars = updateWars;
window.proposeCeasefire = proposeCeasefire;
window.endWar = endWar;
window.applyConquest = applyConquest;
window.getCountryLeaders = getCountryLeaders;
window.ensureEquipment = ensureEquipment;
window.getWarDifficultyMods = getWarDifficultyMods;
window.resolveCombat = resolveCombat;
