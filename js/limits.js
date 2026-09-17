// limits.js - Central Dynamic Limit System V3.3.0
// Limits scale with Population, Revenue, GDP, Technology, Infrastructure, Military Capacity

function getDynamicLimits(state) {
  if (!state) return defaultLimits();
  const pop = state.country?.population || 50e6;
  const gdp = state.economy?.gdp || 100;
  const revenue = state.economy?.revenue || gdp * 0.2;
  const infra = state.economy?.infrastructure || 50;
  const tech = state.tech?.level || 40;
  const milPower = state.upgrades?.militaryPower?.level || 30;
  const industrial = state.economy?.industrialProduction || 50;

  const popFactor = Math.sqrt(pop / 50e6);
  const ecoFactor = Math.sqrt(Math.max(20, gdp) / 100);
  const techFactor = 0.6 + (tech / 100) * 0.8;
  const infraFactor = 0.5 + (infra / 100) * 0.9;

  return {
    // Military capacity
    maxArmy: Math.round(Math.min(100, 25 + milPower * 0.45 + popFactor * 15 + techFactor * 10)),
    maxAirForce: Math.round(Math.min(100, 15 + milPower * 0.35 + techFactor * 20 + ecoFactor * 8)),
    maxNavy: Math.round(Math.min(100, 10 + milPower * 0.3 + ecoFactor * 12 + infraFactor * 10)),
    maxDefenseSystems: Math.round(Math.min(100, 20 + milPower * 0.4 + techFactor * 15)),
    maxReadiness: 100,
    maxManpower: Math.round(pop * 0.008 * (0.7 + milPower / 200)),

    // Equipment stocks (production caps)
    maxMissiles: Math.round(20 + industrial * 1.2 + tech * 0.8 + ecoFactor * 15),
    maxTanks: Math.round(15 + industrial * 1.5 + milPower * 0.5 + popFactor * 10),
    maxAPC: Math.round(25 + industrial * 1.8 + popFactor * 12),
    maxAntiAir: Math.round(10 + tech * 0.9 + industrial * 0.8),
    maxAntiMissile: Math.round(5 + tech * 0.7 + industrial * 0.5),
    maxSpecialForces: Math.round(Math.max(0, (tech >= 55 && milPower >= 40) ? 3 + Math.floor((tech - 55) / 10) + Math.floor((milPower - 40) / 15) : 0)),

    // Economy / production
    maxInfrastructure: 100,
    maxIndustrialProduction: Math.round(Math.min(100, 30 + infra * 0.4 + tech * 0.25 + ecoFactor * 15)),
    maxGdpGrowth: Math.min(9, 3.5 + tech * 0.02 + infra * 0.015),
    maxTaxRate: Math.min(45, 25 + (state.upgrades?.government?.level || 20) * 0.15),
    maxIntelOps: Math.round(2 + (state.intelligence?.level || 30) / 25),
    maxActiveWars: Math.round(1 + (milPower / 40) + (state.upgrades?.government?.level || 20) / 50),

    // Upgrade soft caps (hard max still 100, but cost rises / some gated)
    effectiveUpgradeCap: 100
  };
}

function defaultLimits() {
  return {
    maxArmy: 60, maxAirForce: 50, maxNavy: 45, maxDefenseSystems: 55, maxReadiness: 100,
    maxManpower: 400000, maxMissiles: 40, maxTanks: 30, maxAPC: 40, maxAntiAir: 20,
    maxAntiMissile: 10, maxSpecialForces: 0, maxInfrastructure: 100, maxIndustrialProduction: 70,
    maxGdpGrowth: 6, maxTaxRate: 40, maxIntelOps: 3, maxActiveWars: 2, effectiveUpgradeCap: 100
  };
}

function enforceMilitaryLimits(state) {
  const L = getDynamicLimits(state);
  if (!state.military) return state;
  const m = state.military;
  m.army = Math.min(m.army || 0, L.maxArmy);
  m.airForce = Math.min(m.airForce || 0, L.maxAirForce);
  m.navy = Math.min(m.navy || 0, L.maxNavy);
  m.defenseSystems = Math.min(m.defenseSystems || 0, L.maxDefenseSystems);
  m.readiness = Math.min(m.readiness || 0, L.maxReadiness);
  m.manpower = Math.min(m.manpower || 0, L.maxManpower);
  return state;
}

function canProduceEquipment(state, type, amount = 1) {
  const L = getDynamicLimits(state);
  const stock = state.military?.equipment || {};
  const current = stock[type] || 0;
  const maxKey = 'max' + type.charAt(0).toUpperCase() + type.slice(1);
  const max = L[maxKey] != null ? L[maxKey] : 50;
  if (current + amount > max) return { ok: false, reason: `ظرفیت حداکثر ${max} رسیده`, max, current };
  if (type === 'specialForces' && (L.maxSpecialForces || 0) <= 0) {
    return { ok: false, reason: 'شرایط فناوری/نظامی برای نیروهای ویژه کافی نیست' };
  }
  return { ok: true, max, current };
}

window.getDynamicLimits = getDynamicLimits;
window.enforceMilitaryLimits = enforceMilitaryLimits;
window.canProduceEquipment = canProduceEquipment;
