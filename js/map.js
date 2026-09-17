/**
 * map.js — Real Geographic Political Map Engine V3.7
 * Geometry: Natural Earth 110m Admin-0 (via COUNTRY_GEOJSON)
 * Projection: Equirectangular (Plate Carrée), viewBox 0 0 1000 500
 */
(function (g) {
  'use strict';

  const VB_W = 1000, VB_H = 500;

  // ── Projection: lon/lat → SVG ──
  function project(lon, lat) {
    const x = ((lon + 180) / 360) * VB_W;
    const y = ((90 - lat) / 180) * VB_H;
    return [x, y];
  }

  function ringToPath(ring) {
    if (!ring || ring.length < 2) return '';
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = project(ring[i][0], ring[i][1]);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2);
    }
    return d + 'Z';
  }

  function geomToPath(geom) {
    if (!geom) return '';
    if (geom.type === 'Polygon') {
      return geom.coordinates.map(ringToPath).join('');
    }
    if (geom.type === 'MultiPolygon') {
      return geom.coordinates.map(poly => poly.map(ringToPath).join('')).join('');
    }
    return '';
  }

  function geomCentroid(geom) {
    // Average of all exterior ring points (good enough for labels)
    let sx = 0, sy = 0, n = 0;
    function addRing(ring) {
      for (let i = 0; i < ring.length; i++) {
        const [x, y] = project(ring[i][0], ring[i][1]);
        sx += x; sy += y; n++;
      }
    }
    if (geom.type === 'Polygon') {
      addRing(geom.coordinates[0]);
    } else if (geom.type === 'MultiPolygon') {
      // Use largest polygon exterior
      let best = geom.coordinates[0], bestLen = 0;
      geom.coordinates.forEach(p => {
        const len = p[0] ? p[0].length : 0;
        if (len > bestLen) { bestLen = len; best = p; }
      });
      addRing(best[0]);
    }
    return n ? { x: sx / n, y: sy / n } : { x: VB_W / 2, y: VB_H / 2 };
  }

  // Build lookup once
  let GEO_BY_ID = null;
  function ensureGeo() {
    if (GEO_BY_ID) return GEO_BY_ID;
    GEO_BY_ID = {};
    const fc = g.COUNTRY_GEOJSON;
    if (!fc || !fc.features) {
      console.error('[Map] COUNTRY_GEOJSON missing — load geo-countries.js first');
      return GEO_BY_ID;
    }
    fc.features.forEach(ft => {
      const id = ft.properties && ft.properties.id;
      if (id) GEO_BY_ID[id] = ft;
    });
    return GEO_BY_ID;
  }

  const COUNTRY_COLORS = {
    usa:'#3d5a80', canada:'#4a6fa5', mexico:'#5c7a5e', brazil:'#3d7a5a',
    argentina:'#5a7a9a', chile:'#6a5a7a', colombia:'#7a6a4a', peru:'#6a7a5a',
    uk:'#5a6a9a', ireland:'#4a8a5a', france:'#4a6aaa', spain:'#9a7a4a',
    portugal:'#6a8a5a', germany:'#6a6a7a', italy:'#5a8a6a', netherlands:'#8a6a4a',
    belgium:'#7a7a5a', switzerland:'#8a5a5a', austria:'#6a5a8a', poland:'#8a5a6a',
    czech:'#5a7a8a', hungary:'#7a5a6a', romania:'#8a6a5a', ukraine:'#5a8aaa',
    sweden:'#4a7aaa', norway:'#3a6a9a', finland:'#5a8aba', greece:'#4a8a9a',
    russia:'#5a4a6a', turkey:'#8a5a4a', egypt:'#9a8a5a', saudi:'#7a9a5a',
    uae:'#5a9a7a', qatar:'#4a8a8a', kuwait:'#6a9a6a', iraq:'#8a7a4a',
    iran:'#7a6a5a', israel:'#5a7a9a', south_africa:'#6a8a4a', nigeria:'#5a8a5a',
    algeria:'#8a9a5a', morocco:'#7a8a4a', ethiopia:'#6a7a4a', kenya:'#5a7a4a',
    india:'#8a7a3a', pakistan:'#5a7a4a', bangladesh:'#4a8a5a', china:'#8a4a4a',
    japan:'#8a5a6a', south_korea:'#6a5a8a', taiwan:'#5a6a8a', indonesia:'#4a7a6a',
    thailand:'#7a5a8a', vietnam:'#5a8a6a', malaysia:'#6a7a5a', philippines:'#5a6a9a',
    singapore:'#8a6a5a', australia:'#6a7a4a', new_zealand:'#4a7a6a', kazakhstan:'#7a6a5a'
  };

  const DIPLO = {
    player:  { stroke: '#38bdf8', glow: 'rgba(56,189,248,0.5)',  fillA: 0.88, w: 1.6 },
    allied:  { stroke: '#34d399', glow: 'rgba(52,211,153,0.35)', fillA: 0.82, w: 1.25 },
    friendly:{ stroke: '#6ee7b7', glow: 'rgba(110,231,183,0.2)', fillA: 0.78, w: 1.1 },
    neutral: { stroke: 'rgba(148,163,184,0.65)', glow: 'rgba(148,163,184,0.1)', fillA: 0.75, w: 0.9 },
    tense:   { stroke: '#fb923c', glow: 'rgba(251,146,60,0.3)',  fillA: 0.8,  w: 1.2 },
    hostile: { stroke: '#f87171', glow: 'rgba(248,113,113,0.35)', fillA: 0.82, w: 1.3 },
    enemy:   { stroke: '#ef4444', glow: 'rgba(239,68,68,0.45)',  fillA: 0.85, w: 1.45 },
    war:     { stroke: '#dc2626', glow: 'rgba(220,38,38,0.55)',  fillA: 0.9,  w: 1.8 }
  };

  let mapState = {
    zoom: 1, panX: 0, panY: 0,
    selected: null, hovered: null,
    searchQuery: '', ready: false
  };

  function getDiploStatus(state, countryId) {
    if (!state) return 'neutral';
    if (state.country && state.country.id === countryId) return 'player';
    const atWar = (state.wars || []).some(w => w.opponent === countryId || w.target === countryId);
    if (atWar) return 'war';
    const allies = new Set();
    (state.alliances?.military || []).forEach(a => (a.members || []).forEach(m => allies.add(m)));
    (state.alliances?.economic || []).forEach(a => (a.members || []).forEach(m => allies.add(m)));
    if (allies.has(countryId)) return 'allied';
    const rel = state.diplomacy?.relations?.[countryId];
    const val = typeof getRelationValue === 'function' ? getRelationValue(rel) : (typeof rel === 'number' ? rel : 50);
    if (val >= 75) return 'friendly';
    if (val >= 45) return 'neutral';
    if (val >= 30) return 'tense';
    if (val >= 15) return 'hostile';
    return 'enemy';
  }

  function buildSVG(state) {
    const geo = ensureGeo();
    const countries = (typeof PLAYABLE_COUNTRIES !== 'undefined' ? PLAYABLE_COUNTRIES : []);
    let paths = '';
    let labels = '';
    const placed = [];

    countries.forEach(c => {
      const ft = geo[c.id];
      if (!ft) return;
      const d = geomToPath(ft.geometry);
      if (!d) return;
      const ctr = geomCentroid(ft.geometry);
      let status = getDiploStatus(state, c.id);
      // Annexed territories owned by player
      if (state.worldOwnership && state.worldOwnership[c.id] === state.country?.id) {
        status = 'player';
      }
      const st = DIPLO[status] || DIPLO.neutral;
      const base = COUNTRY_COLORS[c.id] || '#4a5568';
      const isSel = mapState.selected === c.id;
      const isHov = mapState.hovered === c.id;
      const dim = mapState.selected && !isSel && status !== 'player' ? 0.5 : 1;
      const sw = isSel ? st.w + 0.7 : isHov ? st.w + 0.35 : st.w;
      const glow = isSel || isHov ? 3.5 : 1.8;

      paths += `<path class="map-country" data-id="${c.id}" data-status="${status}" d="${d}"
        fill="${base}" fill-opacity="${st.fillA * dim}"
        stroke="${st.stroke}" stroke-width="${sw}" stroke-linejoin="round"
        style="filter:drop-shadow(0 0 ${glow}px ${st.glow});cursor:pointer;opacity:${dim}"/>`;

      // Label placement with simple collision
      let skip = false;
      for (const p of placed) {
        if (Math.hypot(p.x - ctr.x, p.y - ctr.y) < 14) { skip = true; break; }
      }
      if (!skip || status === 'player' || isSel) {
        placed.push(ctr);
        let labelName = c.name;
        if (state && state.worldOwnership && state.worldOwnership[c.id] === state.country?.id) {
          labelName = (state.country?.name || 'شما');
        } else if (typeof getCountryDisplayName === 'function' && state && state.worldOwnership && state.worldOwnership[c.id]) {
          labelName = state.country?.name || c.name;
        }
        const short = labelName.length > 11 ? labelName.slice(0, 9) + '…' : labelName;
        const fs = isSel || status === 'player' ? 8.5 : 7;
        labels += `<text class="map-label" data-id="${c.id}" x="${ctr.x.toFixed(1)}" y="${ctr.y.toFixed(1)}"
          text-anchor="middle" dominant-baseline="middle" font-size="${fs}"
          fill="#f1f5f9" style="pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,0.9);font-weight:${status==='player'||isSel?700:500};opacity:${dim}">${short}</text>`;
      }
    });

    return `
      <defs>
        <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="rgba(120,160,200,0.06)" stroke-width="0.4"/>
        </pattern>
        <radialGradient id="ocean-grad" cx="50%" cy="42%" r="70%">
          <stop offset="0%" stop-color="#1a4060"/>
          <stop offset="50%" stop-color="#0e2a48"/>
          <stop offset="100%" stop-color="#081420"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#ocean-grad)"/>
      <rect width="100%" height="100%" fill="url(#map-grid)"/>
      <g class="map-countries">${paths}</g>
      <g class="map-labels">${labels}</g>`;
  }

  function applyTransform() {
    const layer = document.getElementById('map-transform-layer');
    if (!layer) return;
    const cx = VB_W / 2, cy = VB_H / 2;
    layer.setAttribute('transform',
      `translate(${mapState.panX},${mapState.panY}) translate(${cx},${cy}) scale(${mapState.zoom}) translate(${-cx},${-cy})`);
  }

  function renderMap(state) {
    const host = document.getElementById('map-world');
    if (!host) return;
    ensureGeo();

    if (!host.querySelector('.map-viewport')) {
      host.innerHTML = `
        <div class="map-viewport" id="map-viewport">
          <svg id="map-svg" viewBox="0 0 ${VB_W} ${VB_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Political World Map">
            <g id="map-transform-layer"></g>
          </svg>
          <div class="map-tooltip" id="map-tooltip" style="display:none"></div>
        </div>
        <div class="map-controls">
          <button type="button" class="map-ctrl-btn" data-act="zoom-in" title="Zoom +">+</button>
          <button type="button" class="map-ctrl-btn" data-act="zoom-out" title="Zoom −">−</button>
          <button type="button" class="map-ctrl-btn" data-act="reset" title="Reset">⟲</button>
          <button type="button" class="map-ctrl-btn" data-act="center" title="Center player">◎</button>
        </div>
        <div class="map-search-wrap">
          <input type="search" id="map-search" class="map-search" placeholder="جستجوی کشور…" autocomplete="off"/>
        </div>
        <div class="map-legend" id="map-legend">
          <div class="legend-item"><span class="leg-dot player"></span>بازیکن</div>
          <div class="legend-item"><span class="leg-dot allied"></span>متحد</div>
          <div class="legend-item"><span class="leg-dot friendly"></span>دوست</div>
          <div class="legend-item"><span class="leg-dot neutral"></span>بی‌طرف</div>
          <div class="legend-item"><span class="leg-dot tense"></span>تنش</div>
          <div class="legend-item"><span class="leg-dot hostile"></span>خصمانه</div>
          <div class="legend-item"><span class="leg-dot war"></span>در جنگ</div>
        </div>`;
      bindMapEvents();
    }

    const layer = document.getElementById('map-transform-layer');
    if (layer) {
      layer.innerHTML = buildSVG(state);
      applyTransform();
      layer.querySelectorAll('.map-country').forEach(el => {
        el.addEventListener('mouseenter', onPathEnter);
        el.addEventListener('mouseleave', onPathLeave);
        el.addEventListener('click', onPathClick);
      });
    }
    mapState.ready = true;
  }

  function onPathEnter(e) {
    const id = e.currentTarget.getAttribute('data-id');
    mapState.hovered = id;
    e.currentTarget.style.filter = 'drop-shadow(0 0 5px rgba(56,189,248,0.55)) brightness(1.1)';
    showTooltip(id, e);
  }
  function onPathLeave(e) {
    mapState.hovered = null;
    e.currentTarget.style.filter = '';
    hideTooltip();
  }
  function onPathClick(e) {
    e.stopPropagation();
    const id = e.currentTarget.getAttribute('data-id');
    mapState.selected = id;
    const state = typeof getState === 'function' ? getState() : null;
    if (state) renderMap(state);
    if (typeof onMapCountryClick === 'function') onMapCountryClick(id);
  }

  function showTooltip(countryId, evt) {
    const tip = document.getElementById('map-tooltip');
    if (!tip) return;
    const state = typeof getState === 'function' ? getState() : null;
    const c = (PLAYABLE_COUNTRIES || []).find(x => x.id === countryId);
    if (!c) return;
    const status = getDiploStatus(state, countryId);
    const rel = state?.diplomacy?.relations?.[countryId];
    const val = countryId === state?.country?.id ? '—' :
      (typeof getRelationValue === 'function' ? Math.round(getRelationValue(rel)) : (typeof rel === 'number' ? Math.round(rel) : '—'));
    const labels = { player:'کشور شما', allied:'متحد', friendly:'دوست', neutral:'بی‌طرف', tense:'تنش', hostile:'خصمانه', enemy:'دشمن', war:'در جنگ' };
    tip.innerHTML = `
      <div class="tip-head">${c.flag || ''} <strong>${c.name}</strong></div>
      <div class="tip-row"><span>جمعیت</span><b>${c.population ? (c.population/1e6).toFixed(0)+'M' : '—'}</b></div>
      <div class="tip-row"><span>GDP</span><b>${c.baseGDP ?? '—'}</b></div>
      <div class="tip-row"><span>نظامی</span><b>${c.militaryPower ?? '—'}</b></div>
      <div class="tip-row"><span>فناوری</span><b>${c.techLevel ?? '—'}</b></div>
      <div class="tip-row"><span>روابط</span><b>${val}</b></div>
      <div class="tip-status status-${status}">${labels[status] || status}</div>`;
    tip.style.display = 'block';
    positionTooltip(evt);
  }
  function positionTooltip(evt) {
    const tip = document.getElementById('map-tooltip');
    const vp = document.getElementById('map-viewport');
    if (!tip || !vp) return;
    const rect = vp.getBoundingClientRect();
    let x = evt.clientX - rect.left + 14;
    let y = evt.clientY - rect.top + 14;
    if (x + 210 > rect.width) x = evt.clientX - rect.left - 220;
    if (y + 180 > rect.height) y = evt.clientY - rect.top - 170;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  }
  function hideTooltip() {
    const tip = document.getElementById('map-tooltip');
    if (tip) tip.style.display = 'none';
  }

  function bindMapEvents() {
    const host = document.getElementById('map-world');
    if (!host || host._mapBound) return;
    host._mapBound = true;
    host.querySelectorAll('.map-ctrl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.getAttribute('data-act');
        if (a === 'zoom-in') mapZoom(1.25);
        else if (a === 'zoom-out') mapZoom(0.8);
        else if (a === 'reset') mapReset();
        else if (a === 'center') mapCenterPlayer();
      });
    });
    const search = document.getElementById('map-search');
    if (search) {
      search.addEventListener('input', () => {
        mapState.searchQuery = search.value.trim();
        const q = mapState.searchQuery.toLowerCase();
        document.querySelectorAll('.map-country').forEach(el => {
          const id = el.getAttribute('data-id');
          const c = (PLAYABLE_COUNTRIES || []).find(x => x.id === id);
          const match = !q || (c && (c.name.includes(mapState.searchQuery) || id.includes(q)));
          el.style.opacity = match ? '' : '0.22';
        });
      });
      search.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const q = search.value.trim().toLowerCase();
        const c = (PLAYABLE_COUNTRIES || []).find(x =>
          x.name.includes(search.value.trim()) || x.id.includes(q));
        if (c) {
          mapState.selected = c.id;
          mapCenterOn(c.id);
          if (typeof onMapCountryClick === 'function') onMapCountryClick(c.id);
          const st = typeof getState === 'function' ? getState() : null;
          if (st) renderMap(st);
        }
      });
    }
    const vp = document.getElementById('map-viewport');
    if (vp) {
      let dragging = false, lx = 0, ly = 0;
      vp.addEventListener('wheel', e => {
        e.preventDefault();
        mapZoom(e.deltaY < 0 ? 1.12 : 0.9);
      }, { passive: false });
      vp.addEventListener('pointerdown', e => {
        if (e.target.closest && e.target.closest('.map-country')) return;
        dragging = true; lx = e.clientX; ly = e.clientY;
        try { vp.setPointerCapture(e.pointerId); } catch (_) {}
        vp.classList.add('panning');
      });
      vp.addEventListener('pointermove', e => {
        if (!dragging) { if (mapState.hovered) positionTooltip(e); return; }
        mapState.panX += e.clientX - lx;
        mapState.panY += e.clientY - ly;
        lx = e.clientX; ly = e.clientY;
        applyTransform();
      });
      const end = () => { dragging = false; vp.classList.remove('panning'); };
      vp.addEventListener('pointerup', end);
      vp.addEventListener('pointercancel', end);
    }
  }

  function mapZoom(f) {
    mapState.zoom = Math.max(0.55, Math.min(6, mapState.zoom * f));
    applyTransform();
  }
  function mapReset() {
    mapState.zoom = 1; mapState.panX = 0; mapState.panY = 0;
    applyTransform();
  }
  function mapCenterOn(countryId) {
    const geo = ensureGeo();
    const ft = geo[countryId];
    if (!ft) return;
    const ctr = geomCentroid(ft.geometry);
    mapState.zoom = 2.4;
    const cx = VB_W / 2, cy = VB_H / 2;
    mapState.panX = (cx - ctr.x) * mapState.zoom;
    mapState.panY = (cy - ctr.y) * mapState.zoom;
    applyTransform();
  }
  function mapCenterPlayer() {
    const state = typeof getState === 'function' ? getState() : null;
    if (state?.country?.id) mapCenterOn(state.country.id);
  }

  g.MapEngine = {
    render: renderMap,
    zoom: mapZoom,
    reset: mapReset,
    centerPlayer: mapCenterPlayer,
    centerOn: mapCenterOn,
    getSelected: () => mapState.selected,
    setSelected: (id) => { mapState.selected = id; },
    getDiploStatus,
    project,
    ensureGeo
  };
  g.renderPoliticalMap = renderMap;
})(typeof window !== 'undefined' ? window : globalThis);
