// Esta vista se renderizará cuando la ruta sea #/dashboard
export async function dashboardView() {
  return `
    <div class="admin-dashboard-layout">
      <aside class="admin-sidebar">
        <h3>CMS Cell Space</h3>
        <nav>
          <a href="#/dashboard" class="active">Dashboard</a>
          <a href="#/products">Productos</a>
          <a href="#/services">Servicios</a>
        </nav>
      </aside>
      <main class="admin-main-content">
        <header class="admin-topbar">
          <h1>Dashboard</h1>
          <button onclick="window.logout()">Cerrar Sesión</button>
        </header>
        <div class="admin-content-area">
          <p>Contenido del dashboard (Próximamente)</p>
        </div>
      </main>
    </div>
  `;
}

// Hacer logout disponible globalmente para el onclick del HTML
window.logout = async () => {
  const { logout } = await import('../hooks/useAuth.js');
  await logout();
};