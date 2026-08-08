import { supabase } from '../config.js';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js';

let allOrders = [];

// Ciclo de vida del pedido (fulfillment). Se puede setear desde el panel.
const ORDER_STATUS = {
  nuevo:      { label: 'Nuevo',       color: '#2196F3' },
  confirmado: { label: 'Confirmado',  color: '#00BCD4' },
  preparando: { label: 'Preparando',  color: '#FF9800' },
  enviado:    { label: 'Enviado',     color: '#9C27B0' },
  entregado:  { label: 'Entregado',   color: '#4CAF50' },
  cancelado:  { label: 'Cancelado',   color: '#f44336' },
};

// Estado del pago (lo setea Mercado Pago o la confirmación manual).
const PAY_STATUS = {
  pending:    { label: 'Pago pendiente', color: '#FF9800' },
  in_process: { label: 'En proceso',     color: '#2196F3' },
  approved:   { label: 'Pago aprobado',  color: '#4CAF50' },
  rejected:   { label: 'Rechazado',      color: '#f44336' },
  cancelled:  { label: 'Cancelado',      color: '#888' },
};

const PAY_METHOD = { mercadopago: 'Mercado Pago', transferencia: 'Transferencia', binance: 'Binance (USDT)', efectivo: 'Efectivo' };

export async function ordersView(){
  return layout({
    title: 'Pedidos',
    toolbar: toolbar({
      searchId: 'orderSearch',
      searchPlaceholder: 'Buscar por N° de pedido, nombre o email...',
      countId: 'ordersCount',
      filters: [
        { id: 'filterOrderStatus', options: [
          { v: '', l: 'Todos los estados' },
          ...Object.entries(ORDER_STATUS).map(([v, o]) => ({ v, l: o.label })),
        ]},
        { id: 'filterPayStatus', options: [
          { v: '', l: 'Todos los pagos' },
          ...Object.entries(PAY_STATUS).map(([v, o]) => ({ v, l: o.label })),
        ]},
      ],
    }),
    content: `<div class="admin-products-grid" id="ordersList"></div>
      <div id="orderModalRoot"></div>`,
  });
}

export function ordersViewOnMount(){
  mountLayout();
  document.getElementById('orderSearch').addEventListener('input', applyFilters);
  document.getElementById('filterOrderStatus').addEventListener('change', applyFilters);
  document.getElementById('filterPayStatus').addEventListener('change', applyFilters);
  loadOrders();
}

async function loadOrders(){
  const list = document.getElementById('ordersList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando pedidos...</p>';
  try {
    const { data, error } = await supabase
      .from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allOrders = data || [];
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar pedidos: ${escapeHtml(e.message)}</p>`;
  }
}

function applyFilters(){
  const q = (document.getElementById('orderSearch').value || '').toLowerCase().trim();
  const os = document.getElementById('filterOrderStatus').value;
  const ps = document.getElementById('filterPayStatus').value;

  const list = allOrders.filter(o => {
    const mQ = !q ||
      (o.order_number || '').toLowerCase().includes(q) ||
      (o.buyer_name || '').toLowerCase().includes(q) ||
      (o.buyer_email || '').toLowerCase().includes(q);
    const mOS = !os || (o.order_status || 'nuevo') === os;
    const mPS = !ps || (o.payment_status || 'pending') === ps;
    return mQ && mOS && mPS;
  });

  const totalVendido = allOrders
    .filter(o => (o.payment_status || '') === 'approved')
    .reduce((s, o) => s + (Number(o.total) || 0), 0);
  document.getElementById('ordersCount').textContent =
    `${list.length} pedido(s) · $${money(totalVendido)} cobrado (pagos aprobados)`;

  render(list);
}

function render(list){
  const cont = document.getElementById('ordersList');
  if (!list.length){
    cont.innerHTML = emptyState({
      icon: 'fas fa-shopping-cart',
      title: 'No hay pedidos',
      text: 'Todavía no hay pedidos que coincidan con la búsqueda.',
    });
    return;
  }

  cont.innerHTML = list.map(o => {
    const os = ORDER_STATUS[o.order_status || 'nuevo'] || { label: o.order_status || '—', color: '#888' };
    const ps = PAY_STATUS[o.payment_status || 'pending'] || { label: o.payment_status || '—', color: '#888' };
    const items = Array.isArray(o.items) ? o.items : [];
    const nItems = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
    const fecha = o.created_at ? new Date(o.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const canConfirm = (o.payment_status || 'pending') !== 'approved';

    return `<div class="admin-product-card">
      <div class="ap-thumb" style="background:${os.color}22;color:${os.color};font-size:22px;"><i class="fas fa-receipt"></i></div>

      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-state" style="background:${os.color}22;color:${os.color};">${escapeHtml(os.label)}</span>
          <span class="ap-state" style="background:${ps.color}22;color:${ps.color};">${escapeHtml(ps.label)}</span>
        </div>
        <h4 class="ap-name">${escapeHtml(o.order_number || '(sin nº)')} · $${money(o.total)}</h4>
        <div class="ap-meta">${escapeHtml(o.buyer_name || 'Sin nombre')}${o.buyer_email ? ' · ' + escapeHtml(o.buyer_email) : ''}</div>
        <div class="ap-meta">${nItems} ítem(s) · ${escapeHtml(PAY_METHOD[o.payment_method] || o.payment_method || '—')} · ${escapeHtml(fecha)}</div>
      </div>

      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <select class="filter-select" style="padding:8px 12px;font-size:13px;"
                onchange="changeOrderStatus('${o.id}', this.value)">
          ${Object.entries(ORDER_STATUS).map(([k, v]) =>
            `<option value="${k}" ${(o.order_status || 'nuevo') === k ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
        ${canConfirm ? `<button class="btn-secondary" style="padding:9px 14px;font-size:13px;"
                onclick="confirmOrderPayment('${o.id}')"><i class="fas fa-hand-holding-dollar"></i> Confirmar pago</button>` : ''}
        <button class="btn-primary" style="padding:9px 14px;font-size:13px;"
                onclick="viewOrder('${o.id}')"><i class="fas fa-eye"></i> Detalle</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- acciones ---------- */

window.changeOrderStatus = async function(id, status){
  const o = allOrders.find(x => x.id === id);
  if (!o) return;
  if (status === 'cancelado' && !confirm('¿Marcar este pedido como CANCELADO?')) { render(allOrders); return; }
  try {
    const { error } = await supabase.from('orders')
      .update({ order_status: status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    o.order_status = status;
    toast('Estado del pedido actualizado', 'ok');
    applyFilters();
  } catch (e) { toast('Error: ' + e.message, 'err'); loadOrders(); }
};

window.confirmOrderPayment = async function(id){
  const o = allOrders.find(x => x.id === id);
  if (!o) return;
  if (!confirm(`¿Confirmar el pago del pedido ${o.order_number || ''}?\n\nEsto marca el pago como aprobado y descuenta el stock.`)) return;
  try {
    const { error } = await supabase.rpc('confirm_manual_payment', { p_order_id: id });
    if (error) throw error;
    toast('Pago confirmado', 'ok');
    loadOrders();
  } catch (e) { toast('Error al confirmar: ' + e.message, 'err'); }
};

window.viewOrder = function(id){
  const o = allOrders.find(x => x.id === id);
  if (!o) return;
  const items = Array.isArray(o.items) ? o.items : [];
  const os = ORDER_STATUS[o.order_status || 'nuevo'] || { label: o.order_status, color: '#888' };
  const ps = PAY_STATUS[o.payment_status || 'pending'] || { label: o.payment_status, color: '#888' };

  const itemsRows = items.map(it => `
    <tr>
      <td style="padding:8px 6px;color:#ddd;">${escapeHtml(it.name || '')} <span style="color:#888;">x${escapeHtml(String(it.quantity || 1))}</span></td>
      <td style="padding:8px 6px;color:#fff;text-align:right;white-space:nowrap;">$${money((Number(it.price) || 0) * (Number(it.quantity) || 1))}</td>
    </tr>`).join('') || '<tr><td colspan="2" style="color:#888;padding:8px 6px;">Sin ítems</td></tr>';

  const bill = [o.billing_street, o.billing_number, o.billing_floor && ('Piso ' + o.billing_floor), o.billing_apartment && ('Depto ' + o.billing_apartment), o.billing_postal_code && ('CP ' + o.billing_postal_code)].filter(Boolean).join(' ');
  const ship = o.ship_to_different_address
    ? [o.shipping_street, o.shipping_number, o.shipping_city, o.shipping_province, o.shipping_postal_code && ('CP ' + o.shipping_postal_code)].filter(Boolean).join(' ')
    : 'Misma que facturación';

  const root = document.getElementById('orderModalRoot');
  root.innerHTML = `
  <div class="cs-modal-backdrop" onclick="closeOrderModal(event)">
    <div class="cs-modal" onclick="event.stopPropagation()">
      <div class="cs-modal-head">
        <div>
          <h3 style="margin:0;color:#fff;">${escapeHtml(o.order_number || 'Pedido')}</h3>
          <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
            <span class="ap-state" style="background:${os.color}22;color:${os.color};">${escapeHtml(os.label)}</span>
            <span class="ap-state" style="background:${ps.color}22;color:${ps.color};">${escapeHtml(ps.label)}</span>
          </div>
        </div>
        <button class="cs-modal-x" onclick="closeOrderModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="cs-modal-body">
        <h4 class="cs-modal-sec">Comprador</h4>
        <p class="cs-modal-p">${escapeHtml(o.buyer_name || '')}${o.buyer_company ? ' · ' + escapeHtml(o.buyer_company) : ''}<br>
          ${escapeHtml(o.buyer_email || '')}${o.buyer_phone ? ' · ' + escapeHtml(o.buyer_phone) : ''}<br>
          ${o.document_type ? escapeHtml(o.document_type) + ' ' + escapeHtml(o.document_number || '') : ''} ${o.tax_condition ? '· ' + escapeHtml(o.tax_condition) : ''}</p>

        <h4 class="cs-modal-sec">Ítems</h4>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemsRows}
          <tr><td style="padding:10px 6px;border-top:1px solid #333;color:#aaa;">Total</td>
              <td style="padding:10px 6px;border-top:1px solid #333;color:#fff;text-align:right;font-weight:800;">$${money(o.total)}</td></tr>
        </table>

        <h4 class="cs-modal-sec">Facturación</h4>
        <p class="cs-modal-p">${escapeHtml(bill) || '—'}</p>
        <h4 class="cs-modal-sec">Envío</h4>
        <p class="cs-modal-p">${escapeHtml(ship) || '—'}</p>
        ${o.order_notes ? `<h4 class="cs-modal-sec">Notas</h4><p class="cs-modal-p">${escapeHtml(o.order_notes)}</p>` : ''}
        <h4 class="cs-modal-sec">Pago</h4>
        <p class="cs-modal-p">${escapeHtml(PAY_METHOD[o.payment_method] || o.payment_method || '—')}${o.mp_payment_id ? ' · MP ID: ' + escapeHtml(o.mp_payment_id) : ''}</p>
      </div>
    </div>
  </div>`;
  injectModalStyles();
};

window.closeOrderModal = function(e){
  if (e && e.target && !e.target.classList.contains('cs-modal-backdrop')) return;
  const root = document.getElementById('orderModalRoot');
  if (root) root.innerHTML = '';
};

/* ---------- estilos del modal (una sola vez) ---------- */
function injectModalStyles(){
  if (document.getElementById('cs-order-modal-style')) return;
  const s = document.createElement('style');
  s.id = 'cs-order-modal-style';
  s.textContent = `
    .cs-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;}
    .cs-modal{background:#151515;border:1px solid #2a2a2a;border-radius:16px;max-width:560px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.6);}
    .cs-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px;border-bottom:1px solid #2a2a2a;position:sticky;top:0;background:#151515;}
    .cs-modal-x{background:none;border:none;color:#888;font-size:18px;cursor:pointer;}
    .cs-modal-x:hover{color:#fff;}
    .cs-modal-body{padding:20px;}
    .cs-modal-sec{color:var(--orange,#FF6A00);font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin:18px 0 6px;}
    .cs-modal-p{color:#ccc;font-size:14px;line-height:1.5;margin:0;}`;
  document.head.appendChild(s);
}

/* ---------- helpers ---------- */
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function money(n){
  n = Number(n) || 0;
  return (n % 1 === 0) ? n.toLocaleString('es-AR') : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function toast(msg, type){
  const t = document.createElement('div');
  t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok');
  t.innerHTML = `<i class="fas ${type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${escapeHtml(msg)}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}
