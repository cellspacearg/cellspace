// ========================================
// CELL SPACE - PERFIL.JS
// Página de Mi Cuenta / Perfil
// ========================================

let currentUser = null;
let currentUserType = 'client';
let originalUsername = '';

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadProfileData(user);
      setupNavbar(user);
    } else {
      window.location.href = 'login.html';
    }
  });
});

// ========================================
// CARGAR DATOS DEL PERFIL
// ========================================

async function loadProfileData(user) {
  const userId = user.email.split('@')[0];
  let userData = null;
  
  // Buscar en todas las colecciones
  const clientDoc = await db.collection('clients').doc(userId).get();
  if (clientDoc.exists) {
    userData = clientDoc.data();
    currentUserType = 'client';
  } else {
    const techDoc = await db.collection('technicians').doc(userId).get();
    if (techDoc.exists) {
      userData = techDoc.data();
      currentUserType = 'technician';
    } else {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        userData = userDoc.data();
        currentUserType = userDoc.data().userType || 'client';
      }
    }
  }
  
  // Cargar datos en formulario
  const username = userData?.username || user.displayName?.toLowerCase().replace(/\s+/g, '_') || userId;
  document.getElementById('profileUsername').value = username;
  originalUsername = username;
  
  document.getElementById('profileEmail').value = user.email;
  document.getElementById('profileName').value = userData?.name || user.displayName || '';
  document.getElementById('profilePhone').value = userData?.phone || '';
  document.getElementById('profileTelegram').value = userData?.telegram || '';
  document.getElementById('profileWhatsApp').value = userData?.whatsapp || '';
  document.getElementById('profileLocation').value = userData?.location || '';
  
  // Campos técnicos si corresponde
  if (currentUserType === 'technician') {
    document.getElementById('techFields').style.display = 'block';
    document.getElementById('profileSpecialty').value = userData?.specialty || '';
    document.getElementById('profileExperience').value = userData?.experience || '';
    document.getElementById('profileBio').value = userData?.bio || '';
  }
  
  // Actualizar sidebar
  const displayName = userData?.name || username;
  document.getElementById('sidebarName').textContent = displayName;
  document.getElementById('sidebarEmail').textContent = user.email;
  document.getElementById('profileInitial').textContent = displayName.charAt(0).toUpperCase();
  
  // Foto de perfil
  if (userData?.photoURL || user.photoURL) {
    document.getElementById('profilePhotoImg').src = userData?.photoURL || user.photoURL;
    document.getElementById('profilePhotoImg').style.display = 'block';
    document.getElementById('profileInitial').style.display = 'none';
  }
  
  // Badge de rol
  const badge = document.getElementById('userBadge');
  
  if (currentUserType === 'admin') {
    badge.textContent = 'Admin';
    badge.className = 'role-badge admin';
    document.getElementById('adminMenu').style.display = 'block';
    document.getElementById('sidebarAdminMenu').style.display = 'block';
  } else if (currentUserType === 'technician') {
    badge.textContent = userData?.isPremium ? 'Técnico Premium 👑' : 'Técnico';
    badge.className = userData?.isPremium ? 'role-badge tecnico premium' : 'role-badge tecnico';
    document.getElementById('technicianMenu').style.display = 'block';
    document.getElementById('sidebarTechMenu').style.display = 'block';
  } else {
    badge.textContent = 'Cliente';
    badge.className = 'role-badge cliente';
  }
  
  console.log('✅ Perfil cargado correctamente');
}

function setupNavbar(user) {
  // Mostrar dropdown si existe
  const userDropdown = document.getElementById('userDropdown');
  if (userDropdown) {
    userDropdown.style.display = 'flex';
  }
  
  // Ocultar botón de login
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.style.display = 'none';
  }
}

// ========================================
// GUARDAR CAMBIOS
// ========================================

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  
  const userId = currentUser.email.split('@')[0];
  const newUsername = document.getElementById('profileUsername').value.trim().toLowerCase();
  
  // Validar username
  if (newUsername.length < 3) {
    alert('⚠️ Mínimo 3 caracteres');
    return;
  }
  
  // Si cambió el username
  if (newUsername !== originalUsername) {
    try {
      const checkDoc = await db.collection('usernames').doc(newUsername).get();
      if (checkDoc.exists && checkDoc.data().email !== currentUser.email) {
        alert('⚠️ Ese username ya está en uso.');
        return;
      }
      
      // Borrar el viejo si existe
      if (originalUsername) {
        await db.collection('usernames').doc(originalUsername).delete().catch(() => {});
      }
      
      // Crear nuevo username
      await db.collection('usernames').doc(newUsername).set({
        email: currentUser.email,
        userType: currentUserType,
        uid: currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      alert('❌ Error verificando username');
      return;
    }
  }
  
  // Preparar datos a actualizar
  const updates = {
    username: newUsername,
    name: document.getElementById('profileName').value,
    phone: document.getElementById('profilePhone').value,
    telegram: document.getElementById('profileTelegram').value,
    whatsapp: document.getElementById('profileWhatsApp').value,
    location: document.getElementById('profileLocation').value,
    userType: currentUserType,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  // Campos técnicos
  if (currentUserType === 'technician') {
    updates.specialty = document.getElementById('profileSpecialty').value;
    updates.experience = document.getElementById('profileExperience').value;
    updates.bio = document.getElementById('profileBio').value;
  }
  
  // Contraseña
  const newPass = document.getElementById('newPassword').value;
  if (newPass && newPass.length >= 6) {
    try {
      await currentUser.updatePassword(newPass);
      alert('✅ Contraseña actualizada correctamente');
    } catch (err) {
      alert('❌ Error contraseña: ' + err.message);
      return;
    }
  }
  
  // Detectar colección correcta
  let collection = 'clients';
  const cSnap = await db.collection('clients').doc(userId).get();
  if (cSnap.exists) {
    collection = 'clients';
  } else {
    const tSnap = await db.collection('technicians').doc(userId).get();
    if (tSnap.exists) {
      collection = 'technicians';
    } else {
      collection = 'users';
    }
  }
  
  try {
    // Actualizar con merge (crea si no existe)
    await db.collection(collection).doc(userId).set(updates, { merge: true });
    
    originalUsername = newUsername;
    alert('✅ Perfil actualizado correctamente');
    location.reload();
  } catch (err) {
    console.error(err);
    alert('❌ Error al guardar: ' + err.message);
  }
});

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function cancelChanges() {
  location.reload();
}

function toggleUserDropdown() {
  const d = document.getElementById('userDropdown');
  if (d) d.classList.toggle('open');
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
  const d = document.getElementById('userDropdown');
  if (d && !d.contains(e.target)) {
    d.classList.remove('open');
  }
});
