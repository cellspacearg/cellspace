// ========================================
// CELL SPACE - PANEL DE ADMINISTRACIÓN
// Versión Completa y Corregida
// ========================================

console.log('🔧 Cargando panel de administración...');

// VARIABLES GLOBALES
let currentImageURL = '';
let uploadTask = null;

// ========================================
// INICIALIZACIÓN Y AUTENTICACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM cargado');

  // ESCUCHAR ESTADO DE AUTH (Espera a Firebase)
  firebase.auth().onAuthStateChanged((user) => {
    console.log('🔍 Estado de Auth:', user ? user.email : 'No logueado');

    if (user) {
      // Usuario logueado
      if (user.email === 'nahuel0123encinas@gmail.com') {
        console.log('✅ Admin verificado:', user.email);
        document.getElementById('adminEmail').textContent = user.email;
        
        // Iniciar el panel
        setupNavigation();
        loadDashboard();
        loadContactInfo(); // Precargar contacto
      } else {
        // No es admin
        console.warn('⚠️ No eres admin:', user.email);
        alert('⚠️ Acceso restringido. Solo administradores.');
        window.location.href = 'login.html';
      }
    } else {
      // No logueado
      console.warn('⚠️ Usuario no logueado');
      window.location.href = 'login.html';
    }
  });

  // Vincular formularios manualmente por si el event listener falla
  const serviceForm = document.getElementById('serviceFormEl');
  if (serviceForm) serviceForm.addEventListener('submit', window.saveService);
  
  const productForm = document.getElementById('publishForm');
  if (productForm) productForm.addEventListener('submit', window.saveProduct);
  
  const contactForm = document.getElementById('contactForm');
  if (contactForm) contactForm.addEventListener('submit', window.saveContact);
});

// ========================================
// NAVEGACIÓN
// ========================================

function setupNavigation() {
  console.log('🔧 Configurando navegación...');
  
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      // Si es enlace externo o función inline, dejarlo pasar
      if (href === '#' || href.includes('admin.html') || href.includes('index.html')) return;
      
      e.preventDefault();
      const sectionId = href.substring(1);
      console.log('📍 Navegando a:', sectionId);
      window.showSection(sectionId, this);
    });
  });
}

window.showSection = function(sectionId, btnElement) {
  console.log(' Mostrando sección:', sectionId);
  
  // Ocultar todas las secciones
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
    section.style.display = 'none';
  });
  
  // Remover active de links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Mostrar sección
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
    targetSection.style.display = 'block';
    
    // Cargar datos según sección
    loadSectionData(sectionId);
  }
  
  // Activar botón
  if (btnElement) btnElement.classList.add('active');
};

function loadSectionData(sectionId) {
  switch(sectionId) {
    case 'dashboard': loadDashboard(); break;
    case 'hero': window.loadSlides(); break;
    case 'servicios': window.loadServices(); break;
    case 'productos': window.loadAdminProducts(); break;
    case 'contacto': loadContactInfo(); break;
    case 'footer': window.loadFooterSettings(); break;
    case 'imei': window.loadIMEIHistoryAdmin(); break;
    case 'usuarios': window.loadUsers(); break;
  }
}

window.toggleSidebar = function() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open');
};

// ========================================
// DASHBOARD
// ========================================

window.loadDashboard = async function() {
  try {
    const productsSnap = await db.collection('products').get();
    document.getElementById('totalProducts').textContent = productsSnap.size;
    
    const usersSnap = await db.collection('users').get();
    document.getElementById('totalUsers').textContent = usersSnap.size;
    
    const servicesSnap = await db.collection('services').get();
    document.getElementById('totalServices').textContent = servicesSnap.size;
    
    // Contar IMEI si la colección existe
    try {
        const imeiSnap = await db.collection('imei_history').get();
        const totalIMEIEl = document.getElementById('totalIMEIChecks');
        if(totalIMEIEl) totalIMEIEl.textContent = imeiSnap.size;
    } catch(e) { console.log('Colección IMEI no existe aún'); }

    // Actividad reciente (Productos + Usuarios)
    const recent = [];
    productsSnap.docs.slice(-5).forEach(d => {
        const data = d.data();
        recent.push({
            title: `📦 ${data.title}`,
            date: data.createdAt?.toDate() || new Date()
        });
    });
    
    recent.sort((a, b) => b.date - a.date);
    
    const html = recent.map(item => `
      <div style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;">
        <span style="color:white;font-size:14px;">${item.title}</span>
        <span style="color:var(--muted);font-size:12px;">${item.date.toLocaleString('es-AR')}</span>
      </div>
    `).join('');
    
    document.getElementById('recentActivity').innerHTML = html || '<p style="color:var(--muted);padding:20px;text-align:center;">Sin actividad reciente</p>';
    
  } catch (error) {
    console.error('❌ Error dashboard:', error);
  }
};

// ========================================
// CARRUSEL / SLIDES
// ========================================

window.loadSlides = async function() {
  try {
    const container = document.getElementById('slidesContainer');
    container.innerHTML = '<p class="loading">Cargando...</p>';
    
    const snap = await db.collection('hero_slides').orderBy('order', 'asc').get();
    
    if (snap.empty) {
      container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;">No hay slides.</p>';
      return;
    }
    
    container.innerHTML = snap.docs.map((doc, i) => {
      const s = doc.data();
      return `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,106,0,0.2);border-radius:12px;padding:15px;margin-bottom:15px;display:flex;gap:15px;align-items:center;">
          <img src="${s.imageUrl || 'https://via.placeholder.com/100'}" style="width:100px;height:60px;object-fit:cover;border-radius:6px;">
          <div style="flex:1;">
            <h4 style="margin:0;color:var(--orange);">${s.title}</h4>
            <p style="margin:5px 0 0;font-size:13px;color:var(--muted);">${s.subtitle || ''}</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="window.editSlide('${doc.id}')" style="background:#2196F3;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">✏️</button>
            <button onclick="window.deleteSlide('${doc.id}')" style="background:#ff4444;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">🗑️</button>
          </div>
        </div>`;
    }).join('');
    
  } catch (error) {
    console.error('❌ Error slides:', error);
  }
};

window.addSlide = async function() {
  const title = prompt('Título:');
  if (!title) return;
  const subtitle = prompt('Subtítulo:') || '';
  const imageUrl = prompt('URL Imagen:') || '';
  
  try {
    await db.collection('hero_slides').add({
      title, subtitle, imageUrl,
      active: true,
      order: firebase.firestore.FieldValue.increment(1),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('✅ Slide agregado');
    window.loadSlides();
  } catch (e) { alert('❌ ' + e.message); }
};

window.editSlide = async function(id) {
  const doc = await db.collection('hero_slides').doc(id).get();
  if (!doc.exists) return;
  const s = doc.data();
  
  const title = prompt('Título:', s.title);
  if (!title) return;
  const subtitle = prompt('Subtítulo:', s.subtitle) || '';
  const imageUrl = prompt('URL Imagen:', s.imageUrl) || '';
  
  try {
    await db.collection('hero_slides').doc(id).update({ title, subtitle, imageUrl });
    alert('✅ Actualizado');
    window.loadSlides();
  } catch (e) { alert('❌ ' + e.message); }
};

window.deleteSlide = async function(id) {
  if (!confirm('¿Eliminar slide?')) return;
  try {
    await db.collection('hero_slides').doc(id).delete();
    window.loadSlides();
  } catch (e) { alert('❌ ' + e.message); }
};

// ========================================
// SERVICIOS
// ========================================

window.toggleServiceForm = function() {
  const form = document.getElementById('serviceForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
  document.getElementById('serviceId').value = ''; // Limpiar ID al abrir
};

window.loadServices = async function() {
  const list = document.getElementById('adminServicesList');
  list.innerHTML = '<p class="loading">Cargando...</p>';
  
  try {
    const snap = await db.collection('services').get();
    if (snap.empty) {
      list.innerHTML = '<p style="text-align:center;color:var(--muted);">Sin servicios</p>';
      return;
    }
    
    list.innerHTML = snap.docs.map(doc => {
      const s = doc.data();
      return `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,106,0,0.1);border-radius:10px;padding:15px;margin-bottom:10px;display:flex;align-items:center;gap:15px;">
          <span style="font-size:2rem;">${s.icon || '🔧'}</span>
          <div style="flex:1;">
            <h4 style="margin:0;color:var(--orange);">${s.title}</h4>
            <p style="margin:5px 0 0;font-size:13px;color:var(--muted);">${s.description || ''}</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="window.editService('${doc.id}')" style="background:#2196F3;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">✏️</button>
            <button onclick="window.deleteService('${doc.id}')" style="background:#ff4444;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">🗑️</button>
          </div>
        </div>`;
    }).join('');
  } catch (e) { console.error(e); }
};

window.saveService = async function(e) {
  if (e) e.preventDefault();
  
  const id = document.getElementById('serviceId').value;
  const icon = document.getElementById('serviceIcon').value;
  const title = document.getElementById('serviceTitle').value;
  const desc = document.getElementById('serviceDesc').value;
  
  if (!title) { alert('⚠️ El título es obligatorio'); return; }
  
  const data = {
    icon, title, description: desc,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    if (id) {
      await db.collection('services').doc(id).update(data);
      alert('✅ Servicio actualizado');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('services').add(data);
      alert('✅ Servicio agregado');
    }
    window.resetServiceForm();
    window.loadServices();
  } catch (err) { alert('❌ ' + err.message); }
};

window.editService = async function(id) {
  const doc = await db.collection('services').doc(id).get();
  if (!doc.exists) return;
  const s = doc.data();
  
  document.getElementById('serviceId').value = id;
  document.getElementById('serviceIcon').value = s.icon || '';
  document.getElementById('serviceTitle').value = s.title || '';
  document.getElementById('serviceDesc').value = s.description || '';
  document.getElementById('serviceForm').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteService = async function(id) {
  if (!confirm('¿Eliminar servicio?')) return;
  try {
    await db.collection('services').doc(id).delete();
    window.loadServices();
  } catch (e) { alert('❌ ' + e.message); }
};

window.resetServiceForm = function() {
  document.getElementById('serviceFormEl').reset();
  document.getElementById('serviceId').value = '';
  document.getElementById('serviceForm').style.display = 'none';
};

// ========================================
// PRODUCTOS
// ========================================

window.toggleProductForm = function() {
  const form = document.getElementById('productForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
  window.resetProductForm(); // Limpiar al abrir
};

window.loadAdminProducts = async function() {
  const list = document.getElementById('adminProductsList');
  list.innerHTML = '<p class="loading">Cargando...</p>';
  
  try {
    const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
    if (snap.empty) {
      list.innerHTML = '<p style="text-align:center;color:var(--muted);">Sin productos</p>';
      return;
    }
    
    list.innerHTML = snap.docs.map(doc => {
      const p = doc.data();
      return `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,106,0,0.1);border-radius:10px;padding:15px;margin-bottom:10px;display:flex;gap:15px;align-items:center;">
          <img src="${p.imageUrl || 'https://via.placeholder.com/80'}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;">
          <div style="flex:1;">
            <h4 style="margin:0;color:white;">${p.title}</h4>
            <p style="margin:5px 0 0;color:var(--orange);font-weight:bold;">$${Number(p.price).toLocaleString('es-AR')}</p>
            <p style="margin:5px 0 0;font-size:12px;color:var(--muted);">${p.category} • ${p.inStock ? 'Stock' : 'Agotado'}</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="window.editProduct('${doc.id}')" style="background:#2196F3;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">✏️</button>
            <button onclick="window.deleteProduct('${doc.id}')" style="background:#ff4444;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">🗑️</button>
          </div>
        </div>`;
    }).join('');
  } catch (e) { console.error(e); }
};

// Configurar input de imagen
document.getElementById('prodImage')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) window.uploadImage(file);
});

window.uploadImage = async function(file) {
  if (!file.type.startsWith('image/')) { alert('❌ Solo imágenes'); return; }
  if (file.size > 5 * 1024 * 1024) { alert('❌ Máximo 5MB'); return; }
  
  document.getElementById('uploadProgress').classList.add('show');
  document.getElementById('uploadStatus').textContent = '📤 Subiendo...';
  
  try {
    const ref = storage.ref(`products/${Date.now()}_${file.name}`);
    uploadTask = ref.put(file);
    
    uploadTask.on('state_changed',
      snap => {
        const p = (snap.bytesTransferred / snap.totalBytes) * 100;
        document.getElementById('progressFill').style.width = p + '%';
      },
      err => { document.getElementById('uploadStatus').textContent = '❌ Error'; },
      async () => {
        currentImageURL = await uploadTask.snapshot.ref.getDownloadURL();
        document.getElementById('imagePreview').src = currentImageURL;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('uploadPlaceholder').style.display = 'none';
        document.getElementById('uploadStatus').textContent = '✅ Lista';
        document.getElementById('uploadProgress').classList.remove('show');
      }
    );
  } catch (e) { alert('❌ ' + e.message); }
};

window.saveProduct = async function(e) {
  if (e) e.preventDefault();
  
  const btn = document.getElementById('saveBtn');
  btn.disabled = true; btn.textContent = 'Guardando...';
  
  const id = document.getElementById('prodId').value;
  const data = {
    title: document.getElementById('prodName').value,
    price: parseFloat(document.getElementById('prodPrice').value) || 0,
    category: document.getElementById('prodCategory').value,
    description: document.getElementById('prodDesc').value,
    imageUrl: currentImageURL,
    inStock: document.getElementById('prodStock').checked,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    if (id) {
      await db.collection('products').doc(id).update(data);
      alert('✅ Producto actualizado');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').add(data);
      alert('✅ Producto agregado');
    }
    window.resetProductForm();
    window.loadAdminProducts();
  } catch (err) { alert('❌ ' + err.message); }
  finally {
    btn.disabled = false; btn.textContent = '💾 Guardar';
  }
};

window.editProduct = async function(id) {
  const doc = await db.collection('products').doc(id).get();
  if (!doc.exists) return;
  const p = doc.data();
  
  document.getElementById('prodId').value = id;
  document.getElementById('prodName').value = p.title;
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodDesc').value = p.description || '';
  document.getElementById('prodStock').checked = p.inStock !== false;
  
  if (p.imageUrl) {
    currentImageURL = p.imageUrl;
    document.getElementById('imagePreview').src = p.imageUrl;
    document.getElementById('imagePreview').style.display = 'block';
    document.getElementById('uploadPlaceholder').style.display = 'none';
  }
  
  document.getElementById('productForm').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteProduct = async function(id) {
  if (!confirm('¿Eliminar producto?')) return;
  try {
    await db.collection('products').doc(id).delete();
    window.loadAdminProducts();
  } catch (e) { alert('❌ ' + e.message); }
};

window.resetProductForm = function() {
  document.getElementById('publishForm').reset();
  document.getElementById('prodId').value = '';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('uploadPlaceholder').style.display = 'block';
  document.getElementById('uploadProgress').classList.remove('show');
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('uploadStatus').textContent = '';
  currentImageURL = '';
};

// ========================================
// CONTACTO
// ========================================

async function loadContactInfo() {
  try {
    const doc = await db.collection('site_config').doc('contact').get();
    if (doc.exists) {
      const c = doc.data();
      document.getElementById('contactAddress').value = c.address || '';
      document.getElementById('contactPhone').value = c.phone || '';
      document.getElementById('contactHours').value = c.hours || '';
      document.getElementById('contactEmail').value = c.email || '';
    }
  } catch (e) { console.error(e); }
}

window.saveContact = async function(e) {
  if (e) e.preventDefault();
  try {
    await db.collection('site_config').doc('contact').set({
      address: document.getElementById('contactAddress').value,
      phone: document.getElementById('contactPhone').value,
      hours: document.getElementById('contactHours').value,
      email: document.getElementById('contactEmail').value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    alert('✅ Contacto guardado');
  } catch (err) { alert('❌ ' + err.message); }
};

// ========================================
// FOOTER
// ========================================

window.saveFooterSettings = async function() {
  try {
    const servicesText = document.getElementById('footerServicesList')?.value || '';
    const storeText = document.getElementById('footerStoreList')?.value || '';
    
    await db.collection('site_config').doc('footer').set({
      description: document.getElementById('footerDesc')?.value || '',
      social: {
        facebook: document.getElementById('socialFacebook')?.value || '',
        instagram: document.getElementById('socialInstagram')?.value || '',
        tiktok: document.getElementById('socialTiktok')?.value || '',
        telegram: document.getElementById('socialTelegram')?.value || ''
      },
      services: servicesText.split(',').map(s => s.trim()).filter(s => s),
      store: storeText.split(',').map(s => s.trim()).filter(s => s),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    alert('✅ Footer guardado');
  } catch (e) { alert('❌ ' + e.message); }
};

window.loadFooterSettings = async function() {
  try {
    const doc = await db.collection('site_config').doc('footer').get();
    if (doc.exists) {
      const d = doc.data();
      const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
      
      setVal('footerDesc', d.description);
      if(d.social) {
        setVal('socialFacebook', d.social.facebook);
        setVal('socialInstagram', d.social.instagram);
        setVal('socialTiktok', d.social.tiktok);
        setVal('socialTelegram', d.social.telegram);
      }
      setVal('footerServicesList', d.services?.join(', '));
      setVal('footerStoreList', d.store?.join(', '));
    }
  } catch (e) { console.error(e); }
};

// ========================================
// USUARIOS
// ========================================

window.loadUsers = async function() {
  const tb = document.getElementById('usersTable');
  tb.innerHTML = '<tr><td colspan="4" class="loading">Cargando...</td></tr>';
  
  try {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
    if (snap.empty) {
      tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted)">Sin usuarios</td></tr>';
      return;
    }
    
    tb.innerHTML = snap.docs.map(d => {
      const u = d.data();
      return `<tr>
        <td>${u.name || '-'}</td>
        <td>${u.email}</td>
        <td>${u.createdAt?.toDate().toLocaleDateString('es-AR') || 'Reciente'}</td>
        <td><span style="color:#4CAF50">Activo</span></td>
      </tr>`;
    }).join('');
  } catch (e) { console.error(e); }
};

// ========================================
// IMEI HISTORY
// ========================================

window.loadIMEIHistoryAdmin = async function() {
  const tb = document.getElementById('imeiHistoryTable');
  tb.innerHTML = '<tr><td colspan="8" class="loading">Cargando...</td></tr>';
  
  try {
    const snap = await db.collection('imei_history').orderBy('timestamp', 'desc').limit(50).get();
    if (snap.empty) {
      tb.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted)">Sin consultas</td></tr>';
      return;
    }
    
    tb.innerHTML = snap.docs.map(d => {
      const h = d.data();
      const date = h.timestamp?.toDate().toLocaleString('es-AR');
      const r = h.result || {};
      return `<tr>
        <td>${date}</td>
        <td><strong>${h.imei}</strong></td>
        <td>${h.searchType || 'IMEI'}</td>
        <td>${r.brand || '-'}</td>
        <td>${r.model || '-'}</td>
        <td><span style="color:${r.blacklist==='Clean'?'#4CAF50':'#ff4444'}">${r.blacklist || '-'}</span></td>
        <td>${h.userEmail?.split('@')[0] || '-'}</td>
        <td><button onclick="window.viewIMEIDetails('${d.id}')" style="background:#2196F3;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">👁️</button></td>
      </tr>`;
    }).join('');
  } catch (e) { console.error(e); }
};

window.viewIMEIDetails = async function(id) {
  try {
    const doc = await db.collection('imei_history').doc(id).get();
    if (!doc.exists) return alert('No encontrado');
    const h = doc.data();
    const r = h.result || {};
    alert(`
📋 DETALLES IMEI
IMEI: ${h.imei}
Marca: ${r.brand || '-'}
Modelo: ${r.model || '-'}
Estado: ${r.blacklist || '-'}
Fecha: ${h.timestamp?.toDate().toLocaleString('es-AR')}
    `);
  } catch (e) { alert('Error: ' + e.message); }
};

// ========================================
// UTILIDADES
// ========================================

window.logout = function() {
  if (confirm('¿Cerrar sesión?')) {
    firebase.auth().signOut().then(() => window.location.href = 'login.html');
  }
};

console.log('✅ admin.js cargado correctamente');
