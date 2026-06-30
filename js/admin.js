// ========================================
// PANEL DE ADMINISTRACIÓN
// ========================================

async function loadAdminData() {
  try {
    // Total usuarios
    const usersSnap = await db.collection('users').get();
    document.getElementById('totalUsers').textContent = usersSnap.size;
    
    // Total técnicos
    const techsSnap = await db.collection('technicians').get();
    document.getElementById('totalTechnicians').textContent = techsSnap.size;
    
    // Total pedidos (simulado)
    document.getElementById('totalOrders').textContent = '0';
    
    // Total ingresos (simulado)
    document.getElementById('totalRevenue').textContent = '$0';
    
    // Usuarios recientes
    const recentUsers = [];
    usersSnap.forEach(doc => {
      recentUsers.push({ id: doc.id, ...doc.data() });
    });
    
    const recentUsersHtml = recentUsers.slice(0, 5).map(user => `
      <div style="display:flex;align-items:center;gap:15px;padding:15px;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="width:40px;height:40px;border-radius:50%;background:var(--orange);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">
          ${(user.name || user.email || '?').charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;">
          <h4 style="color:white;margin:0 0 5px;">${user.name || 'Sin nombre'}</h4>
          <p style="color:#888;font-size:13px;margin:0;">${user.email}</p>
        </div>
        <span style="background:rgba(255,106,0,0.2);color:var(--orange);padding:5px 10px;border-radius:10px;font-size:12px;font-weight:700;">
          ${user.role || 'client'}
        </span>
      </div>
    `).join('');
    
    document.getElementById('recentUsers').innerHTML = recentUsersHtml || '<p style="color:#888;text-align:center;">No hay usuarios registrados</p>';
    
  } catch (error) {
    console.error('Error cargando datos admin:', error);
  }
}

function logout() {
  if (confirm('¿Cerrar sesión?')) {
    firebase.auth().signOut().then(() => {
      window.location.href = 'index.html';
    });
  }
}
