// ============================================================
// LAYOUT COMPARTIDO DEL PANEL
// Todas las vistas lo usan: dejan de repetir sidebar/topbar/footer
// ============================================================
import { store } from './state.js';

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
    { path: '#/blog',       icon: 'fas fa-newspaper',  label: 'Blog' },
  ]},
  { group: 'Gestión', items: [
    { path: '#/orders',    icon: 'fas fa-shopping-cart', label: 'Pedidos', badgeId: 'ordersBadge' },
    { path: '#/customers', icon: 'fas fa-users',         label: 'Clientes' },
    { path: '#/messages',  icon: 'fas fa-envelope',      label: 'Mensajes' },
  ]},
  { group: 'Sistema', items: [
    { path: '#/media',    icon: 'fas fa-images', label: 'Archivos' },
    { path: '#/settings', icon: 'fas fa-cog',    label: 'Configuración' },
  ]},
];

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function menuHtml(){
  return MENU.map(sec => `
    <div class="nav-section">
      <span class="nav-section-title">${esc(sec.group)}</span>
      ${sec.items.map(it => `
        <a href="${it.path}" class="nav-item" data-path="${it.path}">
          <i class="${it.icon}"></i><span>${esc(it.label)}</span>
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
          <span class="brand-sub">CMS Panel</span>
        </div>
      </div>
      <nav class="sidebar-nav">${menuHtml()}</nav>
      <div class="sidebar-footer">
        <a href="../index.html" class="nav-item" target="_blank">
          <i class="fas fa-external-link-alt"></i><span>Ver sitio público</span>
        </a>
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
  if (confirm('¿Cerrar sesión?')) {
    const { logout } = await import('../hooks/useAuth.js');
    await logout();
  }
};
