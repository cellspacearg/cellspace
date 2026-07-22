import { store } from '../core/state.js';

export async function dashboardView() {
  const state = store.getState();
  const userName = state.user?.email?.split('@')[0] || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();

  return `
    <div class="admin-layout">
      <!-- SIDEBAR -->
      <aside class="admin-sidebar" id="adminSidebar">
        <div class="sidebar-header">
          <img src="../assets/logo.png" alt="Cell Space" class="sidebar-logo" onerror="this.style.display='none'">
          <div class="sidebar-brand">
            <span class="brand-name">CELL SPACE</span>
            <span class="brand-sub">CMS Panel</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section">
            <span class="nav-section-title">Principal</span>
            <a href="#/dashboard" class="nav-item active">
              <i class="fas fa-home"></i>
              <span>Dashboard</span>
            </a>
          </div>

          <div class="nav-section">
            <span class="nav-section-title">Contenido</span>
            <a href="#/products" class="nav-item">
              <i class="fas fa-box"></i>
              <span>Productos</span>
              <span class="nav-badge">0</span>
            </a>
            <a href="#/services" class="nav-item">
              <i class="fas fa-tools"></i>
              <span>Servicios</span>
              <span class="nav-badge">0</span>
            </a>
            <a href="#/pages" class="nav-item">
              <i class="fas fa-file-alt"></i>
              <span>Páginas</span>
            </a>
            <a href="#/blog" class="nav-item">
              <i class="fas fa-newspaper"></i>
              <span>Blog</span>
            </a>
          </div>

          <div class="nav-section">
            <span class="nav-section-title">Gestión</span>
            <a href="#/orders" class="nav-item">
              <i class="fas fa-shopping-cart"></i>
              <span>Pedidos</span>
              <span class="nav-badge">0</span>
            </a>
            <a href="#/customers" class="nav-item">
              <i class="fas fa-users"></i>
              <span>Clientes</span>
            </a>
            <a href="#/messages" class="nav-item">
              <i class="fas fa-envelope"></i>
              <span>Mensajes</span>
              <span class="nav-badge">0</span>
            </a>
          </div>

          <div class="nav-section">
            <span class="nav-section-title">Sistema</span>
            <a href="#/media" class="nav-item">
              <i class="fas fa-images"></i>
              <span>Archivos</span>
            </a>
            <a href="#/settings" class="nav-item">
              <i class="fas fa-cog"></i>
              <span>Configuración</span>
            </a>
          </div>
        </nav>

        <div class="sidebar-footer">
          <a href="../index.html" class="nav-item" target="_blank">
            <i class="fas fa-external-link-alt"></i>
            <span>Ver sitio público</span>
          </a>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <div class="admin-main">
        <!-- TOPBAR -->
        <header class="admin-topbar">
          <div class="topbar-left">
            <button class="sidebar-toggle" id="sidebarToggle">
              <i class="fas fa-bars"></i>
            </button>
            <h1 class="page-title">Dashboard</h1>
          </div>

          <div class="topbar-right">
            <button class="topbar-btn" title="Notificaciones">
              <i class="fas fa-bell"></i>
              <span class="notification-dot"></span>
            </button>
            
            <div class="user-menu">
              <button class="user-btn" id="userMenuBtn">
                <div class="user-avatar">${userInitial}</div>
                <div class="user-info">
                  <span class="user-name">${userName}</span>
                  <span class="user-role">Administrador</span>
                </div>
                <i class="fas fa-chevron-down"></i>
              </button>

              <div class="user-dropdown" id="userDropdown">
                <a href="#/profile" class="dropdown-item">
                  <i class="fas fa-user"></i>
                  <span>Mi perfil</span>
                </a>
                <a href="#/settings" class="dropdown-item">
                  <i class="fas fa-cog"></i>
                  <span>Configuración</span>
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item logout" onclick="handleLogout()">
                  <i class="fas fa-sign-out-alt"></i>
                  <span>Cerrar sesión</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        <!-- CONTENT AREA -->
        <main class="admin-content">
          <div class="content-wrapper">
            
            <!-- Welcome Section -->
            <div class="dashboard-welcome">
              <div class="welcome-text">
                <h2>¡Hola, ${userName}! 👋</h2>
                <p>Este es el resumen de tu tienda. Acá vas a ver todas las estadísticas importantes.</p>
              </div>
              <div class="welcome-actions">
                <a href="#/products" class="btn-primary">
                  <i class="fas fa-plus"></i>
                  Nuevo Producto
                </a>
                <a href="#/orders" class="btn-secondary">
                  <i class="fas fa-shopping-cart"></i>
                  Ver Pedidos
                </a>
              </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid">
              <!-- Productos -->
              <div class="stat-card">
                <div class="stat-icon" style="background: rgba(255, 106, 0, 0.1); color: #FF6A00;">
                  <i class="fas fa-box"></i>
                </div>
                <div class="stat-content">
                  <span class="stat-label">Productos</span>
                  <span class="stat-value">0</span>
                  <span class="stat-sub">0 destacados · 0 sin stock</span>
                </div>
                <a href="#/products" class="stat-link">
                  <i class="fas fa-arrow-right"></i>
                </a>
              </div>

              <!-- Servicios -->
              <div class="stat-card">
                <div class="stat-icon" style="background: rgba(76, 175, 80, 0.1); color: #4CAF50;">
                  <i class="fas fa-tools"></i>
                </div>
                <div class="stat-content">
                  <span class="stat-label">Servicios</span>
                  <span class="stat-value">0</span>
                  <span class="stat-sub">0 activos</span>
                </div>
                <a href="#/services" class="stat-link">
                  <i class="fas fa-arrow-right"></i>
                </a>
              </div>

              <!-- Pedidos -->
              <div class="stat-card">
                <div class="stat-icon" style="background: rgba(33, 150, 243, 0.1); color: #2196F3;">
                  <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="stat-content">
                  <span class="stat-label">Pedidos</span>
                  <span class="stat-value">0</span>
                  <span class="stat-sub">0 pendientes · 0 completados</span>
                </div>
                <a href="#/orders" class="stat-link">
                  <i class="fas fa-arrow-right"></i>
                </a>
              </div>

              <!-- Clientes -->
              <div class="stat-card">
                <div class="stat-icon" style="background: rgba(156, 39, 176, 0.1); color: #9C27B0;">
                  <i class="fas fa-users"></i>
                </div>
                <div class="stat-content">
                  <span class="stat-label">Clientes</span>
                  <span class="stat-value">0</span>
                  <span class="stat-sub">0 nuevos este mes</span>
                </div>
                <a href="#/customers" class="stat-link">
                  <i class="fas fa-arrow-right"></i>
                </a>
              </div>

              <!-- Mensajes -->
              <div class="stat-card">
                <div class="stat-icon" style="background: rgba(255, 193, 7, 0.1); color: #FFC107;">
                  <i class="fas fa-envelope"></i>
                </div>
                <div class="stat-content">
                  <span class="stat-label">Mensajes</span>
                  <span class="stat-value">0</span>
                  <span class="stat-sub">0 sin leer</span>
                </div>
                <a href="#/messages" class="stat-link">
                  <i class="fas fa-arrow-right"></i>
                </a>
              </div>

              <!-- Publicaciones -->
              <div class="stat-card">
                <div class="stat-icon" style="background: rgba(0, 188, 212, 0.1); color: #00BCD4;">
                  <i class="fas fa-newspaper"></i>
                </div>
                <div class="stat-content">
                  <span class="stat-label">Publicaciones</span>
                  <span class="stat-value">0</span>
                  <span class="stat-sub">0 blog · 0 páginas</span>
                </div>
                <a href="#/blog" class="stat-link">
                  <i class="fas fa-arrow-right"></i>
                </a>
              </div>

              <!-- Visitas -->
              <div class="stat-card">
                <div class="stat-icon" style="background: rgba(233, 30, 99, 0.1); color: #E91E63;">
                  <i class="fas fa-chart-line"></i>
                </div>
                <div class="stat-content">
                  <span class="stat-label">Visitas (30 días)</span>
                  <span class="stat-value">0</span>
                  <span class="stat-sub">0% vs mes anterior</span>
                </div>
                <a href="#/analytics" class="stat-link">
                  <i class="fas fa-arrow-right"></i>
                </a>
              </div>

              <!-- Conversión -->
              <div class="stat-card">
                <div class="stat-icon" style="background: rgba(63, 81, 181, 0.1); color: #3F51B5;">
                  <i class="fas fa-percentage"></i>
                </div>
                <div class="stat-content">
                  <span class="stat-label">Tasa de Conversión</span>
                  <span class="stat-value">0%</span>
                  <span class="stat-sub">0 ventas / 0 visitas</span>
                </div>
                <a href="#/analytics" class="stat-link">
                  <i class="fas fa-arrow-right"></i>
                </a>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
              <h3 class="section-title">Accesos Rápidos</h3>
              <div class="actions-grid">
                <a href="#/products" class="action-card">
                  <div class="action-icon">
                    <i class="fas fa-box"></i>
                  </div>
                  <span class="action-label">Gestionar Productos</span>
                </a>
                <a href="#/services" class="action-card">
                  <div class="action-icon">
                    <i class="fas fa-tools"></i>
                  </div>
                  <span class="action-label">Gestionar Servicios</span>
                </a>
                <a href="#/orders" class="action-card">
                  <div class="action-icon">
                    <i class="fas fa-shopping-cart"></i>
                  </div>
                  <span class="action-label">Ver Pedidos</span>
                </a>
                <a href="#/media" class="action-card">
                  <div class="action-icon">
                    <i class="fas fa-images"></i>
                  </div>
                  <span class="action-label">Subir Archivos</span>
                </a>
                <a href="#/settings" class="action-card">
                  <div class="action-icon">
                    <i class="fas fa-cog"></i>
                  </div>
                  <span class="action-label">Configuración</span>
                </a>
                <a href="../index.html" class="action-card" target="_blank">
                  <div class="action-icon">
                    <i class="fas fa-external-link-alt"></i>
                  </div>
                  <span class="action-label">Ver Sitio Público</span>
                </a>
              </div>
            </div>

          </div>
        </main>

        <!-- FOOTER -->
        <footer class="admin-footer">
          <div class="footer-content">
            <span>&copy; 2026 Cell Space Argentina. Todos los derechos reservados.</span>
            <span class="footer-version">CMS v1.0.0</span>
          </div>
        </footer>
      </div>
    </div>

    <!-- Overlay para mobile -->
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
  `;
}

export function dashboardViewOnMount() {
  // Toggle sidebar (mobile)
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // User dropdown
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');

  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      userDropdown.classList.remove('active');
    });
  }

  // Active nav item
  const navItems = document.querySelectorAll('.nav-item');
  const currentHash = window.location.hash || '#/dashboard';
  
  navItems.forEach(item => {
    if (item.getAttribute('href') === currentHash) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Logout global
window.handleLogout = async () => {
  if (confirm('¿Estás seguro de que querés cerrar sesión?')) {
    const { logout } = await import('../hooks/useAuth.js');
    await logout();
  }
};
