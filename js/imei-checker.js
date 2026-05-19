// ========================================
// CELL SPACE - IMEI CHECKER
// Modo: Verificación Manual por WhatsApp
// ========================================

console.log('🔍 Cell Space IMEI System Loaded');

document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  setupSearchTabs();
  setupIMEIInput();
  
  // Configurar botón para redirigir a WhatsApp
  const btn = document.getElementById('searchBtn');
  const input = document.getElementById('imeiInput');
  
  if (btn) {
    btn.addEventListener('click', () => {
      const imei = input.value.trim();
      
      if (!imei || imei.length < 14) {
        alert('⚠️ Ingresá un IMEI válido (14-16 dígitos)');
        return;
      }
      
      // Redirigir a WhatsApp con el IMEI pre-completado
      const message = `Hola! 👋\nNecesito verificar un IMEI:\n\n📱 *${imei}*\n\n¿Me pueden ayudar con la verificación?`;
      const whatsappUrl = `https://wa.me/5493782437674?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');
    });
  }
  
  // Mostrar sección informativa
  const section = document.getElementById('resultsSection');
  if (section) {
    section.innerHTML = `
      <div style="text-align:center;padding:60px 20px;background:linear-gradient(135deg, rgba(255,106,0,0.1) 0%, rgba(255,106,0,0.05) 100%);border-radius:16px;margin:40px auto;max-width:600px;border:2px solid rgba(255,106,0,0.2);">
        <div style="font-size:5rem;margin-bottom:20px;">📱</div>
        <h2 style="color:var(--orange);margin:0 0 15px 0;font-size:1.8rem;">Verificación de IMEI</h2>
        <p style="color:var(--muted);margin:0 0 25px 0;font-size:1.1rem;line-height:1.6;">
          Para garantizar la precisión de la información, realizamos verificaciones <strong>manualmente</strong>.
        </p>
        
        <div style="background:rgba(255,255,255,0.05);padding:25px;border-radius:12px;margin:25px 0;">
          <h3 style="color:white;margin:0 0 15px 0;font-size:1.2rem;">¿Cómo funciona?</h3>
          <ol style="text-align:left;color:var(--muted);margin:0;padding-left:20px;line-height:1.8;">
            <li>Ingresá tu IMEI en el campo de arriba</li>
            <li>Hacé clic en "Consultar"</li>
            <li>Te redirigiremos a WhatsApp con los datos</li>
            <li>Te respondemos en minutos con el reporte completo</li>
          </ol>
        </div>
        
        <div style="background:rgba(76,175,80,0.1);padding:20px;border-radius:12px;margin:20px 0;border-left:4px solid #4CAF50;">
          <p style="margin:0 0 10px 0;color:#4CAF50;font-weight:700;">✅ Ventajas:</p>
          <ul style="text-align:left;color:var(--muted);margin:0;padding-left:20px;">
            <li>Verificación 100% precisa</li>
            <li>Respuesta rápida (5-10 min)</li>
            <li>Asesoramiento personalizado</li>
            <li>Sin costo de consulta</li>
          </ul>
        </div>
        
        <a href="https://wa.me/5493782437674?text=Hola!%20Necesito%20verificar%20un%20IMEI" 
           target="_blank" 
           style="display:inline-flex;align-items:center;gap:10px;padding:15px 35px;background:#25D366;color:white;text-decoration:none;border-radius:30px;font-weight:700;font-size:1.1rem;margin-top:20px;box-shadow:0 4px 15px rgba(37,211,102,0.3);transition:transform 0.3s;">
          <span>💬</span>
          <span>Consultar por WhatsApp</span>
        </a>
        
        <p style="color:var(--muted);margin:20px 0 0 0;font-size:0.9rem;">
          Horario de atención: Lun-Sáb 9:00 - 20:00
        </p>
      </div>
    `;
    section.style.display = 'block';
  }
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
    });
  });
}

// VALIDACIÓN DE INPUT
function setupIMEIInput() {
  const input = document.getElementById('imeiInput');
  input.addEventListener('input', function() {
    this.value = this.value.replace(/[^0-9A-Fa-f]/g, '');
  });
}

console.log('✅ IMEI Checker en modo manual listo');
