// state.js - Central Game State Management (v2.2)

let GameState = null;

function calculateInitialCredit(debt, gdp, economyPower) {
  const ratio = gdp > 0 ? (debt / gdp) * 100 : 50;
  let score = 75;
  if (ratio > 120) score -= 25;
  else if (ratio > 80) score -= 15;
  else if (ratio > 50) score -= 8;
  score += (economyPower - 55) * 0.25;
  return Math.round(Math.max(25, Math.min(95, score)));
}

function createInitialState(difficultyId, countryId) {
  const diff = DIFFICULTY[difficultyId] || DIFFICULTY.medium;
  const m = diff.multipliers;
  const country = PLAYABLE_COUNTRIES.find(c => c.id === countryId) || PLAYABLE_COUNTRIES[0];

  const gdp = Math.round(country.baseGDP * m.startingResources * 10) / 10;
  const budget = Math.round(country.baseBudget * m.startingBudget);
  const debt = Math.round(country.debt * (m.startingBudget > 1 ? 0.9 : m.startingBudget < 1 ? 1.15 : 1));
  const resourcesScale = m.startingResources;

  // Build relations: simple number for Easy/Medium, multi-dim for Realistic
  const relations = {};
  const isRealistic = difficultyId === 'realistic';
  const otherCountries = PLAYABLE_COUNTRIES.filter(c => c.id !== country.id);

  otherCountries.forEach(other => {
    const base = (BASE_RELATIONS[country.id] && BASE_RELATIONS[country.id][other.id]) != null
      ? BASE_RELATIONS[country.id][other.id]
      : 50;
    if (isRealistic) {
      relations[other.id] = createMultiDimRelation(base, country, other);
    } else {
      // Easy/Medium: simpler single value with mild variation
      const variance = difficultyId === 'easy' ? 8 : 5;
      relations[other.id] = Math.round(Math.max(15, Math.min(90, base + (Math.random() * variance * 2 - variance))));
    }
  });

  return {
    meta: {
      difficulty: difficultyId,
      difficultyName: diff.name,
      countryId: country.id,
      startedAt: Date.now(),
      lastSaved: null,
      version: '2.2',
      isRunning: false,
      speed: 1,
      tickCount: 0,
      gameOver: false,
      gameOverReason: null
    },

    time: { year: 2026, month: 1, day: 1, totalDays: 0 },

    country: {
      id: country.id,
      name: country.name,
      flag: country.flag,
      color: country.color,
      region: country.region,
      population: Math.round(country.population * (0.95 + m.startingResources * 0.05)),
      populationGrowth: 0.9,
      strengths: country.strengths || [],
      weaknesses: country.weaknesses || [],
      startingChallenge: country.startingChallenge || '',
      economicOpportunities: country.economicOpportunities || []
    },

    president: {
      name: 'رئیس‌جمهور',
      level: 1,
      xp: 0,
      xpToNext: 100,
      skills: {
        management: 5,
        economy: 5,
        diplomacy: 5,
        military: 5,
        intelligence: 5
      },
      skillPoints: 0
    },

    economy: {
      gdp: gdp,
      gdpGrowth: 2.1 * m.growthPotential * (country.economyPower / 55),
      inflation: country.inflation * m.inflationRate,
      unemployment: country.unemployment * m.unemploymentBase,
      budget: budget,
      revenue: 0,
      spending: 0,
      deficit: 0,
      nationalDebt: debt,
      taxRate: country.taxRate,
      tradeBalance: 4.5,
      imports: 62,
      exports: 66.5,
      currencyStrength: 100,
      foreignInvestment: 18 * resourcesScale * (country.economyPower / 55),
      industrialProduction: Math.round(country.industrialProduction * resourcesScale),
      naturalResources: Math.round(country.naturalResources * resourcesScale),
      resourceIncome: 12,
      infrastructure: country.infrastructure,
      stability: country.stability,
      creditRating: calculateInitialCredit(debt, gdp, country.economyPower),
      loansTaken: [],
      loansGiven: []
    },


    population: {
      satisfaction: country.satisfaction,
      happiness: Math.round(country.satisfaction * 0.95),
      health: 62,
      education: 58,
      povertyRate: Math.max(5, Math.round(14 - (country.economyPower - 50) * 0.15))
    },

    military: {
      army: country.military.army,
      airForce: country.military.airForce,
      navy: country.military.navy,
      defenseSystems: country.military.defenseSystems,
      budget: 18,
      budgetAmount: 12,
      technology: country.military.tech,
      readiness: country.military.readiness,
      attackPower: 0,
      defensePower: 0,
      manpower: Math.round(country.population * 0.0065),
      activeOperations: []
    },

    intelligence: {
      budget: 4.5,
      level: country.intelLevel,
      domestic: Math.round(country.intelLevel * 1.1),
      foreign: country.intelLevel,
      counter: Math.round(country.intelLevel * 1.05),
      operations: [],
      discoveredThreats: []
    },

    tech: {
      level: country.techLevel,
      researchPoints: 20,
      researchBudget: 6,
      focus: 'general'
    },

    diplomacy: {
      relations: relations,
      relationsMode: isRealistic ? 'multi' : 'simple',
      agreements: [],
      sanctions: [],
      treaties: [],
      alliances: [],
      activeNegotiations: []
    },

    resources: {
      oil: Math.round(country.resources.oil * resourcesScale),
      gas: Math.round(country.resources.gas * resourcesScale),
      minerals: Math.round(country.resources.minerals * resourcesScale),
      agriculture: Math.round(country.resources.agriculture * resourcesScale),
      rare_earth: Math.round(country.resources.rare_earth * resourcesScale)
    },

    projects: [],
    events: [],
    alerts: [],
    advisorSuggestions: [],
    pendingEvent: null,
    history: { gdp: [], satisfaction: [], debt: [], events: [] },
    actionsLog: [],

    // News system
    news: [],
    newsUnread: 0
  };
}

function getState() { return GameState; }
function setState(newState) { GameState = newState; }

function updateState(updater) {
  if (typeof updater === 'function') GameState = updater(GameState);
  else GameState = { ...GameState, ...updater };
  return GameState;
}

function resetState(difficultyId, countryId) {
  GameState = createInitialState(difficultyId, countryId);
  if (typeof updateMilitaryPowers === 'function') {
    updateMilitaryPowers(GameState);
  }
  // Seed initial news
  if (typeof addNews === 'function') {
    addNews(GameState, {
      type: 'domestic',
      category: 'politics',
      icon: '🏛️',
      title: `آغاز ریاست‌جمهوری در ${GameState.country.name}`,
      summary: `رئیس‌جمهور جدید کار خود را آغاز کرد. چالش اصلی: ${GameState.country.startingChallenge || 'مدیریت کشور'}`,
      important: true
    });
  }
  return GameState;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function get(path, defaultValue = 0) {
  if (!GameState) return defaultValue;
  const keys = path.split('.');
  let val = GameState;
  for (const k of keys) {
    if (val == null) return defaultValue;
    val = val[k];
  }
  return val !== undefined ? val : defaultValue;
}

function setPath(path, value) {
  if (!GameState) return;
  const keys = path.split('.');
  let obj = GameState;
  for (let i = 0; i < keys.length - 1; i++) {
    if (obj[keys[i]] === undefined) obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
}

function getSkillBonus(skillName) {
  const s = getState();
  if (!s || !s.president) return 0;
  const val = s.president.skills[skillName] || 5;
  return (val - 5) * 0.02;
}

function addPresidentXP(amount) {
  const s = getState();
  if (!s || !s.president) return;
  s.president.xp += amount;
  while (s.president.xp >= s.president.xpToNext) {
    s.president.xp -= s.president.xpToNext;
    s.president.level += 1;
    s.president.skillPoints += 1;
    s.president.xpToNext = Math.round(s.president.xpToNext * 1.35);
    s.alerts.unshift({ type: 'success', text: `رئیس‌جمهور به سطح ${s.president.level} رسید! +1 امتیاز مهارت` });
  }
}

/** Helper: get overall relation value (works for both simple and multi) */
function getRelationValue(rel) {
  if (rel == null) return 50;
  if (typeof rel === 'number') return rel;
  return rel.overall != null ? rel.overall : (rel.political || 50);
}

/** Helper: update a relation dimensionally or simply */
function modifyRelation(state, targetId, changes) {
  if (!state.diplomacy.relations[targetId]) return;
  const isMulti = state.diplomacy.relationsMode === 'multi';
  if (!isMulti) {
    const delta = changes.overall || changes.political || 0;
    state.diplomacy.relations[targetId] = Math.round(Math.max(5, Math.min(95,
      getRelationValue(state.diplomacy.relations[targetId]) + delta
    )) * 10) / 10;
  } else {
    const r = state.diplomacy.relations[targetId];
    if (changes.political != null) r.political = clamp(r.political + changes.political, 5, 95);
    if (changes.economic != null) r.economic = clamp(r.economic + changes.economic, 5, 95);
    if (changes.military != null) r.military = clamp(r.military + changes.military, 5, 95);
    if (changes.trust != null) r.trust = clamp(r.trust + changes.trust, 5, 95);
    if (changes.strategicInterest != null) r.strategicInterest = clamp(r.strategicInterest + changes.strategicInterest, 5, 95);
    if (changes.threatLevel != null) r.threatLevel = clamp(r.threatLevel + changes.threatLevel, 5, 95);
    // Recalc overall
    r.overall = Math.round(
      r.political * 0.3 + r.economic * 0.25 + r.military * 0.15 + r.trust * 0.2 + r.strategicInterest * 0.1
    );
  }
}

function clamp(v, min, max) {
  return Math.round(Math.max(min, Math.min(max, v)) * 10) / 10;
}
