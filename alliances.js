// alliances.js - Permanent Alliances Engine V3.0.1

function createAlliance(state, type, memberIds, name) {
  if (!state.alliances) state.alliances = { military: [], economic: [] };
  const list = type === 'military' ? state.alliances.military : state.alliances.economic;
  const alliance = {
    id: 'ally_' + type + '_' + Date.now(),
    name: name || (type === 'military' ? 'اتحاد نظامی' : 'اتحاد اقتصادی'),
    type,
    members: [state.country.id, ...memberIds],
    strength: 55,
    trust: 60,
    benefits: type === 'military' ? ['defense_boost', 'intel_share', 'military_support'] : ['trade_boost', 'investment', 'market_access'],
    obligations: type === 'military' ? ['mutual_defense'] : ['economic_cooperation'],
    createdYear: state.time.year,
    status: 'active'
  };
  list.push(alliance);

  // Apply mild benefits
  if (type === 'military' && state.military) {
    state.military.defensePower = Math.min(120, (state.military.defensePower || 40) + 5);
  }
  if (type === 'economic') {
    state.economy.foreignInvestment = Math.min(90, (state.economy.foreignInvestment || 15) + 4);
    state.economy.tradeBalance = (state.economy.tradeBalance || 0) + 2;
  }

  memberIds.forEach(id => {
    if (state.diplomacy?.relations?.[id]) {
      if (typeof state.diplomacy.relations[id] === 'number') {
        state.diplomacy.relations[id] = Math.min(95, state.diplomacy.relations[id] + 12);
      }
    }
  });

  if (typeof addNews === 'function') {
    addNews(state, {
      type: 'diplomatic',
      category: 'alliance',
      icon: '🤝',
      title: `تشکیل ${alliance.name}`,
      summary: `اتحاد جدید ${type === 'military' ? 'نظامی' : 'اقتصادی'} با مشارکت چند کشور اعلام شد.`,
      line2: 'این اتحاد می‌تواند امنیت جمعی یا دسترسی به بازارهای جدید را تقویت کند.',
      important: true
    });
  }
  return { success: true, alliance };
}

function leaveAlliance(state, allianceId) {
  ['military', 'economic'].forEach(t => {
    const list = state.alliances?.[t] || [];
    const idx = list.findIndex(a => a.id === allianceId);
    if (idx >= 0) {
      list.splice(idx, 1);
      state.population.satisfaction = Math.max(10, (state.population.satisfaction || 50) - 2);
    }
  });
  return { success: true };
}

window.createAlliance = createAlliance;
window.leaveAlliance = leaveAlliance;
