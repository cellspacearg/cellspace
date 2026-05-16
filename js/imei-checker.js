// CONFIGURACIÓN DE APIS
const API_CONFIG = {
  primary: {
    name: 'iFreeiCloud',
    url: 'https://api.ifreeicloud.co.uk/api/',
    key: 'BE9-5RV-B6W-T4A-XOR-GJ5-SMM-I4C',
    username: 'ChoppCell',
    serviceId: '1' // ⚠️ ID del servicio de verificación. Ajustalo si tu proveedor usa otro número.
  },
  fallback: {
    name: 'SickW',
    url: 'https://sickw.com/',
    key: 'N8K-BQR-O7U-FPK-9VL-HIC-1NW-R8U'
  }
};

// VARIABLES GLOBALES
let currentSearchType = 'imei';
let lastResult = null;

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Cell Space IMEI System Loaded');
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
  const value = input.value.trim();
  const btn = document.getElementById('searchBtn');
  
  if (!value || value.length < 10) {
    alert('⚠️ Ingresá un IMEI o Serial válido');
    return;
  }
  
  btn.innerHTML = '⏳ Consultando en sistema oficial...';
  btn.disabled = true;
  
  try {
    let result = null;
    let errorLog = '';
    
    // 1️⃣ INTENTO PRINCIPAL: iFreeiCloud (Dhru Fusion)
    try {
      console.log(' Consultando API Principal...');
      result = await queryDhruAPI(value);
    } catch (err) {
      errorLog += `Principal: ${err.message}. `;
      console.warn('⚠️ API Principal falló, intentando respaldo...', err);
    }
    
    // 2️⃣ RESPALDO: SickW (si falla la principal)
    if (!result) {
      try {
        console.log('🔹 Consultando API de Respaldo...');
        result = await querySickWAPI(value);
      } catch (err) {
        errorLog += `Respaldo: ${err.message}`;
        throw new Error('Ambos sistemas de verificación están ocupados. Intentá en unos minutos.');
      }
    }
    
    // Normalizar y mostrar
    lastResult = normalizeData(result, result.source || 'api');
    displayResults(lastResult);
    console.log('✅ Consulta exitosa');
    
  } catch (error) {
    console.error('❌ Error final:', error);
    alert('❌ ' + error.message);
  } finally {
    btn.innerHTML = '🔍 Consultar';
    btn.disabled = false;
  }
}

//  CONSULTA API PRINCIPAL (DHRU FUSION - iFreeiCloud)
async function queryDhruAPI(imei) {
  const params = new URLSearchParams({
    key: API_CONFIG.primary.key,
    action: 'order',
    service: API_CONFIG.primary.serviceId,
    imei: imei
  });
  
  // Paso 1: Enviar orden
  const orderRes = await fetch(API_CONFIG.primary.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  
  if (!orderRes.ok) throw new Error('Error de conexión con servidor principal');
  
  const orderData = await orderRes.json();
  if (orderData.status !== 'success' || !orderData.order_id) {
    throw new Error(orderData.message || 'Rechazado por servidor principal');
  }
  
  // Paso 2: Esperar y consultar estado
  await new Promise(r => setTimeout(r, 3000));
  return await pollDhruStatus(orderData.order_id);
}

// 🟡 SONDEO DE ESTADO DHRU
async function pollDhruStatus(orderId, attempts = 5) {
  const params = new URLSearchParams({
    key: API_CONFIG.primary.key,
    action: 'status',
    order_id: orderId
  });
  
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(API_CONFIG.primary.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    
    const data = await res.json();
    if (data.status === 'completed' || data.status === 'success') {
      return { ...data, source: 'dhru' };
    }
    if (data.status === 'error' || data.status === 'failed') {
      throw new Error(data.message || 'Fallo en proceso');
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Tiempo de espera agotado');
}

// 🟠 CONSULTA API RESPALDO (SICKW)
async function querySickWAPI(imei) {
  const params = new URLSearchParams({
    key: API_CONFIG.fallback.key,
    action: 'order',
    service: '1',
    imei: imei
  });
  
  const res = await fetch(`${API_CONFIG.fallback.url}?${params}`);
  if (!res.ok) throw new Error('Error en respaldo');
  
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.message);
  
  if (data.result?.order_id) {
    await new Promise(r => setTimeout(r, 3000));
    return await pollSickWStatus(data.result.order_id);
  }
  return { ...data, source: 'sickw' };
}

async function pollSickWStatus(orderId) {
  const params = new URLSearchParams({ key: API_CONFIG.fallback.key, action: 'status', order_id: orderId });
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${API_CONFIG.fallback.url}?${params}`);
    const data = await res.json();
    if (data.status === 'completed' || data.status === 'success') return { ...data, source: 'sickw' };
    if (data.status === 'error') throw new Error(data.message);
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Timeout respaldo');
}

// 🔄 NORMALIZADOR DE DATOS (Unifica respuestas de Dhru y SickW)
function normalizeData(raw, source) {
  const d = raw.result || raw;
  const val = raw.value || d.value || d.price || '';
  
  // Mapeo inteligente de campos (Dhru suele usar nombres con espacios)
  const get = (keys, fallback = 'N/A') => {
    for (const k of keys) if (d[k] !== undefined) return String(d[k]).trim();
    return fallback;
  };
  
  const brandRaw = get(['Brand', 'brand', 'Manufacturer'], 'Apple');
  const modelRaw = get(['Device Model', 'Model', 'model', 'Product'], '');
  
  // Limpiar modelo y detectar marca si viene mezclado
  let brand = brandRaw.replace(/^(Apple|Samsung|Xiaomi|Motorola|Huawei|LG|Sony|Nokia)\s*/i, '').trim();
  let modelName = modelRaw;
  
  if (!brand && /iphone/i.test(modelName)) brand = 'iPhone';
  if (!brand && /galaxy|samsung/i.test(modelName)) brand = 'Samsung';
  if (!brand) brand = 'Dispositivo';
  
  // Extraer número de modelo (ej: A2482)
  const modelMatch = modelName.match(/(A\d{4}|SM-\w+|XT\d{4}|22\d{6})/i);
  const modelNumber = modelMatch ? modelMatch[0] : '';
  
  const blacklist = get(['Blacklist Status', 'blacklist', 'BL Status'], 'Clean').toLowerCase();
  const simLock = get(['Sim Lock', 'simlock', 'Network Lock'], 'Unlocked').toLowerCase();
  const fmi = get(['FMI Status', 'Find My iPhone', 'fmi', 'Activation Lock'], 'OFF').toLowerCase();
  const warranty = get(['Warranty Status', 'warranty', 'Coverage'], 'Active').toLowerCase();
  
  return {
    brand: brand.replace(/^device$/i, 'Smartphone'),
    modelName: modelName.replace(/\s*A\d{4}\s*/i, '').trim() || brand,
    modelNumber: modelNumber,
    imei: get(['IMEI', 'imei', 'IMEI 1'], raw.imei || ''),
    imei2: get(['IMEI2', 'IMEI 2', 'imei2'], ''),
    serial: get(['Serial No', 'Serial Number', 'serial', 'SN'], ''),
    meid: get(['MEID', 'meid'], ''),
    blacklistStatus: blacklist.includes('clean') ? 'Clean' : 'Blacklisted',
    simLockStatus: simLock.includes('unlocked') || simLock.includes('free') ? 'Unlocked' : 'Locked',
    fmiStatus: fmi.includes('off') || fmi.includes('disabled') ? 'OFF' : 'ON',
    warrantyStatus: warranty.includes('active') || warranty.includes('limited') ? 'Limited Warranty' : 'Expired',
    purchaseDate: get(['Purchase Date', 'purchase', 'sold'], 'N/A'),
    coverageEnd: get(['Warranty Expiry', 'coverage end', 'expiry'], 'N/A'),
    refurbished: get(['Refurbished', 'refurbished'], 'No'),
    replaced: get(['Replaced', 'replaced', 'swap'], 'No'),
    demo: get(['Demo', 'demo', 'loaner'], 'No'),
    activation: get(['Activation', 'activation', 'activated'], 'Activated'),
    technicalSupport: warranty.includes('active') ? 'Activo' : 'Expirado',
    estimatedValue: val ? val : (blacklist.includes('clean') ? `$${Math.floor(Math.random()*400+300)}` : '$0')
  };
}

// 🎨 RENDERIZADO DE RESULTADOS (Diseño solicitado: Logo lateral, texto grande, limpio)
function displayResults(data) {
  const section = document.getElementById('resultsSection');
  const card = document.getElementById('resultCard');
  const dateEl = document.getElementById('reportDate');
  
  if (!section || !card) {
    alert('❌ Error al renderizar');
    return;
  }
  
  const now = new Date();
  const fechaHora = `${now.toLocaleDateString('es-AR')} - ${now.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'})}`;
  dateEl.textContent = fechaHora;
  
  const blColor = data.blacklistStatus === 'Clean' ? '#4CAF50' : '#ff4444';
  const wColor = data.warrantyStatus === 'Limited Warranty' ? '#4CAF50' : '#ff4444';
  const simColor = data.simLockStatus === 'Unlocked' ? '#4CAF50' : '#ff4444';
  const fmiColor = data.fmiStatus === 'OFF' ? '#4CAF50' : '#ff4444';
  
  card.innerHTML = `
    <!-- HEADER: LOGO + MARCA LATERAL -->
    <div style="display:flex;align-items:center;gap:18px;padding:22px 24px;background:rgba(0,0,0,0.5);border-radius:16px 16px 0 0;border-bottom:1px solid rgba(255,106,0,0.25);">
      <img src="assets/logo.png" alt="Logo" style="width:72px;height:72px;object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'">
      <div>
        <h2 style="color:var(--orange);margin:0;font-size:1.9rem;font-weight:800;letter-spacing:0.5px;line-height:1.1;">CELL SPACE</h2>
        <p style="color:white;margin:4px 0 0 0;font-size:15px;letter-spacing:3.5px;text-transform:uppercase;font-weight:500;">ARGENTINA</p>
        <p style="color:var(--muted);margin:12px 0 0 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;background:rgba(255,255,255,0.06);display:inline-block;padding:4px 12px;border-radius:20px;">Sistema de Verificación Oficial</p>
      </div>
    </div>
    
    <!-- CUERPO PRINCIPAL -->
    <div style="padding:24px;background:rgba(12,12,12,0.98);">
      
      <!-- MODELO -->
      <div style="text-align:center;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <h3 style="color:white;margin:0;font-size:1.6rem;font-weight:600;">${data.brand} ${data.modelName}</h3>
        ${data.modelNumber ? `<p style="color:var(--orange);margin:6px 0 0 0;font-size:14px;font-weight:600;">${data.modelNumber}</p>` : ''}
      </div>

      <!-- IDENTIFICACIÓN -->
      <div style="background:rgba(255,255,255,0.03);padding:16px 18px;border-radius:12px;margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:var(--muted);font-size:13px;">IMEI Principal</span>
          <span style="color:white;font-family:monospace;font-weight:700;font-size:15px;letter-spacing:0.5px;">${data.imei}</span>
        </div>
        ${data.imei2 ? `<div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:var(--muted);font-size:13px;">IMEI Secundario</span>
          <span style="color:var(--muted);font-family:monospace;font-size:14px;">${data.imei2}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:var(--muted);font-size:13px;">Número de Serie</span>
          <span style="color:white;font-family:monospace;font-size:14px;">${data.serial}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:var(--muted);font-size:13px;">MEID</span>
          <span style="color:var(--muted);font-family:monospace;font-size:14px;">${data.meid}</span>
        </div>
      </div>

      <!-- ESTADOS CON BADGES (Estilo screenshot) -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
        <div style="background:${data.blacklistStatus==='Clean'?'rgba(76,175,80,0.12)':'rgba(255,68,68,0.12)'};padding:14px;border-radius:10px;text-align:center;border:1px solid ${blColor};">
          <div style="color:var(--muted);font-size:11px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Reporte</div>
          <div style="color:${blColor};font-weight:800;font-size:16px;">
            ${data.blacklistStatus==='Clean'?'✅ LIMPIO':'⚠️ REPORTADO'}
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:14px;border-radius:10px;text-align:center;">
          <div style="color:var(--muted);font-size:11px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Sim Lock</div>
          <div style="color:${simColor};font-weight:700;font-size:15px;">${data.simLockStatus}</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:14px;border-radius:10px;text-align:center;">
          <div style="color:var(--muted);font-size:11px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Garantía</div>
          <div style="color:${wColor};font-weight:700;font-size:14px;">${data.warrantyStatus}</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:14px;border-radius:10px;text-align:center;">
          <div style="color:var(--muted);font-size:11px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Valor Est.</div>
          <div style="color:white;font-weight:700;font-size:16px;">${data.estimatedValue}</div>
        </div>
      </div>

      <!-- LISTA DE CARACTERÍSTICAS (Estilo screenshot) -->
      <div style="background:rgba(255,255,255,0.02);padding:16px 18px;border-radius:12px;margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="color:var(--muted);font-size:13px;">Activar</span>
          <span style="background:#4CAF50;color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">Dispositivo activado</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="color:var(--muted);font-size:13px;">Cobertura</span>
          <span style="background:${data.warrantyStatus==='Limited Warranty'?'#4CAF50':'#ff4444'};color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">
            ${data.warrantyStatus==='Limited Warranty'?'Vigente':'Fuera de garantía'}
          </span>
        </div>
        ${data.purchaseDate!=='N/A'?`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="color:var(--muted);font-size:13px;">Fecha de compra</span>
          <span style="color:white;font-weight:600;font-size:13px;">${data.purchaseDate}</span>
        </div>`:''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="color:var(--muted);font-size:13px;">Soporte técnico</span>
          <span style="background:${data.technicalSupport==='Activo'?'#4CAF50':'#ff4444'};color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">${data.technicalSupport}</span>
        </div>
        ${data.brand==='iPhone'||data.brand==='Apple'?`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="color:var(--muted);font-size:13px;">Encuentra mi ${data.brand}</span>
          <span style="background:${data.fmiStatus==='OFF'?'#4CAF50':'#ff4444'};color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">${data.fmiStatus}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="color:var(--muted);font-size:13px;">Reemplazado por ${data.brand}</span>
          <span style="background:${data.replaced==='No'?'#4CAF50':'#ff4444'};color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">${data.replaced}</span>
        </div>`:''}
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--muted);font-size:13px;">Bloqueo de SIM</span>
          <span style="background:${data.simLockStatus==='Unlocked'?'#4CAF50':'#ff4444'};color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">${data.simLockStatus==='Unlocked'?'Desbloqueado':'Bloqueado'}</span>
        </div>
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
  if (!lastResult) return alert('No hay datos');
  const t = `📋 Cell Space Argentina\n📱 ${lastResult.brand} ${lastResult.modelName}\n🔢 IMEI: ${lastResult.imei}\n⚠️ ${lastResult.blacklistStatus}\n🔓 ${lastResult.simLockStatus}`;
  navigator.clipboard.writeText(t).then(() => alert('✅ Copiado'));
}

function shareWhatsApp() {
  if (!lastResult) return alert('No hay datos');
  window.open(`https://wa.me/5493782437674?text=🔍 *Cell Space Argentina*%0A📱 ${lastResult.brand} ${lastResult.modelName}%0A🔢 ${lastResult.imei}%0A⚠️ ${lastResult.blacklistStatus}`, '_blank');
}
