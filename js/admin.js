let currentImageURL = '';

// MOSTRAR SECCIÓN
function showSection(id, btn){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(btn) btn.classList.add('active');
  if(id==='dashboard') loadDashboard();
  if(id==='hero') loadSlides();
  if(id==='servicios') loadServices();
  if(id==='productos') loadAdminProducts();
  if(id==='contacto') loadContactInfo();
  if(id==='usuarios') loadUsers();
}

function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
}

// DASHBOARD
async function loadDashboard(){
  try{
    const products = await db.collection('products').get();
    const users = await db.collection('users').get();
    const services = await db.collection('services').get();
    document.getElementById('totalProducts').textContent = products.size;
    document.getElementById('totalUsers').textContent = users.size;
    document.getElementById('totalServices').textContent = services.size;
    const inStock = products.docs.filter(d=>d.data().inStock).length;
    document.getElementById('inStockProducts').textContent = inStock;
    const recent = users.docs.slice(-5).reverse().map(d=>{
      const u = d.data();
      const date = u.createdAt?u.createdAt.toDate().toLocaleString('es-AR'):'Reciente';
      return `<div style="padding:12px;border-bottom:1px solid rgba(255,106,0,0.1);"><strong>${u.name||u.email}</strong><br><small style="color:var(--muted)">Registrado: ${date}</small></div>`;
    }).join('');
    document.getElementById('recentActivity').innerHTML = recent || '<p style="color:var(--muted)">Sin actividad reciente</p>';
  }catch(e){console.error(e);}
}

// CARRUSEL
async function loadSlides(){
  const container = document.getElementById('slidesContainer');
  container.innerHTML = '<p class="loading">Cargando slides...</p>';
  try{
    const snap = await db.collection('hero_slides').orderBy('order','asc').get();
    if(snap.empty){container.innerHTML = '<p style="color:var(--muted);text-align:center;">No hay slides. Agregá el primero.</p>';return;}
    container.innerHTML = snap.docs.map((doc, index)=>{
      const s = doc.data();
      return `<div class="slide-admin-card"><div style="display:flex;gap:20px;align-items:flex-start;">
        <img src="${s.imageUrl||'https://via.placeholder.com/150x100'}" style="width:150px;height:100px;object-fit:cover;border-radius:8px;">
        <div style="flex:1;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h4 style="margin:0;color:var(--orange);">Slide ${index+1}</h4>
          <div style="display:flex;gap:10px;">
            <button onclick="editSlide('${doc.id}')" class="btn-sm" style="background:#2196F3;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">✏️</button>
            <button onclick="deleteSlide('${doc.id}')" class="btn-sm" style="background:#ff4444;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">🗑️</button>
          </div></div>
          <p style="margin:5px 0;"><strong>Título:</strong> ${s.title}</p>
          <p style="margin:5px 0;"><strong>Subtítulo:</strong> ${s.subtitle}</p>
        </div></div></div>`;
    }).join('');
  }catch(e){container.innerHTML = '<p style="color:#ff4444">Error</p>';}
}
window.addSlide = function(){
  const title = prompt('Título:'); if(!title) return;
  const subtitle = prompt('Subtítulo:')||'';
  const imageUrl = prompt('URL imagen (opcional):')||'';
  db.collection('hero_slides').add({title,subtitle,imageUrl,active:true,order:firebase.firestore.FieldValue.increment(1)}).then(()=>{alert('✅ Slide agregado');loadSlides();});
};
window.editSlide = async(id)=>{
  const doc=await db.collection('hero_slides').doc(id).get(); if(!doc.exists)return;
  const s=doc.data();
  const title=prompt('Título:',s.title); if(!title)return;
  const subtitle=prompt('Subtítulo:',s.subtitle)||'';
  const imageUrl=prompt('URL imagen:',s.imageUrl)||'';
  await db.collection('hero_slides').doc(id).update({title,subtitle,imageUrl});
  alert('✅ Actualizado');loadSlides();
};
window.deleteSlide = async(id)=>{if(confirm('¿Eliminar?')){await db.collection('hero_slides').doc(id).delete();loadSlides();}};

// SERVICIOS
window.toggleServiceForm = ()=> document.getElementById('serviceForm').style.display = 'block';
async function loadServices(){
  const list=document.getElementById('adminServicesList'); list.innerHTML='<p class="loading">Cargando...</p>';
  try{
    const snap=await db.collection('services').get();
    if(snap.empty){list.innerHTML='<p style="color:var(--muted);text-align:center;">Sin servicios</p>';return;}
    list.innerHTML=snap.docs.map(d=>{const s=d.data();return `<div class="service-admin-card"><div style="font-size:2.5rem">${s.icon}</div><div style="flex:1"><h4 style="margin:0 0 5px;color:var(--orange)">${s.title}</h4><p style="margin:0;color:var(--muted);font-size:14px">${s.description}</p></div><div style="display:flex;gap:8px"><button onclick="editService('${d.id}')" class="btn-sm" style="background:#2196F3;color:white;border:none;padding:8px;border-radius:6px">✏️</button><button onclick="deleteService('${d.id}')" class="btn-sm" style="background:#ff4444;color:white;border:none;padding:8px;border-radius:6px">🗑️</button></div></div>`}).join('');
  }catch(e){list.innerHTML='<p style="color:#ff4444">Error</p>';}
}
document.getElementById('serviceFormEl')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const data={icon:document.getElementById('serviceIcon').value,title:document.getElementById('serviceTitle').value,description:document.getElementById('serviceDesc').value};
  const id=document.getElementById('serviceId').value;
  try{id?await db.collection('services').doc(id).update(data):await db.collection('services').add(data);alert('✅ Guardado');resetServiceForm();loadServices();}catch(err){alert('❌ '+err.message);}
});
window.editService=async(id)=>{const doc=await db.collection('services').doc(id).get();if(!doc.exists)return;const s=doc.data();document.getElementById('serviceId').value=id;document.getElementById('serviceIcon').value=s.icon;document.getElementById('serviceTitle').value=s.title;document.getElementById('serviceDesc').value=s.description;document.getElementById('serviceForm').style.display='block';};
window.deleteService=async(id)=>{if(confirm('¿Eliminar?')){await db.collection('services').doc(id).delete();loadServices();}};
function resetServiceForm(){document.getElementById('serviceFormEl').reset();document.getElementById('serviceId').value='';document.getElementById('serviceForm').style.display='none';}

// PRODUCTOS
window.toggleProductForm = ()=> document.getElementById('productForm').style.display='block';
async function uploadImage(file){
  if(!file||!file.type.startsWith('image/'))return showUploadStatus('❌ Solo imágenes','error');
  if(file.size>5*1024*1024)return showUploadStatus('❌ Máx 5MB','error');
  const ref=storage.ref(`products/${Date.now()}_${file.name}`);const task=ref.put(file);
  document.getElementById('uploadProgress').classList.add('show');showUploadStatus('📤 Subiendo...','info');
  task.on('state_changed',snap=>{document.getElementById('progressFill').style.width=(snap.bytesTransferred/snap.totalBytes)*100+'%';},
  err=>showUploadStatus('❌ '+err.message,'error'),async()=>{currentImageURL=await task.snapshot.ref.getDownloadURL();showUploadStatus('✅ Lista','success');document.getElementById('imagePreview').src=currentImageURL;document.getElementById('imagePreview').style.display='block';document.getElementById('uploadPlaceholder').style.display='none';});
}
function showUploadStatus(msg,type){const el=document.getElementById('uploadStatus');el.textContent=msg;el.style.color=type==='error'?'#ff4444':type==='success'?'#4CAF50':'#888';}
document.getElementById('prodImage')?.addEventListener('change',e=>uploadImage(e.target.files[0]));
const dropZone=document.getElementById('uploadArea');
dropZone?.addEventListener('dragover',e=>{e.preventDefault();dropZone.style.borderColor='var(--orange)';});
dropZone?.addEventListener('dragleave',()=>dropZone.style.borderColor='rgba(255,106,0,0.2)');
dropZone?.addEventListener('drop',e=>{e.preventDefault();dropZone.style.borderColor='rgba(255,106,0,0.2)';if(e.dataTransfer.files[0])uploadImage(e.dataTransfer.files[0]);});
document.getElementById('publishForm')?.addEventListener('submit',async e=>{
  e.preventDefault();const btn=document.getElementById('saveBtn');btn.disabled=true;btn.textContent='Guardando...';
  const data={title:document.getElementById('prodName').value,price:Number(document.getElementById('prodPrice').value),category:document.getElementById('prodCategory').value,description:document.getElementById('prodDesc').value,imageUrl:currentImageURL,inStock:document.getElementById('prodStock').checked,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
  const id=document.getElementById('prodId').value;
  try{id?await db.collection('products').doc(id).update(data):(data.createdAt=firebase.firestore.FieldValue.serverTimestamp(),await db.collection('products').add(data));alert('✅ Guardado');resetProductForm();loadAdminProducts();}catch(err){alert('❌ '+err.message);}finally{btn.disabled=false;btn.textContent='💾 Guardar';}
});
function resetProductForm(){document.getElementById('publishForm').reset();document.getElementById('prodId').value='';document.getElementById('imagePreview').style.display='none';document.getElementById('uploadPlaceholder').style.display='block';document.getElementById('uploadProgress').classList.remove('show');document.getElementById('progressFill').style.width='0%';document.getElementById('uploadStatus').textContent='';currentImageURL='';}
async function loadAdminProducts(){
  const list=document.getElementById('adminProductsList');list.innerHTML='<p class="loading">Cargando...</p>';
  try{const snap=await db.collection('products').orderBy('createdAt','desc').get();if(snap.empty){list.innerHTML='<p style="text-align:center;color:var(--muted)">Sin productos</p>';return;}
  list.innerHTML=snap.docs.map(d=>{const p=d.data();return `<div class="product-admin-card"><img src="${p.imageUrl||'https://via.placeholder.com/80'}" class="product-admin-img"><div style="flex:1"><h4 style="margin:0 0 5px">${p.title}</h4><p style="margin:0;color:var(--orange);font-weight:700">$${Number(p.price).toLocaleString('es-AR')}</p><p style="margin:5px 0 0;font-size:13px;color:var(--muted)">${p.category} • ${p.inStock?'<span style="color:#4CAF50">Stock</span>':'<span style="color:#ff4444">Sin stock</span>'}</p></div><div style="display:flex;gap:8px"><button onclick="editProduct('${d.id}')" class="btn-sm" style="background:#2196F3;color:white;border:none;padding:8px;border-radius:6px">✏️</button><button onclick="deleteProduct('${d.id}')" class="btn-sm" style="background:#ff4444;color:white;border:none;padding:8px;border-radius:6px">🗑️</button></div></div>`}).join('');
  }catch(e){list.innerHTML='<p style="color:#ff4444">Error</p>';}
}
window.editProduct=async(id)=>{const doc=await db.collection('products').doc(id).get();if(!doc.exists)return;const p=doc.data();document.getElementById('prodId').value=id;document.getElementById('prodName').value=p.title;document.getElementById('prodPrice').value=p.price;document.getElementById('prodCategory').value=p.category;document.getElementById('prodDesc').value=p.description||'';document.getElementById('prodStock').checked=p.inStock;if(p.imageUrl){currentImageURL=p.imageUrl;document.getElementById('imagePreview').src=p.imageUrl;document.getElementById('imagePreview').style.display='block';document.getElementById('uploadPlaceholder').style.display='none';}document.getElementById('productForm').style.display='block';window.scrollTo({top:0,behavior:'smooth'});};
window.deleteProduct=async(id)=>{if(confirm('¿Eliminar?')){await db.collection('products').doc(id).delete();loadAdminProducts();}};

// CONTACTO
async function loadContactInfo(){try{const doc=await db.collection('site_config').doc('contact').get();if(doc.exists){const c=doc.data();document.getElementById('contactAddress').value=c.address||'';document.getElementById('contactPhone').value=c.phone||'';document.getElementById('contactHours').value=c.hours||'';document.getElementById('contactEmail').value=c.email||'';}}catch(e){}}
document.getElementById('contactForm')?.addEventListener('submit',async e=>{e.preventDefault();try{await db.collection('site_config').doc('contact').set({address:document.getElementById('contactAddress').value,phone:document.getElementById('contactPhone').value,hours:document.getElementById('contactHours').value,email:document.getElementById('contactEmail').value,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});alert('✅ Guardado');}catch(err){alert('❌ '+err.message);}});

// USUARIOS
async function loadUsers(){const tb=document.getElementById('usersTable');tb.innerHTML='<tr><td colspan="4" class="loading">Cargando...</td></tr>';try{const snap=await db.collection('users').orderBy('createdAt','desc').get();if(snap.empty){tb.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted)">Sin usuarios</td></tr>';return;}tb.innerHTML=snap.docs.map(d=>{const u=d.data();const date=u.createdAt?u.createdAt.toDate().toLocaleDateString('es-AR'):'Reciente';return `<tr><td>${u.name||'-'}</td><td>${u.email}</td><td>${date}</td><td><span style="color:#4CAF50">Activo</span></td></tr>`}).join('');}catch(e){tb.innerHTML='<tr><td colspan="4" style="text-align:center;color:#ff4444">Error</td></tr>';}}

document.addEventListener('DOMContentLoaded', loadDashboard);
// CARGAR SETTINGS DEL FOOTER CUANDO SE ENTRA A ESA SECCIÓN
async function loadFooterSettings() {
  try {
    const doc = await db.collection('site_config').doc('footer').get();
    
    if (doc.exists) {
      const data = doc.data();
      
      // Cargar descripción
      const footerDescEl = document.getElementById('footerDesc');
      if (footerDescEl) footerDescEl.value = data.description || '';
      
      // Cargar redes sociales
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
      
      // Cargar servicios y tienda
      const servicesEl = document.getElementById('footerServicesList');
      const storeEl = document.getElementById('footerStoreList');
      
      if (servicesEl && data.services) {
        servicesEl.value = data.services.join(', ');
      }
      if (storeEl && data.store) {
        storeEl.value = data.store.join(', ');
      }
      
      // Cargar contacto
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

// MODIFICAR showSection PARA CARGAR FOOTER SETTINGS
const originalShowSection = window.showSection;
window.showSection = function(id, btn) {
  // Llamar a la función original si existe
  if (originalShowSection) {
    originalShowSection(id, btn);
  } else {
    // Si no existe, hacer el cambio básico
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (btn) btn.classList.add('active');
  }
  
  // Cargar footer settings si es la sección de footer
  if (id === 'footer') {
    setTimeout(loadFooterSettings, 100);
  }
};
// ========== IMEI HISTORY FUNCTIONS ==========

// Cargar historial IMEI en admin
async function loadIMEIHistoryAdmin() {
  const tb = document.getElementById('imeiHistoryTable');
  if (!tb) return;
  
  tb.innerHTML = '<tr><td colspan="8" class="loading">Cargando...</td></tr>';
  
  try {
    const snap = await db.collection('imei_history')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    
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
}

// Actualizar estadísticas de IMEI
function updateIMEIStats(checks) {
  const total = checks.length;
  const clean = checks.filter(h => h.result?.blacklist === 'Clean').length;
  const blacklist = checks.filter(h => h.result?.blacklist === 'Blacklisted').length;
  
  const totalEl = document.getElementById('totalChecks');
  const cleanEl = document.getElementById('cleanChecks');
  const blacklistEl = document.getElementById('blacklistChecks');
  const totalChecksEl = document.getElementById('totalIMEIChecks');
  
  if (totalEl) totalEl.textContent = total;
  if (cleanEl) cleanEl.textContent = clean;
  if (blacklistEl) blacklistEl.textContent = blacklist;
  if (totalChecksEl) totalChecksEl.textContent = total;
}

// Ver detalles de una consulta IMEI
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

📍 ORIGEN
━━━━━━━━━━━━━━━━━━━━━━
🌍 CSC: ${result.csc || 'N/A'}
    `;
    
    alert(details);
    
  } catch (e) {
    alert('Error al cargar detalles: ' + e.message);
  }
};

// Modificar showSection para cargar IMEI history
const originalShowSection = window.showSection;
window.showSection = function(id, btn) {
  // Llamar a la función original si existe
  if (originalShowSection) {
    originalShowSection(id, btn);
  } else {
    // Si no existe, hacer el cambio básico
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (btn) btn.classList.add('active');
  }
  
  // Cargar secciones específicas
  if (id === 'footer') {
    setTimeout(loadFooterSettings, 100);
  } else if (id === 'imei') {
    setTimeout(loadIMEIHistoryAdmin, 100);
  } else if (id === 'dashboard') {
    setTimeout(loadDashboard, 100);
  } else if (id === 'productos') {
    setTimeout(loadAdminProducts, 100);
  } else if (id === 'servicios') {
    setTimeout(loadServices, 100);
  } else if (id === 'usuarios') {
    setTimeout(loadUsers, 100);
  }
};

// Actualizar loadDashboard para incluir stats de IMEI
const originalLoadDashboard = window.loadDashboard;
window.loadDashboard = async function() {
  // Llamar a la función original si existe
  if (originalLoadDashboard) {
    await originalLoadDashboard();
  }
  
  // Agregar stats de IMEI
  try {
    const imeiSnap = await db.collection('imei_history').get();
    const totalIMEIChecksEl = document.getElementById('totalIMEIChecks');
    if (totalIMEIChecksEl) {
      totalIMEIChecksEl.textContent = imeiSnap.size;
    }
  } catch (e) {
    console.error('Error cargando stats IMEI:', e);
  }
};
