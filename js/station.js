function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

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

document.addEventListener('DOMContentLoaded', async () => {
  const sName = getParam('s_name');
  const titleEl = document.getElementById('stationTitle');
  const container = document.getElementById('dataSection');

  if (titleEl) {
    titleEl.textContent = `Station: ${sName ?? ''}`;
  }

  if (!sName) {
    if (container) {
      container.innerHTML = `<p class="error">No station specified.</p>`;
    }
    return;
  }

  if (container) {
    container.innerHTML = `<p>Loading charts...</p>`;
  }

  try {
    const dataRes = await postSmart(
      'https://users.iee.ihu.gr/~iee2019074/php/get_station_history.php',
      { s_name: sName }
    );

    if (dataRes.status === 'success' && Array.isArray(dataRes.data)) {
      graphData(dataRes.data, sName, null);
      //loadTimeAverages(sName);
    } else {
      container.innerHTML = `<p class="error">${dataRes.message || 'Failed to load station data.'}</p>`;
    }
  } catch (err) {
    console.error(err);
    if (container) {
      container.innerHTML = `<p class="error">Failed to load charts: ${String(err.message || err)}</p>`;
    }
  }
});