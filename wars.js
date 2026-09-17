// wars.js - War Engine V3.0.1
// Cycle: Tension → Conflict → War → Escalation → Negotiation/Ceasefire → Peace

function startWar(state, targetId, reason = 'تنش‌های مرزی') {
  if (!state.wars) state.wars = [];
  if (state.wars.some(w => w.opponent === targetId && w.status !== 'peace')) {
    return { success: false, message: 'جنگ فعال با این کشور وجود دارد' };
  }
  const target = (typeof PLAYABLE_COUNTRIES !== 'undefined' ? PLAYABLE_COUNTRIES.find(c => c.id === targetId) : null);
  if (!target) return { success: false, message: 'کشور نامعتبر' };

  const playerPower = (state.military?.attackPower || 40) + (state.military?.defensePower || 40) / 2;
  const enemyPower = (target.militaryPower || 50) + Math.random() * 20;

  const war = {
    id: 'war_' + targetId + '_' + Date.now(),
    opponent: targetId,
    opponentName: target.name,
    opponentFlag: target.flag,
    status: 'conflict', // tension | conflict | war | escalation | negotiation | ceasefire | peace
    startYear: state.time.year,
    startMonth: state.time.month,
    durationMonths: 0,
    playerPower: Math.round(playerPower),
    enemyPower: Math.round(enemyPower),
    casualties: 0,
    costAccumulated: 0,
    goals: ['دفاع از منافع ملی'],
    winChance: Math.max(15, Math.min(85, 50 + (playerPower - enemyPower) * 0.4)),
    reason
  };
  state.wars.push(war);

  // Immediate effects
  state.economy.budget -= 8;
  state.population.satisfaction = Math.max(10, (state.population.satisfaction || 50) - 4);
  if (state.diplomacy?.relations?.[targetId]) {
    if (typeof state.diplomacy.relations[targetId] === 'number') {
      state.diplomacy.relations[targetId] = Math.max(5, state.diplomacy.relations[targetId] - 25);
    } else if (state.diplomacy.relations[targetId].overall) {
      state.diplomacy.relations[targetId].overall = Math.max(5, state.diplomacy.relations[targetId].overall - 25);
    }
  }

  if (typeof addNews === 'function') {
    addNews(state, {
      type: 'military',
      category: 'war',
      icon: '⚔️',
      title: 'WAR BREAKING NEWS — آغاز درگیری نظامی',
      summary: `نیروهای ${state.country.name} و ${target.name} پس از افزایش تنش‌های سیاسی وارد درگیری مستقیم شدند.`,
      line2: 'ادامه درگیری می‌تواند تجارت منطقه‌ای، هزینه‌های نظامی و روابط دیپلماتیک کشورهای مرتبط را تحت تأثیر قرار دهد.',
      important: true
    });
  }
  return { success: true, war };
}

function updateWars(state) {
  if (!state.wars || !state.wars.length) return state;
  state.wars.forEach(w => {
    if (w.status === 'peace' || w.status === 'ceasefire') return;
    w.durationMonths = (w.durationMonths || 0) + 1;
    // Monthly cost & impact
    const monthlyCost = 3 + Math.random() * 4 + (w.status === 'escalation' ? 4 : 0);
    state.economy.budget -= monthlyCost;
    w.costAccumulated = (w.costAccumulated || 0) + monthlyCost;
    state.economy.gdpGrowth = Math.max(-5, (state.economy.gdpGrowth || 1) - 0.15);
    state.economy.inflation = Math.min(30, (state.economy.inflation || 3) + 0.08);
    state.population.satisfaction = Math.max(5, (state.population.satisfaction || 50) - 0.4);
    w.casualties = (w.casualties || 0) + Math.round(50 + Math.random() * 200);

    // Progress status
    if (w.status === 'conflict' && w.durationMonths > 2) w.status = 'war';
    if (w.status === 'war' && w.durationMonths > 6 && Math.random() < 0.3) w.status = 'escalation';
    if (w.status === 'escalation' && Math.random() < 0.2) w.status = 'negotiation';

    // Random outcome chance
    if (w.durationMonths > 8 && Math.random() < 0.12) {
      const roll = Math.random() * 100;
      if (roll < w.winChance) {
        endWar(state, w.id, 'victory');
      } else if (roll > 90) {
        endWar(state, w.id, 'defeat');
      }
    }
  });
  return state;
}

function proposeCeasefire(state, warId) {
  const w = state.wars.find(x => x.id === warId);
  if (!w) return { success: false, message: 'جنگ یافت نشد' };
  w.status = 'ceasefire';
  if (typeof addNews === 'function') {
    addNews(state, {
      type: 'military',
      category: 'war',
      icon: '🕊️',
      title: 'آتش‌بس موقت اعلام شد',
      summary: `طرفین درگیری در ${w.opponentName} با آتش‌بس موافقت کردند.`,
      line2: 'مذاکرات برای صلح پایدار ادامه دارد. هزینه جنگ تاکنون تأثیر قابل توجهی بر بودجه گذاشته است.',
      important: true
    });
  }
  return { success: true };
}

function endWar(state, warId, result = 'peace') {
  const idx = state.wars.findIndex(x => x.id === warId);
  if (idx < 0) return;
  const w = state.wars[idx];
  w.status = result === 'victory' ? 'peace' : result === 'defeat' ? 'peace' : 'peace';
  w.result = result;
  state.warHistory = state.warHistory || [];
  state.warHistory.push({ ...w, endYear: state.time.year });

  if (result === 'victory') {
    state.population.satisfaction = Math.min(95, (state.population.satisfaction || 50) + 6);
    state.president.xp = (state.president.xp || 0) + 40;
  } else if (result === 'defeat') {
    state.population.satisfaction = Math.max(10, (state.population.satisfaction || 50) - 12);
    state.economy.gdpGrowth -= 1;
  }

  state.wars.splice(idx, 1);
  if (typeof addNews === 'function') {
    addNews(state, {
      type: 'military',
      category: 'war',
      icon: result === 'victory' ? '🏆' : '🏳️',
      title: result === 'victory' ? 'پیروزی در جنگ' : 'پایان جنگ',
      summary: `جنگ با ${w.opponentName} به پایان رسید. نتیجه: ${result === 'victory' ? 'پیروزی' : result === 'defeat' ? 'شکست' : 'صلح'}`,
      line2: `تلفات تقریبی: ${w.casualties} — هزینه تجمعی: ${Math.round(w.costAccumulated)}`,
      important: true
    });
  }
}

window.startWar = startWar;
window.updateWars = updateWars;
window.proposeCeasefire = proposeCeasefire;
window.endWar = endWar;
