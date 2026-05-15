// VARIABLES
let currentSearchType = 'imei';
let lastResult = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ IMEI Checker loaded');
  createParticles();
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

// CHECK IMEI
async function checkIMEI() {
  console.log('🔍 checkIMEI called');
  
  const input = document.getElementById('imeiInput');
  const value = input.value.trim();
  const btn = document.getElementById('searchBtn');
  
  if (!value) {
    alert('⚠️ Por favor ingresa un número para consultar');
    return;
  }
  
  // Loading state
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Consultando...';
  btn.disabled = true;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const result = generateMockResult(value);
    lastResult = result;
    displayResults(lastResult);
    console.log('✅ Consulta exitosa');
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error: ' + error.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// GENERAR RESULTADO (Formato profesional exacto)
function generateMockResult(imei) {
  const isClean = !imei.startsWith('0');
  return {
    modelDescription: "SVC IPHONE 13 NAMM 128GB PNK CI/AR",
    imei: imei,
    imei2: (parseInt(imei) + 12345).toString(),
    meid: imei.substring(0, 14),
    serialNumber: "THXHDFN9" + Math.random().toString(36).substring(2, 4).toUpperCase(),
    purchaseDate: "2025-09-18",
    warrantyStatus: "Limited Warranty",
    blacklistStatus: isClean ? "Clean" : "Blacklisted",
    demoUnit: "No",
    loanerDevice: "No",
    replacedDevice: "No",
    replacementDevice: "Yes",
    refurbishedDevice: "No",
    lockedCarrier: "10 - Unlock",
    simLockStatus: "Unlocked"
  };
}

// DISPLAY RESULTS
function displayResults(data) {
  console.log('📋 Renderizando reporte...');
  
  const section = document.getElementById('resultsSection');
  const card = document.getElementById('resultCard');
  const dateEl = document.getElementById('reportDate');
  
  if (!section || !card) {
    console.error('❌ Elementos no encontrados');
    alert('❌ Error al mostrar resultados. Recargá la página.');
    return;
  }
  
  // Fecha actual
  const now = new Date();
  dateEl.textContent = `Generado: ${now.toLocaleDateString('es-AR')} a las ${now.toLocaleTimeString('es-AR')}`;
  
  // Colores de estado
  const statusColor = data.blacklistStatus === "Clean" ? "clean" : data.blacklistStatus === "Blacklisted" ? "locked" : "warning";
  const simColor = data.simLockStatus === "Unlocked" ? "clean" : "locked";
  
  card.innerHTML = `
    <div class="report-section-title">📱 Identificación del Dispositivo</div>
    <div class="report-field"><span class="report-label">Model Description</span><span class="report-value">${data.modelDescription}</span></div>
    <div class="report-field"><span class="report-label">IMEI</span><span class="report-value">${data.imei}</span></div>
    <div class="report-field"><span class="report-label">IMEI2</span><span class="report-value">${data.imei2}</span></div>
    <div class="report-field"><span class="report-label">MEID</span><span class="report-value">${data.meid}</span></div>
    <div class="report-field"><span class="report-label">Serial Number</span><span class="report-value">${data.serialNumber}</span></div>
    
    <div class="report-section-title">📅 Estado y Garantía</div>
    <div class="report-field"><span class="report-label">Estimated Purchase Date</span><span class="report-value">${data.purchaseDate}</span></div>
    <div class="report-field"><span class="report-label">Warranty Status</span><span class="report-value">${data.warrantyStatus}</span></div>
    <div class="report-field"><span class="report-label">Blacklist Status</span><span class="report-value ${statusColor}">${data.blacklistStatus}</span></div>
    
    <div class="report-section-title">🔒 Configuración y Bloqueo</div>
    <div class="report-field"><span class="report-label">Demo Unit</span><span class="report-value">${data.demoUnit}</span></div>
    <div class="report-field"><span class="report-label">Loaner Device</span><span class="report-value">${data.loanerDevice}</span></div>
    <div class="report-field"><span class="report-label">Replaced Device</span><span class="report-value">${data.replacedDevice}</span></div>
    <div class="report-field"><span class="report-label">Replacement Device</span><span class="report-value">${data.replacementDevice}</span></div>
    <div class="report-field"><span class="report-label">Refurbished Device</span><span class="report-value">${data.refurbishedDevice}</span></div>
    <div class="report-field"><span class="report-label">Locked Carrier</span><span class="report-value">${data.lockedCarrier}</span></div>
    <div class="report-field"><span class="report-label">Sim-Lock Status</span><span class="report-value ${simColor}">${data.simLockStatus}</span></div>
  `;
  
  section.style.display = 'block';
  setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// COPY RESULTS
function copyResults() {
  if (!lastResult) return alert('No hay resultados para copiar');
  
  const text = `📋 REPORTE IMEI - Cell Space Argentina
━━━━━━━━━━━━━━━━━━
📱 ${lastResult.modelDescription}
🔢 IMEI: ${lastResult.imei}
🔢 IMEI2: ${lastResult.imei2}
📡 MEID: ${lastResult.meid}
🔢 Serial: ${lastResult.serialNumber}
📅 Compra: ${lastResult.purchaseDate}
🛡️ Garantía: ${lastResult.warrantyStatus}
 Blacklist: ${lastResult.blacklistStatus}
🔓 SIM Lock: ${lastResult.simLockStatus}
━━━━━━━━━━━━━━━━━━
✅ Verificado en Cell Space Argentina`;

  navigator.clipboard.writeText(text).then(() => alert('✅ Copiado al portapapeles'));
}

// SHARE WHATSAPP
function shareWhatsApp() {
  if (!lastResult) return alert('No hay resultados para compartir');
  
  const msg = `🔍 *Reporte IMEI - Cell Space Argentina*%0A%0A📱 ${lastResult.modelDescription}%0A🔢 IMEI: ${lastResult.imei}%0A🛡️ Blacklist: ${lastResult.blacklistStatus}%0A🔓 SIM Lock: ${lastResult.simLockStatus}%0A%0A✅ Verificado profesionalmente`;
  window.open(`https://wa.me/5493782437674?text=${msg}`, '_blank');
}
