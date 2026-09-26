// ============================================================
// LAYOUT COMPARTIDO DEL PANEL
// Todas las vistas lo usan: dejan de repetir sidebar/topbar/footer
// ============================================================
import { store } from './state.js?v=cb22';
import { supabase } from '../config.js?v=cb22';
import { logout as authLogout } from '../hooks/useAuth.js?v=cb24';

/* Menú en un solo lugar. Agregás un ítem acá y aparece en todo el panel. */
export const MENU = [
  { group: 'Principal', items: [
    { path: '#/dashboard', icon: 'fas fa-home', label: 'Dashboard' },
  ]},
  { group: 'Contenido', items: [
    { path: '#/products',   icon: 'fas fa-box',        label: 'Productos' },
    { path: '#/categories', icon: 'fas fa-tags',       label: 'Categorías' },
    { path: '#/services',   icon: 'fas fa-tools',      label: 'Servicios' },
    { path: '#/pages',      icon: 'fas fa-file-alt',   label: 'Páginas' },
    { path: '#/central',    icon: 'fas fa-screwdriver-wrench', label: 'Central Space' },
    { path: '#/promotions', icon: 'fas fa-percent',    label: 'Promociones' },
    { path: '#/social',     icon: 'fas fa-share-nodes', label: 'Generador redes' },
  ]},
  { group: 'Tienda', items: [
    { path: '#/gaming',       icon: 'fas fa-gamepad',     label: 'Gaming' },
    { path: '#/fazercards',   icon: 'fas fa-coins',       label: 'FazerCards' },
    { path: '#/calc3d',       icon: 'fas fa-cube',        label: 'Calculadora 3D' },
    { path: '#/shipping',     icon: 'fas fa-truck-fast',  label: 'Envíos' },
    { path: '#/payment-fees', icon: 'fas fa-credit-card', label: 'Medios de pago' },
  ]},
  { group: 'Gestión', items: [
    { path: '#/orders',      icon: 'fas fa-shopping-cart', label: 'Pedidos', badgeId: 'ordersBadge' },
    { path: '#/repairs',     icon: 'fas fa-wrench',        label: 'Reparaciones' },
    { path: '#/inventory',   icon: 'fas fa-boxes-stacked', label: 'Inventario' },
    { path: '#/suppliers',   icon: 'fas fa-truck',         label: 'Proveedores' },
    { path: '#/technicians', icon: 'fas fa-user-gear',     label: 'Técnicos' },
    { path: '#/customers',   icon: 'fas fa-users',         label: 'Clientes' },
  ]},
  { group: 'Sistema', items: [
    { path: '#/reports',       icon: 'fas fa-chart-line',   label: 'Reportes' },
    { path: '#/expenses',      icon: 'fas fa-money-bill-wave', label: 'Gastos' },
    { path: '#/notifications', icon: 'fas fa-bell',         label: 'Notificaciones', badgeId: 'notifBadge' },
    { path: '#/audit',         icon: 'fas fa-clock-rotate-left', label: 'Auditoría' },
    { path: '#/media',         icon: 'fas fa-images',       label: 'Archivos' },
    { path: '#/settings',      icon: 'fas fa-cog',          label: 'Configuración' },
  ]},
];

/* Color de la cajita del ícono por rubro/ítem del menú. */
const ICON_COLORS = {
  '#/dashboard':     '#FF6A00',
  '#/products':      '#FF6A00',
  '#/categories':    '#FF6A00',
  '#/services':      '#FF6A00',
  '#/pages':         '#2F7BFF',
  '#/central':       '#FF6A00',
  '#/promotions':    '#E8B4B8',
  '#/social':        '#8b5cf6',
  '#/gaming':        '#8b5cf6',
  '#/fazercards':    '#FFD700',
  '#/calc3d':        '#FF6A00',
  '#/shipping':      '#2F7BFF',
  '#/payment-fees':  '#10c46a',
  '#/orders':        '#2F7BFF',
  '#/repairs':       '#FF6A00',
  '#/inventory':     '#10c46a',
  '#/suppliers':     '#2F7BFF',
  '#/technicians':   '#FF6A00',
  '#/customers':     '#8b5cf6',
  '#/reports':       '#10c46a',
  '#/expenses':      '#ff3b3b',
  '#/notifications': '#FF6A00',
  '#/audit':         '#FFD700',
  '#/media':         '#2F7BFF',
  '#/settings':      '#FF6A00',
};

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function menuHtml(){
  return MENU.map(sec => `
    <div class="nav-section">
      <span class="nav-section-title">${esc(sec.group)}</span>
      ${sec.items.map(it => `
        <a href="${it.path}" class="nav-item" data-path="${it.path}" style="--ic:${ICON_COLORS[it.path] || '#FF6A00'}">
          <span class="nav-box"><i class="${it.icon}"></i></span>
          <span class="nav-label">${esc(it.label)}</span>
          ${it.badgeId ? `<span class="nav-badge" id="${it.badgeId}" style="display:none"></span>` : ''}
        </a>`).join('')}
    </div>`).join('');
}

/**
 * Envuelve el contenido de una vista con el layout del panel.
 * @param {{title:string, content:string, toolbar?:string}} opts
 */
export function layout({ title, content, toolbar = '' }){
  const state = store.getState();
  const userName = state.user?.email?.split('@')[0] || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();

  return `
  <div class="admin-layout">
    <aside class="admin-sidebar" id="adminSidebar">
      <div class="sidebar-header">
        <img src="../assets/logo.png" alt="Cell Space" class="sidebar-logo" onerror="this.style.display='none'">
        <div class="sidebar-brand">
          <span class="brand-name">CELL SPACE</span>
          <span class="brand-sub">CMS PANEL</span>
        </div>
      </div>
      <nav class="sidebar-nav">${menuHtml()}</nav>
      <div class="sidebar-footer">
        <a href="../index.html" class="nav-item" target="_blank" style="--ic:#FF6A00">
          <span class="nav-box"><i class="fas fa-external-link-alt"></i></span>
          <span class="nav-label">Ver sitio público</span>
        </a>
        <button class="nav-item" onclick="handleLogout()" style="--ic:#ff6b6b">
          <span class="nav-box"><i class="fas fa-sign-out-alt"></i></span>
          <span class="nav-label">Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div class="topbar-left">
          <button class="sidebar-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button>
          <h1 class="page-title">${esc(title)}</h1>
        </div>
        <div class="topbar-right">
          <div class="user-menu">
            <button class="user-btn" id="userMenuBtn">
              <div class="user-avatar">${esc(userInitial)}</div>
              <div class="user-info">
                <span class="user-name">${esc(userName)}</span>
                <span class="user-role">Administrador</span>
              </div>
              <i class="fas fa-chevron-down"></i>
            </button>
            <div class="user-dropdown" id="userDropdown">
              <a href="#/dashboard" class="dropdown-item"><i class="fas fa-home"></i><span>Dashboard</span></a>
              <div class="dropdown-divider"></div>
              <a href="#" class="dropdown-item logout" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt"></i><span>Cerrar sesión</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main class="admin-content">
        <div class="content-wrapper">
          ${toolbar}
          ${content}
        </div>
      </main>

      <footer class="admin-footer">
        <div class="footer-content">
          <span>&copy; 2026 Cell Space Argentina.</span>
          <span class="footer-version">CMS v1.0.0</span>
        </div>
      </footer>
    </div>
  </div>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
}

/** Conecta sidebar, dropdown y marca el ítem activo. Llamalo en cada onMount. */
export function mountLayout(){
  const t = document.getElementById('sidebarToggle');
  const s = document.getElementById('adminSidebar');
  const o = document.getElementById('sidebarOverlay');
  if (t) t.onclick = () => { s.classList.toggle('open'); o.classList.toggle('active'); };
  if (o) o.onclick = () => { s.classList.remove('open'); o.classList.remove('active'); };

  const ub = document.getElementById('userMenuBtn');
  const ud = document.getElementById('userDropdown');
  if (ub) ub.onclick = e => { e.stopPropagation(); ud.classList.toggle('active'); };
  document.addEventListener('click', () => ud && ud.classList.remove('active'));

  const current = (window.location.hash || '#/dashboard').split('?')[0];
  document.querySelectorAll('.nav-item[data-path]').forEach(i =>
    i.classList.toggle('active', i.dataset.path === current));

  refreshNotifBadge();
}

/** Cuenta notificaciones sin leer y actualiza el badge de la barra lateral. */
export async function refreshNotifBadge(){
  const el = document.getElementById('notifBadge');
  if (!el) return;
  try {
    const { count, error } = await supabase
      .from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false);
    if (error) return;
    if (count && count > 0) { el.textContent = count > 99 ? '99+' : String(count); el.style.display = ''; }
    else { el.style.display = 'none'; }
  } catch (_) { /* silencioso */ }
}

/**
 * Barra de filtros con el mismo formato en todas las vistas.
 * @param {{searchId?:string, searchPlaceholder?:string,
 *          filters?:Array<{id:string, options:Array<{v:string,l:string}>}>,
 *          countId?:string, action?:{label:string, icon:string, onclick:string}}} o
 */
export function toolbar(o = {}){
  const {
    searchId = 'searchInput',
    searchPlaceholder = 'Buscar...',
    filters = [],
    countId = 'resultCount',
    action = null,
  } = o;

  return `
  <div class="products-toolbar">
    <div class="toolbar-filters">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input type="text" id="${searchId}" placeholder="${esc(searchPlaceholder)}">
      </div>
      ${filters.map(f => `
        <select id="${f.id}" class="filter-select">
          ${f.options.map(op => `<option value="${esc(op.v)}">${esc(op.l)}</option>`).join('')}
        </select>`).join('')}
    </div>
    ${action ? `<button class="btn-primary" onclick="${action.onclick}">
      <i class="${action.icon}"></i> ${esc(action.label)}
    </button>` : ''}
  </div>
  <div class="products-count" id="${countId}">Cargando...</div>`;
}

/** Estado vacío consistente en todas las vistas. */
export function emptyState({ icon, title, text, action }){
  return `
  <div class="empty-state">
    <div class="empty-icon"><i class="${icon}"></i></div>
    <h2>${esc(title)}</h2>
    <p>${esc(text)}</p>
    ${action ? `<div class="empty-actions">
      <button class="btn-primary" onclick="${action.onclick}">
        <i class="${action.icon}"></i> ${esc(action.label)}
      </button></div>` : ''}
  </div>`;
}

window.handleLogout = async () => {
  if (!confirm('¿Cerrar sesión?')) return;
  await authLogout();
};
