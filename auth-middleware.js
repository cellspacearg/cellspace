// ========================================
// AUTH MIDDLEWARE - Control de Roles
// ========================================

// Verificar rol del usuario
async function getUserRole(user) {
  if (!user) return 'guest';
  
  try {
    // Admin por email específico
    if (user.email === 'nahuel0123encinas@gmail.com') {
      return 'admin';
    }
    
    // Buscar en colección technicians
    const techDoc = await db.collection('technicians').doc(user.uid).get();
    if (techDoc.exists) {
      return 'technician';
    }
    
    // Buscar en colección clients
    const clientDoc = await db.collection('clients').doc(user.uid).get();
    if (clientDoc.exists) {
      return 'client';
    }
    
    // Buscar en colección users
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      return userDoc.data().role || 'client';
    }
    
    return 'client'; // Por defecto
    
  } catch (error) {
    console.error('Error verificando rol:', error);
    return 'guest';
  }
}

// Controlar visibilidad de elementos según rol
async function controlVisibility() {
  return new Promise((resolve) => {
    firebase.auth().onAuthStateChanged(async (user) => {
      const userRole = await getUserRole(user);
      console.log('🔐 Rol del usuario:', userRole);
      
      // ========================================
      // 1. OCULTAR PRECIOS PARA VISITANTES
      // ========================================
      const priceElements = document.querySelectorAll('.price-current, .price-old, .product-price');
      
      if (userRole === 'guest') {
        priceElements.forEach(el => {
          el.innerHTML = '<span style="color: var(--orange); font-weight: 600; font-size: 14px;">🔒 Iniciar sesión para ver precio</span>';
        });
        
        // Ocultar botones de agregar al carrito
        const cartButtons = document.querySelectorAll('.btn-add-cart, .btn-add-cart-premium');
        cartButtons.forEach(btn => {
          btn.innerHTML = '🔒 Iniciar sesión';
          btn.onclick = () => window.location.href = 'login.html';
          btn.style.background = '#333';
        });
      }
      
      // ========================================
      // 2. OCULTAR MENÚ HERRAMIENTAS PARA CLIENTES
      // ========================================
      const herramientasLinks = document.querySelectorAll('a[href="herramientas.html"]');
      
      if (userRole === 'guest' || userRole === 'client') {
        herramientasLinks.forEach(link => {
          link.style.display = 'none';
        });
      }
      
      // ========================================
      // 3. MOSTRAR MENÚ TÉCNICO SOLO PARA TÉCNICOS Y ADMIN
      // ========================================
      const techMenu = document.getElementById('technicianMenu');
      const sidebarTechMenu = document.getElementById('sidebarTechMenu');
      
      if (userRole === 'technician' || userRole === 'admin') {
        if (techMenu) techMenu.style.display = 'block';
        if (sidebarTechMenu) sidebarTechMenu.style.display = 'block';
      }
      
      // ========================================
      // 4. MOSTRAR MENÚ ADMIN SOLO PARA ADMIN
      // ========================================
      const adminMenu = document.getElementById('adminMenu');
      const sidebarAdminMenu = document.getElementById('sidebarAdminMenu');
      
      if (userRole === 'admin') {
        if (adminMenu) adminMenu.style.display = 'block';
        if (sidebarAdminMenu) sidebarAdminMenu.style.display = 'block';
      }
      
      // ========================================
      // 5. MOSTRAR/OCULTAR BOTÓN DE LOGIN
      // ========================================
      const loginBtn = document.getElementById('loginBtn');
      const userDropdown = document.getElementById('userDropdown');
      
      if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userDropdown) userDropdown.style.display = 'flex';
      } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (userDropdown) userDropdown.style.display = 'none';
      }
      
      // ========================================
      // 6. ACTUALIZAR BADGE DE ROL
      // ========================================
      const roleBadge = document.getElementById('userRoleBadge');
      const sidebarBadge = document.getElementById('userBadge');
      
      const roleNames = {
        'guest': 'Visitante',
        'client': 'Cliente',
        'technician': 'Técnico',
        'admin': 'Admin'
      };
      
      const roleClasses = {
        'guest': 'role-badge cliente',
        'client': 'role-badge cliente',
        'technician': 'role-badge tecnico',
        'admin': 'role-badge admin'
      };
      
      if (roleBadge) {
        roleBadge.textContent = roleNames[userRole];
        roleBadge.className = roleClasses[userRole];
      }
      
      if (sidebarBadge) {
        sidebarBadge.textContent = roleNames[userRole];
        sidebarBadge.className = roleClasses[userRole];
      }
      
      // ========================================
      // 7. ACTUALIZAR NOMBRE DE USUARIO
      // ========================================
      if (user) {
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userInitial = document.getElementById('userInitial');
        
        if (userNameDisplay) {
          const displayName = user.displayName || user.email.split('@')[0];
          userNameDisplay.textContent = displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName;
        }
        
        if (userInitial) {
          userInitial.textContent = (user.displayName || user.email).charAt(0).toUpperCase();
        }
      }
      
      resolve(userRole);
    });
  });
}

// Controlar acceso a páginas protegidas
async function checkAccess(requiredRole) {
  return new Promise((resolve) => {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        if (requiredRole !== 'guest') {
          alert('⚠️ Debés iniciar sesión para acceder a esta página');
          window.location.href = 'login.html';
          resolve(false);
          return;
        }
        resolve(true);
        return;
      }
      
      const userRole = await getUserRole(user);
      
      // Admin tiene acceso a todo
      if (userRole === 'admin') {
        resolve(true);
        return;
      }
      
      // Verificar permisos
      const roleHierarchy = {
        'guest': 0,
        'client': 1,
        'technician': 2,
        'admin': 3
      };
      
      if (roleHierarchy[userRole] >= roleHierarchy[requiredRole]) {
        resolve(true);
      } else {
        alert('⚠️ No tenés permisos para acceder a esta página');
        window.location.href = 'index.html';
        resolve(false);
      }
    });
  });
}

// Obtener precio según rol
function getPriceByRole(basePrice, technicianPrice) {
  const user = firebase.auth().currentUser;
  
  if (!user) {
    return { price: null, showPrice: false };
  }
  
  return new Promise(async (resolve) => {
    const userRole = await getUserRole(user);
    
    if (userRole === 'technician' || userRole === 'admin') {
      resolve({ price: technicianPrice, showPrice: true, discount: true });
    } else if (userRole === 'client') {
      resolve({ price: basePrice, showPrice: true, discount: false });
    } else {
      resolve({ price: null, showPrice: false, discount: false });
    }
  });
}

// Hacer funciones globales
window.getUserRole = getUserRole;
window.checkAccess = checkAccess;
window.controlVisibility = controlVisibility;
window.getPriceByRole = getPriceByRole;

console.log('✅ Auth Middleware cargado');
