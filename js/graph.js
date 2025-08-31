// graph.js

// ===============================
// Theme bridge for Chart.js
// ===============================
(function(){
  const r = getComputedStyle(document.documentElement);
  const text = r.getPropertyValue('--text').trim() || '#e8ecf3';
  const muted = r.getPropertyValue('--muted').trim() || '#b6c2e1';
  const grid = 'rgba(255,255,255,0.12)';
  const accent = r.getPropertyValue('--accent').trim() || '#6ee7f9';
  const accent2 = r.getPropertyValue('--accent-2').trim() || '#a78bfa';

  Chart.defaults.color = text;
  Chart.defaults.font.family = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial';
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.color = text;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17,24,39,0.92)';
  Chart.defaults.plugins.tooltip.titleColor = '#fff';
  Chart.defaults.plugins.tooltip.bodyColor = '#fff';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,.12)';
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
  const axisCfg = {
    grid: { color: grid, tickColor: grid, borderColor: grid },
    ticks: { color: muted }
  };
  Chart.overrides.line = Chart.overrides.line || {};
  Chart.overrides.line.scales = Chart.overrides.line.scales || {};
  ['x','y'].forEach(k => Chart.overrides.line.scales[k] = axisCfg);
})();

// --- shared POST helper (same fallback as in station.js) ---
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

// ============ Modal utilities (lazy DOM lookup, so no defer required) ============
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
    activeChart = chart;

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

// Small helper
const el = (tag, className, content) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (content != null) e.textContent = content;
  return e;
};

// Build one chart-card (reusable for page and for modal)
function buildChartCard({ field, rows, station, node, large = false }) {
  const card = el('div', 'chart-card');

  // Header
  const head = el('div', 'chart-head');
  const title = el('div', 'chart-title', `${rows[0]?.n_name || ''} — ${field}`);

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

  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: field,
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
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { drawBorder: false }, title: { display: false } },
        y: { grid: { drawBorder: false }, title: { display: false } }
      }
    }
  });

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


// ---- tiny custom dropdown that mirrors a native <select> ----
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



/**
 * graphData — renders all charts
 */
function graphData(rows, station, node) {
  const container = document.getElementById('dataSection');
  container.innerHTML = '';

  if (!rows || rows.length === 0) {
    container.innerHTML = '<div class="empty">No data available for this node.</div>';
    return;
  }

  const exclude = new Set(['n_name', 'windDirection', 'created_at']);
  const keys = Object.keys(rows[0] || {});
  const numericFields = keys.filter(k => {
    if (exclude.has(k)) return false;
    return rows.some(r => Number.isFinite(parseFloat(r[k])));
  });

  if (numericFields.length === 0) {
    container.innerHTML = '<div class="empty">No numeric fields to plot.</div>';
    return;
  }

  numericFields.forEach(field => {
    const { card } = buildChartCard({ field, rows, station, node, large: false });
    container.appendChild(card);
  });
}


document.addEventListener('DOMContentLoaded', () => {
  const ns = document.getElementById('nodeSelect');
  if (ns) window.upgradeToDropdown(ns, { variant: 'node' });
});
