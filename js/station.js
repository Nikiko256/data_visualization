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
  placeholderOpt.textContent = 'Επιλογή κόμβου';
  placeholderOpt.selected = true;
  placeholderOpt.disabled = true;
  nodeSelect.appendChild(placeholderOpt);


  const avgOpt = document.createElement('option');
  avgOpt.value = 'average_nodes';
  avgOpt.textContent = 'Μέσος όρος κόμβων';
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
    titleEl.textContent = `Σταθμός: ${sName ?? ''}`;
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
      nodeContainer.innerHTML = `
        <div class="station-info-panel">
          <p class="empty-message">
            📊 Επιλέξτε έναν κόμβο για να δείτε τα δεδομένα των μετρήσεων σας υπό τη μορφή γραφημάτων. Παρακάτω παρουσιάζονται 
            τα βασικά χαρακτηριστικα της σελίδας απεικόνησης δεδομένων.
          </p> 

          <div class="info-grid">
            <div class="info-card">
              <h3>Κόμβοι σταθμών</h3>
              <p>
                Ένας μετεωρολογικός σταθμός αποτελείται από έναν ή περισσότερους κόμβους.
                Κάθε κόμβος αντιπροσωπεύει έναν ESP32, στον οποίο είναι συνδεδεμένοι όλοι οι αισθητήρες. Εκείνοι
                συλλέγουν 8 τύπους δεδομένων: θερμοκρασία χώματος & αέρα, υγρασία χώματος & αέρα, ταχύτητα  ανέμου, πίεση αέρα, ύψος βροχής και κατεύθυνση ανέμου.
              </p>
            </div>

            <div class="info-card">
              <h3>Μέσος όρος κόμβων</h3>
              <p>
                Η επιλογή <strong>Μέσος όρος κόμβων</strong> εμφανίζει τον μέσο όρο των δεδομένων 
                από όλους τους διαθέσιμους κόμβους του σταθμού. Έτσι, ο χρήστης/ο γεωργός έχει μια πλήρη απεικόνηση για τη κατάσταση 
                του εκάστοτε χωραφιού.
              </p>
            </div>

            <div class="info-card">
              <h3>Φιλτράρισμα δεδομένων ανά χρονικό διάστημα</h3>
              <p>
                Για κάθε γράφημα, ο χρήστης μπορεί να <strong> φιλτράρει την εμφάνιση των δεδομένων ανά χρονικό διάστημα </strong>, όπως: ανα 24ωρο, 
                48ωρο, εβδομαδιαία, ετήσια κ.ο.κ. Ταυτόχρονα, για κάθε χρονικό διάστημα, εμφανίζεται <strong>ο μέσος όρος </strong> των μετρήσεων, <strong> η μέγιστη </strong> και <strong> η ελάχιστη τιμή μέτρησης </strong>
                 για το συγκεκριμένο διάστημα, ώστε ο χρήστης να διαθέτει μια γενική εικόνα για τις περιβαλλοντικές συνθήκες που επικρατούν.
              </p>
            </div>

            <div class="info-card">
              <h3>Εξαγωγή δεδομένων</h3>
              <p>
                Για κάθε κόμβο, παρέχεται στον χρήστη η δυνατότητα <strong> διεξαγωγής δεδομένων </strong>σε μορφή <strong>CSV </strong>,έτσι ώστε να τα αποθηκεύσει 
                ή να τα επεξεργαστεί σε εργαλεία ανάλυσης δεδομένων (Excel, Python, R).
              </p>
            </div>

          </div>
        </div>
        `;
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
    
    console.log('Selected node for export:', selectedNode);
    
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

document.addEventListener('pointermove', e => {
  const t = e.target.closest('.info-card');
  if (!t) return;

  const r = t.getBoundingClientRect();

  t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  t.style.setProperty('--my', (e.clientY - r.top) + 'px');
});