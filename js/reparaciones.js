// ========================================
// RASTREO DE REPARACIONES - SUPABASE
// ========================================

async function trackOrder() {
  const orderInput = document.getElementById('orderInput');
  const resultContainer = document.getElementById('trackResult');
  const orderId = orderInput.value.trim().toUpperCase();

  if (!orderId) {
    resultContainer.innerHTML = `
      <div class="alert alert-error">
        <i class="fas fa-exclamation-circle"></i> Por favor, ingresá un número de orden.
      </div>
    `;
    return;
  }

  // Mostrar estado de carga
  resultContainer.innerHTML = `
    <div class="loading-state">
      <i class="fas fa-spinner fa-spin"></i> Buscando tu reparación...
    </div>
  `;

  try {
    // Seguimiento público seguro: el RPC devuelve SOLO campos no privados
    // (nada de nombre/teléfono/DNI/diagnóstico). Busca por código o N° de orden.
    const { data: rows, error } = await supabase.rpc('track_repair', { p_code: orderId });
    const data = Array.isArray(rows) ? rows[0] : rows;

    if (error || !data) {
      resultContainer.innerHTML = `
        <div class="alert alert-error">
          <i class="fas fa-times-circle"></i> No encontramos ninguna reparación con el número <strong>${orderId}</strong>.<br>
          <small>Verificá que el número esté bien escrito o contactanos.</small>
        </div>
      `;
      return;
    }

    // Si se encuentra, mostrar el resultado
    renderRepairStatus(data);

  } catch (err) {
    console.error('Error al buscar:', err);
    resultContainer.innerHTML = `
      <div class="alert alert-error">
        <i class="fas fa-times-circle"></i> Ocurrió un error al buscar. Intentalo de nuevo.
      </div>
    `;
  }
}

function renderRepairStatus(repair) {
  const resultContainer = document.getElementById('trackResult');
  
  // Estados (los 11 del sistema). step = etapa para la línea de progreso (1..4).
  const statusConfig = {
    'recibido':             { icon: 'fa-box-open', color: '#3498db', text: 'Equipo Recibido', step: 1 },
    'diagnostico':          { icon: 'fa-stethoscope', color: '#f39c12', text: 'En Diagnóstico', step: 2 },
    'presupuesto':          { icon: 'fa-file-invoice-dollar', color: '#f39c12', text: 'Presupuesto Enviado', step: 2 },
    'esperando_aprobacion': { icon: 'fa-hourglass-half', color: '#e67e22', text: 'Esperando tu Aprobación', step: 2 },
    'en_reparacion':        { icon: 'fa-tools', color: '#e67e22', text: 'En Reparación', step: 3 },
    'esperando_repuesto':   { icon: 'fa-truck-ramp-box', color: '#9b59b6', text: 'Esperando Repuesto', step: 3 },
    'pausado':              { icon: 'fa-circle-pause', color: '#95a5a6', text: 'En Pausa', step: 3 },
    'reparado':             { icon: 'fa-wrench', color: '#2ecc71', text: 'Reparado', step: 4 },
    'listo':                { icon: 'fa-check-circle', color: '#2ecc71', text: 'Listo para Retirar', step: 4 },
    'entregado':            { icon: 'fa-hand-holding', color: '#27ae60', text: 'Equipo Entregado', step: 4 },
    'cancelado':            { icon: 'fa-ban', color: '#e74c3c', text: 'Reparación Cancelada', step: 0 }
  };

  const status = statusConfig[repair.status?.toLowerCase()] || { icon: 'fa-question-circle', color: '#95a5a6', text: 'Estado Desconocido', step: 0 };
  const curStep = status.step || 0;

  // Formatear fecha
  const date = new Date(repair.created_at).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  resultContainer.innerHTML = `
    <div class="success-card">
      <div class="success-header" style="border-left: 4px solid ${status.color};">
        <h3><i class="fas ${status.icon}" style="color: ${status.color};"></i> ${status.text}</h3>
        <p class="order-id">Orden: <strong>${repair.order_id}</strong></p>
      </div>
      
      <div class="repair-details">
        <div class="detail-row">
          <span class="label"><i class="fas fa-mobile-alt"></i> Equipo:</span>
          <span class="value">${repair.device_model || 'No especificado'} ${repair.device_brand || ''}</span>
        </div>
        <div class="detail-row">
          <span class="label"><i class="fas fa-calendar"></i> Fecha de ingreso:</span>
          <span class="value">${date}</span>
        </div>
        <div class="detail-row">
          <span class="label"><i class="fas fa-comment-alt"></i> Falla reportada:</span>
          <span class="value">${repair.issue_description || 'Sin descripción'}</span>
        </div>
        ${repair.estimated_cost ? `
        <div class="detail-row">
          <span class="label"><i class="fas fa-tag"></i> Presupuesto estimado:</span>
          <span class="value" style="color: var(--orange); font-weight: bold;">$${parseFloat(repair.estimated_cost).toLocaleString('es-AR')}</span>
        </div>
        ` : ''}
      </div>

      <div class="timeline">
        <h4>Progreso de la reparación</h4>
        <div class="timeline-steps">
          <div class="step ${curStep >= 1 ? 'completed' : ''}">
            <div class="step-icon"><i class="fas fa-box-open"></i></div>
            <p>Recibido</p>
          </div>
          <div class="step ${curStep >= 2 ? 'completed' : ''}">
            <div class="step-icon"><i class="fas fa-stethoscope"></i></div>
            <p>Diagnóstico</p>
          </div>
          <div class="step ${curStep >= 3 ? 'completed' : ''}">
            <div class="step-icon"><i class="fas fa-tools"></i></div>
            <p>Reparación</p>
          </div>
          <div class="step ${curStep >= 4 ? 'completed' : ''}">
            <div class="step-icon"><i class="fas fa-check-circle"></i></div>
            <p>Listo</p>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <a href="https://wa.me/5493782437674?text=Hola,%20consulto%20por%20la%20orden%20${repair.order_id}" target="_blank" class="btn-whatsapp-track">
          <i class="fab fa-whatsapp"></i> Consultar por WhatsApp
        </a>
      </div>
    </div>
  `;
}

// Permitir buscar presionando Enter
document.getElementById('orderInput')?.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    trackOrder();
  }
});
