import { supabase } from '../config.js?v=cb14';
import { store } from '../core/state.js?v=cb14';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb14';

let products = [];
let movements = [];
const LOW_STOCK = 3;

const TYPE = {
  entrada:    { label: 'Entrada',    color: '#4CAF50', sign: '+' },
  devolucion: { label: 'Devolución', color: '#2196F3', sign: '+' },
  salida:     { label: 'Salida',     color: '#f44336', sign: '-' },
  venta:      { label: 'Venta',      color: '#FF9800', sign: '-' },
  ajuste:     { label: 'Ajuste',     color: '#9C27B0', sign: '=' },
};

export async function inventoryView(){
  return layout({
    title: 'Inventario',
    toolbar: toolbar({
      searchId: 'iSearch',
      searchPlaceholder: 'Buscar movimiento por producto...',
      countId: 'iCount',
      filters: [
        { id: 'iFilterType', options: [
          { v: '', l: 'Todos los tipos' },
          ...Object.entries(TYPE).map(([v, o]) => ({ v, l: o.label })),
        ]},
      ],
      action: { label: 'Nuevo movimiento', icon: 'fas fa-plus', onclick: 'openMovementModal()' },
    }),
    content: `<div id="lowStock"></div><div class="admin-products-grid" id="movementsList"></div><div id="movModalRoot"></div>`,
  });
}

export function inventoryViewOnMount(){
  mountLayout();
  document.getElementById('iSearch').addEventListener('input', applyFilters);
  document.getElementById('iFilterType').addEventListener('change', applyFilters);
  loadAll();
}

async function loadAll(){
  const list = document.getElementById('movementsList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando inventario...</p>';
  try {
    const [p, m] = await Promise.all([
      supabase.from('products').select('id,name,sku,stock').order('name'),
      supabase.from('stock_movements').select('*, products(name,sku)').order('created_at', { ascending: false }).limit(200),
    ]);
    if (p.error) throw p.error;
    products = p.data || [];
    movements = m.data || [];
    renderLowStock();
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar: ${escapeHtml(e.message)}</p>`;
  }
}

function renderLowStock(){
  const cont = document.getElementById('lowStock');
  const low = products.filter(p => (Number(p.stock) || 0) <= LOW_STOCK);
  if (!low.length) { cont.innerHTML = ''; return; }
  cont.innerHTML = `<div style="background:rgba(244,67,54,0.08);border:1px solid rgba(244,67,54,0.3);border-radius:12px;padding:14px 16px;margin-bottom:16px;">
    <div style="color:#f44336;font-weight:700;margin-bottom:8px;"><i class="fas fa-triangle-exclamation"></i> Stock bajo (${low.length})</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">${low.map(p =>
      `<span style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:5px 10px;font-size:13px;color:#ddd;">${escapeHtml(p.name)} · <b style="color:#f44336;">${Number(p.stock)||0}</b></span>`).join('')}</div>
  </div>`;
}

function applyFilters(){
  const q = (document.getElementById('iSearch').value || '').toLowerCase().trim();
  const ty = document.getElementById('iFilterType').value;
  const list = movements.filter(m => {
    const name = (m.products && m.products.name || '').toLowerCase();
    return (!q || name.includes(q)) && (!ty || m.type === ty);
  });
  document.getElementById('iCount').textContent = `${list.length} movimiento(s) · ${products.length} producto(s)`;
  render(list);
}

function render(list){
  const cont = document.getElementById('movementsList');
  if (!list.length){
    cont.innerHTML = emptyState({
      icon: 'fas fa-boxes-stacked', title: 'Sin movimientos',
      text: 'Registrá entradas, salidas o ajustes de stock.',
      action: { label: 'Nuevo movimiento', icon: 'fas fa-plus', onclick: 'openMovementModal()' },
    });
    return;
  }
  cont.innerHTML = list.map(m => {
    const t = TYPE[m.type] || { label: m.type, color: '#888', sign: '' };
    const fecha = m.created_at ? new Date(m.created_at).toLocaleString('es-AR') : '';
    const pname = (m.products && m.products.name) || '(producto eliminado)';
    return `<div class="admin-product-card">
      <div class="ap-thumb" style="background:${t.color}22;color:${t.color};font-size:20px;"><i class="fas fa-arrow-right-arrow-left"></i></div>
      <div class="ap-body">
        <div class="ap-top"><span class="ap-state" style="background:${t.color}22;color:${t.color};">${escapeHtml(t.label)} ${t.sign}${m.quantity}</span></div>
        <h4 class="ap-name">${escapeHtml(pname)}</h4>
        <div class="ap-meta">Stock: ${m.qty_before} → <b style="color:#fff;">${m.qty_after}</b>${m.reason ? ' · ' + escapeHtml(m.reason) : ''}</div>
        <div class="ap-meta">${escapeHtml(fecha)}</div>
      </div>
    </div>`;
  }).join('');
}

/* ---------- modal ---------- */
window.openMovementModal = function(){
  const prodOpts = products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (stock: ${Number(p.stock)||0})</option>`).join('');
  const typeOpts = Object.entries(TYPE).filter(([k]) => k !== 'venta').map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  document.getElementById('movModalRoot').innerHTML = `
  <div class="cs-modal-backdrop" onclick="closeMovementModal(event)">
    <div class="cs-modal" onclick="event.stopPropagation()">
      <div class="cs-modal-head"><h3 style="margin:0;color:#fff;">Nuevo movimiento de stock</h3>
        <button class="cs-modal-x" onclick="closeMovementModal()"><i class="fas fa-times"></i></button></div>
      <div class="cs-modal-body">
        <div class="g-grid">
          <div class="g-field g-col2"><label>Producto *</label><select id="m_product">${prodOpts}</select></div>
          <div class="g-field"><label>Tipo</label><select id="m_type" onchange="movHint()">${typeOpts}</select></div>
          <div class="g-field"><label>Cantidad *</label><input id="m_qty" type="number" min="0" step="1" value="1"></div>
          <div class="g-field g-col2"><label>Motivo</label><input id="m_reason" type="text" placeholder="Ej: compra a proveedor, rotura, conteo físico"></div>
          <div class="g-field g-col2" id="m_hint" style="color:var(--muted,#888);font-size:12px;"></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;">
          <button class="btn-secondary" onclick="closeMovementModal()">Cancelar</button>
          <button class="btn-primary" id="mSaveBtn" onclick="saveMovement()"><i class="fas fa-save"></i> Registrar</button>
        </div>
      </div>
    </div>
  </div>`;
  injectMovStyles();
  movHint();
};
window.movHint = function(){
  const t = document.getElementById('m_type')?.value;
  const el = document.getElementById('m_hint'); if (!el) return;
  el.textContent = t === 'ajuste' ? 'Ajuste: la cantidad es el stock EXACTO que va a quedar.'
    : (t === 'salida' || t === 'venta') ? 'Se descuenta del stock actual.' : 'Se suma al stock actual.';
};
window.closeMovementModal = function(e){
  if (e && e.target && !e.target.classList.contains('cs-modal-backdrop')) return;
  document.getElementById('movModalRoot').innerHTML = '';
};
window.saveMovement = async function(){
  const btn = document.getElementById('mSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
  try {
    const product_id = document.getElementById('m_product').value;
    const type = document.getElementById('m_type').value;
    const quantity = parseInt(document.getElementById('m_qty').value, 10);
    const reason = document.getElementById('m_reason').value.trim() || null;
    if (!product_id) throw new Error('Elegí un producto');
    if (isNaN(quantity) || quantity < 0) throw new Error('Cantidad inválida');
    const { error } = await supabase.from('stock_movements').insert({
      product_id, type, quantity, reason, user_id: store.getState().user?.id || null,
    });
    if (error) throw error;
    toast('Movimiento registrado — stock actualizado', 'ok');
    closeMovementModal(); loadAll();
  } catch (err) { console.error(err); toast('Error: ' + err.message, 'err'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Registrar'; } }
};

function injectMovStyles(){
  if (document.getElementById('cs-mov-style')) return;
  const s = document.createElement('style'); s.id = 'cs-mov-style';
  s.textContent = `
    .cs-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;}
    .cs-modal{background:#151515;border:1px solid #2a2a2a;border-radius:16px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6);}
    .cs-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #2a2a2a;}
    .cs-modal-x{background:none;border:none;color:#888;font-size:18px;cursor:pointer;} .cs-modal-x:hover{color:#fff;}
    .cs-modal-body{padding:20px;}
    .g-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .g-field{display:flex;flex-direction:column;gap:5px;} .g-field.g-col2{grid-column:1/-1;}
    .g-field label{color:#bbb;font-size:12px;}
    .cs-modal-body input, .cs-modal-body select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;}`;
  document.head.appendChild(s);
}
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function toast(msg, type){
  const t = document.createElement('div');
  t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok');
  t.innerHTML = `<i class="fas ${type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${escapeHtml(msg)}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}
