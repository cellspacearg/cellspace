import { supabase } from '../config.js';
import { store } from '../core/state.js';

let allOrders = [];
let currentOrder = null;

const PAY_LABELS = { mercadopago: 'Mercado Pago', transferencia: 'Transferencia', binance: 'Binance (USDT)' };
const PAY_STATUS = {
  pending:   { txt: 'Pago pendiente', color: '#f0a500' },
  approved:  { txt: 'Pagado',         color: '#22c55e' },
  rejected:  { txt: 'Rechazado',      color: '#ef4444' },
  cancelled: { txt: 'Cancelado',      color: '#888888' },
  refunded:  { txt: 'Reembolsado',    color: '#a855f7' },
};
const ORDER_STATES = ['nuevo', 'preparando', 'enviado', 'entregado', 'cancelado'];

export async function ordersView() {
  const state = store.getState();
  const userName = state.user?.email?.split('@')[0] || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();

  return `
  <div class="admin-layout">
    <aside class="admin-sidebar" id="adminSidebar">
      <div class="sidebar-header"><img src="../assets/logo.png" alt="Cell Space" class="sidebar-logo" onerror="this.style.display='none'"><div class="sidebar-brand"><span class="brand-name">CELL SPACE</span><span class="brand-sub">CMS Panel</span></div></div>
      <nav class="sidebar-nav">
        <div class="nav-section"><span class="nav-section-title">Principal</span><a href="#/dashboard" class="nav-item"><i class="fas fa-home"></i><span>Dashboard</span></a></div>
        <div class="nav-section"><span class="nav-section-title">Contenido</span>
          <a href="#/products" class="nav-item"><i class="fas fa-box"></i><span>Productos</span></a>
          <a href="#/categories" class="nav-item"><i class="fas fa-tags"></i><span>Categorías</span></a>
          <a href="#/services" class="nav-item"><i class="fas fa-tools"></i><span>Servicios</span></a>
          <a href="#/pages" class="nav-item"><i class="fas fa-file-alt"></i><span>Páginas</span></a>
          <a href="#/blog" class="nav-item"><i class="fas fa-newspaper"></i><span>Blog</span></a></div>
        <div class="nav-section"><span class="nav-section-title">Gestión</span>
          <a href="#/orders" class="nav-item"><i class="fas fa-shopping-cart"></i><span>Pedidos</span><span id="ordersBadge" class="nav-badge" style="display:none;margin-left:auto;background:var(--orange);color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;"></span></a>
          <a href="#/customers" class="nav-item"><i class="fas fa-users"></i><span>Clientes</span></a>
          <a href="#/messages" class="nav-item"><i class="fas fa-envelope"></i><span>Mensajes</span></a></div>
        <div class="nav-section"><span class="nav-section-title">Sistema</span>
          <a href="#/media" class="nav-item"><i class="fas fa-images"></i><span>Archivos</span></a>
          <a href="#/settings" class="nav-item"><i class="fas fa-cog"></i><span>Configuración</span></a></div>
      </nav>
      <div class="sidebar-footer"><a href="../index.html" class="nav-item" target="_blank"><i class="fas fa-external-link-alt"></i><span>Ver sitio público</span></a></div>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div class="topbar-left"><button class="sidebar-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button><h1 class="page-title">Pedidos</h1></div>
        <div class="topbar-right"><div class="user-menu">
          <button class="user-btn" id="userMenuBtn"><div class="user-avatar">${userInitial}</div><div class="user-info"><span class="user-name">${userName}</span><span class="user-role">Administrador</span></div><i class="fas fa-chevron-down"></i></button>
          <div class="user-dropdown" id="userDropdown"><a href="#/dashboard" class="dropdown-item"><i class="fas fa-home"></i><span>Dashboard</span></a><div class="dropdown-divider"></div><a href="#" class="dropdown-item logout" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i><span>Cerrar sesión</span></a></div>
        </div></div>
      </header>

      <main class="admin-content"><div class="content-wrapper">
        <div id="newSalesBanner" style="display:none;"></div>

        <div class="products-toolbar">
          <div class="toolbar-filters">
            <div class="search-box"><i class="fas fa-search"></i><input type="text" id="orderSearch" placeholder="Buscar por N° de pedido, nombre o email..."></div>
            <select id="filterPayStatus" class="filter-select">
              <option value="">Todos los pagos</option>
              <option value="pending">Pago pendiente</option>
              <option value="approved">Pagados</option>
              <option value="rejected">Rechazados</option>
              <option value="cancelled">Cancelados</option>
            </select>
            <select id="filterOrderStatus" class="filter-select">
              <option value="">Todos los estados</option>
              ${ORDER_STATES.map(s => `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
            </select>
          </div>
          <button class="btn-secondary" onclick="reloadOrders()"><i class="fas fa-rotate"></i> Actualizar</button>
        </div>

        <div class="products-count" id="ordersCount">Cargando...</div>
        <div id="ordersList" style="display:flex;flex-direction:column;gap:12px;"></div>
      </div></main>

      <footer class="admin-footer"><div class="footer-content"><span>&copy; 2026 Cell Space Argentina.</span><span class="footer-version">CMS v1.0.0</span></div></footer>
    </div>
  </div>

  <!-- MODAL DETALLE -->
  <div class="modal-overlay" id="orderModal">
    <div class="modal-box modal-lg">
      <div class="modal-header"><h2 id="orderModalTitle">Pedido</h2><button class="modal-close" onclick="closeOrderModal()"><i class="fas fa-times"></i></button></div>
      <div class="modal-body" id="orderModalBody"></div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeOrderModal()">Cerrar</button>
      </div>
    </div>
  </div>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
}

export function ordersViewOnMount() {
  wireLayout();
  document.getElementById('orderSearch').addEventListener('input', applyFilters);
  document.getElementById('filterPayStatus').addEventListener('change', applyFilters);
  document.getElementById('filterOrderStatus').addEventListener('change', applyFilters);
  loadOrders();
}

function wireLayout() {
  const t=document.getElementById('sidebarToggle'),s=document.getElementById('adminSidebar'),o=document.getElementById('sidebarOverlay');
  if(t)t.onclick=()=>{s.classList.toggle('open');o.classList.toggle('active');};
  if(o)o.onclick=()=>{s.classList.remove('open');o.classList.remove('active');};
  const ub=document.getElementById('userMenuBtn'),ud=document.getElementById('userDropdown');
  if(ub)ub.onclick=e=>{e.stopPropagation();ud.classList.toggle('active');};
  document.addEventListener('click',()=>ud&&ud.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.toggle('active',i.getAttribute('href')===(window.location.hash||'').split('?')[0]));
}

window.reloadOrders = function(){ loadOrders(); };

async function loadOrders() {
  const list = document.getElementById('ordersList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando pedidos...</p>';
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allOrders = data || [];
    renderNewSalesBanner();
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = '<p class="loading-text" style="color:#ff4444">Error al cargar: ' + e.message + '</p>';
  }
}

/* ---------- notificación de ventas nuevas ---------- */
function newSales() {
  return allOrders.filter(o => o.payment_status === 'approved' && !o.admin_notified);
}

function renderNewSalesBanner() {
  const pend = newSales();
  const badge = document.getElementById('ordersBadge');
  if (badge) {
    badge.textContent = pend.length;
    badge.style.display = pend.length ? 'inline-block' : 'none';
  }
  const banner = document.getElementById('newSalesBanner');
  if (!banner) return;
  if (!pend.length) { banner.style.display = 'none'; banner.innerHTML = ''; return; }

  const total = pend.reduce((s, o) => s + Number(o.total || 0), 0);
  banner.style.display = 'block';
  banner.innerHTML = `
    <div style="background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.4);border-radius:12px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
      <i class="fas fa-bell" style="color:#22c55e;font-size:20px;"></i>
      <div style="flex:1;min-width:200px;">
        <div style="color:#fff;font-weight:700;">${pend.length} venta(s) nueva(s) sin revisar</div>
        <div style="color:#aaa;font-size:13px;">Total: $${Number(total).toLocaleString('es-AR')}</div>
      </div>
      <button class="btn-secondary mini" onclick="markSalesSeen()"><i class="fas fa-check"></i> Marcar como vistas</button>
    </div>`;
}

window.markSalesSeen = async function () {
  const ids = newSales().map(o => o.id);
  if (!ids.length) return;
  try {
    const { error } = await supabase.from('orders').update({ admin_notified: true }).in('id', ids);
    if (error) throw error;
    toast('Ventas marcadas como vistas', 'ok');
    loadOrders();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

/* ---------- filtros y listado ---------- */
function applyFilters() {
  const q = (document.getElementById('orderSearch').value || '').toLowerCase().trim();
  const pay = document.getElementById('filterPayStatus').value;
  const ost = document.getElementById('filterOrderStatus').value;

  const list = allOrders.filter(o => {
    const mQ = !q ||
      String(o.order_number || '').toLowerCase().includes(q) ||
      String(o.buyer_name || '').toLowerCase().includes(q) ||
      String(o.buyer_email || '').toLowerCase().includes(q);
    const mP = !pay || o.payment_status === pay;
    const mS = !ost || (o.order_status || 'nuevo') === ost;
    return mQ && mP && mS;
  });

  document.getElementById('ordersCount').textContent = list.length + ' pedido(s)';
  renderOrders(list);
}

function renderOrders(list) {
  const cont = document.getElementById('ordersList');
  if (!list.length) {
    cont.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-receipt"></i></div><h2>No hay pedidos</h2><p>Cuando entre una venta va a aparecer acá.</p></div>`;
    return;
  }
  cont.innerHTML = list.map(o => {
    const ps = PAY_STATUS[o.payment_status] || { txt: o.payment_status, color: '#888' };
    const items = Array.isArray(o.items) ? o.items : [];
    const nItems = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
    const fecha = o.created_at ? new Date(o.created_at).toLocaleString('es-AR') : '';
    const isNew = o.payment_status === 'approved' && !o.admin_notified;
    const manualPending = o.payment_method !== 'mercadopago' && o.payment_status === 'pending';

    return `<div style="background:rgba(21,21,21,0.95);border:1px solid ${isNew ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'};border-radius:14px;padding:16px 18px;">
      <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start;">
        <div style="flex:1;min-width:220px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="color:var(--orange);font-weight:800;font-size:15px;">#${escapeHtml(o.order_number || '—')}</span>
            <span style="background:${ps.color}22;color:${ps.color};border:1px solid ${ps.color}55;font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;">${ps.txt}</span>
            ${isNew ? '<span style="background:#22c55e;color:#04120a;font-size:10px;font-weight:800;padding:2px 7px;border-radius:8px;">NUEVA</span>' : ''}
          </div>
          <div style="color:#fff;font-size:14px;font-weight:600;margin-top:6px;">${escapeHtml(o.buyer_name || 'Sin nombre')}</div>
          <div style="color:#888;font-size:12px;">${escapeHtml(o.buyer_email || '')} · ${escapeHtml(o.buyer_phone || '')}</div>
          <div style="color:#666;font-size:12px;margin-top:4px;">${fecha} · ${nItems} artículo(s) · ${PAY_LABELS[o.payment_method] || o.payment_method || '—'}</div>
        </div>
        <div style="text-align:right;">
          <div style="color:#fff;font-size:20px;font-weight:800;">$${Number(o.total || 0).toLocaleString('es-AR')}</div>
          ${o.stock_applied ? '<div style="color:#22c55e;font-size:11px;margin-top:4px;"><i class="fas fa-check"></i> Stock descontado</div>' : '<div style="color:#f0a500;font-size:11px;margin-top:4px;">Stock sin descontar</div>'}
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;align-items:center;">
        <select class="filter-select" style="max-width:180px;" onchange="changeOrderStatus('${o.id}', this.value)">
          ${ORDER_STATES.map(s => `<option value="${s}" ${(o.order_status || 'nuevo') === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
        </select>
        <button class="btn-secondary mini" onclick="viewOrder('${o.id}')"><i class="fas fa-eye"></i> Ver detalle</button>
        ${manualPending ? `<button class="btn-primary mini" onclick="confirmManualPayment('${o.id}')"><i class="fas fa-money-bill-wave"></i> Confirmar pago recibido</button>` : ''}
        ${o.buyer_phone ? `<a class="btn-secondary mini" style="text-decoration:none;" href="https://wa.me/${String(o.buyer_phone).replace(/[^0-9]/g, '')}" target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* ---------- acciones ---------- */
window.changeOrderStatus = async function (id, status) {
  try {
    const { error } = await supabase.from('orders').update({ order_status: status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    const o = allOrders.find(x => x.id === id); if (o) o.order_status = status;
    toast('Estado actualizado', 'ok');
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.confirmManualPayment = async function (id) {
  const o = allOrders.find(x => x.id === id);
  if (!o) return;
  if (!confirm(`¿Confirmar que recibiste el pago del pedido #${o.order_number}?\n\nEsto marca el pedido como pagado y descuenta el stock. No se puede deshacer solo.`)) return;
  try {
    const { error } = await supabase.rpc('confirm_manual_payment', { p_order_id: id });
    if (error) throw error;
    toast('Pago confirmado y stock descontado', 'ok');
    loadOrders();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.viewOrder = function (id) {
  const o = allOrders.find(x => x.id === id); if (!o) return;
  currentOrder = o;
  const items = Array.isArray(o.items) ? o.items : [];
  const ps = PAY_STATUS[o.payment_status] || { txt: o.payment_status, color: '#888' };

  const addr = (pfx) => {
    const street = o[pfx + '_street'], num = o[pfx + '_number'];
    if (!street) return '<span style="color:#666;">—</span>';
    const l2 = [o[pfx + '_floor'] ? 'Piso ' + o[pfx + '_floor'] : '', o[pfx + '_apartment'] ? 'Depto ' + o[pfx + '_apartment'] : ''].filter(Boolean).join(', ');
    return [escapeHtml(street + ' ' + (num || '')), l2 ? escapeHtml(l2) : '',
      escapeHtml([o.shipping_city, o.shipping_province].filter(Boolean).join(', ')),
      o[pfx + '_postal_code'] ? 'CP ' + escapeHtml(o[pfx + '_postal_code']) : ''].filter(Boolean).join('<br>');
  };

  document.getElementById('orderModalTitle').textContent = 'Pedido #' + (o.order_number || '');
  document.getElementById('orderModalBody').innerHTML = `
    <div class="psec"><h4 class="psec-t"><i class="fas fa-box"></i> Artículos</h4>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${items.map(i => `<div style="display:flex;gap:12px;align-items:center;">
          <div style="width:48px;height:48px;background:#111;border-radius:8px;overflow:hidden;flex-shrink:0;">${i.image ? `<img src="${escAttr(i.image)}" style="width:100%;height:100%;object-fit:cover;">` : ''}</div>
          <div style="flex:1;"><div style="color:#fff;font-size:14px;">${escapeHtml(i.name)}</div><div style="color:#888;font-size:12px;">x${i.quantity} · $${Number(i.price || 0).toLocaleString('es-AR')} c/u</div></div>
          <div style="color:#fff;font-weight:700;">$${(Number(i.price || 0) * Number(i.quantity || 1)).toLocaleString('es-AR')}</div>
        </div>`).join('') || '<p class="field-hint">Sin artículos.</p>'}
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:14px;padding-top:12px;display:flex;justify-content:space-between;color:#fff;font-weight:800;font-size:17px;">
        <span>Total</span><span style="color:var(--orange);">$${Number(o.total || 0).toLocaleString('es-AR')}</span>
      </div>
    </div>

    <div class="psec"><h4 class="psec-t"><i class="fas fa-user"></i> Comprador</h4>
      <div style="color:#ddd;font-size:14px;line-height:1.8;">
        ${escapeHtml(o.buyer_name || '')}<br>
        ${escapeHtml(o.buyer_email || '')}<br>
        ${escapeHtml(o.buyer_phone || '')}<br>
        ${o.document_type ? escapeHtml(o.document_type + ' ' + (o.document_number || '')) : ''}
        ${o.tax_condition ? '<br>' + escapeHtml(o.tax_condition) : ''}
        ${o.buyer_company ? '<br>' + escapeHtml(o.buyer_company) : ''}
      </div>
    </div>

    <div class="psec"><h4 class="psec-t"><i class="fas fa-location-dot"></i> Direcciones</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;color:#ddd;font-size:13px;line-height:1.7;">
        <div><strong style="color:#fff;">Facturación</strong><br>${addr('billing')}</div>
        <div><strong style="color:#fff;">Envío</strong><br>${o.ship_to_different_address ? addr('shipping') : '<span style="color:#888;">Misma que facturación</span>'}</div>
      </div>
    </div>

    <div class="psec"><h4 class="psec-t"><i class="fas fa-credit-card"></i> Pago</h4>
      <div style="color:#ddd;font-size:14px;line-height:1.8;">
        Método: ${PAY_LABELS[o.payment_method] || o.payment_method || '—'}<br>
        Estado: <span style="color:${ps.color};font-weight:700;">${ps.txt}</span><br>
        ${o.mp_payment_id ? 'ID de pago MP: ' + escapeHtml(o.mp_payment_id) + '<br>' : ''}
        Stock: ${o.stock_applied ? '<span style="color:#22c55e;">descontado</span>' : '<span style="color:#f0a500;">sin descontar</span>'}
      </div>
    </div>

    ${o.order_notes ? `<div class="psec"><h4 class="psec-t"><i class="fas fa-note-sticky"></i> Notas del cliente</h4><p style="color:#ddd;font-size:14px;">${escapeHtml(o.order_notes)}</p></div>` : ''}
  `;
  document.getElementById('orderModal').classList.add('open');
};

window.closeOrderModal = function () { document.getElementById('orderModal').classList.remove('open'); };

/* ---------- helpers ---------- */
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
function toast(msg,type){ const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'"></i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }
window.handleLogout = async () => { if(confirm('¿Cerrar sesión?')){ const { logout } = await import('../hooks/useAuth.js'); await logout(); } };
