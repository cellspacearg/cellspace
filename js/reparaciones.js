// ========================================
// CELL SPACE - RASTREO DE REPARACIONES
// Solo consulta de estado para clientes
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Sistema de rastreo cargado');
  
  // Permitir buscar con Enter
  const input = document.getElementById('orderInput');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') trackOrder();
    });
  }
});

// RASTREAR ORDEN
async function trackOrder() {
  const input = document.getElementById('orderInput');
  const resultDiv = document.getElementById('trackResult');
  const orderId = input.value.trim().toUpperCase();
  
  if (!orderId) {
    resultDiv.innerHTML = '<p class="error">⚠️ Por favor ingresá un número de orden</p>';
    input.focus();
    return;
  }
  
  resultDiv.innerHTML = '<p class="loading">🔍 Buscando orden...</p>';
  
  try {
    const snap = await db.collection('repair_orders')
      .where('orderId', '==', orderId)
      .get();
    
    if (snap.empty) {
      resultDiv.innerHTML = `
        <div class="error">
          <p style="font-size:1.2rem;margin:0 0 10px 0;">❌ Orden no encontrada</p>
          <p style="margin:0;font-size:0.95rem;">
            Verificá el número de orden o contactanos por WhatsApp<br>
            <small>Número buscado: <strong>${orderId}</strong></small>
          </p>
        </div>
      `;
      return;
    }
    
    const order = snap.docs[0].data();
    renderOrderResult(order, resultDiv);
    
  } catch (e) {
    console.error('Error:', e);
    resultDiv.innerHTML = `
      <div class="error">
        <p style="font-size:1.2rem;margin:0 0 10px 0;">❌ Error al consultar</p>
        <p style="margin:0;font-size:0.95rem;">
          Intentá de nuevo en unos segundos<br>
          <small>${e.message}</small>
        </p>
      </div>
    `;
  }
}

function renderOrderResult(order, container) {
  const statusColor = getStatusColor(order.status);
  
  // Generar timeline de pasos
  const stepsHTML = order.steps && order.steps.length > 0 
    ? order.steps.map((step, index) => {
        const isDone = step.done === true;
        const isActive = !isDone && index === order.steps.findIndex(s => s.done !== true);
        const className = isDone ? 'done' : (isActive ? 'active' : '');
        
        return `
          <div class="timeline-item ${className}">
            <div class="timeline-dot"></div>
            <span>${step.name || step}</span>
          </div>
        `;
      }).join('')
    : '<p style="color:var(--muted);text-align:center;">Sin pasos definidos</p>';
  
  const clientInfo = order.clientPhone ? `📱 ${order.clientPhone}` : '';
  const technicianInfo = order.technician ? order.technician : 'Asignando...';
  const budgetText = order.budget ? `$${Number(order.budget).toLocaleString('es-AR')}` : 'A confirmar';
  
  container.innerHTML = `
    <div class="order-card">
      <div class="order-header">
        <div>
          <h3>${order.orderId}</h3>
          <p class="date">
            📅 ${order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('es-AR') : 'Fecha no disponible'}
          </p>
        </div>
        <span class="status-badge" style="background:${statusColor}20;color:${statusColor};border:2px solid ${statusColor}">
          ${order.status || 'Pendiente'}
        </span>
      </div>
      
      <div class="info-grid">
        <div class="info-box">
          <span>👤 Cliente</span>
          <strong>${order.clientName || 'No disponible'}</strong>
        </div>
        <div class="info-box">
          <span>📱 Equipo</span>
          <strong>${order.device || 'No disponible'}</strong>
        </div>
        <div class="info-box">
          <span>🔧 Técnico</span>
          <strong>${technicianInfo}</strong>
        </div>
        <div class="info-box">
          <span>💰 Presupuesto</span>
          <strong>${budgetText}</strong>
        </div>
      </div>
      
      ${order.fault ? `
      <div class="fault-box">
        <strong>📋 Falla reportada:</strong>
        ${order.fault}
      </div>
      ` : ''}
      
      <h4 class="timeline-title">📊 Estado del proceso</h4>
      <div class="timeline">
        ${stepsHTML}
      </div>
      
      <div style="margin-top:25px;padding:15px;background:rgba(255,106,0,0.1);border-radius:10px;text-align:center;">
        <p style="margin:0 0 10px 0;color:var(--muted);">¿Tenés dudas sobre tu reparación?</p>
        <a href="https://wa.me/5493782437674?text=Hola!%20Consulta%20por%20mi%20orden%20${order.orderId}" 
           target="_blank"
           style="display:inline-block;padding:10px 25px;background:#25D366;color:white;text-decoration:none;border-radius:25px;font-weight:600;">
          💬 Consultar por WhatsApp
        </a>
      </div>
    </div>
  `;
}

function getStatusColor(status) {
  const map = {
    'Recibido': '#4CAF50',
    'Revisando': '#2196F3',
    'Esperando repuesto': '#FF9800',
    'En reparación': '#9C27B0',
    'Pruebas': '#00BCD4',
    'Listo': '#4CAF50',
    'Entregado': '#888'
  };
  return map[status] || 'var(--orange)';
}
