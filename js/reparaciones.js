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
    // Consulta a Supabase
    // Asumimos que tu tabla se llama 'reparaciones' y el campo es 'order_id' o 'order_number'
    const { data, error } = await supabase
      .from('reparaciones')
      .select('*')
      .eq('order_id', orderId) // Cambiá 'order_id' por el nombre real de tu columna en Supabase
      .single();

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
  
  // Mapeo de estados a iconos y colores (ajustá según tus estados reales en la BD)
  const statusConfig = {
    'recibido': { icon: 'fa-box-open', color: '#3498db', text: 'Equipo Recibido' },
    'diagnostico': { icon: 'fa-stethoscope', color: '#f39c12', text: 'En Diagnóstico' },
    'espera_repuesto': { icon: 'fa-clock', color: '#9b59b6', text: 'Esperando Repuesto' },
    'en_reparacion': { icon: 'fa-tools', color: '#e67e22', text: 'En Reparación' },
    'listo': { icon: 'fa-check-circle', color: '#2ecc71', text: 'Reparación Finalizada' },
    'entregado': { icon: 'fa-hand-holding', color: '#27ae60', text: 'Equipo Entregado' }
  };

  const status = statusConfig[repair.status?.toLowerCase()] || { icon: 'fa-question-circle', color: '#95a5a6', text: 'Estado Desconocido' };

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
          <div class="step ${['recibido', 'diagnostico', 'espera_repuesto', 'en_reparacion', 'listo', 'entregado'].includes(repair.status?.toLowerCase()) ? 'completed' : ''}">
            <div class="step-icon"><i class="fas fa-box-open"></i></div>
            <p>Recibido</p>
          </div>
          <div class="step ${['diagnostico', 'espera_repuesto', 'en_reparacion', 'listo', 'entregado'].includes(repair.status?.toLowerCase()) ? 'completed' : ''}">
            <div class="step-icon"><i class="fas fa-stethoscope"></i></div>
            <p>Diagnóstico</p>
          </div>
          <div class="step ${['en_reparacion', 'listo', 'entregado'].includes(repair.status?.toLowerCase()) ? 'completed' : ''}">
            <div class="step-icon"><i class="fas fa-tools"></i></div>
            <p>Reparación</p>
          </div>
          <div class="step ${['listo', 'entregado'].includes(repair.status?.toLowerCase()) ? 'completed' : ''}">
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
