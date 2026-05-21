function showPageLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) loader.classList.remove('is-hidden');
}

function hidePageLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) loader.classList.add('is-hidden');
}


function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function postSmart(url, payload) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await r.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${r.status}): ${text.slice(0, 200)}`);
  }

  if (!r.ok) throw new Error(data?.message || `HTTP ${r.status}`);
  return data;
}

async function loadNodeOptions(sName) {
  const nodeSelect = document.getElementById('nodeSelect');
  if (!nodeSelect) return;

  nodeSelect.innerHTML = '';

  const placeholderOpt = document.createElement('option');
  placeholderOpt.value = '';
  placeholderOpt.textContent = 'Select node';
  placeholderOpt.selected = true;
  nodeSelect.appendChild(placeholderOpt);

  placeholderOpt.disabled = true;

  const avgOpt = document.createElement('option');
  avgOpt.value = 'average_nodes';
  avgOpt.textContent = 'average_nodes';
  nodeSelect.appendChild(avgOpt);

  const res = await postSmart(
    'https://users.iee.ihu.gr/~iee2019074/php/get_node_names.php',
    { s_name: sName }
  );

  if (res.status === 'success' && Array.isArray(res.node_names)) {
    res.node_names.forEach(nodeName => {
      const opt = document.createElement('option');
      opt.value = nodeName;
      opt.textContent = nodeName;
      nodeSelect.appendChild(opt);
    });
  } else {
    throw new Error(res.message || 'Failed to load node names');
  }

  if (window.upgradeToDropdown) {
    window.upgradeToDropdown(nodeSelect, { variant: 'node' });
  } 
}

async function loadChartsForSelection(sName, selectedValue) {
  const nodeContainer = document.getElementById('nodeDataSection');
  if (!nodeContainer) return;

  if (!selectedValue) {
    nodeContainer.innerHTML = '';
    return;
  }

  nodeContainer.innerHTML = `<p>Loading charts...</p>`;

  if (selectedValue === 'average_nodes') {
    const avgRes = await postSmart(
      'https://users.iee.ihu.gr/~iee2019074/php/get_station_history.php',
      { s_name: sName }
    );

    if (avgRes.status === 'success' && Array.isArray(avgRes.data)) {
      graphData(avgRes.data, sName, null, 'nodeDataSection');
    } else {
      nodeContainer.innerHTML = `<p class="error">${avgRes.message || 'Failed to load average charts.'}</p>`;
    }
    return;
  }

  const nodeRes = await postSmart(
    'https://users.iee.ihu.gr/~iee2019074/php/get_node.php',
    { s_name: sName, n_name: selectedValue }
  );

  if (nodeRes.status === 'success' && Array.isArray(nodeRes.data)) {
    graphData(nodeRes.data, sName, selectedValue, 'nodeDataSection');
  } else {
    nodeContainer.innerHTML = `<p class="error">${nodeRes.message || 'Failed to load node charts.'}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  showPageLoader();

  const sName = getParam('s_name');
  let sId = sessionStorage.getItem('selected_s_id');

  if (!sId && sName) {
    try {
      const res = await fetch('https://users.iee.ihu.gr/~iee2019074/php/get_stations.php');
      const data = await res.json();

      if (data.status === 'success' && Array.isArray(data.stations)) {
        const found = data.stations.find(st =>
          String(st.s_name) === String(sName)
        );

        if (found) {
          sId = found.s_id;
          sessionStorage.setItem('selected_s_id', sId);
        }
      }
    } catch (err) {
      console.error('Failed to recover station id:', err);
    }
  }
  //let sId = sessionStorage.getItem('selected_s_name');
  const titleEl = document.getElementById('stationTitle');
  const nodeSelect = document.getElementById('nodeSelect');
  const nodeContainer = document.getElementById('nodeDataSection');

  if (titleEl) {
    titleEl.textContent = `Station: ${sName ?? ''}`;
  }

  if (!sName) {
    if (nodeContainer) {
      nodeContainer.innerHTML = `<p class="error">No station specified.</p>`;
    }
    hidePageLoader();
    return;
  }

  try {
    await loadNodeOptions(sName);

    if (nodeContainer) {
      nodeContainer.innerHTML = '';
    }

    if (nodeSelect) {
      nodeSelect.addEventListener('change', async () => {
        try {
          await loadChartsForSelection(sName, nodeSelect.value);
        } catch (err) {
          console.error(err);
          if (nodeContainer) {
            nodeContainer.innerHTML = `<p class="error">Failed to load charts: ${String(err.message || err)}</p>`;
          }
        }
      })

      const exportCsvBtn = document.getElementById('exportCsvBtn');

if (exportCsvBtn) {
  exportCsvBtn.addEventListener('click', () => {
    const currentSId = sId || sessionStorage.getItem('selected_s_id');

    if (!currentSId) {
      alert('Station id is missing.');
      return;
    }

    if (!nodeSelect || !nodeSelect.value) {
      alert('Please select a node first.');
      return;
    }

    const selectedNode = nodeSelect.value;

    const url =
      `https://users.iee.ihu.gr/~iee2019074/php/export_data.php` +
      `?s_id=${encodeURIComponent(currentSId)}` +
      `&n_name=${encodeURIComponent(selectedNode)}`;

    window.location.href = url;
  });
}

    }

  } catch (err) {
    console.error(err);
    if (nodeContainer) {
      nodeContainer.innerHTML = `<p class="error">Failed to load station data: ${String(err.message || err)}</p>`;
    }
  } finally {
    hidePageLoader();
  }
});