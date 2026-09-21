import { supabase } from '../config.js?v=cb22';
import { layout, mountLayout, emptyState } from '../core/layout.js?v=cb22';

let allFees = [];
let currentEditId = null;

const METHODS = {
  transfer:    { label: 'Transferencia', icon: 'fas fa-money-bill-wave', color: '#10c46a' },
  cash:        { label: 'Efectivo',      icon: 'fas fa-coins',           color: '#FFD700' },
  mercadopago: { label: 'Mercado Pago',  icon: 'fas fa-credit-card',     color: '#009ee3' },
};

export async function paymentFeesView() {
  const content = `
    <div class="products-toolbar">
      <p class="field-hint" style="margin:0;">
        Configurá los medios de pago que ofrecés y su recargo o descuento. Se aplican automáticamente al precio final de cada producto.
      </p>
      <button class="btn-primary" onclick="openFeeModal()">
        <i class="fas fa-plus"></i> Nuevo medio
      </button>
    </div>
    <div class="products-count" id="feesCount">Cargando...</div>
    <div class="admin-products-grid" id="feesGrid"></div>`;

  const modal = `
  <div class="modal-overlay" id="feeModal">
    <div class="modal-box">
      <div class="modal-header"><h2 id="feeModalTitle">Nuevo medio</h2><button class="modal-close" onclick="closeFeeModal()"><i class="fas fa-times"></i></button></div>
      <form id="feeForm" class="modal-body">
        <div class="form-row">
          <div class="form-group full">
            <label>Método *</label>
            <select id="f_method" required>
              <option value="transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
              <option value="mercadopago">Mercado Pago</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Cuotas</label><input type="number" id="f_installments" min="1" max="24" value="1"></div>
          <div class="form-group"><label>Porcentaje (%)</label><input type="number" id="f_percentage" step="0.1" value="0" placeholder="Ej: 6.5, -10, 0"></div>
        </div>
        <div class="form-row"><div class="form-group full"><label>Label *</label><input type="text" id="f_label" required placeholder="Ej: 12 cuotas sin interés"></div></div>
        <div class="form-row"><div class="form-group full"><label>Descripción</label><textarea id="f_description" rows="2" placeholder="Ej: Financiación en 12 cuotas."></textarea></div></div>
        <div class="form-row">
          <div class="form-group"><label>Orden</label><input type="number" id="f_order" value="0"></div>
        </div>
        <div class="form-row checks">
          <label class="check"><input type="checkbox" id="f_active" checked><span>Activo</span></label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeFeeModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="feeSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>`;

  return layout({ title: 'Medios de pago', content }) + modal;
}

export function paymentFeesViewOnMount() {
  mountLayout();
  document.getElementById('feeForm').addEventListener('submit', saveFee);
  loadFees();
}

async function loadFees() {
  const grid = document.getElementById('feesGrid');
  grid.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando medios de pago...</p>';
  try {
    const { data, error } = await supabase.from('payment_fees').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    allFees = data || [];
    document.getElementById('feesCount').textContent = allFees.length + ' medio(s)';
    renderFees();
  } catch (e) { console.error(e); grid.innerHTML = '<p class="loading-text" style="color:#ff4444">Error al cargar: '+e.message+'</p>'; }
}

function renderFees() {
  const grid = document.getElementById('feesGrid');
  if (!allFees.length) {
    grid.innerHTML = emptyState({
      icon: 'fas fa-credit-card',
      title: 'No hay medios de pago',
      text: 'Creá el primero.',
      action: { label: 'Nuevo medio', icon: 'fas fa-plus', onclick: 'openFeeModal()' },
    });
    return;
  }

  // Agrupar por método
  const grouped = {};
  Object.keys(METHODS).forEach(k => grouped[k] = []);
  allFees.forEach(f => {
    const m = f.method || 'transfer';
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(f);
  });

  grid.innerHTML = Object.entries(grouped)
    .filter(([_, fees]) => fees.length > 0)
    .map(([methodId, fees]) => {
      const m = METHODS[methodId] || { label: methodId, color: '#888', icon: 'fas fa-wallet' };
      return `
        <div class="cat-section">
          <div class="cat-section-head" style="--cat-color: ${m.color}">
            <i class="${m.icon}"></i>
            <span>${escapeHtml(m.label)}</span>
            <span class="cat-section-count">${fees.length}</span>
          </div>
          <div class="cat-section-list">
            ${fees.map(f => renderFeeCard(f, m)).join('')}
          </div>
        </div>`;
    }).join('');
}

function renderFeeCard(f, m) {
  const pct = Number(f.percentage) || 0;
  const pctClass = pct > 0 ? 'fee-surcharge' : pct < 0 ? 'fee-discount' : 'fee-neutral';
  const pctText = pct > 0 ? `+${pct}% recargo` : pct < 0 ? `${pct}% descuento` : 'Sin recargo';

  return `
    <div class="admin-product-card" style="--cat-color: ${m.color}">
      <div class="ap-thumb"><i class="${escAttr(m.icon)}" style="font-size:32px;color:${m.color}"></i></div>
      <div class="ap-body">
        <div class="ap-top">
          ${f.installments > 1 ? `<span class="ap-cat">${f.installments} cuotas</span>` : ''}
          ${f.is_active ? '<span class="ap-state st-active">Activo</span>' : '<span class="ap-state st-hidden">Inactivo</span>'}
        </div>
        <h4 class="ap-name">${escapeHtml(f.label)}</h4>
        ${f.description ? `<div class="ap-meta">${escapeHtml(f.description)}</div>` : ''}
        <div class="fee-percentage ${pctClass}">${escapeHtml(pctText)}</div>
      </div>
      <div class="ap-actions">
        <button title="Editar" onclick="editFee('${f.id}')"><i class="fas fa-pen"></i></button>
        <button title="Eliminar" class="del" onclick="deleteFee('${f.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
}

window.openFeeModal = function () {
  currentEditId = null;
  document.getElementById('feeModalTitle').textContent = 'Nuevo medio';
  document.getElementById('feeForm').reset();
  document.getElementById('feeModal').classList.add('open');
};

window.editFee = function (id) {
  const f = allFees.find(x => x.id === id); if (!f) return;
  currentEditId = id;
  document.getElementById('feeModalTitle').textContent = 'Editar medio';
  document.getElementById('f_method').value = f.method || 'transfer';
  document.getElementById('f_installments').value = f.installments ?? 1;
  document.getElementById('f_percentage').value = f.percentage ?? 0;
  document.getElementById('f_label').value = f.label || '';
  document.getElementById('f_description').value = f.description || '';
  document.getElementById('f_order').value = f.sort_order ?? 0;
  document.getElementById('f_active').checked = f.is_active !== false;
  document.getElementById('feeModal').classList.add('open');
};

window.closeFeeModal = function () { document.getElementById('feeModal').classList.remove('open'); };

window.deleteFee = async function (id) {
  if (!confirm('¿Eliminar este medio de pago?')) return;
  try {
    const { error } = await supabase.from('payment_fees').delete().eq('id', id);
    if (error) throw error;
    toast('Medio eliminado', 'ok'); loadFees();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

async function saveFee(e) {
  e.preventDefault();
  const btn = document.getElementById('feeSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const label = document.getElementById('f_label').value.trim();
    if (!label) throw new Error('El label es obligatorio');
    const payload = {
      method: document.getElementById('f_method').value,
      installments: parseInt(document.getElementById('f_installments').value) || 1,
      percentage: parseFloat(document.getElementById('f_percentage').value) || 0,
      label,
      description: document.getElementById('f_description').value.trim() || null,
      sort_order: parseInt(document.getElementById('f_order').value) || 0,
      is_active: document.getElementById('f_active').checked,
    };
    let error;
    if (currentEditId) ({ error } = await supabase.from('payment_fees').update(payload).eq('id', currentEditId));
    else ({ error } = await supabase.from('payment_fees').insert(payload));
    if (error) throw error;
    toast(currentEditId ? 'Medio actualizado' : 'Medio creado', 'ok');
    closeFeeModal(); loadFees();
  } catch (err) { toast('Error: ' + err.message, 'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; }
}

function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
function toast(msg, type) { const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'"></i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }

/** Aplica el % de un medio de pago a un precio base. Usable desde otras vistas (ej: producto). */
export function calcularPrecio(precioBase, percentage) {
  return Math.round(precioBase * (1 + percentage / 100));
}
