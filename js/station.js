// --- Helpers ---
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// POST helper: try JSON; if it fails (non-2xx or JSON parse error), retry as form-encoded.
async function postSmart(url, payload) {
  // 1) Try JSON
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await r.text(); // read once
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error(`Non-JSON response (${r.status}): ${text.slice(0,200)}`); }
    if (!r.ok) throw new Error(data?.message || `HTTP ${r.status}`);
    return data;
  } catch (e1) {
    // 2) Retry as form-encoded
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

document.addEventListener('DOMContentLoaded', () => {
  const sName    = getParam('s_name');
  const titleEl  = document.getElementById('stationTitle');
  const selectEl = document.getElementById('nodeSelect');
  const container= document.getElementById('dataSection');

  titleEl.textContent = `Station: ${sName ?? ''}`;

  if (!sName) {
    container.innerHTML = `<p class="error">No station specified (missing ?s_name=...).</p>`;
    return;
  }

  // 1) Populate the node dropdown
  postSmart('https://users.iee.ihu.gr/~iee2019074/php/get_node_names.php', { s_name: sName })
    .then(j => {
      if (j.status === 'success' && Array.isArray(j.node_names)) {
        j.node_names.forEach(n => {
          const o = document.createElement('option');
          o.value = n; o.textContent = n;
          selectEl.appendChild(o);
        });
      } else {
        container.innerHTML = `<p class="error">${j.message || 'Failed loading nodes'}</p>`;
      }
    })
    .catch(err => {
      console.error('Nodes error:', err);
      container.innerHTML = `<p class="error">Failed loading nodes: ${String(err.message || err)}</p>`;
    });

  // 2) When a node is chosen, fetch ALL its data once
  selectEl.addEventListener('change', () => {
    const node = selectEl.value;
    container.innerHTML = '';
    if (!node) return;

    postSmart('https://users.iee.ihu.gr/~iee2019074/php/get_node.php', { s_name: sName, n_name: node })
      .then(j => {
        if (j.status === 'success' && Array.isArray(j.data)) {
          graphData(j.data, sName, node); // pass station & node so per-chart requery can work
        } else {
          container.innerHTML = `<p class="error">${j.message || 'Failed to load data'}</p>`;
        }
      })
      .catch(err => {
        console.error('Data error:', err);
        container.innerHTML = `<p class="error">Failed to load data: ${String(err.message || err)}</p>`;
      });
  });
});









