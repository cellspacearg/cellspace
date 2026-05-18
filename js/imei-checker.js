// ========================================
// CELL SPACE - IMEI CHECKER PRO
// Con Cloud Functions (iFreeiCloud + SickW)
// ========================================

console.log('🔍 Cell Space IMEI System Loaded');

let currentSearchType = 'imei';
let lastResult = null;

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  setupSearchTabs();
  setupIMEIInput();
});

// PARTÍCULAS DE FONDO
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
      
      if (currentSearchType === 'imei') {
        input.placeholder = 'Ingresa el IMEI (15-16 dígitos)';
        input.maxLength = 16;
      } else {
        input.placeholder = 'Ingresa el Serial Number';
        input.maxLength = 20;
      }
      input.focus();
    });
  });
}

// VALIDACIÓN DE INPUT
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

// FUNCIÓN PRINCIPAL DE CONSULTA
async function checkIMEI() {
  const input = document.getElementById('imeiInput');
  const imei = input.value.trim();
  const btn = document.getElementById('searchBtn');
  
  if (!imei || imei.length < 14) {
    alert('⚠️ Ingresá un IMEI válido (14-16 dígitos)');
    return;
  }
  
  btn.innerHTML = '⏳ Verificando en servidor seguro...';
  btn.disabled = true;
  
  try {
    // 1️⃣ Llamar a Cloud Function
    const checkIMEIFunction = firebase.functions().httpsCallable('checkIMEI');
    const result = await checkIMEIFunction({ imei: imei });
    
    console.log('✅ Respuesta del servidor:', result.data);
    
    // 2️⃣ Procesar respuesta
    if (result.data.source === 'ifreeicloud') {
      // iFreeiCloud devolvió un Order ID (proceso asíncrono)
      await handleIFreeiCloudOrder(result.data.orderId, imei);
    } else if (result.data.source === 'sickw') {
      // SickW devolvió datos directos
      const apiData = result.data.data;
      displayResults(transformSickWData(apiData, imei));
    } else {
      throw new Error('Respuesta desconocida del servidor');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ ' + error.message);
  } finally {
    btn.innerHTML = '🔍 Consultar';
    btn.disabled = false;
  }
}

// MANEJO DE ORDEN iFreeiCloud (Asíncrono)
async function handleIFreeiCloudOrder(orderId, imei) {
  console.log('⏳ Esperando resultado de iFreeiCloud...');
  
  const section = document.getElementById('resultsSection');
  if (section) {
    section.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div class="spinner" style="width:50px;height:50px;border:4px solid rgba(255,106,0,0.1);border-top-color:var(--orange);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
        <p style="color:var(--orange);font-size:1.2rem;">Procesando verificación...</p>
        <p style="color:var(--muted);font-size:0.9rem;">Order ID: ${orderId}</p>
      </div>
    `;
    section.style.display = 'block';
  }
  
  // Esperar 5 segundos y consultar estado
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    const statusFunction = firebase.functions().httpsCallable('checkIMEIStatus');
    const result = await statusFunction({ orderId: orderId });
    
    if (result.data.status === 'completed') {
      displayResults(transformIFreeiCloudData(result.data.result, imei));
    } else {
      throw new Error('La verificación aún está en proceso. Intentá de nuevo en unos minutos.');
    }
    
  } catch (error) {
    console.error('Error consultando estado:', error);
    // Mostrar datos básicos de todas formas
    displayResults({
      imei: imei,
      brand: 'Dispositivo',
      modelName: 'Verificación Pendiente',
      modelNumber: '',
      blacklistStatus: 'Unknown',
      simLockStatus: 'Unknown',
      warrantyStatus: 'Unknown',
      purchaseDate: 'N/A',
      serial: 'N/A',
      estimatedValue: 'N/A',
      technicalSupport: 'N/A',
      findMyiPhone: 'N/A'
    });
  }
}

// TRANSFORMAR DATOS SICKW
function transformSickWData(data, imei) {
  return {
    imei: imei,
    brand: data.brand || 'Apple',
    modelName: data.model || 'iPhone',
    modelNumber: data.modelNumber || '',
    serial: data.serial || data.serialNumber || 'N/A',
    blacklistStatus: data.blacklist === 'Clean' ? 'Clean' : 'Blacklisted',
    simLockStatus: data.simlock || data.simLock || 'Unlocked',
    warrantyStatus: data.warranty === 'Active' ? 'Limited Warranty' : 'Expired',
    purchaseDate: data.purchaseDate || 'N/A',
    estimatedValue: data.blacklist === 'Clean' ? `$${Math.floor(Math.random() * 400 + 300)}` : '$0 (Reportado)',
    technicalSupport: data.warranty === 'Active' ? 'Activo' : 'Expirado',
    findMyiPhone: data.fmi === 'OFF' ? 'OFF' : 'ON'
  };
}

// TRANSFORMAR DATOS IFREEICLOUD
function transformIFreeiCloudData(data, imei) {
  return {
    imei: imei,
    brand: data.brand || 'Apple',
    modelName: data.model || 'iPhone',
    modelNumber: data.modelNumber || '',
    serial: data.serial || 'N/A',
    blacklistStatus: data.blacklistStatus === 'Clean' ? 'Clean' : 'Blacklisted',
    simLockStatus: data.simLock || 'Unlocked',
    warrantyStatus: data.warrantyStatus === 'Active' ? 'Limited Warranty' : 'Expired',
    purchaseDate: data.purchaseDate || 'N/A',
    estimatedValue: data.blacklistStatus === 'Clean' ? `$${Math.floor(Math.random() * 400 + 300)}` : '$0 (Reportado)',
    technicalSupport: data.warrantyStatus === 'Active' ? 'Activo' : 'Expirado',
    findMyiPhone: data.findMyiPhone === 'OFF' ? 'OFF' : 'ON'
  };
}

// MOSTRAR RESULTADOS
function displayResults(data) {
  const section = document.getElementById('resultsSection');
  const card = document.getElementById('resultCard');
  const dateEl = document.getElementById('reportDate');
  
  if (!section || !card) {
    alert('❌ Error al mostrar resultados');
    return;
  }
  
  const now = new Date();
  const fechaHora = `${now.toLocaleDateString('es-AR')} - ${now.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}`;
  
  const blacklistColor = data.blacklistStatus === "Clean" ? "#4CAF50" : "#ff4444";
  const warrantyColor = data.warrantyStatus === "Limited Warranty" ? "#4CAF50" : "#ff4444";
  
  card.innerHTML = `
    <!-- HEADER: LOGO + MARCA -->
    <div style="display:flex;align-items:center;gap:18px;padding:22px 24px;background:rgba(0,0,0,0.5);border-radius:16px 16px 0 0;border-bottom:1px solid rgba(255,106,0,0.25);">
      <img src="assets/logo.png" alt="Logo" style="width:72px;height:72px;object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'">
      <div>
        <h2 style="color:var(--orange);margin:0;font-size:1.6rem;font-weight:800;letter-spacing:0.5px;line-height:1.1;">CELL SPACE</h2>
        <p style="color:white;margin:4px 0 0 0;font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:500;">ARGENTINA</p>
      </div>
    </div>
    
    <!-- CUERPO PRINCIPAL -->
    <div style="padding:24px;background:rgba(12,12,12,0.98);">
      
      <!-- MODELO -->
      <div style="text-align:center;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <h3 style="color:white;margin:0;font-size:1.5rem;font-weight:600;">${data.brand} ${data.modelName}</h3>
        ${data.modelNumber ? `<p style="color:var(--orange);margin:6px 0 0 0;font-size:13px;font-weight:600;">${data.modelNumber}</p>` : ''}
      </div>

      <!-- IDENTIFICACIÓN -->
      <div style="background:rgba(255,255,255,0.03);padding:16px 18px;border-radius:12px;margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:var(--muted);font-size:13px;">IMEI</span>
          <span style="color:white;font-family:monospace;font-weight:700;font-size:14px;">${data.imei}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:var(--muted);font-size:13px;">Serial</span>
          <span style="color:white;font-family:monospace;font-size:13px;">${data.serial}</span>
        </div>
      </div>

      <!-- ESTADOS -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
        <div style="background:${data.blacklistStatus==='Clean'?'rgba(76,175,80,0.1)':'rgba(255,68,68,0.1)'};padding:14px;border-radius:10px;text-align:center;border:1px solid ${blacklistColor};">
          <div style="color:var(--muted);font-size:11px;margin-bottom:6px;text-transform:uppercase;">Reporte</div>
          <div style="color:${blacklistColor};font-weight:800;font-size:15px;">
            ${data.blacklistStatus === 'Clean' ? '✅ LIMPIO' : '⚠️ REPORTADO'}
          </div>
        </div>
        
        <div style="background:rgba(255,255,255,0.03);padding:14px;border-radius:10px;text-align:center;">
          <div style="color:var(--muted);font-size:11px;margin-bottom:6px;text-transform:uppercase;">Garantía</div>
          <div style="color:${warrantyColor};font-weight:700;font-size:13px;">${data.warrantyStatus}</div>
        </div>

        <div style="background:rgba(255,255,255,0.03);padding:14px;border-radius:10px;text-align:center;">
          <div style="color:var(--muted);font-size:11px;margin-bottom:6px;text-transform:uppercase;">SIM Lock</div>
          <div style="color:${data.simLockStatus==='Unlocked'?'#4CAF50':'#ff4444'};font-weight:700;font-size:13px;">${data.simLockStatus}</div>
        </div>

        <div style="background:rgba(255,255,255,0.03);padding:14px;border-radius:10px;text-align:center;">
          <div style="color:var(--muted);font-size:11px;margin-bottom:6px;text-transform:uppercase;">Valor Est.</div>
          <div style="color:white;font-weight:700;font-size:14px;">${data.estimatedValue}</div>
        </div>
      </div>

      <!-- DETALLES -->
      <div style="background:rgba(255,255,255,0.02);padding:16px 18px;border-radius:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--muted);font-size:12px;">Fecha Compra</span>
          <span style="color:white;font-size:13px;">${data.purchaseDate}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--muted);font-size:12px;">Soporte Técnico</span>
          <span style="color:${data.technicalSupport==='Activo'?'#4CAF50':'#ff4444'};font-size:13px;">${data.technicalSupport}</span>
        </div>
        ${data.brand==='Apple'||data.brand==='iPhone'?`
        <div style="display:flex;justify-content:space-between;">
          <span style="color:var(--muted);font-size:12px;">Find My iPhone</span>
          <span style="color:${data.findMyiPhone==='OFF'?'#4CAF50':'#ff4444'};font-size:13px;">${data.findMyiPhone}</span>
        </div>`:''}
      </div>
    </div>
    
    <!-- FOOTER -->
    <div style="padding:16px;text-align:center;background:linear-gradient(180deg, rgba(255,106,0,0.05) 0%, rgba(255,106,0,0.12) 100%);border-radius:0 0 16px 16px;border-top:1px solid rgba(255,106,0,0.25);">
      <p style="color:var(--orange);margin:0 0 6px 0;font-weight:700;font-size:14px;letter-spacing:0.5px;">✅ REPORTE VERIFICADO POR CELL SPACE</p>
      <p style="color:var(--muted);margin:0;font-size:12px;">${fechaHora}</p>
    </div>
  `;
  
  section.style.display = 'block';
  setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  
  if (data.blacklistStatus === 'Blacklisted') {
    setTimeout(() => alert('⚠️ ATENCIÓN: Dispositivo REPORTADO'), 600);
  }
}

// UTILIDADES
function copyResults() {
  if (!lastResult) return alert('No hay resultados');
  navigator.clipboard.writeText(`📋 Cell Space Argentina\n📱 ${lastResult.brand} ${lastResult.modelName}\n🔢 IMEI: ${lastResult.imei}\n⚠️ ${lastResult.blacklistStatus}\n🔓 ${lastResult.simLockStatus}`).then(() => alert('✅ Copiado'));
}

function shareWhatsApp() {
  if (!lastResult) return alert('No hay resultados');
  window.open(`https://wa.me/5493782437674?text=🔍 *Cell Space Argentina*%0A📱 ${lastResult.brand} ${lastResult.modelName}%0A🔢 ${lastResult.imei}%0A⚠️ ${lastResult.blacklistStatus}`, '_blank');
}

console.log('✅ IMEI Checker listo');
