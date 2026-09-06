// economy.js - Dynamic Economic Engine with causal relationships

function getDifficultyMultipliers() {
  const diffId = getState()?.meta?.difficulty || 'medium';
  return DIFFICULTY[diffId]?.multipliers || DIFFICULTY.medium.multipliers;
}

function calculateRevenue(state) {
  const m = getDifficultyMultipliers();
  const e = state.economy;
  const taxBase = e.gdp * (e.taxRate / 100) * 0.28 * m.taxEfficiency;
  const resourceRevenue = (state.resources.oil * 0.12 + state.resources.gas * 0.08 +
    state.resources.minerals * 0.05 + state.resources.agriculture * 0.03 +
    state.resources.rare_earth * 0.18) * (e.currencyStrength / 100);
  const investmentRevenue = e.foreignInvestment * 0.04;
  const tradeRevenue = Math.max(0, e.exports - e.imports) * 0.15;
  const loanIncome = getLoanInterestIncome(state);

  return Math.round((taxBase + resourceRevenue + investmentRevenue + tradeRevenue + loanIncome) * 10) / 10;
}

function calculateSpending(state) {
  const mil = state.military.budgetAmount;
  const intel = state.intelligence.budget;
  const research = state.tech.researchBudget;
  const infra = state.economy.infrastructure * 0.08;
  const social = state.population.satisfaction < 40 ? 18 : 12;
  const debtInterest = state.economy.nationalDebt * 0.035;
  const baseAdmin = 22;
  // Monthly loan installment payments (taken loans)
  let loanPayments = 0;
  if (state.economy.loansTaken && state.economy.loansTaken.length) {
    loanPayments = state.economy.loansTaken
      .filter(l => l.status === 'active')
      .reduce((sum, l) => sum + (l.monthlyPayment || 0), 0);
  }
  return Math.round((mil + intel + research + infra + social + debtInterest + baseAdmin + loanPayments) * 10) / 10;
}

function getLoanInterestIncome(state) {
  if (!state.economy.loansGiven || !state.economy.loansGiven.length) return 0;
  return state.economy.loansGiven
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + (l.monthlyPayment || 0) * 0.35, 0); // portion as interest income
}

function processEconomyTick(state) {
  const m = getDifficultyMultipliers();
  const e = { ...state.economy };
  const pop = { ...state.population };

  // 1. Revenue & Spending
  e.revenue = calculateRevenue(state);
  e.spending = calculateSpending(state);
  e.deficit = Math.round((e.spending - e.revenue) * 10) / 10;
  e.budget = Math.round((e.budget - e.deficit) * 10) / 10;

  // 2. Debt
  if (e.deficit > 0) {
    e.nationalDebt = Math.round((e.nationalDebt + e.deficit * 0.85) * 10) / 10;
  } else {
    e.nationalDebt = Math.max(0, Math.round((e.nationalDebt + e.deficit * 0.4) * 10) / 10);
  }

  // 3. GDP Growth calculation (causal)
  let growth = 1.2 * m.growthPotential;

  // President economy skill bonus
  if (typeof getSkillBonus === 'function') {
    growth += getSkillBonus('economy') * 8;
    growth += getSkillBonus('management') * 3;
  }

  // Positive factors
  growth += (e.industrialProduction - 50) * 0.025;
  growth += (e.foreignInvestment - 15) * 0.02;
  growth += (e.infrastructure - 45) * 0.015;
  growth += (state.tech.level - 40) * 0.02;
  growth += Math.max(-1.5, Math.min(2, e.tradeBalance * 0.08));
  growth += (e.naturalResources - 50) * 0.01;

  // Negative factors
  growth -= Math.max(0, e.inflation - 3) * 0.35 * m.inflationRate;
  growth -= Math.max(0, e.unemployment - 6) * 0.28;
  growth -= Math.max(0, e.nationalDebt - 200) * 0.008;
  if (e.budget < 0) growth -= 0.6;
  if (state.diplomacy.sanctions.length > 0) {
    const sanctionImpact = state.diplomacy.sanctions.reduce((sum, s) => sum + (s.severity || 1), 0);
    growth -= sanctionImpact * 0.7 * m.sanctionImpact;
  }

  // Tax rate effect: high tax reduces investment & growth
  if (e.taxRate > 28) growth -= (e.taxRate - 28) * 0.06;
  if (e.taxRate < 15) growth += 0.3;

  // Stability & satisfaction feedback
  growth += (pop.satisfaction - 50) * 0.015;
  growth += (e.stability - 50) * 0.012;

  e.gdpGrowth = Math.round(Math.max(-4.5, Math.min(8.5, growth)) * 100) / 100;

  // Apply GDP change (monthly approximation: growth/12)
  const monthlyGrowthFactor = 1 + (e.gdpGrowth / 100) / 12;
  e.gdp = Math.round(e.gdp * monthlyGrowthFactor * 10) / 10;

  // 4. Inflation
  let inflation = 2.0 * m.inflationRate;
  inflation += Math.max(0, e.deficit) * 0.04;
  inflation += Math.max(0, e.gdpGrowth - 3) * 0.15; // overheating
  if (e.budget < -20) inflation += 0.8;
  inflation -= Math.max(0, e.unemployment - 8) * 0.08; // slack
  inflation += (100 - e.currencyStrength) * 0.03;
  if (state.diplomacy.sanctions.length > 0) inflation += 0.6 * m.sanctionImpact;

  // Money printing simulation (if big deficit)
  if (e.deficit > 15) inflation += (e.deficit - 15) * 0.07 * m.inflationRate;

  e.inflation = Math.round(Math.max(0.2, Math.min(25, inflation)) * 10) / 10;

  // 5. Unemployment
  let unemp = 5.5 * m.unemploymentBase;
  unemp -= e.gdpGrowth * 0.35;
  unemp += Math.max(0, e.inflation - 5) * 0.15;
  unemp -= (e.industrialProduction - 50) * 0.04;
  unemp -= (e.infrastructure - 45) * 0.03;
  if (e.taxRate > 30) unemp += 0.5;
  if (state.diplomacy.sanctions.length > 0) unemp += 0.8 * m.sanctionImpact;

  e.unemployment = Math.round(Math.max(2.5, Math.min(28, unemp)) * 10) / 10;

  // 6. Currency Strength
  let currency = e.currencyStrength;
  currency += e.tradeBalance * 0.15;
  currency += e.gdpGrowth * 0.4;
  currency -= e.inflation * 0.6;
  currency -= Math.max(0, e.nationalDebt - 250) * 0.02;
  if (state.diplomacy.sanctions.length > 0) currency -= 3 * m.sanctionImpact;
  e.currencyStrength = Math.round(Math.max(40, Math.min(160, currency)));

  // 7. Trade
  let exports = e.exports;
  exports += e.gdpGrowth * 0.2;
  exports += (e.industrialProduction - 50) * 0.08;
  exports -= Math.max(0, e.inflation - 4) * 0.3;
  if (state.diplomacy.sanctions.length > 0) {
    exports -= 4 * m.sanctionImpact * state.diplomacy.sanctions.length;
  }
  e.exports = Math.round(Math.max(20, exports) * 10) / 10;

  let imports = e.imports;
  imports += e.gdp * 0.002;
  imports -= (e.industrialProduction - 50) * 0.05;
  if (e.taxRate < 18) imports += 1.2;
  e.imports = Math.round(Math.max(25, imports) * 10) / 10;

  e.tradeBalance = Math.round((e.exports - e.imports) * 10) / 10;

  // 8. Production & Resources
  e.industrialProduction = Math.round(Math.max(20, Math.min(95,
    e.industrialProduction + e.gdpGrowth * 0.4 + (state.tech.level - 40) * 0.08 - e.unemployment * 0.15
  )));

  // Resource depletion/gain mild
  const resKeys = ['oil', 'gas', 'minerals', 'agriculture', 'rare_earth'];
  resKeys.forEach(k => {
    if (state.resources[k] > 5) {
      state.resources[k] = Math.max(5, state.resources[k] - 0.08 + (Math.random() * 0.2 - 0.05));
    }
  });
  e.naturalResources = Math.round(
    (state.resources.oil + state.resources.gas + state.resources.minerals +
     state.resources.agriculture + state.resources.rare_earth) / 5
  );

  // 9. Public Satisfaction (strong causal links)
  let sat = pop.satisfaction;
  sat += e.gdpGrowth * 0.6 * m.satisfactionGain;
  sat -= Math.max(0, e.inflation - 3.5) * 0.7;
  sat -= Math.max(0, e.unemployment - 7) * 0.55;
  sat -= Math.max(0, e.taxRate - 25) * 0.25;
  sat += (e.infrastructure - 45) * 0.08;
  sat += (state.military.readiness > 60 ? 0.3 : -0.4);
  if (e.budget < -10) sat -= 1.2;
  if (state.diplomacy.sanctions.length > 0) sat -= 1.5 * m.sanctionImpact;
  // Stability feedback
  e.stability = Math.round(Math.max(15, Math.min(95,
    e.stability + (sat - 50) * 0.08 + e.gdpGrowth * 0.3 - Math.max(0, e.unemployment - 10) * 0.4
  )));

  pop.satisfaction = Math.round(Math.max(5, Math.min(98, sat)) * 10) / 10;
  pop.happiness = Math.round((pop.satisfaction * 0.7 + (100 - e.unemployment * 2) * 0.3));
  pop.povertyRate = Math.round(Math.max(3, Math.min(40, 8 + e.unemployment * 0.7 - e.gdpGrowth * 0.5)));

  // 10. Population growth mild monthly
  const monthlyPopGrowth = (state.country.populationGrowth / 100) / 12;
  state.country.population = Math.round(state.country.population * (1 + monthlyPopGrowth));

  // Foreign investment dynamics
  let fi = e.foreignInvestment;
  fi += e.gdpGrowth * 0.5;
  fi += (e.stability - 50) * 0.15;
  fi -= Math.max(0, e.taxRate - 26) * 0.4;
  if (state.diplomacy.sanctions.length > 0) fi -= 3 * m.sanctionImpact;
  e.foreignInvestment = Math.round(Math.max(2, Math.min(80, fi)) * 10) / 10;

  state.economy = e;
  state.population = pop;

  // Process active loans (payments, defaults, credit rating)
  processLoansTick(state);

  // History for charts (keep last 24 months)
  if (!state.history) state.history = { gdp: [], satisfaction: [], debt: [], events: [] };
  state.history.gdp.push(e.gdp);
  state.history.satisfaction.push(pop.satisfaction);
  state.history.debt.push(e.nationalDebt);
  if (state.history.gdp.length > 24) {
    state.history.gdp.shift();
    state.history.satisfaction.shift();
    state.history.debt.shift();
  }

  return state;
}

// Player actions affecting economy
function changeTaxRate(state, newRate) {
  newRate = typeof clampValue === 'function' ? clampValue('taxRate', newRate) : Math.max(8, Math.min(45, newRate));
  const old = state.economy.taxRate;
  state.economy.taxRate = newRate;
  const delta = newRate - old;
  state.population.satisfaction = typeof clampValue === 'function'
    ? clampValue('satisfaction', state.population.satisfaction - delta * 0.4)
    : Math.max(5, Math.min(98, state.population.satisfaction - delta * 0.4));
  logAction(state, `نرخ مالیات به ${newRate}% تغییر کرد`);
  return state;
}

function investInfrastructure(state, amount) {
  const m = getDifficultyMultipliers();
  if (typeof isAtMax === 'function' && isAtMax('infrastructure', state.economy.infrastructure)) {
    return { success: false, message: 'زیرساخت به حداکثر سطح رسیده است' };
  }
  const cost = Math.round(amount * m.infrastructureCost);
  if (state.economy.budget < cost) {
    return { success: false, message: 'بودجه کافی نیست' };
  }
  state.economy.budget -= cost;
  state.economy.spending += cost;
  const duration = Math.max(2, Math.round(4 / m.infrastructureSpeed));
  const maxInfra = (typeof LIMITS !== 'undefined' && LIMITS.infrastructure) ? LIMITS.infrastructure.max : 100;
  const gainInfra = Math.min(Math.round(amount * 0.35), maxInfra - state.economy.infrastructure);
  const gainProd = Math.round(amount * 0.12);
  state.projects.push({
    id: 'infra_' + Date.now(),
    type: 'infrastructure',
    name: 'توسعه زیرساخت',
    remaining: duration,
    total: duration,
    effect: { infrastructure: gainInfra, production: gainProd }
  });
  logAction(state, `سرمایه‌گذاری ${cost} واحد در زیرساخت آغاز شد`);
  return { success: true, state };
}

function adjustMilitaryBudget(state, newAmount) {
  const m = getDifficultyMultipliers();
  newAmount = typeof clampValue === 'function' ? clampValue('milBudgetAmount', newAmount) : Math.max(3, Math.min(45, newAmount));
  state.military.budgetAmount = Math.round(newAmount * m.militaryCost * 10) / 10;
  logAction(state, `بودجه نظامی به ${state.military.budgetAmount} تنظیم شد`);
  return state;
}

function logAction(state, text) {
  if (!state.actionsLog) state.actionsLog = [];
  state.actionsLog.unshift({
    time: `${state.time.year}/${state.time.month}/${state.time.day}`,
    text
  });
  if (state.actionsLog.length > 50) state.actionsLog.pop();
}

// ========== LOAN / DEBT SYSTEM (v2.2) ==========

function getCreditRatingLabel(score) {
  if (score >= 85) return { label: 'AAA', class: 'rating-aaa' };
  if (score >= 75) return { label: 'AA', class: 'rating-aa' };
  if (score >= 65) return { label: 'A', class: 'rating-a' };
  if (score >= 55) return { label: 'BBB', class: 'rating-bbb' };
  if (score >= 45) return { label: 'BB', class: 'rating-bb' };
  if (score >= 35) return { label: 'B', class: 'rating-b' };
  return { label: 'CCC', class: 'rating-ccc' };
}

function updateCreditRating(state) {
  const e = state.economy;
  const ratio = e.gdp > 0 ? (e.nationalDebt / e.gdp) * 100 : 80;
  let score = 78;
  if (ratio > 150) score -= 30;
  else if (ratio > 100) score -= 20;
  else if (ratio > 70) score -= 12;
  else if (ratio > 40) score -= 5;
  score -= Math.max(0, e.inflation - 4) * 2.5;
  score -= Math.max(0, e.deficit) * 0.4;
  score += Math.max(0, e.gdpGrowth) * 1.5;
  score += (e.stability - 50) * 0.15;
  if (e.loansTaken) {
    const activeDebt = e.loansTaken.filter(l => l.status === 'active').reduce((s, l) => s + l.remaining, 0);
    score -= activeDebt * 0.08;
  }
  e.creditRating = Math.round(Math.max(20, Math.min(98, score)));
  return e.creditRating;
}

function calcMonthlyPayment(principal, annualRate, years) {
  const months = years * 12;
  const r = annualRate / 100 / 12;
  if (r <= 0) return Math.round((principal / months) * 100) / 100;
  const payment = principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return Math.round(payment * 100) / 100;
}

function requestLoan(state, opts) {
  // opts: { source, amount, years, rate? }
  if (!state.economy.loansTaken) state.economy.loansTaken = [];
  const amount = Math.round(Math.max(5, Math.min(200, opts.amount || 20)) * 10) / 10;
  const years = Math.max(2, Math.min(15, opts.years || 5));
  const source = opts.source || 'domestic_bank';
  const credit = state.economy.creditRating || 60;

  // Base rate depends on source + credit
  let baseRate = 4.5;
  if (source === 'domestic_bank') baseRate = 5.5;
  else if (source === 'foreign_country') baseRate = 4.0;
  else if (source === 'imf') baseRate = 3.2;
  // Credit penalty
  if (credit < 40) baseRate += 6;
  else if (credit < 55) baseRate += 3.5;
  else if (credit < 70) baseRate += 1.5;
  else if (credit >= 85) baseRate -= 0.8;

  const rate = opts.rate != null ? opts.rate : Math.round(baseRate * 10) / 10;
  const monthly = calcMonthlyPayment(amount, rate, years);
  const totalRepay = Math.round(monthly * years * 12 * 10) / 10;

  // Risk check
  if (credit < 30 && source !== 'imf') {
    return { success: false, message: 'رتبه اعتباری بسیار پایین — وام رد شد' };
  }
  if (state.economy.loansTaken.filter(l => l.status === 'active').length >= 5) {
    return { success: false, message: 'حداکثر تعداد وام فعال رسیده است' };
  }

  const loan = {
    id: 'loan_t_' + Date.now(),
    direction: 'taken',
    source,
    sourceName: source === 'domestic_bank' ? 'بانک داخلی' : source === 'imf' ? 'صندوق بین‌المللی' : (opts.sourceName || 'کشور خارجی'),
    sourceCountryId: opts.sourceCountryId || null,
    amount,
    rate,
    years,
    monthsTotal: years * 12,
    monthsPaid: 0,
    monthlyPayment: monthly,
    remaining: totalRepay,
    principalRemaining: amount,
    status: 'active',
    startedYear: state.time.year,
    startedMonth: state.time.month
  };

  state.economy.loansTaken.push(loan);
  state.economy.budget = Math.round((state.economy.budget + amount) * 10) / 10;
  state.economy.nationalDebt = Math.round((state.economy.nationalDebt + amount) * 10) / 10;
  updateCreditRating(state);

  logAction(state, `وام ${amount} واحد از ${loan.sourceName} با بهره ${rate}٪ دریافت شد`);
  if (typeof addNews === 'function') {
    addNews(state, {
      type: 'domestic',
      category: 'economy',
      icon: '💰',
      title: `دریافت وام ${amount} میلیاردی از ${loan.sourceName}`,
      summary: `دولت وام جدیدی به مبلغ ${amount} واحد با نرخ بهره سالانه ${rate} درصد و مدت بازپرداخت ${years} سال دریافت کرد. این اقدام بودجه کوتاه‌مدت را تقویت می‌کند اما بدهی ملی را افزایش می‌دهد.`,
      important: amount >= 40,
      countries: opts.sourceCountryId ? [opts.sourceCountryId] : []
    });
  }
  return { success: true, loan, state };
}

function giveLoan(state, opts) {
  // opts: { targetCountryId, amount, years, rate }
  if (!state.economy.loansGiven) state.economy.loansGiven = [];
  const amount = Math.round(Math.max(3, Math.min(80, opts.amount || 10)) * 10) / 10;
  const years = Math.max(2, Math.min(12, opts.years || 5));
  const rate = Math.round(Math.max(2, Math.min(12, opts.rate || 5)) * 10) / 10;
  const targetId = opts.targetCountryId;
  if (!targetId) return { success: false, message: 'کشور مقصد مشخص نشده' };
  if (state.economy.budget < amount) {
    return { success: false, message: 'بودجه کافی برای اعطای وام نیست' };
  }
  const target = (typeof PLAYABLE_COUNTRIES !== 'undefined' ? PLAYABLE_COUNTRIES : [])
    .find(c => c.id === targetId);
  if (!target) return { success: false, message: 'کشور مقصد یافت نشد' };

  const monthly = calcMonthlyPayment(amount, rate, years);
  const totalRepay = Math.round(monthly * years * 12 * 10) / 10;

  // Risk based on relation
  const rawRel = state.diplomacy.relations[targetId];
  const relVal = typeof getRelationValue === 'function' ? getRelationValue(rawRel) : (typeof rawRel === 'number' ? rawRel : 40);
  const defaultRisk = relVal < 30 ? 0.25 : relVal < 50 ? 0.12 : 0.05;

  const loan = {
    id: 'loan_g_' + Date.now(),
    direction: 'given',
    targetCountryId: targetId,
    targetName: target.name,
    targetFlag: target.flag,
    amount,
    rate,
    years,
    monthsTotal: years * 12,
    monthsPaid: 0,
    monthlyPayment: monthly,
    remaining: totalRepay,
    principalRemaining: amount,
    status: 'active',
    defaultRisk,
    startedYear: state.time.year,
    startedMonth: state.time.month
  };

  state.economy.loansGiven.push(loan);
  state.economy.budget = Math.round((state.economy.budget - amount) * 10) / 10;

  // Improve economic relation slightly
  if (typeof adjustRelation === 'function') {
    adjustRelation(state, targetId, 3 + Math.min(5, amount / 15));
  } else if (typeof state.diplomacy.relations[targetId] === 'number') {
    state.diplomacy.relations[targetId] = Math.min(95, state.diplomacy.relations[targetId] + 4);
  }

  logAction(state, `وام ${amount} واحد به ${target.name} با بهره ${rate}٪ اعطا شد`);
  if (typeof addNews === 'function') {
    addNews(state, {
      type: 'global',
      category: 'diplomacy',
      icon: '🤝',
      title: `اعطای وام به ${target.name}`,
      summary: `${state.country.name} وام ${amount} واحدی با نرخ ${rate} درصد به ${target.name} اعطا کرد. این اقدام می‌تواند روابط اقتصادی و نفوذ سیاسی را تقویت کند.`,
      important: amount >= 25,
      countries: [targetId]
    });
  }
  return { success: true, loan, state };
}

function processLoansTick(state) {
  const e = state.economy;
  if (!e.loansTaken) e.loansTaken = [];
  if (!e.loansGiven) e.loansGiven = [];

  // Process taken loans (payments already in spending)
  e.loansTaken.forEach(loan => {
    if (loan.status !== 'active') return;
    loan.monthsPaid++;
    loan.remaining = Math.max(0, Math.round((loan.remaining - loan.monthlyPayment) * 10) / 10);
    const interestPart = loan.principalRemaining * (loan.rate / 100 / 12);
    loan.principalRemaining = Math.max(0, Math.round((loan.principalRemaining - (loan.monthlyPayment - interestPart)) * 10) / 10);
    if (loan.monthsPaid >= loan.monthsTotal || loan.remaining <= 0.1) {
      loan.status = 'paid';
      loan.remaining = 0;
      if (typeof addNews === 'function') {
        addNews(state, {
          type: 'domestic', category: 'economy', icon: '✅',
          title: `بازپرداخت کامل وام ${loan.sourceName}`,
          summary: `وام ${loan.amount} واحدی که از ${loan.sourceName} دریافت شده بود، به‌طور کامل بازپرداخت شد و فشار بدهی کاهش یافت.`,
          important: false
        });
      }
    }
  });

  // Process given loans (receive payments + default risk)
  e.loansGiven.forEach(loan => {
    if (loan.status !== 'active') return;
    // Chance of default
    if (Math.random() < (loan.defaultRisk || 0.05) / 12) {
      loan.status = 'defaulted';
      const loss = loan.principalRemaining;
      e.budget = Math.round((e.budget - loss * 0.3) * 10) / 10; // partial recovery attempt cost
      if (typeof adjustRelation === 'function') {
        adjustRelation(state, loan.targetCountryId, -12);
      } else if (typeof state.diplomacy.relations[loan.targetCountryId] === 'number') {
        state.diplomacy.relations[loan.targetCountryId] = Math.max(5, state.diplomacy.relations[loan.targetCountryId] - 15);
      }
      if (typeof addNews === 'function') {
        addNews(state, {
          type: 'global', category: 'economy', icon: '⚠️',
          title: `عدم بازپرداخت وام توسط ${loan.targetName}`,
          summary: `${loan.targetName} از بازپرداخت وام ${loan.amount} واحدی خودداری کرد. این رویداد به روابط دوجانبه و اعتبار مالی آسیب زد.`,
          important: true,
          countries: [loan.targetCountryId]
        });
      }
      return;
    }
    loan.monthsPaid++;
    loan.remaining = Math.max(0, Math.round((loan.remaining - loan.monthlyPayment) * 10) / 10);
    const interestPart = loan.principalRemaining * (loan.rate / 100 / 12);
    loan.principalRemaining = Math.max(0, Math.round((loan.principalRemaining - (loan.monthlyPayment - interestPart)) * 10) / 10);
    // Payment received is already partially counted in revenue via getLoanInterestIncome
    if (loan.monthsPaid >= loan.monthsTotal || loan.remaining <= 0.1) {
      loan.status = 'paid';
      loan.remaining = 0;
      if (typeof adjustRelation === 'function') {
        adjustRelation(state, loan.targetCountryId, 5);
      }
    }
  });

  updateCreditRating(state);
}

// Hook into economy tick - call after main calculations

