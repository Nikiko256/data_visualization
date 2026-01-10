// Small helper to create elements
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function cssVar(name, fallback = '') {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function tickColor() {
  return cssVar('--chart-ticks', cssVar('--text', '#111'));
}

function gridColor() {
  return cssVar('--chart-grid', 'rgba(0,0,0,0.12)');
}

// keep references to charts so we can refresh them on theme toggle
window.__charts = window.__charts || new Set();
window.registerChart = (ch) => (window.__charts.add(ch), ch);
window.rethemeAllCharts = () => window.__charts.forEach(ch => ch.update('none'));


// ===============================
// Theme bridge for Chart.js

// keep a registry of charts
window.__charts = window.__charts || new Set();

window.registerChart = function registerChart(chart) {
  window.__charts.add(chart);
  return chart;
};

window.rethemeAllCharts = function rethemeAllCharts() {
  const r = getComputedStyle(document.documentElement);
  const ticks = r.getPropertyValue('--chart-ticks').trim() || r.getPropertyValue('--text').trim();
  const grid  = r.getPropertyValue('--chart-grid').trim() || 'rgba(0,0,0,0.12)';

  window.__charts.forEach((ch) => {
    if (!ch || ch._destroyed) return;

    // update axis colors per chart
    if (ch.options?.scales) {
      Object.values(ch.options.scales).forEach((s) => {
        if (!s) return;
        s.ticks = s.ticks || {};
        s.grid  = s.grid  || {};
        s.ticks.color = ticks;
        s.grid.color = grid;
        s.grid.tickColor = grid;
        s.grid.borderColor = grid;
      });
    }

    // refresh gradients if dataset uses them
    const ctx = ch.ctx;
    if (ctx && ch.data?.datasets?.length) {
      ch.data.datasets.forEach(ds => {
        if (typeof window.makeLineGradient === 'function') ds.borderColor = window.makeLineGradient(ctx);
        if (typeof window.makeFillGradient === 'function') ds.backgroundColor = window.makeFillGradient(ctx);
        if (ds.pointBackgroundColor) ds.pointBackgroundColor = window.makeLineGradient(ctx);
      });
    }

    ch.update('none');
  });
};

// ===============================
(function(){
  const r = getComputedStyle(document.documentElement);
  
  /*const text = r.getPropertyValue('--text').trim() || '#e8ecf3';
  const muted = r.getPropertyValue('--muted').trim() || '#b6c2e1';
  const grid = 'rgba(255,255,255,0.12)';*/
  const text  = r.getPropertyValue('--text').trim() || '#0b1220';
  const ticks = r.getPropertyValue('--chart-ticks').trim() || text;
  const grid  = r.getPropertyValue('--chart-grid').trim() || 'rgba(0,0,0,0.12)';

  const accent = r.getPropertyValue('--accent').trim() || '#6ee7f9';
  const accent2 = r.getPropertyValue('--accent-2').trim() || '#460fec';

  Chart.defaults.color = text;
  Chart.defaults.font.family = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial';
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.color = text;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17,24,39,0.92)';
  Chart.defaults.plugins.tooltip.titleColor = '#fff';
  Chart.defaults.plugins.tooltip.bodyColor = '#fff';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,.12)';
  Chart.defaults.plugins.tooltip.titleFont = { size: 16, weight: '600' }; // tooltip title
  Chart.defaults.plugins.tooltip.bodyFont  = { size: 16 };                // tooltip body
  Chart.defaults.plugins.tooltip.footerFont = { size: 12 };               // (optional)
  Chart.defaults.elements.point.radius = 0;
  Chart.defaults.elements.line.tension = 0.35;

  // Gradients
  window.makeLineGradient = (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    g.addColorStop(0, accent);
    g.addColorStop(1, accent2);
    return g;
  };
  window.makeFillGradient = (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    g.addColorStop(0, 'rgba(110,231,249,0.22)');
    g.addColorStop(1, 'rgba(167,139,250,0.04)');
    return g;
  };

  // Axes
  /*const axisCfg = {
    grid: { color: grid, tickColor: grid, borderColor: grid },
    ticks: { color: muted }
  };*/
  const axisCfg = {
    grid: { color: grid, tickColor: grid, borderColor: grid },
    ticks: { color: ticks }
  };
  

  Chart.overrides.line = Chart.overrides.line || {};
  Chart.overrides.line.scales = Chart.overrides.line.scales || {};
  ['x','y'].forEach(k => Chart.overrides.line.scales[k] = axisCfg);

  Chart.overrides.line.scales.y = {
    ...Chart.overrides.line.scales.y,
    ticks: {
      ...(Chart.overrides.line.scales.y?.ticks || {}),
      font: { size: 16 }
    }
  };
})();

// --- shared POST helper (JSON first, then form-encoded fallback) ---
async function postSmart(url, payload) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error(`Non-JSON response (${r.status}): ${text.slice(0,200)}`); }
    if (!r.ok) throw new Error(data?.message || `HTTP ${r.status}`);
    return data;
  } catch (e1) {
    const form = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => form.append(k, v ?? ''));
    const r2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    const text2 = await r2.text();
    let data2;
    try { data2 = JSON.parse(text2); }
    catch { throw new Error(`Non-JSON response (${r2.status}): ${text2.slice(0,200)}`); }
    if (!r2.ok) throw new Error(data2?.message || `HTTP ${r2.status}`);
    return data2;
  }
}

// ============ Modal utilities ============
const modal = (() => {
  let activeChart = null;

  const getRoot = () => document.getElementById('chartModal');
  const getBody = () => getRoot()?.querySelector('.modal-body');

  function open(contentBuilder){
    const root = getRoot(), body = getBody();
    if (!root || !body) return;

    // cleanup previous
    if (activeChart) { try { activeChart.destroy(); } catch(_){} activeChart = null; }
    body.innerHTML = '';

    const { card, chart } = contentBuilder();
    body.appendChild(card);
    activeChart = chart || null;

    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');

    const onKey = (e) => { if (e.key === 'Escape') close(); };
    root._escHandler = onKey;
    document.addEventListener('keydown', onKey);

    if (!root._backdropBound) {
      root.addEventListener('click', (e) => {
        if (e.target && e.target.hasAttribute('data-close-modal')) close();
      });
      root._backdropBound = true;
    }
  }

  function close(){
    const root = getRoot();
    if (!root) return;
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
    if (activeChart) { try { activeChart.destroy(); } catch(_){} activeChart = null; }
    if (root._escHandler) {
      document.removeEventListener('keydown', root._escHandler);
      root._escHandler = null;
    }
  }

  return { open, close };
})();

// ---------- Tiny custom dropdown that mirrors <select> ----------
window.upgradeToDropdown = function upgradeToDropdown(select, { variant = 'time' } = {}) {
  if (!select || select.dataset.ddUpgraded) return;
  select.dataset.ddUpgraded = '1';

  // wrapper + move select inside (visually hidden)
  const wrap = document.createElement('div');
  wrap.className = 'dd';
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  select.classList.add('dd__native');

  // button
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `dd__btn ${variant === 'node' ? 'dd__btn--node' : 'dd__btn--time'}`;
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.textContent = select.options[select.selectedIndex]?.text || '—';
  wrap.appendChild(btn);

  // menu lives in <body> to avoid clipping by .chart-card overflow
  const menu = document.createElement('div');
  menu.className = 'dd__menu';
  document.body.appendChild(menu);

  let open = false;
  const closeAll = () => {
    if (!open) return;
    open = false;
    wrap.classList.remove('dd--open');
    btn.setAttribute('aria-expanded', 'false');
    menu.style.display = 'none';
    document.removeEventListener('click', onDocClick, true);
    window.removeEventListener('scroll', closeAll, { passive: true });
    window.removeEventListener('resize', closeAll);
    document.removeEventListener('keydown', onKey);
  };

  const onDocClick = (e) => { if (!wrap.contains(e.target) && e.target !== menu && !menu.contains(e.target)) closeAll(); };
  const onKey = (e) => { if (e.key === 'Escape') closeAll(); };

  function buildMenu() {
    menu.innerHTML = '';
    [...select.options].forEach((opt, idx) => {
      const item = document.createElement('div');
      item.className = 'dd__option';
      item.setAttribute('role', 'option');
      if (opt.disabled) item.setAttribute('aria-disabled', 'true');
      if (opt.selected) item.setAttribute('aria-selected', 'true');
      item.textContent = opt.textContent;
      item.addEventListener('click', () => {
        if (opt.disabled) return;
        select.selectedIndex = idx;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        btn.textContent = opt.textContent;
        closeAll();
      });
      menu.appendChild(item);
    });
  }

  function positionMenu() {
    const r = btn.getBoundingClientRect();
    menu.style.minWidth = `${r.width}px`;
    menu.style.left = `${Math.round(r.left)}px`;
    // show to measure height
    menu.style.display = 'block';
    const h = menu.offsetHeight;
    const below = r.bottom + 6 + h <= window.innerHeight - 8;
    menu.style.top = below ? `${Math.round(r.bottom + 6)}px` : `${Math.round(r.top - 6 - h)}px`;
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (open) return closeAll();
    buildMenu();
    positionMenu();
    open = true;
    wrap.classList.add('dd--open');
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      document.addEventListener('click', onDocClick, true);
      window.addEventListener('scroll', closeAll, { passive: true });
      window.addEventListener('resize', closeAll);
      document.addEventListener('keydown', onKey);
    }, 0);
  });

  // keep button text synced if value set programmatically
  select.addEventListener('change', () => {
    btn.textContent = select.options[select.selectedIndex]?.text || '—';
  });
};

// ---------- Labels & wind helpers ----------
const FRIENDLY_LABELS = {
  soilTemp: 'Soil Temperature',
  soilMoist: 'Soil Moisture',
  airTemp: 'Air Temperature',
  airHumid: 'Air Humidity',
  pressure: 'Air Pressure',
  airPressure: 'Air Pressure',
  airPress: 'Air Pressure',
  temp: 'Temperature',
  humid: 'Humidity',
  co2: 'CO₂',
  tvoc: 'tVOC',
  light: 'Light',
  battery: 'Battery',
  windSpeed: 'Wind Speed',
  windGust: 'Wind Gust',
};

// === Units (only the ones you specified) ===
const UNITS = {
  soilTemp: '°C',
  soilMoist: '%',
  airTemp: '°C',
  airHumid: '%',
  pressure: 'hPa',
  airPressure: 'hPa',
  airPress: 'hPa',
  windSpeed: 'km/h',
  windGust: 'km/h',
};

function unitForKey(key){ return UNITS[key] || null; }

function prettyLabel(key){
  if (FRIENDLY_LABELS[key]) return FRIENDLY_LABELS[key];
  // camelCase / snake_case -> Title Case
  const spaced = String(key)
    .replace(/[_-]+/g,' ')
    .replace(/([a-z])([A-Z])/g,'$1 $2')
    .toLowerCase();
  return spaced.replace(/\b\w/g, m => m.toUpperCase());
}

const DIRS = [
  {abbr:'N',  full:'North',       deg:  0, char:'↑'},
  {abbr:'NE', full:'North-East',  deg: 45, char:'↗'},
  {abbr:'E',  full:'East',        deg: 90, char:'→'},
  {abbr:'SE', full:'South-East',  deg:135, char:'↘'},
  {abbr:'S',  full:'South',       deg:180, char:'↓'},
  {abbr:'SW', full:'South-West',  deg:225, char:'↙'},
  {abbr:'W',  full:'West',        deg:270, char:'←'},
  {abbr:'NW', full:'North-West',  deg:315, char:'↖'},
];

const WORD_TO_DIR = new Map([
  ['N','N'],['NORTH','N'],
  ['NE','NE'],['NORTHEAST','NE'],['NORTH EAST','NE'],['NORTH-EAST','NE'],
  ['E','E'],['EAST','E'],
  ['SE','SE'],['SOUTHEAST','SE'],['SOUTH EAST','SE'],['SOUTH-EAST','SE'],
  ['S','S'],['SOUTH','S'],
  ['SW','SW'],['SOUTHWEST','SW'],['SOUTH WEST','SW'],['SOUTH-WEST','SW'],
  ['W','W'],['WEST','W'],
  ['NW','NW'],['NORTHWEST','NW'],['NORTH WEST','NW'],['NORTH-WEST','NW'],
]);

function normDeg(d){ d = Number(d); if (!Number.isFinite(d)) return null; d%=360; if (d<0) d+=360; return d; }
function parseWindValue(val){
  if (val == null) return null;
  if (typeof val === 'number') return normDeg(val);
  const s = String(val).trim();
  // try pure number first
  const m = s.match(/-?\d+(\.\d+)?/);
  if (m) { const d = normDeg(parseFloat(m[0])); if (d!=null) return d; }
  const key = s.replace(/\s+/g,' ').replace(/[^A-Za-z]/g,' ').trim().toUpperCase();
  const abbr = WORD_TO_DIR.get(key);
  if (abbr){
    const dir = DIRS.find(d => d.abbr === abbr);
    return dir?.deg ?? null;
  }
  return null;
}
function dirFromDeg(deg){
  if (deg==null) return null;
  const idx = Math.round(deg / 45) % 8;
  return DIRS[idx];
}

// ===== Chart theme re-apply (call after theme toggle) =====
function readChartTheme() {
  const r = getComputedStyle(document.documentElement);
  const text  = r.getPropertyValue('--text').trim() || '#111';
  const ticks = r.getPropertyValue('--chart-ticks').trim() || text;
  const grid  = r.getPropertyValue('--chart-grid').trim() || 'rgba(0,0,0,0.12)';
  return { text, ticks, grid };
}

window.__charts = window.__charts || new Set();
window.registerChart = (ch) => (window.__charts.add(ch), ch);

window.rethemeAllCharts = function () {
  const { text, ticks, grid } = readChartTheme();

  // defaults (optional but good)
  Chart.defaults.color = text;
  Chart.defaults.plugins.legend.labels.color = text;

  // update existing charts
  window.__charts.forEach((ch) => {
    const sx = ch.options?.scales?.x;
    const sy = ch.options?.scales?.y;

    if (sx) {
      sx.ticks = { ...(sx.ticks || {}), color: ticks };
      sx.grid  = { ...(sx.grid  || {}), color: grid };
    }
    if (sy) {
      sy.ticks = { ...(sy.ticks || {}), color: ticks };
      sy.grid  = { ...(sy.grid  || {}), color: grid };
    }

    ch.update('none');
  });
};


// ---------- Reusable CHART card ----------
function buildChartCard({ field, rows, station, node, large = false }) {
  const card = el('div', 'chart-card');

  // Header
  const head = el('div', 'chart-head');
  const nodeName = rows[0]?.n_name || '';
  const title = el('div', 'chart-title', `${prettyLabel(field)} (${unitForKey(field) || 'N/A'})`);
  title.style.fontSize = 'clamp(16px, 2.2vw, 22px)';

  const select = el('select', 'time-select');
  [
    ['All time','all'],
    ['Last 24h','24'],
    ['Last 48h','48'],
    ['Last week','168'],
    ['Last month','720'],
    ['Last year','8760'],
    ['Last 5 years','43800'],
  ].forEach(([lbl, val]) => {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = lbl;
    select.appendChild(opt);
  });

  // Expand button (only on small cards; modal doesn't need it)
  let expandBtn = null;
  if (!large) {
    expandBtn = el('button', 'expand-btn', '⤢');
    expandBtn.type = 'button';
    expandBtn.title = 'Expand';
  }

  // Layout head: title | [select, expand]
  const rightBox = el('div');
  rightBox.style.display = 'flex';
  rightBox.style.alignItems = 'center';
  rightBox.style.gap = '8px';
  rightBox.appendChild(select);
  if (expandBtn) rightBox.appendChild(expandBtn);

  head.appendChild(title);
  head.appendChild(rightBox);

  window.upgradeToDropdown(select, { variant: 'time' });

  // Chart area
  const box = el('div', 'chart-box');
  const canvas = el('canvas', 'chart-canvas');
  const skeleton = el('div', 'chart-skeleton');

  card.appendChild(head);
  card.appendChild(skeleton);
  box.appendChild(canvas);
  card.appendChild(box);

  // Init chart
  const labels = rows.map(r => r.created_at);
  const values = rows.map(r => {
    const v = parseFloat(r[field]);
    return Number.isFinite(v) ? v : null;
  });

  const unit = unitForKey(field);
  const labelWithUnit = unit ? `${prettyLabel(field)} (${unit})` : prettyLabel(field);

  const ctx = canvas.getContext('2d');
  const chart = window.registerChart(new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: labelWithUnit,
        data: values,
        borderWidth: 2,
        borderColor: makeLineGradient(ctx),
        backgroundColor: makeFillGradient(ctx),
        fill: true,
      }]
    },
    options: {
      responsive: true,
      resizeDelay: 150,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        title: { font: { size: 30 }, display: true },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed.y;
              if (val == null || !Number.isFinite(val)) return 'No data';
              // Soil Moisture special meanings
              if (field === 'soilMoist') {
                if (val === -10) return 'Sensor not placed properly in soil';
                if (val === 100) return 'Soil too wet to calculate';
              }
              return unit ? `${val} ${unit}` : String(val);
            }
          }
        }
      },
    scales: {
      x: {
        grid: { drawBorder: false, color: () => gridColor() },
        ticks: { color: () => tickColor() },
        title: { display: false }
      },
      y: {
        grid: { drawBorder: false, color: () => gridColor() },
        ticks: { color: () => tickColor(), font: { size: 16 } },
        title: { display: false, text: '' }
      }
    }
    }
  }));

  window.registerChart(chart);


  skeleton.remove();

  // Time change: refetch and update this chart only
  select.addEventListener('change', async () => {
    const val = select.value;
    let url, body;
    if (val === 'all') {
      url  = 'https://users.iee.ihu.gr/~iee2019074/php/get_node.php';
      body = { s_name: station, n_name: node };
    } else {
      url  = 'https://users.iee.ihu.gr/~iee2019074/php/get_node_by_time.php';
      body = { s_name: station, n_name: node, hours: parseInt(val, 10) };
    }

    card.classList.add('skeleton');
    try {
      const j = await postSmart(url, body);
      card.classList.remove('skeleton');

      if (j.status === 'success' && Array.isArray(j.data)) {
        const newRows = j.data;
        chart.data.labels = newRows.map(r => r.created_at);
        chart.data.datasets[0].data = newRows.map(r => {
          const v = parseFloat(r[field]);
          return Number.isFinite(v) ? v : null;
        });
        chart.update();
      } else {
        showInlineError(card, j?.message || 'No data for selected range.');
      }
    } catch (err) {
      card.classList.remove('skeleton');
      console.error(`Error fetching ${field}:`, err);
      showInlineError(card, `Network/server error: ${String(err.message || err)}`);
    }
  });

  // Expand action
  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      modal.open(() => {
        const big = buildChartCard({ field, rows, station, node, large: true });
        return { card: big.card, chart: big.chart };
      });
    });
  }

  return { card, chart };
}

function showInlineError(card, msg){
  let p = card.querySelector('.chart-error');
  if (!p) {
    p = document.createElement('p');
    p.className = 'chart-error';
    p.style.color = 'var(--muted)';
    p.style.margin = '8px 6px 0';
    card.appendChild(p);
  }
  p.textContent = msg;
}

// ---------- Wind Direction card ----------
function buildWindCard({ rows, station, node, large = false }) {
  const card = el('div', 'chart-card wind-card');

  // Header
  const head = el('div', 'chart-head');
  const nodeName = rows[0]?.n_name || '';
  const title = el('div', 'chart-title', `Wind Direction`);
  title.style.fontSize = 'clamp(16px, 2.2vw, 22px)';

  const select = el('select', 'time-select');
  [
    ['All time','all'],
    ['Last 24h','24'],
    ['Last 48h','48'],
    ['Last week','168'],
    ['Last month','720'],
    ['Last year','8760'],
    ['Last 5 years','43800'],
  ].forEach(([lbl, val]) => {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = lbl;
    select.appendChild(opt);
  });

  let expandBtn = null;
  if (!large) {
    expandBtn = el('button', 'expand-btn', '⤢');
    expandBtn.type = 'button';
    expandBtn.title = 'Expand';
  }

  const rightBox = el('div');
  rightBox.style.display = 'flex';
  rightBox.style.alignItems = 'center';
  rightBox.style.gap = '8px';
  rightBox.appendChild(select);
  if (expandBtn) rightBox.appendChild(expandBtn);

  head.appendChild(title);
  head.appendChild(rightBox);
  card.appendChild(head);

  window.upgradeToDropdown(select, { variant: 'time' });

  // Chart area
  const box = el('div', 'chart-box');
  const canvas = el('canvas', 'chart-canvas');
  const skeleton = el('div', 'chart-skeleton');

  card.appendChild(skeleton);
  box.appendChild(canvas);
  card.appendChild(box);

  // --- Build categorical series (points with y = direction label) ---
  const Y_CATS = DIRS.map(d => d.full); // ["North", "North-East", ..., "North-West"]

  function toSeries(arr) {
    const labels = arr.map(r => r.created_at);
    const points = arr.map((r, i) => {
      const ts = labels[i];
      const deg = parseWindValue(r?.windDirection);
      if (deg == null) return { x: ts, y: null };
      const dir = dirFromDeg(deg);
      if (!dir) return { x: ts, y: null };
      return { x: ts, y: dir.full, _deg: deg }; // _deg for tooltip
    });
    return { labels, points };
  }

  let { labels, points } = toSeries(rows);

  // Build chart (dots only; no connecting line)
  const ctx = canvas.getContext('2d');
  const chart = window.registerChart (new Chart(ctx, {
    type: 'line',
    data: {
      labels,                    // optional when using point.x; kept for consistency
      datasets: [{
        label: 'Wind Direction',
        data: points,            // [{x: time, y: "North"}, ...]
        parsing: true,
        showLine: false,         // dots only
        spanGaps: false,
        borderWidth: 0,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: makeLineGradient(ctx),
      }]
    },
    options: {
      responsive: true,
      resizeDelay: 150,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const raw = ctx.raw;
              if (!raw || raw.y == null) return 'No data';
              return `${raw.y}${raw._deg != null ? ` (${Math.round(raw._deg)}°)` : ''}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          grid: { drawBorder: false, color: () => gridColor() },
          ticks: { color: () => tickColor() },
          title: { display: false }
        },
        y: {
          type: 'category',
          labels: Y_CATS,          // <- IMPORTANT: fixed order of directions
          offset: true,
          grid: { drawBorder: false, color: () => gridColor() },
          ticks: { color: () => tickColor(), font: { size: 16 } },
          title: { display: false, text: '' }
        }
      }
    }
  }));

  window.registerChart(chart);


  skeleton.remove();

  // Time change -> refetch + re-render series
  select.addEventListener('change', async () => {
    const val = select.value;
    let url, body;
    if (val === 'all') {
      url  = 'https://users.iee.ihu.gr/~iee2019074/php/get_node.php';
      body = { s_name: station, n_name: node };
    } else {
      url  = 'https://users.iee.ihu.gr/~iee2019074/php/get_node_by_time.php';
      body = { s_name: station, n_name: node, hours: parseInt(val, 10) };
    }

    card.classList.add('skeleton');
    try {
      const j = await postSmart(url, body);
      card.classList.remove('skeleton');
      if (j.status === 'success' && Array.isArray(j.data)) {
        const series = toSeries(j.data);
        labels = series.labels;
        points = series.points;

        chart.data.labels = labels;
        chart.data.datasets[0].data = points;
        chart.update();
      } else {
        showInlineError(card, j?.message || 'No data for selected range.');
      }
    } catch (err) {
      card.classList.remove('skeleton');
      console.error('Wind fetch error:', err);
      showInlineError(card, `Network/server error: ${String(err.message || err)}`);
    }
  });

  // Expand
  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      modal.open(() => {
        const big = buildWindCard({ rows, station, node, large: true });
        return { card: big.card, chart: big.chart };
      });
    });
  }

  return { card, chart };
}



// ========== Render all cards ==========
function graphData(rows, station, node) {
  const container = document.getElementById('dataSection');
  container.innerHTML = '';

  if (!rows || rows.length === 0) {
    container.innerHTML = '<div class="empty">No data available for this node.</div>';
    return;
  }

  // Which keys are numeric (skip windDirection)
  const keys = Object.keys(rows[0] || {});
  const numericFields = keys.filter(k => {
    if (k === 'n_name' || k === 'windDirection' || k === 'created_at') return false;
    return rows.some(r => Number.isFinite(parseFloat(r[k])));
  });

  // Charts
  numericFields.forEach(field => {
    const { card } = buildChartCard({ field, rows, station, node, large: false });
    container.appendChild(card);
  });

  // Wind Direction card (if present at all)
  const hasWind = rows.some(r => r && r.windDirection != null && String(r.windDirection).trim() !== '');
  if (hasWind) {
    const { card } = buildWindCard({ rows, station, node, large: false });
    container.appendChild(card);
  }
}

// Auto-upgrade the top node select after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const ns = document.getElementById('nodeSelect');
  if (ns) window.upgradeToDropdown(ns, { variant: 'node' });
});