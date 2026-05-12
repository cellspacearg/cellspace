let currentImageURL = '';

// MOSTRAR SECCIÓN
function showSection(id, btn){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(btn) btn.classList.add('active');
  if(id==='dashboard') loadDashboard();
  if(id==='productos') loadAdminProducts();
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
    document.getElementById('totalProducts').textContent = products.size;
    document.getElementById('totalUsers').textContent = users.size;
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

// PRODUCTOS ADMIN
function toggleProductForm(){
  const form = document.getElementById('productForm');
  form.style.display = form.style.display==='none'?'block':'none';
}

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

// UPLOAD DRAG & DROP
const dropZone = document.getElementById('uploadArea');
dropZone?.addEventListener('dragover', e=>{e.preventDefault();dropZone.style.borderColor='var(--orange)';});
dropZone?.addEventListener('dragleave', ()=>dropZone.style.borderColor='rgba(255,106,0,0.2)');
dropZone?.addEventListener('drop', e=>{
  e.preventDefault();dropZone.style.borderColor='rgba(255,106,0,0.2)';
  if(e.dataTransfer.files[0]) uploadImage(e.dataTransfer.files[0]);
});

// GUARDAR PRODUCTO
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
    if(snap.empty){list.innerHTML = '<p style="text-align:center;color:var(--muted);grid-column:1/-1;">No hay productos</p>';return;}
    
    list.innerHTML = snap.docs.map(d=>{
      const p = d.data();
      return `
        <div class="product-admin-card">
          <img src="${p.imageUrl||'https://via.placeholder.com/80'}" class="product-admin-img">
          <div class="product-admin-info">
            <h4>${p.title}</h4>
            <p style="color:var(--orange);font-weight:700;">$${Number(p.price).toLocaleString('es-AR')}</p>
            <p>${p.category} • ${p.inStock?'<span style="color:#4CAF50">En stock</span>':'<span style="color:#ff4444">Sin stock</span>'}</p>
          </div>
          <div class="product-admin-actions">
            <button onclick="editProduct('${d.id}')" title="Editar">✏️</button>
            <button onclick="deleteProduct('${d.id}')" title="Eliminar">🗑️</button>
          </div>
        </div>`;
    }).join('');
  }catch(e){console.error(e);list.innerHTML='<p style="color:#ff4444">Error al cargar</p>';}
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

// USUARIOS
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