// ========================================
// CELL SPACE - PANEL DE ADMINISTRACIÓN
// ========================================

console.log('🔧 Cargando panel de administración...');

// VARIABLES GLOBALES
let currentImageURL = '';
let uploadTask = null;

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ DOM cargado');
  
  // Verificar autenticación
  await checkAdminAuth();
  
  // Configurar navegación
  setupNavigation();
  
  // Cargar dashboard inicial
  loadDashboard();
  
  console.log('✅ Panel inicializado');
});

// ========================================
// AUTENTICACIÓN
// ========================================

async function checkAdminAuth() {
  try {
    const user = firebase.auth().currentUser;
    console.log('👤 Usuario actual:', user?.email || 'No logueado');
    
    if (!user || user.email !== 'nahuel0123encinas@gmail.com') {
      console.warn('⚠️ Usuario no autorizado, redirigiendo...');
      alert('⚠️ Acceso restringido. Solo administradores.');
      window.location.href = 'login.html';
      return;
    }
    
    document.getElementById('adminEmail').textContent = user.email;
    console.log('✅ Usuario autorizado:', user.email);
    
  } catch (error) {
    console.error('❌ Error en auth:', error);
    window.location.href = 'login.html';
  }
}

// ========================================
// NAVEGACIÓN
// ========================================

function setupNavigation() {
  console.log('🔧 Configurando navegación...');
  
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Si es un link externo o de logout, no prevenir default
      if (this.getAttribute('href') === '#' || this.onclick?.toString().includes('logout')) {
        return;
      }
      
      const targetId = this.getAttribute('href').substring(1);
      console.log('📍 Navegando a:', targetId);
      
      e.preventDefault();
      showSection(targetId, this);
    });
  });
  
  console.log('✅ Navegación configurada');
}

function showSection(sectionId, btnElement) {
  console.log(' Mostrando sección:', sectionId);
  
  // Ocultar todas las secciones
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
    section.style.display = 'none';
  });
  
  // Remover active de todos los links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Mostrar sección seleccionada
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
    targetSection.style.display = 'block';
    console.log('✅ Sección mostrada:', sectionId);
    
    // Cargar datos específicos según la sección
    loadSectionData(sectionId);
  } else {
    console.error('❌ Sección no encontrada:', sectionId);
  }
  
  // Activar botón
  if (btnElement) {
    btnElement.classList.add('active');
  }
}

function loadSectionData(sectionId) {
  console.log('📥 Cargando datos para:', sectionId);
  
  switch(sectionId) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'hero':
      loadSlides();
      break;
    case 'servicios':
      loadServices();
      break;
    case 'productos':
      loadAdminProducts();
      break;
    case 'contacto':
      loadContactInfo();
      break;
    case 'footer':
      loadFooterSettings();
      break;
    case 'imei':
      loadIMEIHistoryAdmin();
      break;
    case 'usuarios':
      loadUsers();
      break;
    default:
      console.log('⚠️ Sección sin datos específicos:', sectionId);
  }
}

// ========================================
// DASHBOARD
// ========================================

async function loadDashboard() {
  console.log('📊 Cargando dashboard...');
  
  try {
    // Contar productos
    const productsSnap = await db.collection('products').get();
    document.getElementById('totalProducts').textContent = productsSnap.size;
    
    // Contar usuarios
    const usersSnap = await db.collection('users').get();
    document.getElementById('totalUsers').textContent = usersSnap.size;
    
    // Contar servicios
    const servicesSnap = await db.collection('services').get();
    document.getElementById('totalServices').textContent = servicesSnap.size;
    
    // Productos en stock
    const inStock = productsSnap.docs.filter(doc => doc.data().inStock !== false).length;
    document.getElementById('inStockProducts').textContent = inStock;
    
    // Actividad reciente
    const recentActivities = [];
    
    // Últimos 5 productos
    productsSnap.docs.slice(-5).forEach(doc => {
      const data = doc.data();
      recentActivities.push({
        type: 'product',
        title: data.title || 'Producto',
        date: data.createdAt?.toDate() || new Date()
      });
    });
    
    // Últimos 5 usuarios
    usersSnap.docs.slice(-5).forEach(doc => {
      const data = doc.data();
      recentActivities.push({
        type: 'user',
        title: data.email || 'Usuario',
        date: data.createdAt?.toDate() || new Date()
      });
    });
    
    // Ordenar por fecha
    recentActivities.sort((a, b) => b.date - a.date);
    
    // Mostrar actividades
    const activityHTML = recentActivities.slice(0, 10).map(act => `
      <div style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="color:white;font-size:14px;">
          ${act.type === 'product' ? '📦' : '👤'} ${act.title}
        </div>
        <div style="color:var(--muted);font-size:12px;">
          ${act.date.toLocaleString('es-AR')}
        </div>
      </div>
    `).join('');
    
    document.getElementById('recentActivity').innerHTML = activityHTML || '<p style="color:var(--muted);padding:20px;text-align:center;">Sin actividad reciente</p>';
    
    console.log('✅ Dashboard cargado');
    
  } catch (error) {
    console.error('❌ Error cargando dashboard:', error);
    alert('❌ Error al cargar dashboard: ' + error.message);
  }
}

// ========================================
// CARRUSEL / SLIDES
// ========================================

async function loadSlides() {
  console.log('🎠 Cargando slides...');
  
  try {
    const container = document.getElementById('slidesContainer');
    if (!container) {
      console.error('❌ Container slides no encontrado');
      return;
    }
    
    container.innerHTML = '<p class="loading">Cargando slides...</p>';
    
    const snap = await db.collection('hero_slides').orderBy('order', 'asc').get();
    
    if (snap.empty) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px;">No hay slides. Agregá el primero.</p>';
      return;
    }
    
    const slidesHTML = snap.docs.map((doc, index) => {
      const s = doc.data();
      return `
        <div class="slide-admin-card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,106,0,0.2);border-radius:12px;padding:20px;margin-bottom:15px;">
          <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">
            <img src="${s.imageUrl || 'https://via.placeholder.com/150x100'}" style="width:150px;height:100px;object-fit:cover;border-radius:8px;">
            <div style="flex:1;min-width:200px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h4 style="margin:0;color:var(--orange);">Slide ${index + 1}</h4>
                <div style="display:flex;gap:10px;">
                  <button onclick="editSlide('${doc.id}')" style="background:#2196F3;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">✏️ Editar</button>
                  <button onclick="deleteSlide('${doc.id}')" style="background:#ff4444;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">🗑️ Eliminar</button>
                </div>
              </div>
              <p style="margin:5px 0;"><strong>Título:</strong> ${s.title || 'Sin título'}</p>
              <p style="margin:5px 0;"><strong>Subtítulo:</strong> ${s.subtitle || 'Sin subtítulo'}</p>
              <p style="margin:5px 0;"><strong>Texto botón:</strong> ${s.buttonText || 'Sin texto'}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = slidesHTML;
    console.log('✅ Slides cargados:', snap.size);
    
  } catch (error) {
    console.error('❌ Error cargando slides:', error);
    document.getElementById('slidesContainer').innerHTML = '<p style="color:#ff4444">Error: ' + error.message + '</p>';
  }
}

window.addSlide = async function() {
  const title = prompt('Título del slide:');
  if (!title) return;
  
  const subtitle = prompt('Subtítulo:') || '';
  const buttonText = prompt('Texto del botón:') || 'Contactar';
  const imageUrl = prompt('URL de la imagen (opcional):') || '';
  
  try {
    await db.collection('hero_slides').add({
      title,
      subtitle,
      buttonText,
      imageUrl,
      active: true,
      order: firebase.firestore.FieldValue.increment(1),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('✅ Slide agregado correctamente');
    loadSlides();
    
  } catch (error) {
    console.error('❌ Error agregando slide:', error);
    alert('❌ Error: ' + error.message);
  }
};

window.editSlide = async function(id) {
  const doc = await db.collection('hero_slides').doc(id).get();
  if (!doc.exists) {
    alert('❌ Slide no encontrado');
    return;
  }
  
  const s = doc.data();
  const title = prompt('Título:', s.title);
  if (!title) return;
  
  const subtitle = prompt('Subtítulo:', s.subtitle) || '';
  const buttonText = prompt('Texto del botón:', s.buttonText) || '';
  const imageUrl = prompt('URL de imagen:', s.imageUrl) || '';
  
  try {
    await db.collection('hero_slides').doc(id).update({
      title,
      subtitle,
      buttonText,
      imageUrl,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('✅ Slide actualizado');
    loadSlides();
    
  } catch (error) {
    console.error('❌ Error actualizando slide:', error);
    alert('❌ Error: ' + error.message);
  }
};

window.deleteSlide = async function(id) {
  if (!confirm('¿Eliminar este slide?')) return;
  
  try {
    await db.collection('hero_slides').doc(id).delete();
    alert('✅ Slide eliminado');
    loadSlides();
    
  } catch (error) {
    console.error('❌ Error eliminando slide:', error);
    alert('❌ Error: ' + error.message);
  }
};

// ========================================
// SERVICIOS
// ========================================

window.toggleServiceForm = function() {
  const form = document.getElementById('serviceForm');
  if (form) {
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  }
};

async function loadServices() {
  console.log('🛠️ Cargando servicios...');
  
  try {
    const list = document.getElementById('adminServicesList');
    if (!list) return;
    
    list.innerHTML = '<p class="loading">Cargando...</p>';
    
    const snap = await db.collection('services').get();
    
    if (snap.empty) {
      list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px;">Sin servicios</p>';
      return;
    }
    
    list.innerHTML = snap.docs.map(doc => {
      const s = doc.data();
      return `
        <div class="service-admin-card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,106,0,0.15);border-radius:12px;padding:20px;margin-bottom:15px;display:flex;gap:15px;align-items:center;">
          <div style="font-size:3rem;">${s.icon || '🔧'}</div>
          <div style="flex:1;">
            <h4 style="margin:0 0 5px;color:var(--orange);">${s.title}</h4>
            <p style="margin:0;color:var(--muted);font-size:14px;">${s.description || ''}</p>
          </div>
          <div style="display:flex;gap:10px;">
            <button onclick="editService('${doc.id}')" style="background:#2196F3;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">✏️</button>
            <button onclick="deleteService('${doc.id}')" style="background:#ff4444;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
    
    console.log('✅ Servicios cargados:', snap.size);
    
  } catch (error) {
    console.error('❌ Error cargando servicios:', error);
  }
}

// Formulario de servicios
const serviceForm = document.getElementById('serviceFormEl');
if (serviceForm) {
  serviceForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('serviceId').value;
    const data = {
      icon: document.getElementById('serviceIcon').value,
      title: document.getElementById('serviceTitle').value,
      description: document.getElementById('serviceDesc').value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
      if (id) {
        await db.collection('services').doc(id).update(data);
        alert('✅ Servicio actualizado');
      } else {
        await db.collection('services').add({
          ...data,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('✅ Servicio agregado');
      }
      
      resetServiceForm();
      loadServices();
      
    } catch (error) {
      console.error('❌ Error guardando servicio:', error);
      alert('❌ Error: ' + error.message);
    }
  });
}

window.editService = async function(id) {
  const doc = await db.collection('services').doc(id).get();
  if (!doc.exists) return;
  
  const s = doc.data();
  document.getElementById('serviceId').value = id;
  document.getElementById('serviceIcon').value = s.icon || '';
  document.getElementById('serviceTitle').value = s.title || '';
  document.getElementById('serviceDesc').value = s.description || '';
  document.getElementById('serviceForm').style.display = 'block';
};

window.deleteService = async function(id) {
  if (!confirm('¿Eliminar este servicio?')) return;
  
  try {
    await db.collection('services').doc(id).delete();
    alert('✅ Servicio eliminado');
    loadServices();
  } catch (error) {
    alert('❌ Error: ' + error.message);
  }
};

function resetServiceForm() {
  document.getElementById('serviceFormEl').reset();
  document.getElementById('serviceId').value = '';
  document.getElementById('serviceForm').style.display = 'none';
}

// ========================================
// PRODUCTOS (CON SUBIDA DE IMÁGENES)
// ========================================

window.toggleProductForm = function() {
  const form = document.getElementById('productForm');
  if (form) {
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  }
};

// Configurar subida de imágenes
const imageInput = document.getElementById('prodImage');
if (imageInput) {
  imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) uploadImage(file);
  });
}

async function uploadImage(file) {
  console.log('📸 Subiendo imagen:', file.name);
  
  if (!file.type.startsWith('image/')) {
    alert('❌ Solo se permiten imágenes');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    alert('❌ La imagen no puede superar 5MB');
    return;
  }
  
  try {
    const storageRef = storage.ref(`products/${Date.now()}_${file.name}`);
    uploadTask = storageRef.put(file);
    
    document.getElementById('uploadProgress').classList.add('show');
    document.getElementById('uploadStatus').textContent = '📤 Subiendo...';
    
    uploadTask.on('state_changed', 
      snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
      },
      error => {
        console.error('❌ Error subiendo:', error);
        document.getElementById('uploadStatus').textContent = '❌ Error: ' + error.message;
      },
      async () => {
        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
        currentImageURL = downloadURL;
        
        document.getElementById('imagePreview').src = downloadURL;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('uploadPlaceholder').style.display = 'none';
        document.getElementById('uploadStatus').textContent = '✅ Imagen subida';
        document.getElementById('uploadProgress').classList.remove('show');
        
        console.log('✅ Imagen subida:', downloadURL);
      }
    );
    
  } catch (error) {
    console.error('❌ Error en upload:', error);
    alert('❌ Error al subir imagen: ' + error.message);
  }
}

// Formulario de productos
const productForm = document.getElementById('publishForm');
if (productForm) {
  productForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    
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
      
      resetProductForm();
      loadAdminProducts();
      
    } catch (error) {
      console.error('❌ Error guardando producto:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Guardar';
    }
  });
}

async function loadAdminProducts() {
  console.log('📦 Cargando productos...');
  
  try {
    const list = document.getElementById('adminProductsList');
    if (!list) return;
    
    list.innerHTML = '<p class="loading">Cargando...</p>';
    
    const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
    
    if (snap.empty) {
      list.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;">Sin productos</p>';
      return;
    }
    
    list.innerHTML = snap.docs.map(doc => {
      const p = doc.data();
      return `
        <div class="product-admin-card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,106,0,0.1);border-radius:12px;padding:20px;margin-bottom:15px;display:flex;gap:15px;align-items:center;">
          <img src="${p.imageUrl || 'https://via.placeholder.com/80'}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;">
          <div style="flex:1;">
            <h4 style="margin:0 0 5px;color:white;">${p.title}</h4>
            <p style="margin:0;color:var(--orange);font-weight:700;">$${Number(p.price).toLocaleString('es-AR')}</p>
            <p style="margin:5px 0 0;font-size:13px;color:var(--muted);">${p.category} • ${p.inStock ? '<span style="color:#4CAF50">En stock</span>' : '<span style="color:#ff4444">Sin stock</span>'}</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="editProduct('${doc.id}')" style="background:#2196F3;color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;">✏️</button>
            <button onclick="deleteProduct('${doc.id}')" style="background:#ff4444;color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
    
    console.log('✅ Productos cargados:', snap.size);
    
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
  }
}

window.editProduct = async function(id) {
  const doc = await db.collection('products').doc(id).get();
  if (!doc.exists) return;
  
  const p = doc.data();
  document.getElementById('prodId').value = id;
  document.getElementById('prodName').value = p.title || '';
  document.getElementById('prodPrice').value = p.price || '';
  document.getElementById('prodCategory').value = p.category || '';
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
  if (!confirm('¿Eliminar este producto?')) return;
  
  try {
    await db.collection('products').doc(id).delete();
    alert('✅ Producto eliminado');
    loadAdminProducts();
  } catch (error) {
    alert('❌ Error: ' + error.message);
  }
};

function resetProductForm() {
  document.getElementById('publishForm').reset();
  document.getElementById('prodId').value = '';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('uploadPlaceholder').style.display = 'block';
  document.getElementById('uploadProgress').classList.remove('show');
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('uploadStatus').textContent = '';
  currentImageURL = '';
  document.getElementById('productForm').style.display = 'none';
}

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
  } catch (error) {
    console.error('Error cargando contacto:', error);
  }
}

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
      await db.collection('site_config').doc('contact').set({
        address: document.getElementById('contactAddress').value,
        phone: document.getElementById('contactPhone').value,
        hours: document.getElementById('contactHours').value,
        email: document.getElementById('contactEmail').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      alert('✅ Información de contacto guardada');
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  });
}

// ========================================
// FOOTER
// ========================================

window.saveFooterSettings = async function() {
  try {
    const servicesText = document.getElementById('footerServicesList')?.value || '';
    const storeText = document.getElementById('footerStoreList')?.value || '';
    
    const data = {
      description: document.getElementById('footerDesc')?.value || '',
      social: {
        facebook: document.getElementById('socialFacebook')?.value || '',
        instagram: document.getElementById('socialInstagram')?.value || '',
        tiktok: document.getElementById('socialTiktok')?.value || '',
        telegram: document.getElementById('socialTelegram')?.value || ''
      },
      services: servicesText.split(',').map(s => s.trim()).filter(s => s),
      store: storeText.split(',').map(s => s.trim()).filter(s => s),
      contact: {
        address: document.getElementById('contactAddress')?.value || '',
        hours: document.getElementById('contactHours')?.value || '',
        phone: document.getElementById('contactPhone')?.value || '',
        email: document.getElementById('contactEmail')?.value || ''
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('site_config').doc('footer').set(data, { merge: true });
    alert('✅ Footer guardado correctamente');
    
  } catch (e) {
    alert('❌ Error: ' + e.message);
  }
};

async function loadFooterSettings() {
  try {
    const doc = await db.collection('site_config').doc('footer').get();
    
    if (doc.exists) {
      const data = doc.data();
      
      const footerDescEl = document.getElementById('footerDesc');
      if (footerDescEl) footerDescEl.value = data.description || '';
      
      if (data.social) {
        const fbEl = document.getElementById('socialFacebook');
        const igEl = document.getElementById('socialInstagram');
        const ttEl = document.getElementById('socialTiktok');
        const tgEl = document.getElementById('socialTelegram');
        
        if (fbEl) fbEl.value = data.social.facebook || '';
        if (igEl) igEl.value = data.social.instagram || '';
        if (ttEl) ttEl.value = data.social.tiktok || '';
        if (tgEl) tgEl.value = data.social.telegram || '';
      }
      
      const servicesEl = document.getElementById('footerServicesList');
      const storeEl = document.getElementById('footerStoreList');
      
      if (servicesEl && data.services) servicesEl.value = data.services.join(', ');
      if (storeEl && data.store) storeEl.value = data.store.join(', ');
      
      if (data.contact) {
        const addrEl = document.getElementById('contactAddress');
        const hoursEl = document.getElementById('contactHours');
        const phoneEl = document.getElementById('contactPhone');
        const emailEl = document.getElementById('contactEmail');
        
        if (addrEl) addrEl.value = data.contact.address || '';
        if (hoursEl) hoursEl.value = data.contact.hours || '';
        if (phoneEl) phoneEl.value = data.contact.phone || '';
        if (emailEl) emailEl.value = data.contact.email || '';
      }
    }
  } catch (e) {
    console.error('Error cargando footer settings:', e);
  }
}

// ========================================
// USUARIOS
// ========================================

async function loadUsers() {
  const tb = document.getElementById('usersTable');
  if (!tb) return;
  
  tb.innerHTML = '<tr><td colspan="4" class="loading">Cargando...</td></tr>';
  
  try {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
    
    if (snap.empty) {
      tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted)">Sin usuarios</td></tr>';
      return;
    }
    
    tb.innerHTML = snap.docs.map(doc => {
      const u = doc.data();
      const date = u.createdAt?.toDate()?.toLocaleDateString('es-AR') || 'Reciente';
      return `
        <tr>
          <td>${u.name || '-'}</td>
          <td>${u.email}</td>
          <td>${date}</td>
          <td><span style="color:#4CAF50">Activo</span></td>
        </tr>
      `;
    }).join('');
    
  } catch (e) {
    console.error('Error cargando usuarios:', e);
    tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#ff4444">Error</td></tr>';
  }
}

// ========================================
// IMEI HISTORY
// ========================================

window.loadIMEIHistoryAdmin = async function() {
  const tb = document.getElementById('imeiHistoryTable');
  if (!tb) return;
  
  tb.innerHTML = '<tr><td colspan="8" class="loading">Cargando...</td></tr>';
  
  try {
    const snap = await db.collection('imei_history').orderBy('timestamp', 'desc').limit(100).get();
    
    if (snap.empty) {
      tb.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted)">Sin consultas registradas</td></tr>';
      updateIMEIStats([]);
      return;
    }
    
    const checks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    tb.innerHTML = checks.map(h => {
      const date = h.timestamp?.toDate?.()?.toLocaleString('es-AR') || 'Reciente';
      const brand = h.result?.brand || '-';
      const model = h.result?.model || '-';
      const status = h.result?.blacklist || 'Unknown';
      const statusColor = status === 'Clean' ? '#4CAF50' : status === 'Blacklisted' ? '#ff4444' : '#ffc107';
      const userEmail = h.userEmail ? h.userEmail.split('@')[0] : 'Invitado';
      
      return `
        <tr>
          <td>${date}</td>
          <td><strong>${h.imei}</strong></td>
          <td>${h.searchType?.toUpperCase() || 'IMEI'}</td>
          <td>${brand}</td>
          <td>${model}</td>
          <td><span style="color:${statusColor};font-weight:600">${status}</span></td>
          <td>${userEmail}</td>
          <td>
            <button class="btn-sm" onclick="viewIMEIDetails('${h.id}')" style="background:#2196F3;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">👁️ Ver</button>
          </td>
        </tr>
      `;
    }).join('');
    
    updateIMEIStats(checks);
    
  } catch (e) {
    console.error('Error cargando IMEI history:', e);
    tb.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#ff4444">Error al cargar: ' + e.message + '</td></tr>';
  }
};

function updateIMEIStats(checks) {
  const total = checks.length;
  const clean = checks.filter(h => h.result?.blacklist === 'Clean').length;
  const blacklist = checks.filter(h => h.result?.blacklist === 'Blacklisted').length;
  
  const totalEl = document.getElementById('totalChecks');
  const cleanEl = document.getElementById('cleanChecks');
  const blacklistEl = document.getElementById('blacklistChecks');
  const totalIMEIChecksEl = document.getElementById('totalIMEIChecks');
  
  if (totalEl) totalEl.textContent = total;
  if (cleanEl) cleanEl.textContent = clean;
  if (blacklistEl) blacklistEl.textContent = blacklist;
  if (totalIMEIChecksEl) totalIMEIChecksEl.textContent = total;
}

window.viewIMEIDetails = async function(id) {
  try {
    const doc = await db.collection('imei_history').doc(id).get();
    if (!doc.exists) {
      alert('Consulta no encontrada');
      return;
    }
    
    const h = doc.data();
    const result = h.result || {};
    
    const details = `
DETALLES DE CONSULTA IMEI
━━━━━━━━━━━━━━━━━━━━━━
📱 IMEI/Serial: ${h.imei}
🔢 Tipo: ${h.searchType?.toUpperCase() || 'IMEI'}
📅 Fecha: ${h.timestamp?.toDate?.()?.toLocaleString('es-AR') || 'N/A'}
👤 Usuario: ${h.userEmail || 'Invitado'}

📋 INFORMACIÓN DEL DISPOSITIVO
━━━━━━━━━━━━━━━━━━━━━━
🏷️ Marca: ${result.brand || 'N/A'}
📱 Modelo: ${result.model || 'N/A'}
🎨 Color: ${result.color || 'N/A'}
💾 Capacidad: ${result.capacity || 'N/A'}
🔢 Model Number: ${result.modelNumber || 'N/A'}
🔢 MPN: ${result.mpn || 'N/A'}
🔢 Serial: ${result.serial || 'N/A'}

🔒 ESTADO Y BLOQUEO
━━━━━━━━━━━━━━━━━━━━━━
🛡️ Blacklist: ${result.blacklist || 'Unknown'}
🔓 SIM Lock: ${result.simLock || 'N/A'}
📡 Carrier: ${result.carrier || 'N/A'}
Find My iPhone: ${result.fmi || 'N/A'}
⚙️ KG Status: ${result.kgStatus || 'N/A'}
🔐 Knox: ${result.knox || 'N/A'}

📅 GARANTÍA Y ACTIVACIÓN
━━━━━━━━━━━━━━━━━━━━━━
✅ Activation: ${result.activationStatus || 'N/A'}
🛡️ Warranty: ${result.warrantyStatus || 'N/A'}
📅 Warranty Date: ${result.warrantyDate || 'N/A'}
📅 Purchase Date: ${result.purchaseDate || 'N/A'}
🏪 Sold By: ${result.soldBy || 'N/A'}
🔄 Replacement: ${result.replacement || 'N/A'}
    `;
    
    alert(details);
    
  } catch (e) {
    alert('Error al cargar detalles: ' + e.message);
  }
};

// ========================================
// UTILIDADES
// ========================================

window.logout = function() {
  if (confirm('¿Cerrar sesión?')) {
    firebase.auth().signOut().then(() => {
      window.location.href = 'login.html';
    });
  }
};

window.toggleSidebar = function() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
};

console.log('✅ admin.js cargado correctamente');
