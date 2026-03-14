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

function prettyLabel(key) {
  const map = {
    soilTemp: 'Soil Temperature',
    soilMoist: 'Soil Moisture',
    airTemp: 'Air Temperature',
    airHumid: 'Air Humidity',
    airPress: 'Air Pressure',
    rainDepth: 'Rain Depth',
    windSpeed: 'Wind Speed',
    windDirection: 'Wind Direction'
  };
  return map[key] || key;
}

function unitForKey(key) {
  const map = {
    soilTemp: '°C',
    soilMoist: '%',
    airTemp: '°C',
    airHumid: '%',
    airPress: 'hPa',
    rainDepth: 'mm',
    windSpeed: 'km/h'
  };
  return map[key] || '';
}

function renderAverageCards(avgData) {
  const container = document.getElementById('dataSection');
  container.innerHTML = '';

  const averages = avgData.averages || {};

  Object.entries(averages).forEach(([key, value]) => {
    const card = document.createElement('div');
    card.className = 'chart-card';

    const title = document.createElement('h3');
    title.className = 'chart-title';
    title.textContent = prettyLabel(key);

    const val = document.createElement('p');
    val.className = 'avg-value';

    if (value === null || value === undefined) {
      val.textContent = 'No data';
    } else if (key === 'windDirection') {
      val.textContent = value;
    } else {
      const unit = unitForKey(key);
      val.textContent = `${Number(value).toFixed(2)}${unit ? ' ' + unit : ''}`;
    }

    card.appendChild(title);
    card.appendChild(val);
    container.appendChild(card);
  });

  const meta = document.createElement('div');
  meta.className = 'station-meta';
  meta.innerHTML = `
    <p><strong>Nodes used:</strong> ${avgData.node_count ?? 0}</p>
    <p><strong>Latest update:</strong> ${avgData.latest_created_at ?? 'N/A'}</p>
  `;
  container.appendChild(meta);
}

document.addEventListener('DOMContentLoaded', () => {
  const sName = getParam('s_name');
  const titleEl = document.getElementById('stationTitle');
  const container = document.getElementById('dataSection');

  titleEl.textContent = `Station: ${sName ?? ''}`;

  if (!sName) {
    container.innerHTML = `<p class="error">No station specified.</p>`;
    return;
  }

  postSmart('https://users.iee.ihu.gr/~iee2019074/php/get_station_average.php', { s_name: sName })
    .then(j => {
      if (j.status === 'success') {
        renderAverageCards(j);
      } else {
        container.innerHTML = `<p class="error">${j.message || 'Failed to load station averages'}</p>`;
      }
    })
    .catch(err => {
      console.error('Average data error:', err);
      container.innerHTML = `<p class="error">Failed to load station averages: ${String(err.message || err)}</p>`;
    });
});