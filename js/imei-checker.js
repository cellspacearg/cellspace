// VARIABLES
let currentSearchType = 'imei';
let lastResult = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  loadHistory();
  setupSearchTabs();
  setupIMEIInput();
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
        input.placeholder = 'Ingresa el MEID (14 dígitos hex)';
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
      this.value = this.value.replace(/[^0-9]/g, '');
    }
  });
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') checkIMEI();
  });
}

// CHECK IMEI - FUNCIÓN CORREGIDA
async function checkIMEI() {
  const input = document.getElementById('imeiInput');
  const value = input.value.trim();
  const btn = document.getElementById('searchBtn');
  
  if (!value) {
    alert('⚠️ Por favor ingresa un número para consultar');
    return;
  }
  
  if (currentSearchType === 'imei' && !/^\d{15,16}$/.test(value)) {
    alert('⚠️ El IMEI debe tener 15 o 16 dígitos numéricos');
    return;
  }
  
  // Loading state
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Consultando...';
  btn.disabled = true;
  
  try {
    // SIMULACIÓN DE CONSULTA (Reemplazar con API real después)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Datos de ejemplo basados en el IMEI
    const result = generateMockResult(value);
    
    // Guardar en historial
    await saveToHistory(value, result);
    
    // Mostrar resultados
    lastResult = { imei: value, ...result };
    displayResults(lastResult);
    loadIMEIHistory(value);
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al consultar: ' + error.message);
  } finally {
    // Restaurar botón
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// GENERAR RESULTADO MOCK (SIEMPRE FUNCIONA)
function generateMockResult(imei) {
  // Generar resultados consistentes basados en el IMEI
  const isApple = imei.length === 15;
  const isClean = imei.charAt(0) !== '0'; // Si empieza con 0, es blacklist
  
  if (isApple) {
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
      blacklist: isClean ? 'Clean' : 'Blacklisted',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Samsung_Galaxy_S23_Ultra.svg/500px-Samsung_Galaxy_S23_Ultra.svg.png'
    };
  }
}

// DISPLAY RESULTS
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
    <div style="margin-top:25px;padding-top:25px;border-top:1px solid rgba(255,255,255,0.1);">
      <h4 style="color:var(--orange);margin:0 0 15px 0;font-size:14px;text-transform:uppercase;">🍎 Apple GSX Info</h4>
      <div class="result-grid">
        <div class="result-item"><label>Find My iPhone</label><span>${data.fmi === 'OFF' ? '✅ OFF' : '🔒 ON'}</span></div>
        <div class="result-item"><label>SIM Lock</label><span>${data.simLock || '-'}</span></div>
        <div class="result-item"><label>Activation</label><span>${data.activationStatus || '-'}</span></div>
        <div class="result-item"><label>Replacement</label><span>${data.replacement || '-'}</span></div>
      </div>
    </div>
    ` : ''}
  `;
}

// SAVE TO HISTORY
async function saveToHistory(imei, result) {
  try {
    const user = firebase.auth().currentUser;
    await db.collection('imei_history').add({
      imei: imei,
      searchType: currentSearchType,
      result: result,
      userId: user?.uid || 'guest',
      userEmail: user?.email || null,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error('Error saving history:', e);
    // No mostrar error al usuario, solo loguear
  }
}

// LOAD HISTORY
async function loadHistory() {
  const grid = document.getElementById('historyGrid');
  if (!grid) return;
  
  try {
    const user = firebase.auth().currentUser;
    const query = db.collection('imei_history')
      .orderBy('timestamp', 'desc')
      .limit(10);
    
    const snap = user ? await query.where('userId', '==', user.uid).get() : await query.get();
    
    if (snap.empty) {
      grid.innerHTML = '<p class="empty-state">No tenés consultas aún</p>';
      return;
    }
    
    grid.innerHTML = snap.docs.map(doc => {
      const h = doc.data();
      const date = h.timestamp?.toDate?.()?.toLocaleDateString('es-AR') || 'Reciente';
      return `
        <div class="history-item">
          <div class="history-item-header">
            <span class="history-item-imei">${h.imei}</span>
            <span class="history-item-date">${date}</span>
          </div>
          <div class="history-item-details">
            <span>Marca:</span><strong>${h.result?.brand || '-'}</strong>
            <span>Modelo:</span><strong>${h.result?.model || '-'}</strong>
            <span>Estado:</span><strong>${h.result?.blacklist || 'Unknown'}</strong>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error('Error loading history:', e);
    grid.innerHTML = '<p class="empty-state">No hay historial disponible</p>';
  }
}

// LOAD IMEI HISTORY
async function loadIMEIHistory(imei) {
  const container = document.getElementById('imeiHistory');
  if (!container) return;
  
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

// COPY RESULTS
function copyResults() {
  if (!lastResult) {
    alert('No hay resultados para copiar');
    return;
  }
  const text = `📋 REPORTE IMEI - Cell Space Argentina\n━━━━━━━━━━━━━━━━━━\n📱 ${lastResult.brand} ${lastResult.model}\n🔢 IMEI: ${lastResult.imei || lastResult.serial}\n🛡️ Blacklist: ${lastResult.blacklist}\n━━━━━━━━━━━━━━━━━━\n✅ Reporte generado en Cell Space Argentina`;
  navigator.clipboard.writeText(text).then(() => {
    alert('✅ Copiado al portapapeles');
  });
}

// GENERATE PDF
function generatePDF() {
  if (!lastResult) {
    alert('No hay resultados para exportar');
    return;
  }
  alert('📄 Función PDF: Para habilitar esta función, necesitás agregar la librería html2pdf.js');
}

// SHARE WHATSAPP
function shareWhatsApp() {
  if (!lastResult) {
    alert('No hay resultados para compartir');
    return;
  }
  const msg = `🔍 *Reporte IMEI - Cell Space Argentina*%0A%0A📱 ${lastResult.brand} ${lastResult.model}%0A🔢 IMEI: ${lastResult.imei || lastResult.serial}%0A🛡️ Blacklist: ${lastResult.blacklist}%0A%0A✅ Verificado en Cell Space Argentina`;
  window.open(`https://wa.me/5493782437674?text=${msg}`, '_blank');
}

// OCR & QR (Placeholders)
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) alert('🔧 OCR en desarrollo. Ingresá el IMEI manualmente.');
}

function startQRScan() {
  alert('🔧 Escáner QR en desarrollo.');
}
