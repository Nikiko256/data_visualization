// graph.js

/**
 * rows: array of { n_name, soilTemp, soilMoist, airTemp, ... , created_at }
 * station, node: strings
 */
function graphData(rows, station, node) {
  const container = document.getElementById('dataSection');
  container.innerHTML = '';

  if (rows.length === 0) {
    container.innerHTML = '<p>No data available for this node.</p>';
    return;
  }

  // Time-range options [label, hours or 'all']
  const timeOpts = [
    ['All time','all'],
    ['Last 24h','24'],
    ['Last 48h','48'],
    ['Last week','168'],
    ['Last month','720'],
    ['Last year','8760'],
    ['Last 5 years','43800'],
  ];

  // Extract which keys are numeric
  const keys = Object.keys(rows[0]);
  const numeric = keys.filter(k =>
    k!=='n_name' && k!=='windDirection' && k!=='created_at'
  );

  // For each numeric field, build a chart + its own time dropdown
  numeric.forEach(field => {
    // Wrapper
    const wrap = document.createElement('div');
    wrap.className = 'chart-wrapper';

    // Title
    const h2 = document.createElement('h2');
    h2.textContent = `${rows[0].n_name} — ${field}`;
    wrap.appendChild(h2);

    // Time selector
    const sel = document.createElement('select');
    sel.className = 'chart-time-select';
    timeOpts.forEach(([lbl,val]) => {
      const o = document.createElement('option');
      o.value = val; o.textContent = lbl;
      sel.appendChild(o);
    });
    wrap.appendChild(sel);

    // Canvas
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    container.appendChild(wrap);

    // Initial chart instance
    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: rows.map(r=>r.created_at),
        datasets: [{ 
          label: field,
          data: rows.map(r=>parseFloat(r[field])),
          fill: false,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        plugins:{ legend:{ display:false }},
        scales: {
          x:{ title:{ display:true, text:'Time' }},
          y:{ title:{ display:true, text:field }}
        }
      }
    });

    // When this chart's time dropdown changes, re-fetch and update only this chart
    sel.addEventListener('change', () => {
      let url, body;
      if (sel.value === 'all') {
        url  = 'https://users.iee.ihu.gr/~iee2019074/php/get_node.php';
        body = { s_name: station, n_name: node };
      } else {
        url  = 'https://users.iee.ihu.gr/~iee2019074/php/get_node_by_time.php';
        body = { s_name: station, n_name: node, hours: parseInt(sel.value,10) };
      }

      fetch(url, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      })
        .then(r=>r.json())
        .then(j => {
          if (j.status==='success') {
            const newRows = j.data;
            // update labels + data
            chart.data.labels = newRows.map(r=>r.created_at);
            chart.data.datasets[0].data = newRows.map(r=>parseFloat(r[field]));
            chart.update();
          } else {
            // show an inline error
            wrap.querySelector('.chart-error')?.remove();
            const errP = document.createElement('p');
            errP.className = 'chart-error';
            errP.textContent = j.message;
            wrap.appendChild(errP);
          }
        })
        .catch(err => {
          console.error(`Error fetching ${field}:`, err);
        });
    });
  });
}
