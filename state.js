// state.js - Central Game State Management

let GameState = null;

function createInitialState(difficultyId, countryId) {
  const diff = DIFFICULTY[difficultyId] || DIFFICULTY.medium;
  const m = diff.multipliers;
  const country = PLAYABLE_COUNTRIES.find(c => c.id === countryId) || PLAYABLE_COUNTRIES[0];

  // Apply difficulty multipliers on top of country base
  const gdp = Math.round(country.baseGDP * m.startingResources * 10) / 10;
  const budget = Math.round(country.baseBudget * m.startingBudget);
  const debt = Math.round(country.debt * m.startingBudget);
  const resourcesScale = m.startingResources;

  return {
    meta: {
      difficulty: difficultyId,
      difficultyName: diff.name,
      countryId: country.id,
      startedAt: Date.now(),
      lastSaved: null,
      version: '2.0',
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
      weaknesses: country.weaknesses || []
    },

    // President RPG traits (light system)
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
      stability: country.stability
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
      relations: { ...country.startingRelations },
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
    pendingEvent: null, // for choice modal
    history: { gdp: [], satisfaction: [], debt: [], events: [] },
    actionsLog: []
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
  // Calculate initial military powers
  if (typeof updateMilitaryPowers === 'function') {
    updateMilitaryPowers(GameState);
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

// President skill helpers
function getSkillBonus(skillName) {
  const s = getState();
  if (!s || !s.president) return 0;
  const val = s.president.skills[skillName] || 5;
  return (val - 5) * 0.02; // ±2% per point above/below 5
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
