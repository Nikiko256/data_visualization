// Admin API base (relative to /admin/)
const API = "../php/admin";

const toastEl = document.getElementById("toast");

function toast(type, text) {
  toastEl.innerHTML = `<div class="${type === "ok" ? "ok" : "err"}">${text}</div>`;
  toastEl.classList.add("is-show");
  window.clearTimeout(toastEl._t);
  toastEl._t = window.setTimeout(() => toastEl.classList.remove("is-show"), 3200);
}

async function postJSON(url, payload) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Non-JSON response (${r.status}): ${text.slice(0, 200)}`); }

  if (!r.ok || data.status !== "success") {
    throw new Error(data.message || `HTTP ${r.status}`);
  }
  return data;
}

// ---------------- Tabs ----------------
function setupTabs() {
  const tabs = document.querySelectorAll(".admin-tab");
  const panels = document.querySelectorAll(".admin-section");

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.tab;

      tabs.forEach(t => t.classList.toggle("is-active", t === btn));
      tabs.forEach(t => t.setAttribute("aria-selected", t === btn ? "true" : "false"));

      panels.forEach(p => p.classList.toggle("is-active", p.dataset.panel === key));
    });
  });
}

// ---------------- Stations ----------------
const stationsTbody = document.getElementById("stationsTbody");
const nodeStationSelect = document.getElementById("nodeStationSelect");

async function loadStations() {
  const j = await postJSON(`${API}/stations_list.php`, {});
  renderStations(j.data || []);
  fillStationsSelect(j.data || []);
}

function renderStations(rows) {
  stationsTbody.innerHTML = "";

  if (!rows.length) {
    stationsTbody.innerHTML = `
      <tr><td colspan="3" style="color:var(--muted);padding:14px">No stations yet.</td></tr>
    `;
    return;
  }

  rows.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge">${escapeHtml(s.s_id)}</span></td>
      <td>
        <input class="admin-row-input" data-sname="${escapeAttr(s.s_id)}" value="${escapeAttr(s.s_name || "")}">
      </td>
      <td>
        <div class="admin-actions-inline">
          <button class="btn btn-ghost" data-save="${escapeAttr(s.s_id)}" type="button">Save</button>
          <button class="btn btn-ghost" data-del="${escapeAttr(s.s_id)}" type="button">Delete</button>
        </div>
      </td>
    `;
    stationsTbody.appendChild(tr);
  });

  stationsTbody.querySelectorAll("[data-save]").forEach((b) => {
    b.addEventListener("click", async () => {
      const s_id = b.dataset.save;
      const inp = stationsTbody.querySelector(`input[data-sname="${CSS.escape(s_id)}"]`);
      const s_name = (inp?.value || "").trim();
      if (!s_name) return toast("err", "s_name cannot be empty");

      try {
        await postJSON(`${API}/stations_update.php`, { s_id, s_name });
        toast("ok", "Station updated");
        await loadStations();
      } catch (e) {
        toast("err", e.message);
      }
    });
  });

  stationsTbody.querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", async () => {
      const s_id = b.dataset.del;
      if (!confirm(`Delete station "${s_id}"? (node metadata will also be removed)`)) return;

      try {
        await postJSON(`${API}/stations_delete.php`, { s_id });
        toast("ok", "Station deleted");
        await loadStations();
        await loadNodes();
      } catch (e) {
        toast("err", e.message);
      }
    });
  });
}

function fillStationsSelect(rows) {
  const cur = nodeStationSelect.value;
  nodeStationSelect.innerHTML = `<option value="">-- choose station --</option>`;
  rows.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.s_id;
    opt.textContent = `${s.s_name} (${s.s_id})`;
    nodeStationSelect.appendChild(opt);
  });
  // keep selection if still exists
  if ([...nodeStationSelect.options].some(o => o.value === cur)) nodeStationSelect.value = cur;
}

function setupStationCreate() {
  const s_id = document.getElementById("s_id");
  const s_name = document.getElementById("s_name");

  document.getElementById("createStation").addEventListener("click", async () => {
    const id = s_id.value.trim();
    const name = s_name.value.trim();
    if (!id || !name) return toast("err", "Fill s_id and s_name");

    try {
      await postJSON(`${API}/stations_create.php`, { s_id: id, s_name: name });
      toast("ok", "Station created");
      s_id.value = "";
      s_name.value = "";
      await loadStations();
    } catch (e) {
      toast("err", e.message);
    }
  });

  document.getElementById("clearStationForm").addEventListener("click", () => {
    s_id.value = "";
    s_name.value = "";
  });
}

// ---------------- Nodes ----------------
const nodesTbody = document.getElementById("nodesTbody");

async function loadNodes() {
  const j = await postJSON(`${API}/nodes_list.php`, {});
  renderNodes(j.data || []);
}

function renderNodes(rows) {
  nodesTbody.innerHTML = "";

  if (!rows.length) {
    nodesTbody.innerHTML = `
      <tr><td colspan="5" style="color:var(--muted);padding:14px">No nodes yet.</td></tr>
    `;
    return;
  }

  rows.forEach((n) => {
    const active = Number(n.is_active) === 1;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge">${escapeHtml(n.s_id)}</span></td>
      <td><span class="badge">${escapeHtml(n.n_name)}</span></td>
      <td>
        <input class="admin-row-input" data-disp="${escapeAttr(n.id)}" value="${escapeAttr(n.display_name || "")}">
      </td>
      <td>
        <span class="badge ${active ? "on" : "off"}">${active ? "1" : "0"}</span>
      </td>
      <td>
        <div class="admin-actions-inline">
          <button class="btn btn-ghost" data-save-node="${escapeAttr(n.id)}" type="button">Save</button>
          <button class="btn btn-ghost" data-toggle="${escapeAttr(n.id)}" data-active="${active ? "1" : "0"}" type="button">
            ${active ? "Disable" : "Enable"}
          </button>
          <button class="btn btn-ghost" data-del-node="${escapeAttr(n.id)}" type="button">Delete</button>
        </div>
      </td>
    `;
    nodesTbody.appendChild(tr);
  });

  nodesTbody.querySelectorAll("[data-save-node]").forEach((b) => {
    b.addEventListener("click", async () => {
      const id = Number(b.dataset.saveNode);
      const inp = nodesTbody.querySelector(`input[data-disp="${id}"]`);
      const display_name = (inp?.value || "").trim();

      try {
        await postJSON(`${API}/nodes_update.php`, { id, display_name });
        toast("ok", "Node updated");
        await loadNodes();
      } catch (e) {
        toast("err", e.message);
      }
    });
  });

  nodesTbody.querySelectorAll("[data-toggle]").forEach((b) => {
    b.addEventListener("click", async () => {
      const id = Number(b.dataset.toggle);
      const is_active = b.dataset.active === "1" ? 0 : 1;

      try {
        await postJSON(`${API}/nodes_set_active.php`, { id, is_active });
        toast("ok", "Node status updated");
        await loadNodes();
      } catch (e) {
        toast("err", e.message);
      }
    });
  });

  nodesTbody.querySelectorAll("[data-del-node]").forEach((b) => {
    b.addEventListener("click", async () => {
      const id = Number(b.dataset.delNode);
      if (!confirm(`Delete node id ${id}?`)) return;

      try {
        await postJSON(`${API}/nodes_delete.php`, { id });
        toast("ok", "Node deleted");
        await loadNodes();
      } catch (e) {
        toast("err", e.message);
      }
    });
  });
}

function setupNodeCreate() {
  const n_name = document.getElementById("n_name");
  const display_name = document.getElementById("display_name");

  document.getElementById("createNode").addEventListener("click", async () => {
    const s_id = nodeStationSelect.value.trim();
    const nn = n_name.value.trim();
    const dn = display_name.value.trim();

    if (!s_id) return toast("err", "Choose a station first");
    if (!nn) return toast("err", "n_name cannot be empty");

    try {
      await postJSON(`${API}/nodes_create.php`, { s_id, n_name: nn, display_name: dn });
      toast("ok", "Node created");
      n_name.value = "";
      display_name.value = "";
      await loadNodes();
    } catch (e) {
      toast("err", e.message);
    }
  });

  document.getElementById("clearNodeForm").addEventListener("click", () => {
    nodeStationSelect.value = "";
    n_name.value = "";
    display_name.value = "";
  });
}

// ---------------- Utilities ----------------
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function escapeAttr(s){ return escapeHtml(s).replace(/"/g, "&quot;"); }

// ---------------- Boot ----------------
document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupStationCreate();
  setupNodeCreate();

  document.getElementById("refreshAll").addEventListener("click", async () => {
    try {
      await loadStations();
      await loadNodes();
      toast("ok", "Refreshed");
    } catch (e) {
      toast("err", e.message);
    }
  });

  try {
    await loadStations();
    await loadNodes();
  } catch (e) {
    toast("err", e.message);
  }
});
