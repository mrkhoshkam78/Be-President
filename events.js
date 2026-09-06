// events.js - Dynamic Event System with player choices

function processEvents(state) {
  const m = getDifficultyMultipliers();
  const chanceMultiplier = m.crisisChance || 1;

  // Don't trigger new event if one is pending choice
  if (state.pendingEvent) return state;

  if (Math.random() < 0.18 * chanceMultiplier) {
    const possible = EVENT_TEMPLATES.filter(t => {
      try { return t.conditions(state); } catch { return true; }
    });

    if (possible.length > 0) {
      const totalWeight = possible.reduce((s, e) => s + (e.probabilityBase || 0.05), 0);
      let r = Math.random() * totalWeight;
      let chosen = possible[0];
      for (const e of possible) {
        r -= (e.probabilityBase || 0.05);
        if (r <= 0) { chosen = e; break; }
      }
      triggerEvent(state, chosen);
    }
  }

  if (state.alerts && state.alerts.length > 8) {
    state.alerts = state.alerts.slice(0, 8);
  }
  return state;
}

function triggerEvent(state, template) {
  // If event has choices, put it in pending for modal
  if (template.choices && template.choices.length > 0) {
    state.pendingEvent = {
      id: template.id + '_' + Date.now(),
      templateId: template.id,
      title: template.title,
      description: template.description,
      type: template.type,
      icon: template.icon || '📢',
      day: state.time.totalDays,
      choices: template.choices
    };
    // Pause time while deciding
    state.meta.speed = 0;
    return state;
  }

  // Fallback direct effect (legacy)
  const event = {
    id: template.id + '_' + Date.now(),
    title: template.title,
    description: template.description,
    type: template.type,
    day: state.time.totalDays,
    effects: { ...template.effects }
  };
  applyEventEffects(state, event.effects);
  state.events.unshift(event);
  if (state.events.length > 15) state.events.pop();
  state.alerts.unshift({
    type: template.type === 'positive' ? 'success' : 'danger',
    text: `رویداد: ${template.title}`
  });
  logAction(state, `رویداد: ${template.title}`);
  return state;
}

function resolveEventChoice(state, choiceId) {
  if (!state.pendingEvent) return state;
  const choice = state.pendingEvent.choices.find(c => c.id === choiceId);
  if (!choice) return state;

  applyEventEffects(state, choice.effects || {});

  // Record
  state.events.unshift({
    id: state.pendingEvent.id,
    title: state.pendingEvent.title,
    description: state.pendingEvent.description + ' → ' + choice.label,
    type: state.pendingEvent.type,
    day: state.time.totalDays,
    choice: choice.label
  });
  if (state.events.length > 15) state.events.pop();

  state.alerts.unshift({
    type: state.pendingEvent.type === 'positive' ? 'success' : (choice.id === 'ignore' || choice.id === 'suppress' ? 'warning' : 'info'),
    text: `تصمیم: ${choice.label} در رویداد «${state.pendingEvent.title}»`
  });

  logAction(state, `رویداد «${state.pendingEvent.title}»: انتخاب «${choice.label}»`);
  addPresidentXP(8 + Math.floor(Math.random() * 6));

  state.pendingEvent = null;
  // Resume normal speed if was paused only for event
  if (state.meta.speed === 0) state.meta.speed = 1;

  return state;
}

function applyEventEffects(state, effects) {
  if (!effects) return;

  if (effects.gdpGrowth) state.economy.gdpGrowth += effects.gdpGrowth;
  if (effects.unemployment) state.economy.unemployment = Math.max(2, state.economy.unemployment + effects.unemployment);
  if (effects.satisfaction) state.population.satisfaction = Math.max(5, Math.min(98, state.population.satisfaction + effects.satisfaction));
  if (effects.budget) state.economy.budget += effects.budget;
  if (effects.inflation) state.economy.inflation = Math.max(0.1, state.economy.inflation + effects.inflation);
  if (effects.exports) state.economy.exports = Math.max(10, state.economy.exports + effects.exports);
  if (effects.foreignInvestment) state.economy.foreignInvestment = Math.max(0, state.economy.foreignInvestment + effects.foreignInvestment);
  if (effects.production) state.economy.industrialProduction = Math.max(15, Math.min(95, state.economy.industrialProduction + effects.production));
  if (effects.resources) {
    state.economy.naturalResources = Math.min(95, state.economy.naturalResources + effects.resources);
    state.resources.oil += effects.resources * 0.3;
    state.resources.gas += effects.resources * 0.2;
  }
  if (effects.techLevel) state.tech.level = Math.min(95, state.tech.level + effects.techLevel);
  if (effects.militaryTech) state.military.technology = Math.min(95, state.military.technology + effects.militaryTech);
  if (effects.stability) state.economy.stability = Math.max(10, Math.min(95, state.economy.stability + effects.stability));
  if (effects.readiness) state.military.readiness = Math.max(10, Math.min(98, state.military.readiness + effects.readiness));
  if (effects.infrastructure) state.economy.infrastructure = Math.min(95, state.economy.infrastructure + effects.infrastructure);
  if (effects.taxRate) state.economy.taxRate = Math.max(8, Math.min(45, state.economy.taxRate + effects.taxRate));

  if (effects.relationsBoost) {
    Object.keys(state.diplomacy.relations).forEach(k => {
      state.diplomacy.relations[k] = Math.min(95, state.diplomacy.relations[k] + effects.relationsBoost * 0.6);
    });
  }
  if (effects.relationsPenalty) {
    Object.keys(state.diplomacy.relations).forEach(k => {
      state.diplomacy.relations[k] = Math.max(5, state.diplomacy.relations[k] - effects.relationsPenalty * 0.6);
    });
  }
  if (effects.military && effects.military.readiness) {
    state.military.readiness = Math.min(98, state.military.readiness + effects.military.readiness);
  }
}

function forceEvent(state, eventId) {
  const template = EVENT_TEMPLATES.find(e => e.id === eventId);
  if (template) triggerEvent(state, template);
  return state;
}
