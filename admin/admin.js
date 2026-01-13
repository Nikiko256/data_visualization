function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, m => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));
}

async function postJSON(url, payload){
  const r = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload || {})
  });
  const text = await r.text();
  let j;
  try { j = JSON.parse(text); } catch { throw new Error(`Non-JSON ${r.status}: ${text.slice(0,200)}`); }
  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j;
}

async function getJSON(url){
  const r = await fetch(url, { cache: 'no-store' });
  const text = await r.text();
  let j;
  try { j = JSON.parse(text); } catch { throw new Error(`Non-JSON ${r.status}: ${text.slice(0,200)}`); }
  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j;
}

// ---- CONFIG: put YOUR endpoints here ----
const API = {
  stations_list:   '../php/admin/stations_list.php',   // you may not have it -> use your own list endpoint if named differently
  stations_create: '../php/admin/stations_create.php',
  stations_update: '../php/admin/stations_update.php',
  stations_delete: '../php/admin/stations_delete.php',

  nodes_list:      '../php/admin/nodes_list.php',
  nodes_create:    '../php/admin/nodes_create.php',
  nodes_update:    '../php/admin/nodes_update.php', // rename from nodes_updates.php OR change here
  nodes_delete:    '../php/admin/nodes_delete.php',
  nodes_set_active:'../php/admin/nodes_set_active.php',
};

// Data caches
let STATIONS = [];
let NODES = [];

function setTab(which){
  const stBtn = document.getElementById('tabStations');
  const ndBtn = document.getElementById('tabNodes');
  document.getElementById('panelStations').style.display = which === 'stations' ? 'block' : 'none';
  document.getElementById('panelNodes').style.display    = which === 'nodes' ? 'block' : 'none';
  stBtn.classList.toggle('is-active', which === 'stations');
  ndBtn.classList.toggle('is-active', which === 'nodes');
}

function renderStations(filter=''){
  const tb = document.getElementById('stationsTbody');
  const q = filter.trim().toLowerCase();

  const rows = STATIONS.filter(s => (`${s.s_id} ${s.s_name}`).toLowerCase().includes(q));

  tb.innerHTML = rows.map(s => `
    <tr style="border-top:1px solid var(--white-10);">
      <td style="padding:10px; color:var(--muted);">${esc(s.s_id)}</td>
      <td style="padding:10px;">
        <input class="time-select" style="width:100%; padding:10px;"
               data-st-id="${esc(s.s_id)}" value="${esc(s.s_name)}">
      </td>
      <td style="padding:10px; white-space:nowrap;">
        <button class="btn" data-act="st-save" data-sid="${esc(s.s_id)}">Save</button>
        <button class="btn" data-act="st-del" data-sid="${esc(s.s_id)}" style="margin-left:8px;">Delete</button>
      </td>
    </tr>
  `).join('');
}

function refillStationsSelect(){
  const sel = document.getElementById('nodeCreateStation');
  sel.innerHTML = STATIONS.map(s => `<option value="${esc(s.s_id)}">${esc(s.s_name)} (${esc(s.s_id)})</option>`).join('');
}

function renderNodes(filter=''){
  const tb = document.getElementById('nodesTbody');
  const q = filter.trim().toLowerCase();

  const rows = NODES.filter(n => {
    const hay = `${n.id} ${n.s_id} ${n.n_name} ${n.display_name||''} ${n.is_active}`.toLowerCase();
    return hay.includes(q);
  });

  tb.innerHTML = rows.map(n => {
    const checked = String(n.is_active) === '1' ? 'checked' : '';
    return `
      <tr style="border-top:1px solid var(--white-10);">
        <td style="padding:10px; color:var(--muted);">#${esc(n.id)}</td>
        <td style="padding:10px; color:var(--muted);">${esc(n.s_id)}</td>
        <td style="padding:10px; color:var(--muted);">${esc(n.n_name)}</td>
        <td style="padding:10px;">
          <input class="time-select" style="width:100%; padding:10px;"
                 data-node-id="${esc(n.id)}"
                 value="${esc(n.display_name || '')}"
                 placeholder="Display name...">
        </td>
        <td style="padding:10px;">
          <label style="display:flex; gap:10px; align-items:center;">
            <input type="checkbox" data-act="node-active" data-node-id="${esc(n.id)}" ${checked}>
            <span style="color:var(--muted);">${String(n.is_active) === '1' ? 'Active' : 'Inactive'}</span>
          </label>
        </td>
        <td style="padding:10px; white-space:nowrap;">
          <button class="btn" data-act="node-save" data-node-id="${esc(n.id)}">Save</button>
          <button class="btn" data-act="node-del" data-node-id="${esc(n.id)}" style="margin-left:8px;">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function reloadAll(){
  // IMPORTANT: you MUST have stations_list endpoint that returns stations.
  // If you don't have it, tell me its filename and I adapt API.stations_list.
  const st = await getJSON(API.stations_list);
  STATIONS = st.data || st.stations || [];  // accept either key

  const nd = await getJSON(API.nodes_list);
  NODES = nd.data || [];

  refillStationsSelect();
  renderStations(document.getElementById('stSearch').value || '');
  renderNodes(document.getElementById('nodeSearch').value || '');
}

document.addEventListener('DOMContentLoaded', async () => {
  setTab('stations');

  document.getElementById('tabStations').addEventListener('click', () => setTab('stations'));
  document.getElementById('tabNodes').addEventListener('click', () => setTab('nodes'));

  document.getElementById('stSearch').addEventListener('input', e => renderStations(e.target.value));
  document.getElementById('nodeSearch').addEventListener('input', e => renderNodes(e.target.value));

  document.getElementById('btnCreateStation').addEventListener('click', async () => {
    const s_id = document.getElementById('stCreateId').value.trim();
    const s_name = document.getElementById('stCreateName').value.trim();
    if (!s_id || !s_name) return alert('Fill s_id and s_name');
    await postJSON(API.stations_create, { s_id, s_name });
    document.getElementById('stCreateId').value = '';
    document.getElementById('stCreateName').value = '';
    await reloadAll();
  });

  document.getElementById('btnCreateNode').addEventListener('click', async () => {
    const s_id = document.getElementById('nodeCreateStation').value;
    const n_name = document.getElementById('nodeCreateName').value.trim();
    const display_name = document.getElementById('nodeCreateDisplay').value.trim();
    if (!s_id || !n_name) return alert('Fill station and n_name');
    await postJSON(API.nodes_create, { s_id, n_name, display_name });
    document.getElementById('nodeCreateName').value = '';
    document.getElementById('nodeCreateDisplay').value = '';
    await reloadAll();
  });

  document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;

    const act = btn.dataset.act;

    if (act === 'st-save') {
      const s_id = btn.dataset.sid;
      const input = document.querySelector(`input[data-st-id="${CSS.escape(s_id)}"]`);
      const s_name = input.value.trim();
      await postJSON(API.stations_update, { s_id, s_name });
      await reloadAll();
      alert('Saved.');
    }

    if (act === 'st-del') {
      const s_id = btn.dataset.sid;
      if (!confirm(`Delete station ${s_id}? (Also deletes node metadata)`)) return;
      await postJSON(API.stations_delete, { s_id });
      await reloadAll();
    }

    if (act === 'node-save') {
      const id = Number(btn.dataset.nodeId);
      const input = document.querySelector(`input[data-node-id="${id}"]`);
      const display_name = input.value.trim();
      await postJSON(API.nodes_update, { id, display_name });
      await reloadAll();
      alert('Saved.');
    }

    if (act === 'node-del') {
      const id = Number(btn.dataset.nodeId);
      if (!confirm(`Delete node metadata #${id}?`)) return;
      await postJSON(API.nodes_delete, { id });
      await reloadAll();
    }
  });

  document.body.addEventListener('change', async (e) => {
    const cb = e.target.closest('input[type="checkbox"][data-act="node-active"]');
    if (!cb) return;

    const id = Number(cb.dataset.nodeId);
    const is_active = cb.checked ? 1 : 0;
    await postJSON(API.nodes_set_active, { id, is_active });
    await reloadAll();
  });

  try {
    await reloadAll();
  } catch (err) {
    console.error(err);
    alert('Admin API error: ' + (err.message || err));
  }
});
