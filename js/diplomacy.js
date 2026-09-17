// diplomacy.js - Diplomacy, Agreements, Sanctions (v2.1 multi-dim support)

function processDiplomacyTick(state) {
  const m = getDifficultyMultipliers();
  const isMulti = state.diplomacy.relationsMode === 'multi';

  Object.keys(state.diplomacy.relations).forEach(cid => {
    const country = getCountryById(cid);
    if (!country) return;

    if (!isMulti) {
      let rel = state.diplomacy.relations[cid];
      if (rel > 55) rel -= 0.08;
      if (rel < 40) rel += 0.06;
      if (country.militaryPower > (state.military.attackPower || 40) + 15) {
        rel -= 0.05 * m.aiAggressiveness;
      }
      state.diplomacy.relations[cid] = Math.round(Math.max(5, Math.min(95, rel)) * 10) / 10;
    } else {
      const r = state.diplomacy.relations[cid];
      // Mild drift
      if (r.political > 60) r.political -= 0.06;
      if (r.political < 35) r.political += 0.05;
      if (r.trust > 60) r.trust -= 0.04;
      if (r.threatLevel > 50 && m.aiAggressiveness > 1) {
        r.threatLevel = Math.min(90, r.threatLevel + 0.03 * m.aiAggressiveness);
        r.political = Math.max(5, r.political - 0.04);
      }
      r.overall = Math.round(r.political * 0.3 + r.economic * 0.25 + r.military * 0.15 + r.trust * 0.2 + r.strategicInterest * 0.1);
    }
  });

  state.diplomacy.sanctions = state.diplomacy.sanctions.filter(s => {
    const age = state.time.totalDays - (s.startDay || 0);
    if (age > 540) return false;
    return true;
  });

  return state;
}

function improveRelations(state, targetId, amount = 5) {
  const cost = Math.round(4 + amount * 0.8);
  if (state.economy.budget < cost) {
    return { success: false, message: 'بودجه دیپلماسی کافی نیست' };
  }
  if (!state.diplomacy.relations[targetId]) {
    return { success: false, message: 'کشور هدف یافت نشد' };
  }

  state.economy.budget -= cost;
  modifyRelation(state, targetId, {
    political: amount,
    trust: amount * 0.6,
    overall: amount
  });
  logAction(state, `روابط با ${getCountryName(targetId)} بهبود یافت (+${amount})`);
  if (typeof addNews === 'function') {
    addNews(state, {
      type: 'global',
      category: 'diplomacy',
      icon: '🤝',
      title: `بهبود روابط با ${getCountryName(targetId)}`,
      summary: `تلاش‌های دیپلماتیک منجر به بهبود روابط شد.`,
      countries: [targetId]
    });
  }
  return { success: true, state };
}

function proposeAgreement(state, targetId, agreementType) {
  const costMap = {
    trade: 8,
    economic: 12,
    energy: 10,
    defense: 15,
    military: 18
  };
  const cost = costMap[agreementType] || 10;
  const requiredRelation = agreementType === 'military' || agreementType === 'defense' ? 55 : 40;
  const currentRel = getRelationValue(state.diplomacy.relations[targetId]);

  if (state.economy.budget < cost) {
    return { success: false, message: 'بودجه مذاکره کافی نیست' };
  }
  if (currentRel < requiredRelation) {
    return { success: false, message: 'سطح روابط برای این توافق کافی نیست' };
  }

  const exists = state.diplomacy.agreements.find(a => a.targetId === targetId && a.type === agreementType);
  if (exists) {
    return { success: false, message: 'این توافق قبلاً وجود دارد' };
  }

  state.economy.budget -= cost;

  const m = getDifficultyMultipliers();
  let chance = 0.35 + (currentRel / 100) * 0.5;
  chance -= (m.aiAggressiveness - 1) * 0.1;
  if (typeof getSkillBonus === 'function') chance += getSkillBonus('diplomacy') * 12;
  chance = Math.max(0.2, Math.min(0.9, chance));

  if (Math.random() < chance) {
    state.diplomacy.agreements.push({
      id: 'agr_' + Date.now(),
      targetId,
      targetName: getCountryName(targetId),
      type: agreementType,
      startDay: state.time.totalDays,
      benefits: getAgreementBenefits(agreementType)
    });

    const relChanges = {
      political: 4,
      trust: 5,
      overall: 6
    };
    if (agreementType === 'trade' || agreementType === 'economic' || agreementType === 'energy') {
      relChanges.economic = 8;
      relChanges.strategicInterest = 4;
    }
    if (agreementType === 'defense' || agreementType === 'military') {
      relChanges.military = 10;
      relChanges.trust = 8;
      relChanges.threatLevel = -6;
    }
    modifyRelation(state, targetId, relChanges);
    applyAgreementEffects(state, agreementType, 1);
    logAction(state, `توافق ${agreementType} با ${getCountryName(targetId)} امضا شد`);
    state.alerts.push({ type: 'success', text: `توافق ${getAgreementName(agreementType)} با ${getCountryName(targetId)} نهایی شد.` });

    if (typeof addNews === 'function') {
      addNews(state, {
        type: 'global',
        category: 'diplomacy',
        icon: '📜',
        title: `توافق ${getAgreementName(agreementType)} با ${getCountryName(targetId)}`,
        summary: `توافق جدید باعث گسترش همکاری شد.`,
        countries: [targetId],
        important: true
      });
    }
    return { success: true, agreed: true, state };
  } else {
    modifyRelation(state, targetId, { political: -3, trust: -2, overall: -3 });
    logAction(state, `پیشنهاد توافق ${agreementType} با ${getCountryName(targetId)} رد شد`);
    if (typeof addNews === 'function') {
      addNews(state, {
        type: 'global',
        category: 'diplomacy',
        icon: '❌',
        title: `پیشنهاد توافق با ${getCountryName(targetId)} رد شد`,
        summary: `مذاکرات به نتیجه نرسید و روابط اندکی تضعیف شد.`,
        countries: [targetId]
      });
    }
    return { success: true, agreed: false, state };
  }
}

function getAgreementBenefits(type) {
  switch (type) {
    case 'trade': return { exports: 3, imports: -1, growth: 0.3 };
    case 'economic': return { foreignInvestment: 4, growth: 0.4 };
    case 'energy': return { resources: 5, inflation: -0.3 };
    case 'defense': return { readiness: 3, defensePower: 4 };
    case 'military': return { attackPower: 3, readiness: 2 };
    default: return {};
  }
}

function getAgreementName(type) {
  const names = {
    trade: 'تجاری',
    economic: 'اقتصادی',
    energy: 'انرژی',
    defense: 'دفاعی',
    military: 'نظامی'
  };
  return names[type] || type;
}

function applyAgreementEffects(state, type, direction = 1) {
  const benefits = getAgreementBenefits(type);
  if (benefits.exports) state.economy.exports += benefits.exports * direction;
  if (benefits.foreignInvestment) state.economy.foreignInvestment += benefits.foreignInvestment * direction;
  if (benefits.growth) state.economy.gdpGrowth += benefits.growth * direction;
  if (benefits.resources) state.economy.naturalResources += benefits.resources * direction;
  if (benefits.inflation) state.economy.inflation += benefits.inflation * direction;
  if (benefits.readiness) state.military.readiness = Math.min(95, state.military.readiness + benefits.readiness * direction);
  if (benefits.defensePower) state.military.defensePower += benefits.defensePower * direction;
  if (benefits.attackPower) state.military.attackPower += benefits.attackPower * direction;
}

function liftSanction(state, fromId) {
  const idx = state.diplomacy.sanctions.findIndex(s => s.from === fromId);
  if (idx === -1) return { success: false, message: 'تحریم یافت نشد' };

  const cost = 20;
  if (state.economy.budget < cost) {
    return { success: false, message: 'هزینه مذاکره برای رفع تحریم بالا است' };
  }
  const relVal = getRelationValue(state.diplomacy.relations[fromId]);
  if (relVal < 35) {
    return { success: false, message: 'روابط برای مذاکره رفع تحریم کافی نیست' };
  }

  state.economy.budget -= cost;
  const removed = state.diplomacy.sanctions.splice(idx, 1)[0];
  modifyRelation(state, fromId, { political: 8, economic: 6, trust: 5, overall: 8 });
  logAction(state, `تحریم از سوی ${removed.fromName || fromId} رفع شد`);
  state.alerts.push({ type: 'success', text: `تحریم ${removed.fromName} لغو شد.` });
  if (typeof addNews === 'function') {
    addNews(state, {
      type: 'global',
      category: 'diplomacy',
      icon: '✅',
      title: `رفع تحریم از سوی ${removed.fromName || getCountryName(fromId)}`,
      summary: 'مذاکرات منجر به لغو تحریم شد.',
      countries: [fromId],
      important: true
    });
  }
  return { success: true, state };
}

function imposeSanction(state, targetId, severity = 1) {
  if (state.diplomacy.sanctions.some(s => s.from === 'player' && s.target === targetId)) {
    return { success: false, message: 'قبلاً تحریم اعمال شده' };
  }
  modifyRelation(state, targetId, {
    political: -12,
    economic: -15,
    trust: -10,
    threatLevel: 8,
    overall: -12
  });
  logAction(state, `تحریم علیه ${getCountryName(targetId)} اعلام شد`);
  if (typeof addNews === 'function') {
    addNews(state, {
      type: 'global',
      category: 'diplomacy',
      icon: '🚫',
      title: `اعلام تحریم علیه ${getCountryName(targetId)}`,
      summary: 'اقدام تحریمی روابط اقتصادی و سیاسی را تحت تأثیر قرار داد.',
      countries: [targetId],
      important: true
    });
  }
  return { success: true, state };
}

function getRelationStatus(value) {
  if (value >= 75) return { text: 'عالی', class: 'rel-excellent' };
  if (value >= 55) return { text: 'خوب', class: 'rel-good' };
  if (value >= 40) return { text: 'خنثی', class: 'rel-neutral' };
  if (value >= 25) return { text: 'تنش', class: 'rel-tense' };
  return { text: 'خصمانه', class: 'rel-hostile' };
}
