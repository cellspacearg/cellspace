// ========================================
// CELL SPACE - SISTEMA DE AUTENTICACIÓN
// Compatible con nuevo navbar + verificaciones null
// ========================================

let currentUser = null;
let currentUserType = 'client';
let isPremium = false;

document.addEventListener('DOMContentLoaded', () => {
  checkAuthState();
});

function checkAuthState() {
  firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;
    
    // Elementos del nuevo navbar (con verificación null)
    const userDropdown = document.getElementById('userDropdown');
    const loginBtn = document.getElementById('loginBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    const userInitial = document.getElementById('userInitial');
    const technicianMenu = document.getElementById('technicianMenu');
    const adminMenu = document.getElementById('adminMenu');
    
    if (user) {
      // ✅ Usuario logueado: mostrar dropdown, ocultar login
      if (userDropdown) userDropdown.style.display = 'flex';
      if (loginBtn) loginBtn.style.display = 'none';
      
      // Verificar si es admin por email
      if (user.email === 'nahuel0123encinas@gmail.com') {
        if (userNameDisplay) userNameDisplay.textContent = 'nahuel0123encinas';
        if (userRoleBadge) {
          userRoleBadge.textContent = 'Admin';
          userRoleBadge.className = 'role-badge admin';
        }
        if (userInitial) userInitial.textContent = 'N';
        if (technicianMenu) technicianMenu.style.display = 'block';
        if (adminMenu) adminMenu.style.display = 'block';
        
        currentUserType = 'admin';
        isPremium = true;
        showAllContent();
        return;
      }
      
      // Verificar tipo de usuario en Firestore
      await checkUserType(user.email);
      
    } else {
      // ❌ No logueado: ocultar dropdown, mostrar login
      if (userDropdown) userDropdown.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (technicianMenu) technicianMenu.style.display = 'none';
      if (adminMenu) adminMenu.style.display = 'none';
      
      hidePremiumContent();
    }
  });
}

async function checkUserType(email) {
  const userId = email.split('@')[0];
  
  // Elementos del UI
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const userAvatarSmall = document.getElementById('userAvatarSmall');
  const userInitial = document.getElementById('userInitial');
  const technicianMenu = document.getElementById('technicianMenu');
  const adminMenu = document.getElementById('adminMenu');
  
  try {
    // 1. Verificar si es técnico
    const techDoc = await db.collection('technicians').doc(userId).get();
    
    if (techDoc.exists) {
      const techData = techDoc.data();
      currentUserType = 'technician';
      isPremium = techData.isPremium || false;
      
      // Mostrar nombre
      const displayName = techData.username || techData.name || userId;
      if (userNameDisplay) {
        userNameDisplay.textContent = displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName;
      }
      if (userInitial) {
        userInitial.textContent = displayName.charAt(0).toUpperCase();
      }
      
      // Badge de rol
      if (userRoleBadge) {
        userRoleBadge.textContent = isPremium ? 'Técnico 👑' : 'Técnico';
        userRoleBadge.className = isPremium ? 'role-badge tecnico premium' : 'role-badge tecnico';
      }
      
      // Mostrar menú técnico
      if (technicianMenu) technicianMenu.style.display = 'block';
      if (adminMenu) adminMenu.style.display = 'none';
      
      // Contenido según nivel
      if (isPremium) {
        showAllContent();
      } else {
        showFreeContent();
      }
      
    } else {
      // 2. Es cliente
      const clientDoc = await db.collection('clients').doc(userId).get();
      currentUserType = 'client';
      isPremium = false;
      
      const displayName = (clientDoc.exists && clientDoc.data().name) ? clientDoc.data().name : userId;
      
      if (userNameDisplay) {
        userNameDisplay.textContent = displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName;
      }
      if (userInitial) {
        userInitial.textContent = displayName.charAt(0).toUpperCase();
      }
      if (userRoleBadge) {
        userRoleBadge.textContent = 'Cliente';
        userRoleBadge.className = 'role-badge cliente';
      }
      
      if (technicianMenu) technicianMenu.style.display = 'none';
      if (adminMenu) adminMenu.style.display = 'none';
      
      hidePremiumContent();
    }
    
    // Actualizar avatar si tiene foto
    if (userAvatarSmall && currentUser?.photoURL) {
      userAvatarSmall.innerHTML = `<img src="${currentUser.photoURL}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;">`;
    }
    
  } catch (error) {
    console.error('Error verificando tipo de usuario:', error);
    // Fallback a cliente
    if (userNameDisplay) userNameDisplay.textContent = userId;
    if (userRoleBadge) {
      userRoleBadge.textContent = 'Cliente';
      userRoleBadge.className = 'role-badge cliente';
    }
  }
}

// Toggle dropdown
function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.classList.toggle('open');
  }
}

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    dropdown.classList.remove('open');
  }
});

// Logout
function logout() {
  if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
    firebase.auth().signOut().then(() => {
      window.location.href = 'index.html';
    }).catch((error) => {
      console.error('Error al cerrar sesión:', error);
    });
  }
}

// ========================================
// CONTROL DE CONTENIDO SEGÚN NIVEL
// ========================================

function showAllContent() {
  document.querySelectorAll('.premium-lock').forEach(lock => lock.remove());
  document.querySelectorAll('.premium-content').forEach(content => {
    content.classList.remove('restricted');
  });
}

function showFreeContent() {
  document.querySelectorAll('.premium-content.premium-only').forEach(content => {
    if (!content.querySelector('.premium-lock')) {
      const lock = document.createElement('div');
      lock.className = 'premium-lock';
      lock.innerHTML = `
        <div class="lock-icon">🔒</div>
        <h3>Contenido Premium</h3>
        <p>Este contenido es exclusivo para técnicos premium</p>
        <button class="btn-upgrade-now" onclick="requestUpgrade()">👑 Ser Premium</button>
      `;
      content.appendChild(lock);
    }
  });
}

function hidePremiumContent() {
  const techZoneLink = document.getElementById('techZoneLink');
  if (techZoneLink) techZoneLink.style.display = 'none';
  
  document.querySelectorAll('.premium-content').forEach(content => {
    if (!content.querySelector('.premium-lock')) {
      const lock = document.createElement('div');
      lock.className = 'premium-lock';
      lock.innerHTML = `
        <div class="lock-icon">🔒</div>
        <h3>Solo para Técnicos</h3>
        <p>Este contenido es exclusivo para técnicos registrados</p>
        <a href="register-technician.html" class="btn-upgrade-now">Registrarme</a>
      `;
      content.classList.add('premium-only');
      content.appendChild(lock);
    }
  });
}

function requestUpgrade() {
  const message = 'Hola! Quiero ser Técnico Premium y acceder a todo el contenido exclusivo.';
  window.open(`https://wa.me/5493782437674?text=${encodeURIComponent(message)}`, '_blank');
}
