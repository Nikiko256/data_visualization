document.addEventListener('DOMContentLoaded', () => {
      const listEl = document.getElementById('stationsList');
      const searchInput = document.getElementById('searchInput');
      let stations = [];

      // Fetch station names from the deployed endpoint
      fetch('https://users.iee.ihu.gr/~iee2019074/php/get_stations.php')
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            stations = data.stations;
            renderList(stations);
          } else {
            listEl.innerHTML = '<li class="station-item">Failed to load stations</li>';
          }
        })
        .catch(err => {
          console.error(err);
          listEl.innerHTML = '<li class="station-item">Error loading stations</li>';
        });

      // Render list helper
      function renderList(items) {
        listEl.innerHTML = '';
        if (!items.length) {
          listEl.innerHTML = '<li class="station-item">No stations found</li>';
          return;
        }
        items.forEach(name => {
          const li = document.createElement('li');
          li.className = 'station-item';
          li.textContent = name;
          li.addEventListener('click', () => {
            window.location.href = `station.html?s_name=${encodeURIComponent(name)}`;
          });
          listEl.appendChild(li);
        });
      }

      // Filter as user types
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const filtered = stations.filter(name => name.toLowerCase().includes(query));
        renderList(filtered);
      });

      /*document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('themeToggle');
        if (btn) {
        btn.addEventListener('click', () => {
        const root = document.documentElement;
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        root.dataset.theme = next;
        localStorage.setItem('theme', next);
      });
        }
      
      }); */

    });

    // enhance the hover glow effect
    document.addEventListener('pointermove', e => {
  const t = e.target.closest('.station-item');
  if(!t) return;
  const r = t.getBoundingClientRect();
  t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  t.style.setProperty('--my', (e.clientY - r.top) + 'px');
});

