// ========================================
// PANEL DE ADMINISTRACIÓN - SUPABASE
// ========================================

async function loadAdminData() {
  try {
    // 1. Total de Usuarios
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    document.getElementById('totalUsers').textContent = totalUsers || 0;

    // 2. Total de Técnicos
    const { count: totalTechs, error: techsError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'technician');
    
    document.getElementById('totalTechnicians').textContent = totalTechs || 0;

    // 3. Total de Pedidos (Simulado o real si tenés la tabla 'orders')
    // Si tenés la tabla 'orders', descomentá las siguientes líneas:
    /*
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    document.getElementById('totalOrders').textContent = totalOrders || 0;
    */
    document.getElementById('totalOrders').textContent = '0'; // Placeholder

    // 4. Ingresos Totales (Simulado o real)
    /*
    const { data: ordersData } = await supabase
      .from('orders')
      .select('total');
    const revenue = ordersData ? ordersData.reduce((sum, order) => sum + (order.total || 0), 0) : 0;
    document.getElementById('totalRevenue').textContent = '$' + revenue.toLocaleString('es-AR');
    */
    document.getElementById('totalRevenue').textContent = '$0'; // Placeholder

    // 5. Usuarios Recientes
    const { data: recentUsers, error: recentError } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const recentUsersContainer = document.getElementById('recentUsers');
    
    if (recentError || !recentUsers || recentUsers.length === 0) {
      recentUsersContainer.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">No hay usuarios registrados aún.</p>';
    } else {
      const roleColors = {
        'admin': 'background: rgba(255, 68, 68, 0.2); color: #ff4444;',
        'technician': 'background: rgba(255, 215, 0, 0.2); color: #FFD700;',
        'client': 'background: rgba(255, 106, 0, 0.2); color: var(--orange);'
      };

      recentUsersContainer.innerHTML = recentUsers.map(user => {
        const initial = (user.name || user.email).charAt(0).toUpperCase();
        const date = new Date(user.created_at).toLocaleDateString('es-AR');
        const roleLabel = user.role === 'admin' ? 'Admin' : (user.role === 'technician' ? 'Técnico' : 'Cliente');
        
        return `
          <div style="display:flex;align-items:center;gap:15px;padding:15px;border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--orange);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;flex-shrink:0;">
              ${initial}
            </div>
            <div style="flex:1;min-width:0;">
              <h4 style="color:white;margin:0 0 5px;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${user.name || 'Sin nombre'}
              </h4>
              <p style="color:#888;font-size:13px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${user.email}
              </p>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <span style="display:inline-block;padding:4px 10px;border-radius:10px;font-size:11px;font-weight:700;text-transform:uppercase;${roleColors[user.role] || roleColors['client']}">
                ${roleLabel}
              </span>
              <p style="color:#666;font-size:11px;margin:5px 0 0;">${date}</p>
            </div>
          </div>
        `;
      }).join('');
    }

  } catch (error) {
    console.error('Error cargando datos de admin:', error);
    document.getElementById('recentUsers').innerHTML = '<p style="color:#ff4444;text-align:center;padding:20px;">Error al cargar los datos.</p>';
  }
}

function logout() {
  if (confirm('¿Cerrar sesión de administrador?')) {
    supabase.auth.signOut().then(() => {
      window.location.href = 'index.html';
    });
  }
}
