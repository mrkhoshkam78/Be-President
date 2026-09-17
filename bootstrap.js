// bootstrap.js — App Start Gate + Base Data Validation V3.5.0
// Flow: Load Static Data → Validate → Ready Flag → UI may render

(function (g) {
  'use strict';

  const REQUIRED_COUNTRY_FIELDS = [
    'id', 'name', 'flag', 'population', 'baseGDP', 'baseBudget', 'debt',
    'taxRate', 'inflation', 'unemployment', 'satisfaction', 'stability',
    'infrastructure', 'military', 'resources', 'techLevel', 'intelLevel'
  ];

  function validateCountry(c, index) {
    const errors = [];
    if (!c || typeof c !== 'object') {
      return ['country[' + index + '] is not an object'];
    }
    REQUIRED_COUNTRY_FIELDS.forEach(function (f) {
      if (c[f] === undefined || c[f] === null) errors.push(c.id + ' missing field: ' + f);
    });
    if (c.military && typeof c.military === 'object') {
      ['army', 'airForce', 'navy', 'defenseSystems', 'tech', 'readiness'].forEach(function (mf) {
        if (c.military[mf] == null) errors.push((c.id || index) + ' military.' + mf + ' missing');
      });
    }
    if (c.resources && typeof c.resources === 'object') {
      ['oil', 'gas', 'minerals', 'agriculture', 'rare_earth'].forEach(function (rf) {
        if (c.resources[rf] == null) c.resources[rf] = 20; // soft fallback
      });
    }
    // Numeric fallbacks
    if (typeof c.population !== 'number' || isNaN(c.population)) c.population = 10000000;
    if (typeof c.baseGDP !== 'number' || isNaN(c.baseGDP)) c.baseGDP = 50;
    if (typeof c.baseBudget !== 'number' || isNaN(c.baseBudget)) c.baseBudget = 15;
    if (typeof c.debt !== 'number' || isNaN(c.debt)) c.debt = 30;
    if (!Array.isArray(c.strengths)) c.strengths = [];
    if (!Array.isArray(c.weaknesses)) c.weaknesses = [];
    if (typeof c.economyPower !== 'number') c.economyPower = 50;
    if (typeof c.militaryPower !== 'number') c.militaryPower = 40;
    return errors;
  }

  function validateBaseData() {
    const report = { ok: true, errors: [], warnings: [], countryCount: 0 };
    if (!g.PLAYABLE_COUNTRIES || !Array.isArray(g.PLAYABLE_COUNTRIES)) {
      report.ok = false;
      report.errors.push('PLAYABLE_COUNTRIES is missing or not an array');
      return report;
    }
    report.countryCount = g.PLAYABLE_COUNTRIES.length;
    if (report.countryCount < 1) {
      report.ok = false;
      report.errors.push('PLAYABLE_COUNTRIES is empty');
    }
    g.PLAYABLE_COUNTRIES.forEach(function (c, i) {
      const errs = validateCountry(c, i);
      errs.forEach(function (e) { report.errors.push(e); });
    });
    if (!g.DIFFICULTY || !g.DIFFICULTY.easy || !g.DIFFICULTY.medium || !g.DIFFICULTY.realistic) {
      report.ok = false;
      report.errors.push('DIFFICULTY modes incomplete');
    }
    if (report.errors.length) report.ok = false;
    if (report.countryCount < 20) report.warnings.push('Low country count: ' + report.countryCount);
    return report;
  }

  function showFatalError(msg) {
    console.error('[BePresident] FATAL:', msg);
    var el = document.getElementById('boot-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'boot-error';
      el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0c1220;color:#f87171;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;font-family:system-ui;text-align:center;';
      document.body.appendChild(el);
    }
    el.innerHTML = '<h2 style="color:#fff;margin-bottom:1rem">خطای بارگذاری داده</h2><p style="max-width:480px;line-height:1.6">' + msg + '</p><p style="color:#8b9cb8;margin-top:1rem;font-size:0.85rem">Console (F12) را برای جزئیات بررسی کنید. LocalStorage را پاک کنید و رفرش کنید.</p><button onclick="localStorage.clear();location.reload()" style="margin-top:1.5rem;padding:0.75rem 1.5rem;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">پاک کردن Save و رفرش</button>';
  }

  g.BePresidentBoot = {
    ready: false,
    report: null,
    init: function () {
      const report = validateBaseData();
      this.report = report;
      g.DATA_VALIDATION = report;
      if (!report.ok) {
        this.ready = false;
        showFatalError('داده پایه کشورها ناقص است (' + report.errors.length + ' خطا). اولین خطا: ' + (report.errors[0] || 'نامشخص'));
        report.errors.slice(0, 10).forEach(function (e) { console.error('[DataValidation]', e); });
        return false;
      }
      this.ready = true;
      g.DATA_READY = true;
      console.info('[BePresident] Base data OK —', report.countryCount, 'countries, version', g.DATA_VERSION || '?');
      if (report.warnings.length) report.warnings.forEach(function (w) { console.warn('[BePresident]', w); });
      return true;
    },
    assertReady: function () {
      if (!this.ready && !this.init()) throw new Error('Base data not ready');
      return true;
    }
  };

  // Auto-run after DOM if data already parsed
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { g.BePresidentBoot.init(); });
    } else {
      g.BePresidentBoot.init();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
