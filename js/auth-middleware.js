// ========================================
// CONTROL DE VISIBILIDAD - HEADER
// ========================================

async function updateHeaderAuth() {
  return new Promise((resolve) => {
    firebase.auth().onAuthStateChanged(async (user) => {
      const guestActions = document.getElementById('guestActions');
      const userActions = document.getElementById('userActions');
      
      if (user) {
        // Usuario logueado
        if (guestActions) guestActions.style.display = 'none';
        if (userActions) userActions.style.display = 'block';
        
        // Actualizar datos del usuario
        await updateUserInfo(user);
      } else {
        // Visitante
        if (guestActions) guestActions.style.display = 'flex';
        if (userActions) userActions.style.display = 'none';
      }
      
      resolve(user);
    });
  });
}

async function updateUserInfo(user) {
  // Obtener rol
  const userRole = await getUserRole(user);
  
  // Actualizar avatar
  const userInitial = document.getElementById('userInitial');
  if (userInitial) {
    const displayName = user.displayName || user.email.split('@')[0];
    userInitial.textContent = displayName.charAt(0).toUpperCase();
  }
  
  // Actualizar nombre
  const userNameDisplay = document.getElementById('userNameDisplay');
  if (userNameDisplay) {
    const displayName = user.displayName || user.email.split('@')[0];
    userNameDisplay.textContent = displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName;
  }
  
  // Actualizar badge de rol
  const userRoleBadge = document.getElementById('userRoleBadge');
  if (userRoleBadge) {
    const roleNames = {
      'client': 'Cliente',
      'technician': 'Técnico',
      'admin': 'Admin'
    };
    userRoleBadge.textContent = roleNames[userRole] || 'Cliente';
  }
  
  // Mostrar menú técnico si corresponde
  const technicianMenu = document.getElementById('technicianMenu');
  if (technicianMenu) {
    technicianMenu.style.display = (userRole === 'technician' || userRole === 'admin') ? 'block' : 'none';
  }
  
  // Mostrar menú admin si corresponde
  const adminMenu = document.getElementById('adminMenu');
  if (adminMenu) {
    adminMenu.style.display = (userRole === 'admin') ? 'block' : 'none';
  }
}

function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.classList.toggle('open');
  }
}

function logout() {
  if (confirm('¿Cerrar sesión?')) {
    firebase.auth().signOut().then(() => {
      window.location.href = 'index.html';
    });
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
window.updateHeaderAuth = updateHeaderAuth;
window.toggleUserDropdown = toggleUserDropdown;
window.logout = logout;
