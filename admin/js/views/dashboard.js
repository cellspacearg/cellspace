import { supabase } from '../config.js?v=cb22';
import { layout, mountLayout } from '../core/layout.js?v=cb22';
import { store } from '../core/state.js?v=cb22';

// Colores de estado de reparaciones (copia de repairs.js: ese archivo no exporta la
// constante y esta parte no puede tocar otras vistas, así que se duplica acá para
// mantener la misma paleta en el gráfico de dona).
const REPAIR_STATUS = {
  recibido:             { label: 'Recibido',             color: '#3498db' },
  diagnostico:          { label: 'Diagnóstico',          color: '#f39c12' },
  presupuesto:          { label: 'Presupuesto',          color: '#f39c12' },
  esperando_aprobacion: { label: 'Esperando aprobación', color: '#e67e22' },
  en_reparacion:        { label: 'En reparación',        color: '#e67e22' },
  esperando_repuesto:   { label: 'Esperando repuesto',   color: '#9b59b6' },
  pausado:              { label: 'Pausado',              color: '#95a5a6' },
  reparado:             { label: 'Reparado',             color: '#2ecc71' },
  listo:                { label: 'Listo para retirar',   color: '#2ecc71' },
  entregado:            { label: 'Entregado',            color: '#27ae60' },
  cancelado:            { label: 'Cancelado',            color: '#e74c3c' },
};
const PAYMENT_STATUS_COLORS = { pending:'#FF9800', approved:'#4CAF50', rejected:'#f44336', in_process:'#2196F3' };

let salesChartInstance = null;
let repairsChartInstance = null;

function money(n){
  n = Number(n) || 0;
  return (n % 1 === 0) ? n.toLocaleString('es-AR') : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function kpiBig({ icon, color, label, valueId, subs }){
  return `
    <div class="kpi-big">
      <div class="kpi-icon" style="background:${color}1a;color:${color};"><i class="${icon}"></i></div>
      <span class="kpi-label">${label}</span>
      <span class="kpi-value" id="${valueId}">—</span>
      ${subs.map(id => `<span class="kpi-sub" id="${id}">Cargando...</span>`).join('')}
    </div>`;
}

function kpiMini({ icon, color, label, valueId, subId }){
  return `
    <div class="kpi-mini">
      <div class="kpi-mini-icon" style="background:${color}1a;color:${color};"><i class="${icon}"></i></div>
      <div>
        <div class="kpi-mini-label">${label}</div>
        <div class="kpi-mini-value" id="${valueId}">—</div>
        ${subId ? `<div class="kpi-mini-label" id="${subId}" style="text-transform:none;font-weight:500;">Cargando...</div>` : ''}
      </div>
    </div>`;
}

export async function dashboardView(){
  const state = store.getState();
  const userName = state.user?.email?.split('@')[0] || 'Admin';
  const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const content = `
    <div class="dashboard-welcome">
      <div class="welcome-text">
        <h2>¡Hola, ${userName}! 👋</h2>
        <p style="text-transform:capitalize;">${fecha}</p>
        <p>Resumen en vivo del negocio.</p>
      </div>
      <div class="welcome-actions">
        <a href="#/products" class="btn-primary"><i class="fas fa-plus"></i> Nuevo Producto</a>
        <a href="#/orders" class="btn-secondary"><i class="fas fa-shopping-cart"></i> Ver Pedidos</a>
      </div>
    </div>

    <div class="kpi-grid">
      ${kpiBig({ icon:'fas fa-sack-dollar', color:'#4CAF50', label:'Ingresos (cobrados)', valueId:'dashRevenue', subs:['dashRevenueSub'] })}
      ${kpiBig({ icon:'fas fa-shopping-cart', color:'#2196F3', label:'Pedidos', valueId:'dashOrders', subs:['dashOrdersSub'] })}
      ${kpiBig({ icon:'fas fa-box', color:'#FF6A00', label:'Productos', valueId:'dashProducts', subs:['dashProductsSub1','dashProductsSub2'] })}
      ${kpiBig({ icon:'fas fa-screwdriver-wrench', color:'#8b5cf6', label:'Reparaciones', valueId:'dashRepairs', subs:['dashRepairsSub1','dashRepairsSub2'] })}
    </div>

    <div class="kpi-mini-grid">
      ${kpiMini({ icon:'fas fa-users', color:'#9C27B0', label:'Clientes', valueId:'dashClients', subId:'dashClientsSub' })}
      ${kpiMini({ icon:'fas fa-user-gear', color:'#00BCD4', label:'Técnicos', valueId:'dashTechs' })}
      ${kpiMini({ icon:'fas fa-book', color:'#3F51B5', label:'Guías', valueId:'dashGuides', subId:'dashGuidesSub' })}
      ${kpiMini({ icon:'fas fa-money-bill-wave', color:'#f44336', label:'Gastos del mes', valueId:'dashExpenses' })}
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h3><i class="fas fa-chart-column"></i> Ventas por mes (últimos 6 meses)</h3>
        <div class="chart-wrap"><canvas id="salesChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3><i class="fas fa-chart-pie"></i> Reparaciones por estado</h3>
        <div class="chart-wrap" style="display:flex;align-items:center;justify-content:center;">
          <canvas id="repairsChart"></canvas>
          <div id="repairsChartTotal" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
            <div style="font-size:26px;font-weight:800;color:#fff;" id="repairsChartTotalNum">0</div>
            <div style="font-size:11px;color:var(--admin-text-muted);text-transform:uppercase;">Total</div>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-card" style="margin-bottom:28px;">
      <h3><i class="fas fa-ranking-star"></i> Top 5 productos más vendidos</h3>
      <div class="top-products" id="topProductsList"><p class="loading-text">Cargando...</p></div>
    </div>

    <div id="alertsContainer"></div>

    <div class="lists-grid">
      <div class="list-card">
        <div class="list-head">
          <h3><i class="fas fa-shopping-cart"></i> Últimos pedidos</h3>
          <a href="#/orders" class="list-link">Ver todos</a>
        </div>
        <div id="dashRecentOrders"><p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando...</p></div>
      </div>
      <div class="list-card">
        <div class="list-head">
          <h3><i class="fas fa-wrench"></i> Últimas reparaciones</h3>
          <a href="#/repairs" class="list-link">Ver todas</a>
        </div>
        <div id="dashRecentRepairs"><p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando...</p></div>
      </div>
    </div>

    <div class="list-card" style="margin-top:20px;">
      <div class="list-head">
        <h3><i class="fas fa-bell"></i> Notificaciones sin leer</h3>
        <a href="#/notifications" class="list-link">Ver todas</a>
      </div>
      <div id="dashNotifs"><p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando...</p></div>
    </div>

    <div class="quick-actions" style="margin-top:20px;">
      <h3 class="section-title">Accesos rápidos</h3>
      <div class="actions-grid">
        <a href="#/products" class="action-card"><div class="action-icon"><i class="fas fa-box"></i></div><span class="action-label">Productos</span></a>
        <a href="#/orders" class="action-card"><div class="action-icon"><i class="fas fa-shopping-cart"></i></div><span class="action-label">Pedidos</span></a>
        <a href="#/services" class="action-card"><div class="action-icon"><i class="fas fa-tools"></i></div><span class="action-label">Servicios</span></a>
        <a href="#/customers" class="action-card"><div class="action-icon"><i class="fas fa-users"></i></div><span class="action-label">Clientes</span></a>
        <a href="#/settings" class="action-card"><div class="action-icon"><i class="fas fa-cog"></i></div><span class="action-label">Configuración</span></a>
        <a href="../index.html" class="action-card" target="_blank"><div class="action-icon"><i class="fas fa-external-link-alt"></i></div><span class="action-label">Ver sitio</span></a>
      </div>
    </div>`;

  return layout({ title: 'Dashboard', content });
}

export function dashboardViewOnMount(){
  mountLayout();
  loadStats();
}

function setText(id, txt){ const el = document.getElementById(id); if (el) el.textContent = txt; }

async function loadStats(){
  try {
    const [ordersRes, productsRes, profilesRes, servicesRes, repairsRes, guidesRes, expensesRes, notifsRes] = await Promise.all([
      supabase.from('orders').select('total,payment_status,order_number,buyer_name,created_at').order('created_at', { ascending: false }),
      supabase.from('products').select('id,name,stock,status,is_hidden,is_featured,sold_count,image_url,images'),
      supabase.from('profiles').select('role,created_at'),
      supabase.from('services').select('status,is_visible'),
      supabase.from('repairs').select('order_number,customer_name,status,created_at,delivered_at').order('created_at', { ascending: false }),
      supabase.from('cs_guides').select('status'),
      supabase.from('expenses').select('amount,paid_at'),
      supabase.from('notifications').select('*').eq('is_read', false).order('created_at', { ascending: false }).limit(5),
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const profiles = profilesRes.data || [];
    const repairs = repairsRes.data || [];
    const guides = guidesRes.data || [];
    const expenses = expensesRes.data || [];
    const notifs = notifsRes.data || [];

    const now = new Date();
    const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);

    /* ---------- KPIs grandes ---------- */
    const approvedThisMonth = orders.filter(o => o.payment_status === 'approved' && o.created_at && new Date(o.created_at) >= mesInicio);
    const revenue = approvedThisMonth.reduce((s,o) => s + (Number(o.total)||0), 0);
    setText('dashRevenue', '$' + money(revenue));
    setText('dashRevenueSub', `${approvedThisMonth.length} pedido(s) cobrado(s) este mes`);

    const pendPago = orders.filter(o => (o.payment_status||'pending') !== 'approved').length;
    setText('dashOrders', String(orders.length));
    setText('dashOrdersSub', `${pendPago} pendiente(s) de pago`);

    const noStock = products.filter(p => (Number(p.stock)||0) <= 0).length;
    const drafts = products.filter(p => p.status === 'draft').length;
    setText('dashProducts', String(products.length));
    setText('dashProductsSub1', `${noStock} sin stock`);
    setText('dashProductsSub2', `${drafts} borrador(es)`);

    const repairsAbiertas = repairs.filter(r => r.status !== 'entregado' && r.status !== 'cancelado').length;
    const repairsEntregadas = repairs.filter(r => r.status === 'entregado').length;
    setText('dashRepairs', String(repairs.length));
    setText('dashRepairsSub1', `${repairsAbiertas} abierta(s)`);
    setText('dashRepairsSub2', `${repairsEntregadas} entregada(s)`);

    /* ---------- KPIs chicos ---------- */
    const clientes = profiles.filter(p => p.role === 'client');
    const clientesNuevos = clientes.filter(p => p.created_at && new Date(p.created_at) >= mesInicio).length;
    setText('dashClients', String(clientes.length));
    setText('dashClientsSub', `${clientesNuevos} nuevo(s) este mes`);
    setText('dashTechs', String(profiles.filter(p => p.role === 'technician').length));

    setText('dashGuides', String(guides.length));
    setText('dashGuidesSub', `${guides.filter(g => g.status === 'published').length} publicada(s)`);

    const gastosDelMes = expenses.filter(e => e.paid_at && new Date(e.paid_at) >= mesInicio).reduce((s,e) => s + (Number(e.amount)||0), 0);
    setText('dashExpenses', '$' + money(gastosDelMes));

    /* ---------- gráficos ---------- */
    renderSalesChart(orders);
    renderRepairsChart(repairs);

    /* ---------- top productos ---------- */
    renderTopProducts(products);

    /* ---------- alertas ---------- */
    renderAlerts({ noStock, pendPago, repairsAbiertas });

    /* ---------- listas ---------- */
    renderRecentOrders(orders.slice(0, 5));
    renderRecentRepairs(repairs.slice(0, 5));
    renderNotifs(notifs);
  } catch (e) {
    console.error('dashboard stats', e);
    const c = document.getElementById('dashRecentOrders');
    if (c) c.innerHTML = `<p class="loading-text" style="color:#ff4444">No se pudieron cargar los datos: ${escapeHtml(e.message)}</p>`;
  }
}

/* ---------- gráfico: ventas por mes ---------- */
function renderSalesChart(orders){
  const canvas = document.getElementById('salesChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('es-AR', { month: 'short' }) });
  }
  const totals = months.map(m => {
    return orders
      .filter(o => o.payment_status === 'approved' && o.created_at)
      .filter(o => { const d = new Date(o.created_at); return `${d.getFullYear()}-${d.getMonth()}` === m.key; })
      .reduce((s,o) => s + (Number(o.total)||0), 0);
  });

  if (salesChartInstance) salesChartInstance.destroy();
  salesChartInstance = new Chart(canvas, {
    type: 'bar',
    data: { labels: months.map(m => m.label), datasets: [{ label: 'Ventas', data: totals, backgroundColor: '#FF6A00', borderRadius: 6, maxBarThickness: 48 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => '$' + money(ctx.parsed.y) } } },
      scales: {
        y: { ticks: { color: '#888', callback: v => '$' + money(v) }, grid: { color: 'rgba(255,255,255,.05)' } },
        x: { ticks: { color: '#888' }, grid: { display: false } },
      },
    },
  });
}

/* ---------- gráfico: reparaciones por estado ---------- */
function renderRepairsChart(repairs){
  const canvas = document.getElementById('repairsChart');
  setText('repairsChartTotalNum', String(repairs.length));
  if (!canvas || typeof Chart === 'undefined') return;

  const counts = {};
  repairs.forEach(r => { const k = r.status || 'recibido'; counts[k] = (counts[k]||0) + 1; });
  const keys = Object.keys(counts);
  if (!keys.length){ canvas.style.display = 'none'; return; }
  canvas.style.display = '';

  if (repairsChartInstance) repairsChartInstance.destroy();
  repairsChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: keys.map(k => (REPAIR_STATUS[k] || { label: k }).label),
      datasets: [{ data: keys.map(k => counts[k]), backgroundColor: keys.map(k => (REPAIR_STATUS[k] || { color: '#888' }).color), borderWidth: 0 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '72%',
      plugins: { legend: { position: 'bottom', labels: { color: '#aaa', boxWidth: 10, font: { size: 11 } } } },
    },
  });
}

/* ---------- top productos ---------- */
function renderTopProducts(products){
  const cont = document.getElementById('topProductsList');
  if (!cont) return;
  const top = [...products].filter(p => (p.sold_count||0) > 0).sort((a,b) => (b.sold_count||0) - (a.sold_count||0)).slice(0, 5);
  if (!top.length){ cont.innerHTML = '<p class="loading-text">Todavía no hay ventas registradas.</p>'; return; }
  const max = top[0].sold_count || 1;
  cont.innerHTML = top.map((p, i) => {
    const thumb = p.image_url || (Array.isArray(p.images) ? p.images[0] : null);
    const pct = Math.max(6, Math.round(((p.sold_count||0) / max) * 100));
    return `<div class="top-product">
      <span class="tp-pos">${i+1}</span>
      <div class="ap-thumb" style="width:36px;height:36px;min-width:36px;">${thumb ? `<img src="${escapeHtml(thumb)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : '<i class="fas fa-box"></i>'}</div>
      <span class="tp-name">${escapeHtml(p.name || 'Producto')}</span>
      <div style="flex:2;background:rgba(255,255,255,.05);border-radius:6px;overflow:hidden;height:8px;">
        <div style="width:${pct}%;height:100%;background:var(--admin-orange);"></div>
      </div>
      <span class="tp-count">${p.sold_count} vendidos</span>
    </div>`;
  }).join('');
}

/* ---------- alertas ---------- */
function renderAlerts({ noStock, pendPago, repairsAbiertas }){
  const box = document.getElementById('alertsContainer');
  if (!box) return;
  const items = [];
  if (noStock > 0) items.push({ icon: 'fas fa-triangle-exclamation', color: '#ff4444', text: `${noStock} producto(s) sin stock`, link: '#/products', linkText: 'Ver productos' });
  if (pendPago > 0) items.push({ icon: 'fas fa-clock', color: '#FFD700', text: `${pendPago} pedido(s) pendiente(s) de pago`, link: '#/orders', linkText: 'Ver pedidos' });
  if (repairsAbiertas > 0) items.push({ icon: 'fas fa-screwdriver-wrench', color: '#2F7BFF', text: `${repairsAbiertas} reparación(es) abierta(s)`, link: '#/repairs', linkText: 'Ver reparaciones' });

  if (!items.length){
    box.innerHTML = `<div class="alerts-box ok"><h3 style="color:#10c46a;"><i class="fas fa-circle-check"></i> Todo en orden</h3>
      <div class="alerts-list"><div class="alert-item"><i class="fas fa-circle-check" style="color:#10c46a;"></i> Sin alertas pendientes.</div></div></div>`;
    return;
  }
  box.innerHTML = `<div class="alerts-box"><h3 style="color:#ff6b6b;"><i class="fas fa-triangle-exclamation"></i> Alertas</h3>
    <div class="alerts-list">
      ${items.map(it => `<div class="alert-item"><i class="${it.icon}" style="color:${it.color};"></i> ${escapeHtml(it.text)} <a href="${it.link}">${escapeHtml(it.linkText)}</a></div>`).join('')}
    </div></div>`;
}

/* ---------- listas ---------- */
function renderRecentOrders(list){
  const cont = document.getElementById('dashRecentOrders');
  if (!cont) return;
  if (!list.length){ cont.innerHTML = '<p class="loading-text">Todavía no hay pedidos.</p>'; return; }
  cont.innerHTML = list.map(o => {
    const c = PAYMENT_STATUS_COLORS[o.payment_status] || '#888';
    const fecha = o.created_at ? new Date(o.created_at).toLocaleDateString('es-AR') : '';
    return `<div class="list-item-dash">
      <div class="li-main">
        <div class="li-title">${escapeHtml(o.order_number || '')} · ${escapeHtml(o.buyer_name || '')}</div>
        <div class="li-meta"><span style="color:${c};">●</span> ${escapeHtml(o.payment_status || '—')} · ${escapeHtml(fecha)}</div>
      </div>
      <span class="li-total">$${money(o.total)}</span>
    </div>`;
  }).join('');
}

function renderRecentRepairs(list){
  const cont = document.getElementById('dashRecentRepairs');
  if (!cont) return;
  if (!list.length){ cont.innerHTML = '<p class="loading-text">Todavía no hay reparaciones.</p>'; return; }
  cont.innerHTML = list.map(r => {
    const s = REPAIR_STATUS[r.status] || { label: r.status || '—', color: '#888' };
    const fecha = r.created_at ? new Date(r.created_at).toLocaleDateString('es-AR') : '';
    return `<div class="list-item-dash">
      <div class="li-main">
        <div class="li-title">${escapeHtml(r.order_number || '')} · ${escapeHtml(r.customer_name || '')}</div>
        <div class="li-meta"><span style="color:${s.color};">●</span> ${escapeHtml(s.label)}</div>
      </div>
      <span class="li-total" style="color:var(--admin-text-muted);font-weight:500;">${escapeHtml(fecha)}</span>
    </div>`;
  }).join('');
}

function renderNotifs(list){
  const cont = document.getElementById('dashNotifs');
  if (!cont) return;
  if (!list.length){ cont.innerHTML = '<p class="loading-text">Sin notificaciones sin leer.</p>'; return; }
  cont.innerHTML = list.map(n => {
    const fecha = n.created_at ? new Date(n.created_at).toLocaleDateString('es-AR') : '';
    return `<div class="list-item-dash">
      <div class="li-main">
        <div class="li-title">${escapeHtml(n.title || 'Notificación')}</div>
        <div class="li-meta">${escapeHtml(n.body || '')}</div>
      </div>
      <span class="li-total" style="color:var(--admin-text-muted);font-weight:500;">${escapeHtml(fecha)}</span>
    </div>`;
  }).join('');
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
