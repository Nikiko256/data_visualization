// station.js

// Simple URL-param helper
function getParam(name) {
  return new URL(location).searchParams.get(name);
}

document.addEventListener('DOMContentLoaded', () => {
  const sName    = getParam('s_name');
  const titleEl  = document.getElementById('stationTitle');
  const selectEl = document.getElementById('nodeSelect');
  const container= document.getElementById('dataSection');

  titleEl.textContent = `Station: ${sName}`;

  // 1) Populate the node dropdown
  fetch('https://users.iee.ihu.gr/~iee2019074/php/get_node_names.php', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ s_name: sName })
  })
    .then(r=>r.json())
    .then(j => {
      if (j.status==='success') {
        j.node_names.forEach(n=>{
          const o = document.createElement('option');
          o.value = n; o.textContent = n;
          selectEl.appendChild(o);
        });
      } else {
        container.innerHTML = `<p class="error">${j.message}</p>`;
      }
    })
    .catch(err=>{
      console.error(err);
      container.innerHTML = `<p class="error">Failed loading nodes</p>`;
    });

  // 2) When a node is chosen, fetch ALL its data once, then render per-chart controls
  selectEl.addEventListener('change', () => {
    const node = selectEl.value;
    container.innerHTML = '';
    if (!node) return;

    fetch('https://users.iee.ihu.gr/~iee2019074/php/get_node.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ s_name: sName, n_name: node })
    })
      .then(r=>r.json())
      .then(j => {
        if (j.status==='success') {
          // Pass station & node so each chart can re-query later
          graphData(j.data, sName, node);
        } else {
          container.innerHTML = `<p class="error">${j.message}</p>`;
        }
      })
      .catch(err=>{
        console.error(err);
        container.innerHTML = `<p class="error">Failed loading data</p>`;
      });
  });
});
