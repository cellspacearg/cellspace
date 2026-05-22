// ========================================
// CELL SPACE - SISTEMA DE AUTENTICACIÓN
// Con niveles de acceso
// ========================================

let currentUser = null;
let currentUserType = 'client'; // 'client' o 'technician'
let isPremium = false;

document.addEventListener('DOMContentLoaded', () => {
  checkAuthState();
});

function checkAuthState() {
  firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    
    if (user) {
      // Ocultar login, mostrar perfil
      document.getElementById('loginLink').style.display = 'none';
      document.getElementById('userProfile').style.display = 'block';
      document.getElementById('userName').textContent = user.email.split('@')[0];
      
      // Verificar si es admin
      if (user.email === 'nahuel0123encinas@gmail.com') {
        document.getElementById('adminLink').style.display = 'block';
        document.getElementById('userType').textContent = 'Admin';
        document.getElementById('userType').classList.add('premium');
        currentUserType = 'admin';
        isPremium = true;
        showAllContent();
        return;
      }
      
      // Verificar tipo de usuario en Firestore
      checkUserType(user.email);
      
    } else {
      // No logueado
      document.getElementById('loginLink').style.display = 'block';
      document.getElementById('userProfile').style.display = 'none';
      document.getElementById('adminLink').style.display = 'none';
      document.getElementById('techZoneLink').style.display = 'none';
      hidePremiumContent();
    }
  });
}

async function checkUserType(email) {
  const userId = email.split('@')[0];
  
  // Primero verificar si es técnico
  const techDoc = await db.collection('technicians').doc(userId).get();
  
  if (techDoc.exists) {
    const techData = techDoc.data();
    currentUserType = 'technician';
    isPremium = techData.isPremium || false;
    
    document.getElementById('userType').textContent = isPremium ? 'Técnico Premium 👑' : 'Técnico';
    if (isPremium) document.getElementById('userType').classList.add('premium');
    
    // Mostrar link a zona técnica
    document.getElementById('techZoneLink').style.display = 'block';
    
    // Mostrar contenido según nivel
    if (isPremium) {
      showAllContent();
    } else {
      showFreeContent();
    }
    
  } else {
    // Es cliente
    currentUserType = 'client';
    isPremium = false;
    document.getElementById('userType').textContent = 'Cliente';
    document.getElementById('techZoneLink').style.display = 'none';
    hidePremiumContent();
  }
}

function toggleUserDropdown() {
  document.querySelector('.user-dropdown').classList.toggle('open');
}

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-dropdown')) {
    document.querySelector('.user-dropdown')?.classList.remove('open');
  }
});

function logout() {
  if (confirm('¿Cerrar sesión?')) {
    firebase.auth().signOut().then(() => {
      window.location.href = 'index.html';
    });
  }
}

// ========================================
// CONTROL DE CONTENIDO SEGÚN NIVEL
// ========================================

function showAllContent() {
  // Admin o Premium: ven todo
  document.querySelectorAll('.premium-lock').forEach(lock => {
    lock.remove();
  });
  document.querySelectorAll('.premium-content').forEach(content => {
    content.classList.remove('restricted');
  });
}

function showFreeContent() {
  // Técnicos gratis: ven contenido free, bloqueado el premium
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
  // Clientes: no ven zona técnica ni contenido premium
  document.getElementById('techZoneLink').style.display = 'none';
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
