// ========================================
// CELL SPACE - SISTEMA TÉCNICO
// Rastreo, Órdenes y Diagnóstico IA
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupNewOrderForm();
});

// TABS
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// RASTREAR ORDEN
async function trackOrder() {
  const input = document.getElementById('orderInput').value.trim();
  const resultDiv = document.getElementById('trackResult');
  
  if (!input) return alert('️ Ingresá un número de orden');
  
  resultDiv.innerHTML = '<p class="loading"> Buscando orden...</p>';
  
  try {
    const snap = await db.collection('repair_orders').where('orderId', '==', input).get();
    
    if (snap.empty) {
      resultDiv.innerHTML = '<p class="error" style="color:#ff4444;margin-top:20px;">❌ Orden no encontrada. Verificá el número.</p>';
      return;
    }
    
    const order = snap.docs[0].data();
    renderOrderResult(order, resultDiv);
  } catch (e) {
    resultDiv.innerHTML = `<p class="error" style="color:#ff4444;margin-top:20px;">❌ Error: ${e.message}</p>`;
  }
}

function renderOrderResult(order, container) {
  const statusColor = getStatusColor(order.status);
  const stepsHTML = order.steps ? order.steps.map((step, i) => `
    <div class="timeline-item ${step.done ? 'done' : ''} ${!step.done && i === order.steps.findIndex(s => !s.done) ? 'active' : ''}">
      <div class="timeline-dot"></div>
      <span>${step.name}</span>
    </div>
  `).join('') : '';
  
  container.innerHTML = `
    <div class="order-card">
      <div class="order-header">
        <div>
          <h3>${order.orderId}</h3>
          <p class="date">${order.createdAt?.toDate().toLocaleDateString('es-AR') || 'Fecha no disponible'}</p>
        </div>
        <span class="status-badge" style="background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40">${order.status}</span>
      </div>
      
      <div class="info-grid">
        <div class="info-box">👤 <span>Cliente</span><strong>${order.clientName}</strong></div>
        <div class="info-box">📱 <span>Equipo</span><strong>${order.device}</strong></div>
        <div class="info-box"> <span>Técnico</span><strong>${order.technician || 'Asignando...'}</strong></div>
        <div class="info-box"> <span>Presupuesto</span><strong>$${Number(order.budget).toLocaleString('es-AR')}</strong></div>
      </div>
      
      <div class="fault-box">
        <strong>Falla reportada:</strong> ${order.fault}
      </div>
      
      <h4 style="color:white;margin:20px 0 15px;font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;">Estado del proceso</h4>
      <div class="timeline">
        ${stepsHTML}
      </div>
    </div>
  `;
}

function getStatusColor(status) {
  const map = {
    'Recibido': '#4CAF50', 'Revisando': '#2196F3', 'Esperando repuesto': '#FF9800',
    'En reparación': '#9C27B0', 'Pruebas': '#00BCD4', 'Listo': '#4CAF50', 'Entregado': '#888'
  };
  return map[status] || 'var(--orange)';
}

// NUEVA ORDEN
function setupNewOrderForm() {
  document.getElementById('newOrderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
      orderId: `TS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      clientName: document.getElementById('clientName').value,
      clientPhone: document.getElementById('clientPhone').value,
      device: document.getElementById('device').value,
      fault: document.getElementById('fault').value,
      technician: '',
      budget: 0,
      status: 'Recibido',
      steps: [
        { name: 'Recibido', done: true },
        { name: 'Revisando', done: false },
        { name: 'Esperando repuesto', done: false },
        { name: 'En reparación', done: false },
        { name: 'Pruebas', done: false },
        { name: 'Listo', done: false }
      ],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
      await db.collection('repair_orders').add(data);
      alert(`✅ Orden creada: ${data.orderId}\n\nGuardá este número para rastrear el estado.`);
      document.getElementById('newOrderForm').reset();
      document.getElementById('orderInput').value = data.orderId;
      trackOrder();
    } catch (err) {
      alert('❌ Error al crear orden: ' + err.message);
    }
  });
}

// DIAGNÓSTICO IA (Simulado)
function runAIDiagnosis() {
  const input = document.getElementById('aiInput').value.toLowerCase();
  const resultDiv = document.getElementById('aiResult');
  
  if (!input) return alert('⚠️ Describí el problema primero');
  
  resultDiv.innerHTML = '<p class="loading">🤖 Analizando síntomas...</p>';
  
  setTimeout(() => {
    let diagnosis = '', cost = '', time = '';
    
    if (input.includes('pantalla') || input.includes('display') || input.includes('tacto')) {
      diagnosis = '📱 Posible daño en pantalla/display. Se requiere revisión de flex, conectores y backlight.';
      cost = '$15.000 - $45.000'; time = '24-48 hs';
    } else if (input.includes('batería') || input.includes('carga') || input.includes('no enciende') || input.includes('apaga')) {
      diagnosis = '🔋 Problema de batería, puerto de carga o circuito de encendido. Verificar celda y flex.';
      cost = '$8.000 - $25.000'; time = '12-24 hs';
    } else if (input.includes('software') || input.includes('lento') || input.includes('reinicia') || input.includes('loop')) {
      diagnosis = '💻 Falla de software/crash. Se recomienda backup + reinstalación de sistema o DFU.';
      cost = '$5.000 - $10.000'; time = '2-4 hs';
    } else if (input.includes('agua') || input.includes('líquido') || input.includes('mojado')) {
      diagnosis = ' Daño por líquido. Requiere limpieza ultrasónica inmediata y revisión de corrosión.';
      cost = '$10.000 - $30.000'; time = '48-72 hs';
    } else {
      diagnosis = '🔍 Síntoma no reconocido automáticamente. Se recomienda traer el equipo para diagnóstico presencial gratuito.';
      cost = 'A definir'; time = 'A definir';
    }
    
    resultDiv.innerHTML = `
      <div class="ai-response">
        <h4>📋 Diagnóstico Preliminar</h4>
        <p>${diagnosis}</p>
        <div class="ai-details">
          <span>💰 Estimado: <strong>${cost}</strong></span>
          <span>⏱️ Tiempo: <strong>${time}</strong></span>
        </div>
        <button class="btn-secondary" onclick="document.querySelector('[data-tab=new]').click()">📝 Crear orden con estos datos</button>
      </div>
    `;
  }, 1500);
}