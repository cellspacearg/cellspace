// ========================================
// AUTH MIDDLEWARE - unificado con CSAuth
// Fuente única de verdad del rol: cs-auth.js (my_role() / tabla profiles)
// Este archivo ya NO consulta ninguna tabla por su cuenta.
// Se auto-ejecuta: no hace falta llamarlo desde cada HTML.
// ========================================

function mapCSRole(csRole) {
  return csRole === 'visitor' ? 'guest' : csRole;
}

// Espera a que CSAuth exista y haya resuelto el rol (sin importar el orden de los <script>)
function waitForCSAuth() {
  return new Promise(function (resolve) {
    if (window.CSAuth) {
      if (window.CSAuth.ready()) return resolve();
      window.CSAuth.onReady(function () { resolve(); });
      return;
    }
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (window.CSAuth) {
        clearInterval(iv);
        if (window.CSAuth.ready()) return resolve();
        window.CSAuth.onReady(function () { resolve(); });
      } else if (tries > 200) { // ~10s de margen si algo tarda en cargar
        clearInterval(iv);
        console.warn('⚠️ CSAuth no cargó (revisá que cs-auth.js esté en esta página)');
        resolve();
      }
    }, 50);
  });
}

async function getUserRole(user) {
  // Se mantiene por compatibilidad (la usan otras páginas), pero ya no consulta
  // ninguna tabla: delega 100% en CSAuth, que sí lee la tabla real (profiles).
  if (!user) return 'guest';
  await waitForCSAuth();
  return window.CSAuth ? mapCSRole(window.CSAuth.role()) : 'guest';
}

async function controlVisibility() {
  await waitForCSAuth();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || null;
  const userRole = window.CSAuth ? mapCSRole(window.CSAuth.role()) : 'guest';

  console.log('🔐 Rol del usuario:', userRole);

  // Ocultar precios para visitantes
  if (userRole === 'guest') {
    document.querySelectorAll('.price-current, .price-old').forEach(el => {
      el.innerHTML = '<span style="color: var(--orange); font-weight: 600;">🔒 Iniciar sesión para ver precio</span>';
    });

    document.querySelectorAll('.btn-add-cart, .btn-add-cart-premium').forEach(btn => {
      btn.innerHTML = '🔒 Iniciar sesión';
      btn.onclick = () => window.location.href = 'login.html';
      btn.style.background = '#333';
    });
  }

  // Ocultar menú herramientas para clientes y visitantes
  const herramientasLinks = document.querySelectorAll('a[href="herramientas.html"]');
  if (userRole === 'guest' || userRole === 'client') {
    herramientasLinks.forEach(link => link.style.display = 'none');
  }

  // Mostrar menú técnico solo para técnicos y admin
  const techMenu = document.getElementById('technicianMenu');
  const sidebarTechMenu = document.getElementById('sidebarTechMenu');
  if (techMenu) techMenu.style.display = (userRole === 'technician' || userRole === 'admin') ? 'block' : 'none';
  if (sidebarTechMenu) sidebarTechMenu.style.display = (userRole === 'technician' || userRole === 'admin') ? 'block' : 'none';

  // Mostrar menú admin solo para admin
  const adminMenu = document.getElementById('adminMenu');
  const sidebarAdminMenu = document.getElementById('sidebarAdminMenu');
  if (adminMenu) adminMenu.style.display = (userRole === 'admin') ? 'block' : 'none';
  if (sidebarAdminMenu) sidebarAdminMenu.style.display = (userRole === 'admin') ? 'block' : 'none';

  // Actualizar header (login vs mi cuenta)
  const guestActions = document.getElementById('guestActions');
  const userActions = document.getElementById('userActions');

  if (user) {
    if (guestActions) guestActions.style.display = 'none';
    if (userActions) userActions.style.display = 'block';

    const userNameDisplay = document.getElementById('userNameDisplay');
    const userInitial = document.getElementById('userInitial');
    const userRoleBadge = document.getElementById('userRoleBadge');

    if (userNameDisplay) {
      const name = user.user_metadata?.name || user.email.split('@')[0];
      userNameDisplay.textContent = name.length > 12 ? name.substring(0, 12) + '...' : name;
    }

    if (userInitial) {
      const name = user.user_metadata?.name || user.email;
      userInitial.textContent = name.charAt(0).toUpperCase();
    }

    if (userRoleBadge) {
      const roleNames = { 'client': 'Cliente', 'technician': 'Técnico', 'admin': 'Admin' };
      userRoleBadge.textContent = roleNames[userRole] || 'Cliente';
    }
  } else {
    if (guestActions) guestActions.style.display = 'flex';
    if (userActions) userActions.style.display = 'none';
  }

  // Si tenés una función para pintar productos destacados en esta página, se ejecuta acá
  if (typeof renderFeaturedProducts === 'function') {
    renderFeaturedProducts();
  }

  return userRole;
}

async function checkAccess(requiredRole) {
  await waitForCSAuth();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || null;

  if (!user) {
    if (requiredRole !== 'guest') {
      alert('⚠️ Debés iniciar sesión para acceder a esta página');
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  const userRole = window.CSAuth ? mapCSRole(window.CSAuth.role()) : 'guest';

  if (userRole === 'admin') return true;

  const roleHierarchy = { 'guest': 0, 'client': 1, 'technician': 2, 'admin': 3 };

  if (roleHierarchy[userRole] >= roleHierarchy[requiredRole]) {
    return true;
  } else {
    alert('⚠️ No tenés permisos para acceder a esta página');
    window.location.href = 'index.html';
    return false;
  }
}

function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.toggle('open');
}

async function logout() {
  if (confirm('¿Cerrar sesión?')) {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  }
}

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    dropdown.classList.remove('open');
  }
});

// Hacer funciones globales
window.getUserRole = getUserRole;
window.controlVisibility = controlVisibility;
window.checkAccess = checkAccess;
window.toggleUserDropdown = toggleUserDropdown;
window.logout = logout;

// ========================================
// AUTO-EJECUCIÓN: esto es lo que reemplaza el bloque que había
// que pegar manualmente en cada HTML. Corre solo, y se vuelve a
// ejecutar automáticamente si el usuario inicia/cierra sesión.
// ========================================
function autoInit() {
  controlVisibility();
  if (window.CSAuth) window.CSAuth.onChange(controlVisibility);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

console.log('✅ Auth Middleware (unificado) cargado');
