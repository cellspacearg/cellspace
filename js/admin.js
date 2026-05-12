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

// SIDEBAR MOBILE
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

// ========== CARRUSEL/HERO ==========
async function loadSlides(){
  const container = document.getElementById('slidesContainer');
  container.innerHTML = '<p class="loading">Cargando slides...</p>';
  
  try{
    const snap = await db.collection('hero_slides').orderBy('order','asc').get();
    if(snap.empty){
      container.innerHTML = '<p style="color:var(--muted);text-align:center;">No hay slides. Agregá el primero.</p>';
      return;
    }
    
    container.innerHTML = snap.docs.map((doc, index)=>{
      const s = doc.data();
      return `
        <div class="slide-admin-card" style="background:rgba(21,21,21,0.9);border:1px solid rgba(255,106,0,0.15);border-radius:12px;padding:20px;margin-bottom:20px;">
          <div style="display:flex;gap:20px;align-items:flex-start;">
            <img src="${s.imageUrl||'https://via.placeholder.com/150x100'}" style="width:150px;height:100px;object-fit:cover;border-radius:8px;">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h4 style="margin:0;color:var(--orange);">Slide ${index+1}</h4>
                <div style="display:flex;gap:10px;">
                  <button onclick="editSlide('${doc.id}')" class="btn-sm" style="background:#2196F3;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">✏️ Editar</button>
                  <button onclick="deleteSlide('${doc.id}')" class="btn-sm" style="background:#ff4444;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">🗑️</button>
                </div>
              </div>
              <p style="margin:5px 0;"><strong>Título:</strong> ${s.title}</p>
              <p style="margin:5px 0;"><strong>Subtítulo:</strong> ${s.subtitle}</p>
              <p style="margin:5px 0;"><strong>Botón:</strong> ${s.buttonText}</p>
            </div>
          </div>
        </div>`;
    }).join('');
  }catch(e){
    console.error(e);
    container.innerHTML = '<p style="color:#ff4444">Error al cargar</p>';
  }
}

window.addSlide = function(){
  const title = prompt('Título del slide:');
  if(!title) return;
  const subtitle = prompt('Subtítulo:') || '';
  const buttonText = prompt('Texto del botón:') || 'Contactar';
  const imageUrl = prompt('URL de la imagen (dejá vacío para usar imagen por defecto):') || '';
  
  db.collection('hero_slides').add({
    title, subtitle, buttonText, imageUrl,
    order: firebase.firestore.FieldValue.increment(1),
    active: true
  }).then(()=>{
    alert('✅ Slide agregado');
    loadSlides();
  });
};

window.editSlide = async (id)=>{
  const doc = await db.collection('hero_slides').doc(id).get();
  if(!doc.exists) return;
  const s = doc.data();
  
  const title = prompt('Título:', s.title);
  if(!title) return;
  const subtitle = prompt('Subtítulo:', s.subtitle) || '';
  const buttonText = prompt('Texto del botón:', s.buttonText) || '';
  const imageUrl = prompt('URL de la imagen:', s.imageUrl) || '';
  
  await db.collection('hero_slides').doc(id).update({title, subtitle, buttonText, imageUrl});
  alert('✅ Slide actualizado');
  loadSlides();
};

window.deleteSlide = async (id)=>{
  if(confirm('¿Eliminar este slide?')){
    await db.collection('hero_slides').doc(id).delete();
    loadSlides();
  }
};

// ========== SERVICIOS ==========
window.toggleServiceForm = function(){
  const form = document.getElementById('serviceForm');
  form.style.display = form.style.display==='none'?'block':'none';
};

async function loadServices(){
  const list = document.getElementById('adminServicesList');
  list.innerHTML = '<p class="loading">Cargando servicios...</p>';
  
  try{
    const snap = await db.collection('services').get();
    if(snap.empty){
      list.innerHTML = '<p style="color:var(--muted);text-align:center;">No hay servicios creados</p>';
      return;
    }
    
    list.innerHTML = snap.docs.map(d=>{
      const s = d.data();
      return `
        <div class="service-admin-card" style="background:rgba(21,21,21,0.9);border:1px solid rgba(255,106,0,0.1);border-radius:12px;padding:20px;margin-bottom:15px;display:flex;gap:15px;align-items:center;">
          <div style="font-size:2.5rem;">${s.icon}</div>
          <div style="flex:1;">
            <h4 style="margin:0 0 5px;color:var(--orange);">${s.title}</h4>
            <p style="margin:0;color:var(--muted);font-size:14px;">${s.description}</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="editService('${d.id}')" class="btn-sm" style="background:#2196F3;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">✏️</button>
            <button onclick="deleteService('${d.id}')" class="btn-sm" style="background:#ff4444;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">🗑️</button>
          </div>
        </div>`;
    }).join('');
  }catch(e){
    console.error(e);
    list.innerHTML = '<p style="color:#ff4444">Error</p>';
  }
}

document.getElementById('serviceFormEl')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const data = {
    icon: document.getElementById('serviceIcon').value,
    title: document.getElementById('serviceTitle').value,
    description: document.getElementById('serviceDesc').value
  };
  
  const id = document.getElementById('serviceId').value;
  try{
    if(id){
      await db.collection('services').doc(id).update(data);
      alert('✅ Servicio actualizado');
    } else {
      await db.collection('services').add(data);
      alert('✅ Servicio guardado');
    }
    resetServiceForm();
    loadServices();
  }catch(err){alert('❌ '+err.message);}
});

window.editService = async (id)=>{
  const doc = await db.collection('services').doc(id).get();
  if(!doc.exists) return;
  const s = doc.data();
  
  document.getElementById('serviceId').value = id;
  document.getElementById('serviceIcon').value = s.icon;
  document.getElementById('serviceTitle').value = s.title;
  document.getElementById('serviceDesc').value = s.description;
  
  document.getElementById('serviceForm').style.display = 'block';
};

window.deleteService = async (id)=>{
  if(confirm('¿Eliminar este servicio?')){
    await db.collection('services').doc(id).delete();
    loadServices();
  }
};

function resetServiceForm(){
  document.getElementById('serviceFormEl').reset();
  document.getElementById('serviceId').value = '';
  document.getElementById('serviceForm').style.display = 'none';
}

// ========== PRODUCTOS ==========
window.toggleProductForm = function(){
  const form = document.getElementById('productForm');
  form.style.display = form.style.display==='none'?'block':'none';
};

async function uploadImage(file){
  if(!file) return;
  if(!file.type.startsWith('image/')) return showUploadStatus('❌ Solo imágenes','error');
  if(file.size > 5*1024*1024) return showUploadStatus('❌ Máximo 5MB','error');
  
  const ref = storage.ref(`products/${Date.now()}_${file.name}`);
  const task = ref.put(file);
  
  document.getElementById('uploadProgress').classList.add('show');
  showUploadStatus('📤 Subiendo...','info');
  
  task.on('state_changed', snap=>{
    const pct = (snap.bytesTransferred/snap.totalBytes)*100;
    document.getElementById('progressFill').style.width = pct+'%';
  }, err=>showUploadStatus('❌ '+err.message,'error'), async ()=>{
    currentImageURL = await task.snapshot.ref.getDownloadURL();
    showUploadStatus('✅ Imagen lista','success');
    document.getElementById('imagePreview').src = currentImageURL;
    document.getElementById('imagePreview').style.display = 'block';
    document.getElementById('uploadPlaceholder').style.display = 'none';
  });
}

function showUploadStatus(msg, type){
  const el = document.getElementById('uploadStatus');
  el.textContent = msg;
  el.style.color = type==='error'?'#ff4444':type==='success'?'#4CAF50':'#888';
}

document.getElementById('prodImage')?.addEventListener('change', e=>uploadImage(e.target.files[0]));

const dropZone = document.getElementById('uploadArea');
dropZone?.addEventListener('dragover', e=>{e.preventDefault();dropZone.style.borderColor='var(--orange)';});
dropZone?.addEventListener('dragleave', ()=>dropZone.style.borderColor='rgba(255,106,0,0.2)');
dropZone?.addEventListener('drop', e=>{
  e.preventDefault();dropZone.style.borderColor='rgba(255,106,0,0.2)';
  if(e.dataTransfer.files[0]) uploadImage(e.dataTransfer.files[0]);
});

document.getElementById('publishForm')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  
  const data = {
    title: document.getElementById('prodName').value,
    price: Number(document.getElementById('prodPrice').value),
    category: document.getElementById('prodCategory').value,
    description: document.getElementById('prodDesc').value,
    imageUrl: currentImageURL,
    inStock: document.getElementById('prodStock').checked,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  const id = document.getElementById('prodId').value;
  try{
    if(id){
      await db.collection('products').doc(id).update(data);
      alert('✅ Producto actualizado');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').add(data);
      alert('✅ Producto guardado');
    }
    resetProductForm();
    loadAdminProducts();
  }catch(err){alert('❌ '+err.message);}
  finally{btn.disabled=false;btn.textContent='💾 Guardar';}
});

function resetProductForm(){
  document.getElementById('publishForm').reset();
  document.getElementById('prodId').value = '';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('uploadPlaceholder').style.display = 'block';
  document.getElementById('uploadProgress').classList.remove('show');
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('uploadStatus').textContent = '';
  currentImageURL = '';
}

async function loadAdminProducts(){
  const list = document.getElementById('adminProductsList');
  list.innerHTML = '<p class="loading">Cargando...</p>';
  try{
    const snap = await db.collection('products').orderBy('createdAt','desc').get();
    if(snap.empty){list.innerHTML = '<p style="text-align:center;color:var(--muted);">No hay productos</p>';return;}
    
    list.innerHTML = snap.docs.map(d=>{
      const p = d.data();
      return `
        <div class="product-admin-card" style="background:rgba(21,21,21,0.9);border:1px solid rgba(255,106,0,0.1);border-radius:12px;padding:20px;display:flex;gap:15px;align-items:center;margin-bottom:15px;">
          <img src="${p.imageUrl||'https://via.placeholder.com/80'}" class="product-admin-img" style="width:80px;height:80px;object-fit:cover;border-radius:8px;">
          <div style="flex:1;">
            <h4 style="margin:0 0 5px;color:white;">${p.title}</h4>
            <p style="margin:0;color:var(--orange);font-weight:700;">$${Number(p.price).toLocaleString('es-AR')}</p>
            <p style="margin:5px 0 0;font-size:13px;color:var(--muted);">${p.category} • ${p.inStock?'<span style="color:#4CAF50">En stock</span>':'<span style="color:#ff4444">Sin stock</span>'}</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="editProduct('${d.id}')" class="btn-sm" style="background:#2196F3;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">✏️</button>
            <button onclick="deleteProduct('${d.id}')" class="btn-sm" style="background:#ff4444;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">🗑️</button>
          </div>
        </div>`;
    }).join('');
  }catch(e){console.error(e);list.innerHTML='<p style="color:#ff4444">Error</p>';}
}

window.editProduct = async (id)=>{
  const doc = await db.collection('products').doc(id).get();
  if(!doc.exists) return;
  const p = doc.data();
  
  document.getElementById('prodId').value = id;
  document.getElementById('prodName').value = p.title;
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodDesc').value = p.description||'';
  document.getElementById('prodStock').checked = p.inStock;
  
  if(p.imageUrl){
    currentImageURL = p.imageUrl;
    document.getElementById('imagePreview').src = p.imageUrl;
    document.getElementById('imagePreview').style.display = 'block';
    document.getElementById('uploadPlaceholder').style.display = 'none';
  }
  
  document.getElementById('productForm').style.display = 'block';
  window.scrollTo({top:0,behavior:'smooth'});
};

window.deleteProduct = async (id)=>{
  if(confirm('¿Eliminar este producto?')){
    await db.collection('products').doc(id).delete();
    loadAdminProducts();
  }
};

// ========== CONTACTO/FOOTER ==========
async function loadContactInfo(){
  try{
    const doc = await db.collection('site_config').doc('contact').get();
    if(doc.exists){
      const c = doc.data();
      document.getElementById('contactAddress').value = c.address||'';
      document.getElementById('contactPhone').value = c.phone||'';
      document.getElementById('contactHours').value = c.hours||'';
      document.getElementById('contactEmail').value = c.email||'';
    }
  }catch(e){console.error(e);}
}

document.getElementById('contactForm')?.addEventListener('submit', async e=>{
  e.preventDefault();
  try{
    await db.collection('site_config').doc('contact').set({
      address: document.getElementById('contactAddress').value,
      phone: document.getElementById('contactPhone').value,
      hours: document.getElementById('contactHours').value,
      email: document.getElementById('contactEmail').value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true});
    alert('✅ Información de contacto actualizada');
  }catch(err){alert('❌ '+err.message);}
});

// ========== USUARIOS ==========
async function loadUsers(){
  const tb = document.getElementById('usersTable');
  tb.innerHTML = '<tr><td colspan="4" class="loading">Cargando...</td></tr>';
  try{
    const snap = await db.collection('users').orderBy('createdAt','desc').get();
    if(snap.empty){tb.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted)">No hay usuarios</td></tr>';return;}
    tb.innerHTML = snap.docs.map(d=>{
      const u = d.data();
      const date = u.createdAt?u.createdAt.toDate().toLocaleDateString('es-AR'):'Reciente';
      return `<tr><td>${u.name||'-'}</td><td>${u.email}</td><td>${date}</td><td><span style="color:#4CAF50">Activo</span></td></tr>`;
    }).join('');
  }catch(e){console.error(e);tb.innerHTML='<tr><td colspan="4" style="text-align:center;color:#ff4444">Error</td></tr>';}
}

// Cargar dashboard al inicio
document.addEventListener('DOMContentLoaded', loadDashboard);