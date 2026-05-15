// VARIABLES GLOBALES
let currentSearchType = 'imei';
let lastResult = null;

// INICIALIZAR
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  loadHistory();
  setupSearchTabs();
  setupIMEIInput();
});

// PARTÍCULAS (igual que en public.js)
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

// TABS DE BÚSQUEDA
function setupSearchTabs() {
  document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      currentSearchType = this.dataset.type;
      const input = document.getElementById('imeiInput');
      
      switch(currentSearchType) {
        case 'imei':
          input.placeholder = 'Ingresa el IMEI (15-16 dígitos)';
          input.maxLength = 16;
          break;
        case 'serial':
          input.placeholder = 'Ingresa el Serial Number';
          input.maxLength = 20;
          break;
        case 'meid':
          input.placeholder = 'Ingresa el MEID (14 dígitos hex)';
          input.maxLength = 14;
          break;
      }
      input.focus();
    });
  });
}

// VALIDAR INPUT IMEI
function setupIMEIInput() {
  const input = document.getElementById('imeiInput');
  input.addEventListener('input', function() {
    // Solo números para IMEI/MEID
    if (currentSearchType !== 'serial') {
      this.value = this.value.replace(/[^0-9]/g, '');
    }
  });
  
  // Enter para buscar
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') checkIMEI();
  });
}

// FUNCIÓN PRINCIPAL: CONSULTAR IMEI
async function checkIMEI() {
  const input = document.getElementById('imeiInput');
  const value = input.value.trim();
  
  if (!value) {
    alert('⚠️ Por favor ingresa un número para consultar');
    return;
  }
  
  // Validaciones básicas
  if (currentSearchType === 'imei' && !/^\d{15,16}$/.test(value)) {
    alert('⚠️ El IMEI debe tener 15 o 16 dígitos numéricos');
    return;
  }
  
  // Mostrar loading
  const btn = document.querySelector('.btn-search');
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Consultando...';
  btn.disabled = true;
  
  try {
    // 🔥 AQUÍ VA LA LLAMADA A LA API REAL 🔥
    // Por ahora usamos datos de ejemplo (MOCK)
    const result = await mockAPICall(value, currentSearchType);
    
    // Guardar en historial
    await saveToHistory(value, result);
    
    // Mostrar resultados
    lastResult = { imei: value, ...result };
    displayResults(lastResult);
    
    // Cargar historial de este IMEI
    loadIMEIHistory(value);
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al consultar: ' + error.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// 🔥 MOCK API - REEMPLAZAR CON API REAL 🔥
async function mockAPICall(imei, type) {
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Datos de ejemplo para Apple
  if (Math.random() > 0.3) {
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
      blacklist: 'Clean',
      replacement: 'No',
      soldBy: 'Apple Store',
      purchaseDate: '2023-12-15',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/IPhone_13_Pro_Graphite.svg/500px-IPhone_13_Pro_Graphite.svg.png'
    };
  }
  
  // Datos para Samsung
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
    csc: 'CHO/CHO/CHO',
    carrier: 'Unlocked',
    blacklist: 'Clean',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Samsung_Galaxy_S23_Ultra.svg/500px-Samsung_Galaxy_S23_Ultra.svg.png'
  };
}

// MOSTRAR RESULTADOS
function displayResults(data) {
  const section = document.getElementById('resultsSection');
  const card = document.getElementById('resultCard');
  
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth' });
  
  const statusClass = data.blacklist === 'Clean' ? 'clean' : data.blacklist ? 'blacklisted' : 'unknown';
  const statusText = data.blacklist === 'Clean' ? '✅ Clean' : data.blacklist || '⚠️ Unknown';
  
  card.innerHTML = `
    <div class="result-header">
      <div class="result-brand">
        <img src="${data.image || 'https://via.placeholder.com/60?text=📱'}" alt="${data.brand}">
        <div>
          <h3>${data.brand} ${data.model}</h3>
          <p style="color:var(--muted);margin:5px 0 0 0">${data.color} • ${data.capacity}</p>
        </div>
      </div>
      <span class="result-status ${statusClass}">${statusText}</span>
    </div>
    
    <div class="result-grid">
      <div class="result-item"><label>IMEI/Serial</label><span>${data.imei || data.serial}</span></div>
      <div class="result-item"><label>Model Number</label><span>${data.modelNumber || '-'}</span></div>
      <div class="result-item"><label>MPN</label><span>${data.mpn || '-'}</span></div>
      <div class="result-item"><label>Serial</label><span>${data.serial || '-'}</span></div>
      <div class="result-item"><label>Carrier</label><span>${data.carrier || '-'}</span></div>
      <div class="result-item"><label>Warranty</label><span>${data.warrantyStatus || '-'} ${data.warrantyDate ? '(' + data.warrantyDate + ')' : ''}</span></div>
    </div>
    
    ${data.brand === 'Apple' ? `
    <div class="apple-section">
      <h4>🍎 Apple GSX Info</h4>
      <div class="apple-grid">
        <div class="result-item"><label>Find My iPhone</label><span>${data.fmi === 'OFF' ? '✅ OFF' : '🔒 ON'}</span></div>
        <div class="result-item"><label>SIM Lock</label><span>${data.simLock || '-'}</span></div>
        <div class="result-item"><label>Activation</label><span>${data.activationStatus || '-'}</span></div>
        <div class="result-item"><label>Replacement</label><span>${data.replacement || '-'}</span></div>
        <div class="result-item"><label>Sold By</label><span>${data.soldBy || '-'}</span></div>
        <div class="result-item"><label>Purchase Date</label><span>${data.purchaseDate || '-'}</span></div>
      </div>
    </div>
    ` : ''}
    
    ${data.brand === 'Samsung' ? `
    <div class="apple-section">
      <h4>📱 Samsung Info</h4>
      <div class="apple-grid">
        <div class="result-item"><label>KG Status</label><span>${data.kgStatus || '-'}</span></div>
        <div class="result-item"><label>Knox</label><span>${data.knox || '-'}</span></div>
        <div class="result-item"><label>CSC</label><span>${data.csc || '-'}</span></div>
        <div class="result-item"><label>Blacklist</label><span>${data.blacklist || '-'}</span></div>
      </div>
    </div>
    ` : ''}
  `;
}

// GUARDAR EN HISTORIAL (Firebase)
async function saveToHistory(imei, result) {
  try {
    const user = firebase.auth().currentUser;
    
    await db.collection('imei_history').add({
      imei: imei,
      searchType: currentSearchType,
      result: result,
      userId: user?.uid || 'guest',
      userEmail: user?.email || null,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      ip: 'client-side' // En producción usar backend para IP real
    });
  } catch (e) {
    console.error('Error guardando historial:', e);
  }
}

// CARGAR HISTORIAL GENERAL
async function loadHistory() {
  const grid = document.getElementById('historyGrid');
  
  try {
    const user = firebase.auth().currentUser;
    const query = db.collection('imei_history')
      .orderBy('timestamp', 'desc')
      .limit(10);
    
    const snap = await (user ? query.where('userId', '==', user.uid) : query).get();
    
    if (snap.empty) {
      grid.innerHTML = '<p class="empty-state">No tenés consultas aún</p>';
      return;
    }
    
    grid.innerHTML = snap.docs.map(doc => {
      const h = doc.data();
      const date = h.timestamp?.toDate?.()?.toLocaleDateString('es-AR') || 'Reciente';
      const brand = h.result?.brand || 'Desconocido';
      const model = h.result?.model || '';
      
      return `
        <div class="history-item">
          <div class="history-item-header">
            <span class="history-item-imei">${h.imei}</span>
            <span class="history-item-date">${date}</span>
          </div>
          <div class="history-item-details">
            <span>Marca:</span><strong>${brand}</strong>
            <span>Modelo:</span><strong>${model}</strong>
            <span>Estado:</span><strong>${h.result?.blacklist || 'Unknown'}</strong>
            <span>Tipo:</span><strong>${h.searchType?.toUpperCase()}</strong>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (e) {
    console.error('Error cargando historial:', e);
    grid.innerHTML = '<p class="empty-state">Error al cargar historial</p>';
  }
}

// CARGAR HISTORIAL DE UN IMEI ESPECÍFICO
async function loadIMEIHistory(imei) {
  const container = document.getElementById('imeiHistory');
  
  try {
    const snap = await db.collection('imei_history')
      .where('imei', '==', imei)
      .orderBy('timestamp', 'desc')
      .limit(3)
      .get();
    
    if (snap.empty) {
      container.innerHTML = '<p style="color:var(--muted);font-size:14px">Sin consultas anteriores</p>';
      return;
    }
    
    container.innerHTML = snap.docs.map(doc => {
      const h = doc.data();
      const date = h.timestamp?.toDate?.()?.toLocaleString('es-AR') || '';
      return `<p style="font-size:13px;color:var(--muted);margin:5px 0">📅 ${date} - ${h.result?.blacklist || 'Unknown'}</p>`;
    }).join('');
    
    document.getElementById('historyPreview').style.display = 'block';
    
  } catch (e) {
    console.error('Error:', e);
  }
}

// COPIAR RESULTADOS
function copyResults() {
  if (!lastResult) return;
  
  const text = `📋 REPORTE IMEI - Cell Space Argentina
━━━━━━━━━━━━━━━━━━
📱 ${lastResult.brand} ${lastResult.model}
🎨 ${lastResult.color} | 💾 ${lastResult.capacity}
🔢 IMEI: ${lastResult.imei || lastResult.serial}
🏷️ Modelo: ${lastResult.modelNumber}
🔓 Carrier: ${lastResult.carrier}
🛡️ Blacklist: ${lastResult.blacklist}
📅 Warranty: ${lastResult.warrantyStatus} ${lastResult.warrantyDate || ''}
━━━━━━━━━━━━━━━━━━
✅ Reporte generado en Cell Space Argentina`;

  navigator.clipboard.writeText(text).then(() => {
    alert('✅ Copiado al portapapeles');
  });
}

// GENERAR PDF
function generatePDF() {
  if (!lastResult) return;
  
  const element = document.getElementById('resultCard');
  const opt = {
    margin: 10,
    filename: `IMEI_Report_${lastResult.imei || lastResult.serial}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, backgroundColor: '#0a0a0a' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save();
}

// COMPARTIR POR WHATSAPP
function shareWhatsApp() {
  if (!lastResult) return;
  
  const msg = `🔍 *Reporte IMEI - Cell Space Argentina*%0A%0A` +
    `📱 ${lastResult.brand} ${lastResult.model}%0A` +
    `🔢 IMEI: ${lastResult.imei || lastResult.serial}%0A` +
    `🔓 Carrier: ${lastResult.carrier}%0A` +
    `🛡️ Blacklist: ${lastResult.blacklist}%0A` +
    `📅 Warranty: ${lastResult.warrantyStatus}%0A%0A` +
    `✅ Verificado en Cell Space Argentina`;
  
  window.open(`https://wa.me/5493782437674?text=${msg}`, '_blank');
}

// EXPORTAR A EXCEL (CSV simple)
function exportExcel() {
  if (!lastResult) return;
  
  const headers = ['IMEI', 'Brand', 'Model', 'Color', 'Capacity', 'Carrier', 'Blacklist', 'Warranty', 'Date'];
  const row = [
    lastResult.imei || lastResult.serial,
    lastResult.brand,
    lastResult.model,
    lastResult.color,
    lastResult.capacity,
    lastResult.carrier,
    lastResult.blacklist,
    lastResult.warrantyStatus,
    new Date().toLocaleDateString('es-AR')
  ];
  
  const csv = [headers.join(','), row.join(',')].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `imei_export_${Date.now()}.csv`;
  link.click();
}

// OCR DESDE FOTO (placeholder - requiere backend)
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  alert('🔧 Función OCR en desarrollo. Por ahora, ingresá el IMEI manualmente.');
  // En producción: usar Tesseract.js o API de Google Vision
}

// ESCANEO QR (placeholder)
function startQRScan() {
  alert('🔧 Escáner QR en desarrollo. Usá una app de QR para leer y pegá el resultado.');
  // En producción: usar html5-qrcode library
}
