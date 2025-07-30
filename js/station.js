// Helper to read URL query params
function getParam(name) {
  const url = new URL(window.location);
  return url.searchParams.get(name);
}

document.addEventListener('DOMContentLoaded', () => {
  const sName = getParam('s_name');
  const titleEl = document.getElementById('stationTitle');
  const selectEl = document.getElementById('nodeSelect');
  const dataSection = document.getElementById('dataSection');

  // Display station name
  titleEl.textContent = `Station: ${sName}`;

  // Fetch node names
  fetch('get_node_names.php', {
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
      console.error(err);
      dataSection.innerHTML = '<p class="error">Unable to load node list.</p>';
    });

  // On node selection
  selectEl.addEventListener('change', () => {
    const node = selectEl.value;
    dataSection.innerHTML = ''; // clear
    if (!node) return;

    // Fetch data for that node
    fetch('get_node.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s_name: sName, n_name: node })
    })
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success') {
          renderData(json.data);
        } else {
          dataSection.innerHTML = `<p class="error">${json.message}</p>`;
        }
      })
      .catch(err => {
        console.error(err);
        dataSection.innerHTML = '<p class="error">Unable to load node data.</p>';
      });
  });

  // Render table of results
  function renderData(rows) {
    if (!rows.length) {
      dataSection.innerHTML = '<p>No data for this node.</p>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    // Header
    const header = table.insertRow();
    Object.keys(rows[0]).forEach(col => {
      const th = document.createElement('th');
      th.textContent = col;
      header.appendChild(th);
    });
    // Body
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