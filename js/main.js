function showPageLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) loader.classList.remove('is-hidden');
}

function hidePageLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) loader.classList.add('is-hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  showPageLoader();

  const listEl = document.getElementById('stationsList');
  const searchInput = document.getElementById('searchInput');
  if (!listEl || !searchInput) {
    hidePageLoader();
    return;
  }

  let stations = [];

  fetch('https://users.iee.ihu.gr/~iee2019074/php/get_stations.php')
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        stations = Array.isArray(data.stations) ? data.stations : [];
        renderList(stations);
      } else {
        listEl.innerHTML = '<li class="station-item">Failed to load stations</li>';
      }
    })
    .catch(err => {
      console.error(err);
      listEl.innerHTML = '<li class="station-item">Error loading stations</li>';
    })
    .finally(() => {
      hidePageLoader();
    });

  function normalizeStation(item) {
    if (typeof item === 'string') {
      return {
        s_id: item,
        s_name: item, 
        status: 'offline',
        last_update: null
      };
    }

    return {
      s_id: item.s_id,
      s_name: item.s_name || `Station ${item.s_id}`,
      status: item.status || 'offline',
      last_update: item.last_update || null
    };
  }

  function renderList(items) {
    listEl.innerHTML = '';

    if (!items.length) {
      listEl.innerHTML = '<li class="station-item">No stations found</li>';
      return;
    }

    items.forEach(rawItem => {
      const station = normalizeStation(rawItem);

      const li = document.createElement('li');
      li.className = 'station-item';
      //li.textContent = station.s_name;
      li.innerHTML = `
        <div class="station-icon">📡</div>
        <h3>${station.s_name}</h3>

        ${station.last_update ? `
          <p><strong>Last update:</strong> ${station.last_update}</p>
        ` : ''}

        <p>${station.status ?? 'offline'}</p>
      `;


      li.addEventListener('click', () => {
        console.log('station object:', station);
        console.log('selected_s_id:', station.s_id);

        sessionStorage.setItem('selected_s_id', station.s_id);

        window.location.href =
          `station.html?s_name=${encodeURIComponent(station.s_name)}`;  
      });

      listEl.appendChild(li);
    });
  }

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();

    const filtered = stations.filter(rawItem => {
      const station = normalizeStation(rawItem);
      return (
        String(station.s_name).toLowerCase().includes(query) ||
        String(station.s_id).toLowerCase().includes(query)
      );
    });

    renderList(filtered);
  });
});

document.addEventListener('pointermove', e => {
  const t = e.target.closest('.station-item');
  if (!t) return;
  const r = t.getBoundingClientRect();
  t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  t.style.setProperty('--my', (e.clientY - r.top) + 'px');
});