// ========================================
// CELL SPACE - ZONA TÉCNICA
// Lógica de permisos y contenido
// ========================================

let isPremiumUser = false;
let currentUserDocId = '';

document.addEventListener('DOMContentLoaded', () => {
  // Verificar Autenticación
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUserDocId = user.email.split('@')[0];
      
      // Verificar si es técnico y su estado
      try {
        const doc = await db.collection('technicians').doc(currentUserDocId).get();
        
        if (doc.exists) {
          const data = doc.data();
          document.getElementById('techName').textContent = data.name;
          
          if (data.isPremium) {
            isPremiumUser = true;
            document.getElementById('premiumBadge').style.display = 'inline-block';
            document.body.classList.add('is-premium');
          }
          
          loadContent();
          setupTabs();
          
        } else {
          alert('⚠️ Acceso denegado. No eres un técnico registrado.');
          window.location.href = 'index.html';
        }
      } catch (error) {
        console.error('Error:', error);
      }
      
    } else {
      window.location.href = 'login.html';
    }
  });
});

// Cargar contenido
async function loadContent(filter = 'all') {
  const grid = document.getElementById('contentGrid');
  grid.innerHTML = '<p class="loading">Cargando contenido...</p>';
  
  try {
    let query = db.collection('technician_posts');
    
    // Si el filtro es 'free', buscamos solo no premium
    // Si es 'premium', buscamos solo premium (pero si el usuario no es premium, no debe verlos o verlos bloqueados)
    // Mejor traemos todo y filtramos en JS para manejo de UI
    
    const snap = await query.orderBy('createdAt', 'desc').get();
    
    if (snap.empty) {
      grid.innerHTML = '<p class="loading">No hay contenido disponible aún.</p>';
      return;
    }
    
    let html = '';
    
    snap.forEach(doc => {
      const post = doc.data();
      
      // Filtros
      if (filter === 'free' && post.isPremium) return;
      if (filter === 'premium' && !post.isPremium) return;
      
      // Renderizado
      const isLocked = post.isPremium && !isPremiumUser;
      
      html += `
        <div class="content-card ${post.isPremium ? 'premium' : ''}">
          ${post.imageUrl ? `<img src="${post.imageUrl}" class="content-image" alt="${post.title}">` : ''}
          <div class="content-body ${isLocked ? 'locked-content' : ''}">
            <span class="content-tag ${post.isPremium ? 'premium' : 'free'}">
              ${post.isPremium ? '👑 PREMIUM' : '✨ GRATUITO'}
            </span>
            
            <h3>${post.title}</h3>
            
            ${isLocked ? `
              <div class="lock-overlay">
                <div class="lock-icon">🔒</div>
                <p>Contenido exclusivo para técnicos Premium</p>
                <button class="btn-upgrade" onclick="window.location.href='https://wa.me/5493782437674?text=Hola!%20Quiero%20ser%20Tecnico%20Premium'">
                  Solicitar Upgrade
                </button>
              </div>
            ` : `
              <p>${post.description}</p>
              ${post.videoUrl ? `<a href="${post.videoUrl}" target="_blank" class="btn-view">🎬 Ver Video</a>` : ''}
            `}
            
            <div class="content-meta">
              <span>${post.category || 'General'}</span>
              <span>${post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : 'Reciente'}</span>
            </div>
          </div>
        </div>
      `;
    });
    
    grid.innerHTML = html || '<p class="loading">No hay contenido en esta categoría.</p>';
    
  } catch (error) {
    console.error('Error:', error);
    grid.innerHTML = '<p class="loading">Error al cargar contenido</p>';
  }
}

// Tabs
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadContent(this.dataset.tab);
    });
  });
}

// Logout
function logout() {
  firebase.auth().signOut().then(() => window.location.href = 'login.html');
}
