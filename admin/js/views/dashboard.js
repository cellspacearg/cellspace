import { supabase } from '../config.js';
import { layout, mountLayout } from '../core/layout.js';
import { store } from '../core/state.js';

function money(n){
  n = Number(n) || 0;
  return (n % 1 === 0) ? n.toLocaleString('es-AR') : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statCard({ id, icon, color, label, valueId, value = '—', subId, sub = '', link }){
  return `
    <div class="stat-card">
      <div class="stat-icon" style="background:${color}1a;color:${color};"><i class="${icon}"></i></div>
      <div class="stat-content">
        <span class="stat-label">${label}</span>
        <span class="stat-value" id="${valueId}">${value}</span>
        <span class="stat-sub" id="${subId}">${sub}</span>
      </div>
      <a href="${link}" class="stat-link"><i class="fas fa-arrow-right"></i></a>
    </div>`;
}

export async function dashboardView(){
  const state = store.getState();
  const userName = state.user?.email?.split('@')[0] || 'Admin';

  const content = `
    <div class="dashboard-welcome">
      <div class="welcome-text">
        <h2>¡Hola, ${userName}! 👋</h2>
        <p>Resumen en vivo de Cell Space. Datos reales desde la base.</p>
      </div>
      <div class="welcome-actions">
        <a href="#/products" class="btn-primary"><i class="fas fa-plus"></i> Nuevo Producto</a>
        <a href="#/orders" class="btn-secondary"><i class="fas fa-shopping-cart"></i> Ver Pedidos</a>
      </div>
    </div>

    <div class="stats-grid">
      ${statCard({ icon:'fas fa-sack-dollar', color:'#4CAF50', label:'Ingresos (pagos aprobados)', valueId:'dashRevenue', subId:'dashRevenueSub', sub:'Cargando...', link:'#/orders' })}
      ${statCard({ icon:'fas fa-shopping-cart', color:'#2196F3', label:'Pedidos', valueId:'dashOrders', subId:'dashOrdersSub', sub:'Cargando...', link:'#/orders' })}
      ${statCard({ icon:'fas fa-box', color:'#FF6A00', label:'Productos', valueId:'dashProducts', subId:'dashProductsSub', sub:'Cargando...', link:'#/products' })}
      ${statCard({ icon:'fas fa-triangle-exclamation', color:'#f44336', label:'Sin stock', valueId:'dashNoStock', subId:'dashNoStockSub', sub:'Cargando...', link:'#/products' })}
      ${statCard({ icon:'fas fa-users', color:'#9C27B0', label:'Clientes', valueId:'dashClients', subId:'dashClientsSub', sub:'Cargando...', link:'#/customers' })}
      ${statCard({ icon:'fas fa-screwdriver-wrench', color:'#00BCD4', label:'Técnicos', valueId:'dashTechs', subId:'dashTechsSub', sub:'Cargando...', link:'#/customers' })}
      ${statCard({ icon:'fas fa-tools', color:'#8BC34A', label:'Servicios', valueId:'dashServices', subId:'dashServicesSub', sub:'Cargando...', link:'#/services' })}
      ${statCard({ icon:'fas fa-newspaper', color:'#3F51B5', label:'Publicaciones', valueId:'dashPubs', subId:'dashPubsSub', sub:'Cargando...', link:'#/blog' })}
    </div>

    <div class="quick-actions">
      <h3 class="section-title">Últimos pedidos</h3>
      <div id="dashRecentOrders"><p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando...</p></div>
    </div>

    <div class="quick-actions">
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
    const [products, orders, profiles, services, posts, pages] = await Promise.all([
      supabase.from('products').select('is_featured,stock,is_hidden,status'),
      supabase.from('orders').select('total,order_status,payment_status,order_number,buyer_name,created_at').order('created_at', { ascending: false }),
      supabase.from('profiles').select('role,created_at'),
      supabase.from('services').select('status,is_visible'),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('pages').select('id', { count: 'exact', head: true }),
    ]);

    // Productos
    const prod = products.data || [];
    const noStock = prod.filter(p => (Number(p.stock) || 0) <= 0).length;
    const featured = prod.filter(p => p.is_featured === true).length;
    setText('dashProducts', String(prod.length));
    setText('dashProductsSub', `${featured} destacado(s)`);
    setText('dashNoStock', String(noStock));
    setText('dashNoStockSub', noStock ? 'Reponer stock' : 'Todo con stock');

    // Pedidos + ingresos
    const ord = orders.data || [];
    const pend = ord.filter(o => (o.payment_status || 'pending') !== 'approved').length;
    const revenue = ord.filter(o => (o.payment_status || '') === 'approved').reduce((s, o) => s + (Number(o.total) || 0), 0);
    setText('dashRevenue', '$' + money(revenue));
    setText('dashRevenueSub', `${ord.filter(o => o.payment_status === 'approved').length} pedido(s) cobrado(s)`);
    setText('dashOrders', String(ord.length));
    setText('dashOrdersSub', `${pend} pendiente(s) de pago`);

    // Clientes / técnicos
    const prof = profiles.data || [];
    setText('dashClients', String(prof.filter(p => p.role === 'client').length));
    const now = new Date(); const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const nuevos = prof.filter(p => p.created_at && new Date(p.created_at) >= mesInicio).length;
    setText('dashClientsSub', `${nuevos} nuevo(s) este mes`);
    setText('dashTechs', String(prof.filter(p => p.role === 'technician').length));
    setText('dashTechsSub', 'Con acceso a Central Space');

    // Servicios
    const serv = services.data || [];
    setText('dashServices', String(serv.length));
    setText('dashServicesSub', `${serv.filter(s => s.is_visible !== false).length} visible(s)`);

    // Publicaciones
    setText('dashPubs', String((posts.count || 0) + (pages.count || 0)));
    setText('dashPubsSub', `${posts.count || 0} blog · ${pages.count || 0} páginas`);

    renderRecentOrders(ord.slice(0, 5));
  } catch (e) {
    console.error('dashboard stats', e);
    ['dashRevenueSub','dashOrdersSub','dashProductsSub','dashNoStockSub','dashClientsSub','dashTechsSub','dashServicesSub','dashPubsSub']
      .forEach(id => setText(id, 'Error al cargar'));
    const r = document.getElementById('dashRecentOrders');
    if (r) r.innerHTML = `<p class="loading-text" style="color:#ff4444">No se pudieron cargar los datos: ${escapeHtml(e.message)}</p>`;
  }
}

function renderRecentOrders(list){
  const cont = document.getElementById('dashRecentOrders');
  if (!cont) return;
  if (!list.length){ cont.innerHTML = '<p class="loading-text">Todavía no hay pedidos.</p>'; return; }
  const PS = { pending:'#FF9800', approved:'#4CAF50', rejected:'#f44336', in_process:'#2196F3' };
  cont.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:14px;">
    ${list.map(o => {
      const c = PS[o.payment_status] || '#888';
      const fecha = o.created_at ? new Date(o.created_at).toLocaleDateString('es-AR') : '';
      return `<tr style="border-bottom:1px solid #222;">
        <td style="padding:10px 6px;color:#ddd;">${escapeHtml(o.order_number || '')}</td>
        <td style="padding:10px 6px;color:#aaa;">${escapeHtml(o.buyer_name || '')}</td>
        <td style="padding:10px 6px;"><span style="color:${c};">●</span> <span style="color:#888;">${escapeHtml(o.payment_status || '')}</span></td>
        <td style="padding:10px 6px;color:#888;">${escapeHtml(fecha)}</td>
        <td style="padding:10px 6px;color:#fff;text-align:right;font-weight:700;">$${money(o.total)}</td>
      </tr>`;
    }).join('')}
  </table>`;
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

window.handleLogout = async () => {
  if (confirm('¿Cerrar sesión?')) {
    const { logout } = await import('../hooks/useAuth.js');
    await logout();
  }
};
