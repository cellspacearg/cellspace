// VARIABLES
let currentSearchType = 'imei';
let lastResult = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {
  console.log('IMEI Checker loaded');
  createParticles();
  setupSearchTabs();
  setupIMEIInput();
  loadHistory();
});

// PARTICLES
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (8 + Math.random() * 15) + 's';
    p.style.animationDelay = Math.random() * 10 + 's';
    p.style.width = p.style.height = (1 + Math.random() * 3) + 'px';
    p.style.opacity = 0.1 + Math.random() * 0.4;
    container.appendChild(p);
  }
}

// TABS
function setupSearchTabs() {
  document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      currentSearchType = this.dataset.type;
      const input = document.getElementById('imeiInput');
      
      if (currentSearchType === 'imei') {
        input.placeholder = 'Ingresa el IMEI (15-16 dígitos)';
        input.maxLength = 16;
      } else if (currentSearchType === 'serial') {
        input.placeholder = 'Ingresa el Serial Number';
        input.maxLength = 20;
      } else {
        input.placeholder = 'Ingresa el MEID (14 dígitos)';
        input.maxLength = 14;
      }
      input.focus();
    });
  });
}

// INPUT VALIDATION
function setupIMEIInput() {
  const input = document.getElementById('imeiInput');
  input.addEventListener('input', function() {
    if (currentSearchType !== 'serial') {
      this.value = this.value.replace(/[^0-9A-Fa-f]/g, '');
    }
  });
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') checkIMEI();
  });
}

// CHECK IMEI - VERSIÓN SIMPLIFICADA
async function checkIMEI() {
  console.log('checkIMEI called');
  
  const input = document.getElementById('imeiInput');
  const value = input.value.trim();
  const btn = document.getElementById('searchBtn');
  
  if (!value) {
    alert('⚠️ Por favor ingresa un número para consultar');
    return;
  }
  
  console.log('Checking:', value, 'Type:', currentSearchType);
  
  // Loading state
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Consultando...';
  btn.disabled = true;
  
  try {
    // Simular delay de red (2 segundos)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Generating result...');
    
    // Generar resultado
    const result = generateMockResult(value);
    
    console.log('Result:', result);
    
    // Mostrar resultados
    lastResult = { imei: value, ...result };
    displayResults(lastResult);
    
    // Guardar en localStorage (sin Firebase)
    saveToLocalStorage(value, result);
    
    // Cargar historial
    loadHistory();
    
    console.log('Done!');
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error: ' + error.message);
  } finally {
    // Restaurar botón SIEMPRE
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// GENERAR RESULTADO MOCK
function generateMockResult(imei) {
  const isClean = !imei.startsWith('0');
  
  if (imei.length >= 15) {
    // Apple
    return {
      brand: 'Apple',
      model: 'iPhone 13 Pro',
      color: 'Graphite',
      capacity: '256GB',
      modelNumber: 'MLVF3LL/A',
      mpn: 'A2483',
      serial: 'F17LH8NHN71K',
      activationStatus: 'Activated',
      warrantyStatus: 'Active',
      warrantyDate: '2024-12-15',
      fmi: 'OFF',
      simLock: 'Unlocked',
      carrier: 'Factory Unlocked',
      blacklist: isClean ? 'Clean' : 'Blacklisted',
      replacement: 'No',
      soldBy: 'Apple Store',
      purchaseDate: '2023-12-15',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/IPhone_13_Pro_Graphite.svg/500px-IPhone_13_Pro_Graphite.svg.png'
    };
  } else {
    // Samsung
    return {
      brand: 'Samsung',
      model: 'Galaxy S23 Ultra',
      color: 'Phantom Black',
      capacity: '512GB',
      modelNumber: 'SM-S918B',
      serial: 'R58NB0ABCDE',
      warrantyStatus: 'Active',
      warrantyDate: '2025-06-20',
      kgStatus: 'Normal',
      knox: '0x0',
      csc: 'CHO',
      carrier: 'Unlocked',
      blacklist: isClean ? 'Clean' : 'Blacklisted',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Samsung_Galaxy_S23_Ultra.svg/500px-Samsung_Galaxy_S23_Ultra.svg.png'
    };
  }
}

// DISPLAY RESULTS
function displayResults(data) {
  console.log('Displaying results:', data);
  
  const section = document.getElementById('resultsSection');
  const card = document.getElementById('resultCard');
  
  if (!section || !card) {
    console.error('Elements not found!');
    return;
  }
  
  section.style.display = 'block';
  
  const statusClass = data.blacklist === 'Clean' ? 'clean' : 'blacklisted';
  const statusText = data.blacklist === 'Clean' ? '✅ Clean' : '⚠️ Blacklisted';
  
  card.innerHTML = `
    <div class="result-header">
      <div class="result-brand">
        <img src="${data.image}" alt="${data.brand}" onerror="this.src='https://via.placeholder.com/60?text=📱'">
        <div>
          <h3>${data.brand} ${data.model}</h3>
          <p style="color:var(--muted);margin:5px 0 0 0">${data.color} • ${data.capacity}</p>
        </div>
      </div>
      <span class="result-status ${statusClass}">${statusText}</span>
    </div>
    
    <div class="result-grid">
      <div class="result-item"><label>IMEI/Serial</label><span>${data.imei || data.serial}</span></div>
      <div class="result-item"><label>Model Number</label><span>${data.modelNumber}</span></div>
      <div class="result-item"><label>MPN</label><span>${data.mpn || '-'}</span></div>
      <div class="result-item"><label>Carrier</label><span>${data.carrier}</span></div>
      <div class="result-item"><label>Warranty</label><span>${data.warrantyStatus}</span></div>
      <div class="result-item"><label>Blacklist</label><span style="color:${data.blacklist === 'Clean' ? '#4CAF50' : '#ff4444'}">${data.blacklist}</span></div>
    </div>
    
    ${data.brand === 'Apple' ? `
    <div style="margin-top:25px;padding-top:25px;border-top:1px solid rgba(255,255,255,0.1);">
      <h4 style="color:var(--orange);margin:0 0 15px 0;font-size:14px;text-transform:uppercase;">🍎 Apple Info</h4>
      <div class="result-grid">
        <div class="result-item"><label>Find My iPhone</label><span>${data.fmi}</span></div>
        <div class="result-item"><label>SIM Lock</label><span>${data.simLock}</span></div>
        <div class="result-item"><label>Activation</label><span>${data.activationStatus}</span></div>
      </div>
    </div>
    ` : ''}
  `;
  
  // Scroll to results
  setTimeout(() => {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// SAVE TO LOCALSTORAGE (sin Firebase)
function saveToLocalStorage(imei, result) {
  try {
    const history = JSON.parse(localStorage.getItem('imei_history') || '[]');
    history.unshift({
      imei: imei,
      searchType: currentSearchType,
      result: result,
      timestamp: new Date().toISOString()
    });
    // Keep only last 20
    localStorage.setItem('imei_history', JSON.stringify(history.slice(0, 20)));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

// LOAD HISTORY
function loadHistory() {
  const grid = document.getElementById('historyGrid');
  if (!grid) return;
  
  try {
    const history = JSON.parse(localStorage.getItem('imei_history') || '[]');
    
    if (history.length === 0) {
      grid.innerHTML = '<p class="empty-state">No tenés consultas aún</p>';
      return;
    }
    
    grid.innerHTML = history.map(h => {
      const date = new Date(h.timestamp).toLocaleDateString('es-AR') + ' ' + new Date(h.timestamp).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
      return `
        <div class="history-item">
          <div class="history-item-header">
            <span class="history-item-imei">${h.imei}</span>
            <span class="history-item-date">${date}</span>
          </div>
          <div class="history-item-details">
            <span>Marca:</span><strong>${h.result.brand}</strong>
            <span>Modelo:</span><strong>${h.result.model}</strong>
            <span>Estado:</span><strong style="color:${h.result.blacklist === 'Clean' ? '#4CAF50' : '#ff4444'}">${h.result.blacklist}</strong>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error('Error loading history:', e);
    grid.innerHTML = '<p class="empty-state">Error al cargar historial</p>';
  }
}

// COPY RESULTS
function copyResults() {
  if (!lastResult) {
    alert('No hay resultados para copiar');
    return;
  }
  const text = `📋 REPORTE IMEI - Cell Space Argentina\n━━━━━━━━━━━━━━━━━━\n📱 ${lastResult.brand} ${lastResult.model}\n🔢 IMEI: ${lastResult.imei}\n🛡️ Blacklist: ${lastResult.blacklist}\n━━━━━━━━━━━━━━━━━━\n✅ Cell Space Argentina`;
  navigator.clipboard.writeText(text).then(() => {
    alert('✅ Copiado al portapapeles');
  });
}

// SHARE WHATSAPP
function shareWhatsApp() {
  if (!lastResult) {
    alert('No hay resultados para compartir');
    return;
  }
  const msg = `🔍 *Reporte IMEI - Cell Space Argentina*%0A%0A📱 ${lastResult.brand} ${lastResult.model}%0A🔢 IMEI: ${lastResult.imei}%0A🛡️ Blacklist: ${lastResult.blacklist}%0A%0A✅ Cell Space Argentina`;
  window.open(`https://wa.me/5493782437674?text=${msg}`, '_blank');
}

// PLACEHOLDERS
function handleImageUpload(event) {
  alert('🔧 OCR en desarrollo');
}

function startQRScan() {
  alert('🔧 Escáner QR en desarrollo');
}
