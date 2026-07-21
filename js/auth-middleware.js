// ========================================
// AUTH MIDDLEWARE - SUPABASE
// ========================================

async function getUserRole(user) {
  if (!user) return 'guest';
  
  try {
    if (user.email === ADMIN_EMAIL) return 'admin';
    
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error) return 'client';
    return data?.role || 'client';
    
  } catch (error) {
    console.error('Error verificando rol:', error);
    return 'guest';
  }
}

async function controlVisibility() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || null;
  const userRole = await getUserRole(user);
  
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
    
    // Actualizar datos del usuario en el header
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
  
  return userRole;
}

async function checkAccess(requiredRole) {
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
  
  const userRole = await getUserRole(user);
  
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

console.log('✅ Auth Middleware cargado');
