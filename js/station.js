// Reads station (s_name) from URL and populates node dropdown, then fetches node data

// Helper: get URL parameter
function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

document.addEventListener('DOMContentLoaded', () => {
  const sName = getParam('s_name');
  const titleEl = document.getElementById('stationTitle');
  const selectEl = document.getElementById('nodeSelect');
  const dataSection = document.getElementById('dataSection');

  // Display station name
  titleEl.textContent = `Station: ${sName}`;

  // Fetch node names for this station
  fetch('https://users.iee.ihu.gr/~iee2019074/php/get_node_names.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s_name: sName })
  })
    .then(res => res.json())
    .then(json => {
      if (json.status === 'success') {
        json.node_names.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          selectEl.appendChild(opt);
        });
      } else {
        dataSection.innerHTML = `<p class="error">${json.message}</p>`;
      }
    })
    .catch(err => {
      console.error('Error fetching node names:', err);
      dataSection.innerHTML = '<p class="error">Unable to load node list.</p>';
    });

  // When a node is selected, fetch its data
  selectEl.addEventListener('change', () => {
    const node = selectEl.value;
    dataSection.innerHTML = ''; // clear previous
    if (!node) return;

    fetch('https://users.iee.ihu.gr/~iee2019074/php/get_node.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s_name: sName, n_name: node })
    })
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success') {
          renderTable(json.data);
        } else {
          dataSection.innerHTML = `<p class="error">${json.message}</p>`;
        }
      })
      .catch(err => {
        console.error('Error fetching node data:', err);
        dataSection.innerHTML = '<p class="error">Unable to load node data.</p>';
      });
  });

  // Renders a table for the data rows
  function renderTable(rows) {
    if (!rows.length) {
      dataSection.innerHTML = '<p>No data for this node.</p>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';

    // Header row
    const headerRow = table.insertRow();
    Object.keys(rows[0]).forEach(col => {
      const th = document.createElement('th');
      th.textContent = col;
      headerRow.appendChild(th);
    });

    // Data rows
    rows.forEach(row => {
      const tr = table.insertRow();
      Object.values(row).forEach(val => {
        const td = tr.insertCell();
        td.textContent = val;
      });
    });

    dataSection.appendChild(table);
  }
});