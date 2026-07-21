import { logout } from '../hooks/useAuth.js';

export async function dashboardView() {
  return `
    <div class="admin-dashboard-layout">
      <aside class="admin-sidebar">
        <h3>CMS Cell Space</h3>
        <nav>
          <a href="#/dashboard" class="active">
            <i class="fas fa-home"></i> Dashboard
          </a>
          <a href="#/products">
            <i class="fas fa-box"></i> Productos
          </a>
          <a href="#/services">
            <i class="fas fa-tools"></i> Servicios
          </a>
        </nav>
      </aside>
      
      <main class="admin-main-content">
        <header class="admin-topbar">
          <h1>Dashboard</h1>
          <button onclick="handleLogout()" class="btn-logout">
            <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
          </button>
        </header>
        
        <div class="admin-content-area">
          <p>Contenido del dashboard (Próximamente - Parte 4)</p>
        </div>
      </main>
    </div>
  `;
}

// Función global para el logout
window.handleLogout = async () => {
  if (confirm('¿Estás seguro de que querés cerrar sesión?')) {
    await logout();
  }
};