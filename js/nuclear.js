/**
 * nuclear.js — Nuclear Arsenal System V3.8
 * Superpower status derived from economyPower + militaryPower + techLevel (not scattered hardcode).
 */
(function (g) {
  'use strict';

  const SUPERPOWER_THRESHOLD = 200; // economyPower + militaryPower + techLevel/2

  function isSuperpowerCountry(countryOrState) {
    if (!countryOrState) return false;
    // If full game state passed
    if (countryOrState.country && countryOrState.economy) {
      const c = countryOrState.country;
      const src = (typeof PLAYABLE_COUNTRIES !== 'undefined' ? PLAYABLE_COUNTRIES : [])
        .find(x => x.id === c.id) || c;
      return scoreCountry(src) >= SUPERPOWER_THRESHOLD || !!(countryOrState.nuclear && countryOrState.nuclear.hasProgram);
    }
    return scoreCountry(countryOrState) >= SUPERPOWER_THRESHOLD;
  }

  function scoreCountry(c) {
    const eco = c.economyPower || 0;
    const mil = c.militaryPower || 0;
    const tech = c.techLevel || c.military?.tech || 0;
    return eco + mil + tech * 0.5;
  }

  function ensureNuclear(state) {
    if (!state.nuclear) {
      const c = (typeof PLAYABLE_COUNTRIES !== 'undefined' ? PLAYABLE_COUNTRIES : [])
        .find(x => x.id === state.country?.id);
      const eligible = c ? isSuperpowerCountry(c) : false;
      state.nuclear = {
        hasProgram: eligible,
        warheads: eligible ? Math.max(5, Math.round((c.militaryPower || 40) / 8)) : 0,
        readiness: eligible ? 40 : 0,
        doctrine: 'deterrence', // deterrence | first_strike
        lastStrikeTurn: -999,
        reputationPenalty: 0,
        strikesUsed: 0
      };
    }
    return state.nuclear;
  }

  function canUseNuclear(state) {
    ensureNuclear(state);
    const n = state.nuclear;
    if (!n.hasProgram || n.warheads <= 0) {
      return { ok: false, reason: 'برنامه هسته‌ای فعال یا کلاهک موجود نیست' };
    }
    if (n.readiness < 30) {
      return { ok: false, reason: 'آمادگی زرادخانه کافی نیست' };
    }
    // Cooldown: 1 strike per 3 turns
    if (state.meta && state.meta.tickCount - n.lastStrikeTurn < 3) {
      return { ok: false, reason: 'دوره سرد شدن سلاح هسته‌ای هنوز تمام نشده' };
    }
    const cost = 25;
    if ((state.economy?.budget || 0) < cost) {
      return { ok: false, reason: 'بودجه کافی برای عملیات هسته‌ای نیست (۲۵ واحد)' };
    }
    return { ok: true };
  }

  function executeNuclearStrike(state, targetId) {
    if (state._nuclearLock) return { success: false, message: 'عملیات در حال اجرا' };
    state._nuclearLock = true;
    try {
      const check = canUseNuclear(state);
      if (!check.ok) return { success: false, message: check.reason };
      if (!targetId) return { success: false, message: 'هدف مشخص نشده' };
      if (targetId === state.country.id) return { success: false, message: 'هدف نامعتبر' };

      const target = (PLAYABLE_COUNTRIES || []).find(c => c.id === targetId);
      if (!target) return { success: false, message: 'کشور هدف یافت نشد' };

      const n = ensureNuclear(state);
      n.warheads -= 1;
      n.lastStrikeTurn = state.meta?.tickCount || 0;
      n.strikesUsed = (n.strikesUsed || 0) + 1;
      n.reputationPenalty = (n.reputationPenalty || 0) + 25;
      state.economy.budget -= 25;

      // Devastating effect on war if active
      const war = (state.wars || []).find(w => w.opponent === targetId && w.status !== 'peace');
      if (war) {
        war.enemyPower = Math.max(5, (war.enemyPower || 50) * 0.35);
        war.winChance = Math.min(95, (war.winChance || 50) + 25);
      }

      // Diplomatic catastrophe with ALL countries
      if (state.diplomacy?.relations) {
        Object.keys(state.diplomacy.relations).forEach(id => {
          const rel = state.diplomacy.relations[id];
          if (typeof rel === 'number') {
            state.diplomacy.relations[id] = Math.max(0, rel - (id === targetId ? 40 : 18));
          } else if (rel && typeof rel === 'object') {
            rel.overall = Math.max(0, (rel.overall || 50) - (id === targetId ? 40 : 18));
            rel.trust = Math.max(0, (rel.trust || 50) - 20);
            rel.threatLevel = Math.min(100, (rel.threatLevel || 20) + 25);
          }
        });
      }

      state.population.satisfaction = Math.max(5, (state.population.satisfaction || 50) - 12);
      state.economy.stability = Math.max(10, (state.economy.stability || 50) - 15);

      if (typeof pushNotification === 'function') {
        pushNotification(state, {
          severity: 'critical',
          category: 'war',
          title: 'حمله هسته‌ای به ' + target.name,
          body: 'یک کلاهک استفاده شد. پیامدهای دیپلماتیک و انسانی سنگین است. کلاهک باقی‌مانده: ' + n.warheads,
          important: true
        });
      }
      if (typeof logAction === 'function') {
        logAction(state, 'حمله هسته‌ای به ' + target.name);
      }
      return { success: true, state, warheadsLeft: n.warheads };
    } finally {
      state._nuclearLock = false;
    }
  }

  function developNuclearProgram(state) {
    ensureNuclear(state);
    if (state.nuclear.hasProgram) return { success: false, message: 'برنامه هسته‌ای از قبل فعال است' };
    const c = (PLAYABLE_COUNTRIES || []).find(x => x.id === state.country?.id);
    if (!c || scoreCountry(c) < SUPERPOWER_THRESHOLD * 0.75) {
      return { success: false, message: 'قدرت اقتصادی/نظامی/فناوری برای شروع برنامه کافی نیست' };
    }
    const cost = 80;
    if ((state.economy?.budget || 0) < cost) return { success: false, message: 'بودجه ناکافی (۸۰ واحد)' };
    state.economy.budget -= cost;
    state.nuclear.hasProgram = true;
    state.nuclear.warheads = 3;
    state.nuclear.readiness = 25;
    if (typeof pushNotification === 'function') {
      pushNotification(state, {
        severity: 'warning', category: 'military',
        title: 'آغاز برنامه هسته‌ای',
        body: 'برنامه هسته‌ای ملی فعال شد. تنش دیپلماتیک افزایش می‌یابد.'
      });
    }
    // mild global relation hit
    if (state.diplomacy?.relations) {
      Object.keys(state.diplomacy.relations).forEach(id => {
        const rel = state.diplomacy.relations[id];
        if (typeof rel === 'number') state.diplomacy.relations[id] = Math.max(5, rel - 8);
      });
    }
    return { success: true, state };
  }

  g.isSuperpowerCountry = isSuperpowerCountry;
  g.ensureNuclear = ensureNuclear;
  g.canUseNuclear = canUseNuclear;
  g.executeNuclearStrike = executeNuclearStrike;
  g.developNuclearProgram = developNuclearProgram;
  g.scoreCountryNuclear = scoreCountry;
})(typeof window !== 'undefined' ? window : globalThis);
