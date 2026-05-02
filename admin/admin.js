function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));
}

async function postJSON(url, payload) {
  const r = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload || {}),
    cache: 'no-store'
  });

  const text = await r.text();

  let j;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON ${r.status}: ${text.slice(0, 200)}`);
  }

  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j;
}

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  const text = await r.text();

  let j;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON ${r.status}: ${text.slice(0, 200)}`);
  }

  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j;
}

const API = {
  stations_list: '../php/admin/stations_list.php',
  stations_create: '../php/admin/stations_create.php',
  stations_update: '../php/admin/stations_update.php',
  stations_delete: '../php/admin/stations_delete.php',
  stations_approve: '../php/admin/stations_approve.php',
  stations_reject: '../php/admin/stations_reject.php',
  nodes_list: '../php/admin/nodes_list.php'
};

let STATIONS = [];
let NODES = [];

function setTab(which) {
  const stBtn = document.getElementById('tabStations');
  const ndBtn = document.getElementById('tabNodes');
  const stPanel = document.getElementById('panelStations');
  const ndPanel = document.getElementById('panelNodes');

  stPanel.style.display = which === 'stations' ? 'block' : 'none';
  ndPanel.style.display = which === 'nodes' ? 'block' : 'none';

  stBtn.classList.toggle('is-active', which === 'stations');
  ndBtn.classList.toggle('is-active', which === 'nodes');

  if (which === 'nodes') loadNodesForSelectedStation();
}

function renderStations(filter = '') {
  const tb = document.getElementById('stationsTbody');
  const q = filter.trim().toLowerCase();

  const rows = STATIONS.filter(s =>
    `${s.s_id} ${s.s_name}`.toLowerCase().includes(q)
  );

  if (!rows.length) {
    tb.innerHTML = `
      <tr>
        <td colspan="4" style="padding:12px; color:var(--muted);">
          No stations found.
        </td>
      </tr>
    `;
    return;
  }

  tb.innerHTML = rows.map(s => `
    <tr>
      <td style="padding:10px; color:var(--muted);">${esc(s.s_id)}</td>
      <td style="padding:10px;">
        <input class="time-select" style="width:100%; padding:10px;"
               data-st-id="${esc(s.s_id)}"
               value="${esc(s.s_name)}">
      </td>

      <td style="padding:10px; color:var(--muted);">
      ${esc(s.status || 'unknown')}
      </td>

      <td style="padding:10px; white-space:nowrap;">
        <button class="btn" data-act="st-save" data-sid="${esc(s.s_id)}">Save</button>
        <button class="btn" data-act="st-del" data-sid="${esc(s.s_id)}" style="margin-left:8px;">Delete</button>

        ${String(s.status || '').trim().toLowerCase() === 'pending' ? `
        <button class="btn" data-act="st-approve" data-sid="${esc(s.s_id)}" style="margin-left:8px;">Approve</button>
        <button class="btn" data-act="st-reject" data-sid="${esc(s.s_id)}" style="margin-left:8px;">Reject</button>
    ` : ''}
        </td>
    </tr>
  `).join('');
}

function refillStationDropdown(selected = '') {
  
  const trigger = document.getElementById('stationTrigger');
  const optionsBox = document.getElementById('stationOptions');

  if (!trigger || !optionsBox) return;

  optionsBox.innerHTML = '';

  if (!STATIONS.length) {
    trigger.textContent = 'No stations';
    return;
  }

  const selectedExists = STATIONS.some(s => s.s_id === selected);
  let current = selectedExists ? selected : STATIONS[0].s_id;

  STATIONS.forEach(s => {
    const opt = document.createElement('div');
    opt.className = 'custom-option';

    if (String(s.s_id) === String(current)) {
      opt.classList.add('is-selected');
    }

    opt.textContent = `${s.s_name} (${s.s_id})`;

    opt.addEventListener('click', async () => {
      current = s.s_id;
      trigger.textContent = `${s.s_name} (${s.s_id})`;

      document.querySelectorAll('.custom-option').forEach(o => {
        o.classList.remove('is-selected');
    });

    opt.classList.add('is-selected');

    document.getElementById('stationDropdown').classList.remove('open');

    await loadNodesForSelectedStation(current);
  });

  optionsBox.appendChild(opt);
  });

  const selectedStation = STATIONS.find(s => s.s_id === current);
  trigger.textContent = `${selectedStation.s_name} (${selectedStation.s_id})`;
}

function renderNodes(filter = '') {
  const tb = document.getElementById('nodesTbody');
  const q = filter.trim().toLowerCase();

  const rows = NODES.filter(n =>
    `${n.n_name} ${n.records || ''} ${n.last_seen || ''}`.toLowerCase().includes(q)
  );

  if (!rows.length) {
    tb.innerHTML = `
      <tr>
        <td colspan="3" style="padding:12px; color:var(--muted);">
          No nodes found for this station.
        </td>
      </tr>
    `;
    return;
  }

  tb.innerHTML = rows.map(n => `
    <tr>
      <td style="padding:10px; color:var(--muted);">${esc(n.n_name)}</td>
      <td style="padding:10px; color:var(--muted);">${esc(n.records ?? 0)}</td>
      <td style="padding:10px; color:var(--muted);">${esc(n.last_seen || '-')}</td>
    </tr>
  `).join('');
}

let lastPendingIds = new Set();

function showAdminMessage(message, type = 'info') {
  const box = document.getElementById('adminMessage');
  if (!box) return;

  box.textContent = message;
  box.className = `admin-message admin-message--${type}`;
  box.style.display = 'block';

  setTimeout(() => {
    box.style.display = 'none';
  }, 4000);
}

async function loadStations() {
  const selected = document.getElementById('nodeStationSelect')?.value || '';

  const st = await getJSON(API.stations_list);
  STATIONS = st.data || st.stations || [];

  renderStations(document.getElementById('stSearch')?.value || '');
  refillStationDropdown(selected);

  const notice = document.getElementById('pendingNotice');
  const pending = STATIONS.filter(s => 
  String(s.status || '').trim().toLowerCase() === 'pending');

  if (notice) {
    notice.innerHTML = pending.length
      ? `⚠️ ${pending.length} station(s) waiting for approval.`
      : '';
  }

  const currentPendingIds = new Set(pending.map(s => s.s_id));

  pending.forEach(s => {
    if (!lastPendingIds.has(s.s_id)) {
      showAdminMessage(`🔔 New weather station waiting for approval: ${s.s_id}`, 'warning');
    }
  });

  lastPendingIds = currentPendingIds;
}

async function loadNodesForSelectedStation(s_id_param = null) {
  const trigger = document.getElementById('stationTrigger');

  let s_id = s_id_param;

  if (!s_id) {
    const txt = trigger.textContent;
    const match = txt.match(/\((.*?)\)/);
    s_id = match ? match[1] : '';
  }

  if (!s_id) {
    NODES = [];
    renderNodes();
    return;
  }

  const res = await postJSON(API.nodes_list, { s_id });
  NODES = res.data || [];
  renderNodes(document.getElementById('nodeSearch')?.value || '');
}

document.getElementById('stationTrigger')?.addEventListener('click', () => {
  document.getElementById('stationDropdown').classList.toggle('open');
});

document.addEventListener('click', e => {
  if (!e.target.closest('#stationDropdown')) {
    document.getElementById('stationDropdown')?.classList.remove('open');
  }
});

async function reloadAll() {
  await loadStations();
  await loadNodesForSelectedStation();
}

document.addEventListener('DOMContentLoaded', async () => {
  setTab('stations');

  document.getElementById('tabStations')?.addEventListener('click', () => setTab('stations'));
  document.getElementById('tabNodes')?.addEventListener('click', () => setTab('nodes'));

  document.getElementById('stSearch')?.addEventListener('input', e => {
    renderStations(e.target.value);
  });

  document.getElementById('nodeSearch')?.addEventListener('input', e => {
    renderNodes(e.target.value);
  });

  document.getElementById('nodeStationSelect')?.addEventListener('change', async () => {
    await loadNodesForSelectedStation();
  });

  document.getElementById('btnCreateStation')?.addEventListener('click', async () => {
    const s_id = document.getElementById('stCreateId').value.trim();
    const s_name = document.getElementById('stCreateName').value.trim();

    if (!s_id || !s_name) return alert('Fill s_id and s_name');

    await postJSON(API.stations_create, { s_id, s_name });

    document.getElementById('stCreateId').value = '';
    document.getElementById('stCreateName').value = '';

    await reloadAll();
  });

  document.body.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;

    const act = btn.dataset.act;

    if (act === 'st-save') {
      const s_id = btn.dataset.sid;
      const input = document.querySelector(`input[data-st-id="${CSS.escape(s_id)}"]`);
      const s_name = input.value.trim();

      if (!s_name) return alert('Station name is required');

      if (!confirm(`Save changes for station ${s_id}?`)) return;

      await postJSON(API.stations_update, { s_id, s_name });
      await reloadAll();
      return;
    }

    if (act === 'st-del') {
      const s_id = btn.dataset.sid;
      if (!confirm(`Delete station ${s_id}?`)) return;

      await postJSON(API.stations_delete, { s_id });
      await reloadAll();
      return;
    }

    if (act === 'st-approve') {
      const s_id = btn.dataset.sid;

      if (!confirm(`Approve station ${s_id}?`)) return;

      await postJSON(API.stations_approve, { s_id });
      showAdminMessage(`✅ Station ${s_id} approved successfully.`, 'success');
      await reloadAll();
      return;
    }

    if (act === 'st-reject') {
      const s_id = btn.dataset.sid;

      if (!confirm(`Reject station ${s_id}?`)) return;

      await postJSON(API.stations_reject, { s_id });
      showAdminMessage(`🚫 Station ${s_id} rejected.`, 'warning');
      await reloadAll();
      return;
    }



  });

  try {
    await reloadAll();
  } catch (err) {
    console.error(err);
    alert('Admin API error: ' + (err.message || err));
  }
});