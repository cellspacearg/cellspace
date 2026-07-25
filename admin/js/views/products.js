import { supabase } from '../config.js';
import { store } from '../core/state.js';

let allProducts = [];
let currentEditId = null;
let currentImages = [];
let currentStates = [];   // [{label,price,note,recommended}]
let currentStorages = []; // ['256GB','512GB']
let currentColors = [];   // [{name,hex,image}]
let currentSpecs = [];    // [{icon,label,value}]

const CATEGORIES = ['Celulares','Accesorios','Herramientas','Licencias','Hardware','Software','Repuestos','Otros'];
const SPEC_ICONS = [
  ['fa-mobile-screen','Pantalla'],['fa-microchip','Procesador'],['fa-memory','RAM'],
  ['fa-hard-drive','Memoria'],['fa-camera','Cámara'],['fa-battery-full','Batería'],
  ['fa-ruler-combined','Dimensiones'],['fa-weight-hanging','Peso'],['fa-signal','Señal'],
  ['fa-sim-card','SIM'],['fa-wifi','Conectividad'],['fa-fingerprint','Seguridad'],
  ['fa-droplet','Resistencia'],['fa-bolt','Carga'],['fa-cube','Sistema']
];

export async function productsView() {
  const state = store.getState();
  const userName = state.user?.email?.split('@')[0] || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();
  const catOptions = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  const specIconOpts = SPEC_ICONS.map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
  window.__SPEC_ICON_OPTS = specIconOpts;

  return `
  <div class="admin-layout">
    <aside class="admin-sidebar" id="adminSidebar">
      <div class="sidebar-header"><img src="../assets/logo.png" alt="Cell Space" class="sidebar-logo" onerror="this.style.display='none'"><div class="sidebar-brand"><span class="brand-name">CELL SPACE</span><span class="brand-sub">CMS Panel</span></div></div>
      <nav class="sidebar-nav">
        <div class="nav-section"><span class="nav-section-title">Principal</span><a href="#/dashboard" class="nav-item"><i class="fas fa-home"></i><span>Dashboard</span></a></div>
        <div class="nav-section"><span class="nav-section-title">Contenido</span>
          <a href="#/products" class="nav-item"><i class="fas fa-box"></i><span>Productos</span></a>
          <a href="#/services" class="nav-item"><i class="fas fa-tools"></i><span>Servicios</span></a>
          <a href="#/pages" class="nav-item"><i class="fas fa-file-alt"></i><span>Páginas</span></a>
          <a href="#/blog" class="nav-item"><i class="fas fa-newspaper"></i><span>Blog</span></a></div>
        <div class="nav-section"><span class="nav-section-title">Gestión</span>
          <a href="#/orders" class="nav-item"><i class="fas fa-shopping-cart"></i><span>Pedidos</span></a>
          <a href="#/customers" class="nav-item"><i class="fas fa-users"></i><span>Clientes</span></a>
          <a href="#/messages" class="nav-item"><i class="fas fa-envelope"></i><span>Mensajes</span></a></div>
        <div class="nav-section"><span class="nav-section-title">Sistema</span>
          <a href="#/media" class="nav-item"><i class="fas fa-images"></i><span>Archivos</span></a>
          <a href="#/settings" class="nav-item"><i class="fas fa-cog"></i><span>Configuración</span></a></div>
      </nav>
      <div class="sidebar-footer"><a href="../index.html" class="nav-item" target="_blank"><i class="fas fa-external-link-alt"></i><span>Ver sitio público</span></a></div>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div class="topbar-left"><button class="sidebar-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button><h1 class="page-title">Productos</h1></div>
        <div class="topbar-right"><div class="user-menu">
          <button class="user-btn" id="userMenuBtn"><div class="user-avatar">${userInitial}</div><div class="user-info"><span class="user-name">${userName}</span><span class="user-role">Administrador</span></div><i class="fas fa-chevron-down"></i></button>
          <div class="user-dropdown" id="userDropdown"><a href="#/dashboard" class="dropdown-item"><i class="fas fa-home"></i><span>Dashboard</span></a><div class="dropdown-divider"></div><a href="#" class="dropdown-item logout" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i><span>Cerrar sesión</span></a></div>
        </div></div>
      </header>

      <main class="admin-content"><div class="content-wrapper">
        <div class="products-toolbar">
          <div class="toolbar-filters">
            <div class="search-box"><i class="fas fa-search"></i><input type="text" id="productSearch" placeholder="Buscar por nombre, SKU o marca..."></div>
            <select id="filterCategory" class="filter-select"><option value="">Todas las categorías</option>${catOptions}</select>
            <select id="filterStatus" class="filter-select"><option value="">Todos los estados</option><option value="active">Activos</option><option value="draft">Borradores</option><option value="hidden">Ocultos</option></select>
          </div>
          <button class="btn-primary" onclick="openProductModal()"><i class="fas fa-plus"></i> Nuevo Producto</button>
        </div>
        <div class="products-count" id="productsCount">Cargando...</div>
        <div class="admin-products-grid" id="productsGrid"></div>
      </div></main>

      <footer class="admin-footer"><div class="footer-content"><span>&copy; 2026 Cell Space Argentina.</span><span class="footer-version">CMS v1.0.0</span></div></footer>
    </div>
  </div>

  <!-- MODAL PRODUCTO (ampliado) -->
  <div class="modal-overlay" id="productModal">
    <div class="modal-box modal-lg">
      <div class="modal-header"><h2 id="modalTitle">Nuevo Producto</h2><button class="modal-close" onclick="closeProductModal()"><i class="fas fa-times"></i></button></div>
      <form id="productForm" class="modal-body">

        <div class="psec"><h4 class="psec-t"><i class="fas fa-circle-info"></i> Información básica</h4>
          <div class="form-row"><div class="form-group full"><label>Nombre *</label><input type="text" id="p_name" required></div></div>
          <div class="form-row">
            <div class="form-group"><label>SKU</label><input type="text" id="p_sku" placeholder="Ej: IPH15-256"></div>
            <div class="form-group"><label>Categoría</label><select id="p_category"><option value="">Seleccionar...</option>${catOptions}</select></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Marca</label><input type="text" id="p_brand" placeholder="Apple, Samsung..."></div>
            <div class="form-group"><label>Modelo</label><input type="text" id="p_model" placeholder="iPhone 15 Pro"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Precio *</label><input type="number" id="p_price" step="0.01" min="0" required></div>
            <div class="form-group"><label>Precio tachado (antes)</label><input type="number" id="p_old_price" step="0.01" min="0"></div>
            <div class="form-group"><label>Stock</label><input type="number" id="p_stock" min="0" value="0"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Estado</label><select id="p_status"><option value="active">Activo</option><option value="draft">Borrador</option></select></div>
            <div class="form-group"><label>Badge</label><input type="text" id="p_badge" placeholder="NUEVO, -20%..."></div>
          </div>
          <div class="form-row checks">
            <label class="check"><input type="checkbox" id="p_featured"><span>Destacado en home</span></label>
            <label class="check"><input type="checkbox" id="p_hidden"><span>Oculto en tienda</span></label>
          </div>
        </div>

        <div class="psec"><h4 class="psec-t"><i class="fas fa-images"></i> Galería</h4>
          <div class="upload-zone" id="uploadZone"><input type="file" id="p_images" accept="image/*" multiple style="display:none"><i class="fas fa-cloud-upload-alt"></i><p>Hacé clic o arrastrá imágenes</p><span>La primera es la portada</span></div>
          <div class="image-previews" id="imagePreviews"></div>
        </div>

        <div class="psec"><h4 class="psec-t"><i class="fas fa-clipboard-check"></i> Condición del equipo</h4>
          <div class="form-row">
            <div class="form-group"><label>Condición</label><input type="text" id="p_condition" placeholder="Muy bueno / Nuevo / Usado..."></div>
            <div class="form-group"><label>Etiqueta con check (opc.)</label><input type="text" id="p_condition_badge" placeholder="Bueno"></div>
          </div>
          <div class="form-row"><div class="form-group full"><label>Nota de condición</label><textarea id="p_condition_note" rows="2" placeholder="El producto tiene marcas en carcasa..."></textarea></div></div>
        </div>

        <div class="psec"><h4 class="psec-t"><i class="fas fa-layer-group"></i> Variantes de estado (precio por condición)</h4>
          <p class="field-hint">Como en las fichas: Nuevo / Open Box / Bueno / Muy bueno, cada una con su precio. Si no agregás ninguna, se usa el precio de arriba.</p>
          <div class="mini-list" id="statesList"></div>
          <button type="button" class="btn-secondary mini" onclick="addState()"><i class="fas fa-plus"></i> Agregar variante</button>
        </div>

        <div class="psec"><h4 class="psec-t"><i class="fas fa-sd-card"></i> Capacidades</h4>
          <div class="chip-row" id="storagesList"></div>
          <div class="blk-row"><input id="newStorage" placeholder="Ej: 256GB"><button type="button" class="btn-secondary mini" onclick="addStorage()"><i class="fas fa-plus"></i></button></div>
        </div>

        <div class="psec"><h4 class="psec-t"><i class="fas fa-palette"></i> Colores</h4>
          <div class="mini-list" id="colorsList"></div>
          <button type="button" class="btn-secondary mini" onclick="addColor()"><i class="fas fa-plus"></i> Agregar color</button>
        </div>

        <div class="psec"><h4 class="psec-t"><i class="fas fa-list-check"></i> Características técnicas</h4>
          <div class="mini-list" id="specsList"></div>
          <button type="button" class="btn-secondary mini" onclick="addSpec()"><i class="fas fa-plus"></i> Agregar característica</button>
        </div>

        <div class="psec"><h4 class="psec-t"><i class="fas fa-credit-card"></i> Financiación, envío y garantía</h4>
          <div class="form-row"><div class="form-group full"><label>Cuotas / financiación</label><input type="text" id="p_installments" placeholder="Hasta 12 cuotas de $X sin interés"></div></div>
          <div class="form-row">
            <div class="form-group"><label>Precio sin impuestos</label><input type="number" id="p_price_no_tax" step="0.01" min="0"></div>
            <div class="form-group"><label>Garantía</label><input type="text" id="p_warranty" placeholder="12 meses de garantía"></div>
          </div>
          <div class="form-row"><div class="form-group full"><label>Nota de envío</label><input type="text" id="p_shipping_note" placeholder="Envío gratis a todo el país / Llega en 24h..."></div></div>
        </div>

        <div class="psec"><h4 class="psec-t"><i class="fas fa-align-left"></i> Descripción</h4>
          <div class="form-row"><div class="form-group full"><textarea id="p_desc" rows="4"></textarea></div></div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeProductModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="saveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
}

export function productsViewOnMount() {
  wireLayout();
  document.getElementById('productSearch').addEventListener('input', applyFilters);
  document.getElementById('filterCategory').addEventListener('change', applyFilters);
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('productForm').addEventListener('submit', saveProduct);
  const zone = document.getElementById('uploadZone'), fi = document.getElementById('p_images');
  zone.addEventListener('click', () => fi.click());
  fi.addEventListener('change', handleImageUpload);
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); fi.files = e.dataTransfer.files; handleImageUpload({ target: fi }); });
  loadProducts();
}

function wireLayout() {
  const t=document.getElementById('sidebarToggle'),s=document.getElementById('adminSidebar'),o=document.getElementById('sidebarOverlay');
  if(t)t.onclick=()=>{s.classList.toggle('open');o.classList.toggle('active');};
  if(o)o.onclick=()=>{s.classList.remove('open');o.classList.remove('active');};
  const ub=document.getElementById('userMenuBtn'),ud=document.getElementById('userDropdown');
  if(ub)ub.onclick=e=>{e.stopPropagation();ud.classList.toggle('active');};
  document.addEventListener('click',()=>ud&&ud.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.toggle('active',i.getAttribute('href')===(window.location.hash||'').split('?')[0]));
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando productos...</p>';
  try {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allProducts = data || []; applyFilters();
  } catch (e) { console.error(e); grid.innerHTML = '<p class="loading-text" style="color:#ff4444">Error al cargar: '+e.message+'</p>'; }
}

function applyFilters() {
  const q=(document.getElementById('productSearch').value||'').toLowerCase().trim();
  const cat=document.getElementById('filterCategory').value;
  const st=document.getElementById('filterStatus').value;
  const list = allProducts.filter(p => {
    const mQ=!q||(p.name||'').toLowerCase().includes(q)||(p.sku||'').toLowerCase().includes(q)||(p.brand||'').toLowerCase().includes(q);
    const mC=!cat||p.category===cat;
    let mS=true; if(st==='active')mS=p.is_active&&!p.is_hidden; if(st==='draft')mS=p.status==='draft'; if(st==='hidden')mS=!!p.is_hidden;
    return mQ&&mC&&mS;
  });
  document.getElementById('productsCount').textContent=list.length+' producto(s)';
  renderProducts(list);
}

function renderProducts(list) {
  const grid = document.getElementById('productsGrid');
  if (!list.length) { grid.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-box-open"></i></div><h2>No hay productos</h2><p>Creá tu primer producto.</p><div class="empty-actions"><button class="btn-primary" onclick="openProductModal()"><i class="fas fa-plus"></i> Crear Producto</button></div></div>`; return; }
  grid.innerHTML = list.map(p => {
    const imgs = Array.isArray(p.images)?p.images:[];
    const thumb = p.image_url || imgs[0];
    const state = p.is_hidden?'Oculto':(p.status==='draft'?'Borrador':'Activo');
    const stateClass = p.is_hidden?'st-hidden':(p.status==='draft'?'st-draft':'st-active');
    const price = '$'+Number(p.price||0).toLocaleString('es-AR');
    const oldP = p.old_price?'<span class="p-old">$'+Number(p.old_price).toLocaleString('es-AR')+'</span>':'';
    const specsN = Array.isArray(p.specs)?p.specs.length:0;
    return `<div class="admin-product-card">
      <div class="ap-thumb">${thumb?'<img src="'+thumb+'" alt="">':'<i class="fas fa-image"></i>'}</div>
      <div class="ap-body">
        <div class="ap-top"><span class="ap-cat">${p.category||'Sin categoría'}</span><span class="ap-state ${stateClass}">${state}</span>${p.is_featured?'<span class="ap-feat"><i class="fas fa-star"></i></span>':''}</div>
        <h4 class="ap-name">${escapeHtml(p.name)}</h4>
        <div class="ap-meta">${p.sku?'SKU: '+escapeHtml(p.sku)+' · ':''}Stock: ${p.stock??0}${specsN?' · <i class="fas fa-list-check"></i> '+specsN+' specs':''}</div>
        <div class="ap-price">${price} ${oldP}</div>
      </div>
      <div class="ap-actions">
        <button title="Ver ficha pública" onclick="window.open('../producto.html?id=${p.id}','_blank')"><i class="fas fa-eye"></i></button>
        <button title="Editar" onclick="editProduct('${p.id}')"><i class="fas fa-pen"></i></button>
        <button title="Duplicar" onclick="duplicateProduct('${p.id}')"><i class="fas fa-copy"></i></button>
        <button title="Eliminar" class="del" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- MODAL ---------- */
window.openProductModal = function () {
  currentEditId=null; currentImages=[]; currentStates=[]; currentStorages=[]; currentColors=[]; currentSpecs=[];
  document.getElementById('modalTitle').textContent='Nuevo Producto';
  document.getElementById('productForm').reset();
  document.getElementById('p_status').value='active';
  renderAllLists();
  document.getElementById('productModal').classList.add('open');
};

window.editProduct = async function (id) {
  const p = allProducts.find(x=>x.id===id); if(!p) return;
  currentEditId=id;
  currentImages = Array.isArray(p.images)?[...p.images]:(p.image_url?[p.image_url]:[]);
  currentStates = Array.isArray(p.state_variants)?p.state_variants.map(s=>({...s})):[];
  currentStorages = Array.isArray(p.storage_options)?[...p.storage_options]:[];
  currentColors = Array.isArray(p.color_options)?p.color_options.map(c=>({...c})):[];
  currentSpecs = Array.isArray(p.specs)?p.specs.map(s=>({...s})):[];
  document.getElementById('modalTitle').textContent='Editar Producto';
  set('p_name',p.name); set('p_sku',p.sku); set('p_category',p.category); set('p_brand',p.brand); set('p_model',p.model);
  set('p_price',p.price); set('p_old_price',p.old_price); set('p_stock',p.stock); set('p_status',p.status||'active');
  set('p_badge',p.badge); set('p_desc',p.description); set('p_condition',p.condition); set('p_condition_badge',p.condition_badge);
  set('p_condition_note',p.condition_note); set('p_installments',p.installments); set('p_price_no_tax',p.price_no_tax);
  set('p_warranty',p.warranty); set('p_shipping_note',p.shipping_note);
  document.getElementById('p_featured').checked=!!p.is_featured;
  document.getElementById('p_hidden').checked=!!p.is_hidden;
  renderAllLists();
  document.getElementById('productModal').classList.add('open');
};

window.closeProductModal = function () { document.getElementById('productModal').classList.remove('open'); };

window.deleteProduct = async function (id) {
  if(!confirm('¿Eliminar este producto?')) return;
  try { const { error } = await supabase.from('products').delete().eq('id',id); if(error) throw error; toast('Producto eliminado','ok'); loadProducts(); }
  catch(e){ toast('Error: '+e.message,'err'); }
};

window.duplicateProduct = async function (id) {
  const p = allProducts.find(x=>x.id===id); if(!p) return;
  const copy={...p}; delete copy.id; delete copy.created_at; delete copy.updated_at;
  copy.name=(p.name||'')+' (copia)'; copy.sku=(p.sku||'')+'-COPY';
  try { const { error } = await supabase.from('products').insert(copy); if(error) throw error; toast('Producto duplicado','ok'); loadProducts(); }
  catch(e){ toast('Error: '+e.message,'err'); }
};

/* ---------- listas en memoria ---------- */
function renderAllLists(){ renderImages(); renderStates(); renderStorages(); renderColors(); renderSpecs(); }

window.addState = function(){ currentStates.push({label:'',price:'',note:'',recommended:false}); renderStates(); };
window.removeState = function(i){ currentStates.splice(i,1); renderStates(); };
function renderStates(){
  document.getElementById('statesList').innerHTML = currentStates.map((s,i)=>`
    <div class="mini-row">
      <input placeholder="Etiqueta (Bueno, Nuevo...)" value="${escAttr(s.label)}" oninput="currentStates[${i}].label=this.value">
      <input type="number" step="0.01" placeholder="Precio" value="${escAttr(s.price)}" oninput="currentStates[${i}].price=this.value">
      <input placeholder="Nota (opc.)" value="${escAttr(s.note)}" oninput="currentStates[${i}].note=this.value">
      <label class="check mini-check"><input type="checkbox" ${s.recommended?'checked':''} onchange="currentStates[${i}].recommended=this.checked"><span>Recomendado</span></label>
      <button type="button" class="del mini" onclick="removeState(${i})"><i class="fas fa-times"></i></button>
    </div>`).join('') || '<p class="field-hint">Sin variantes: se usará el precio principal.</p>';
}

window.addStorage = function(){ const v=(document.getElementById('newStorage').value||'').trim(); if(!v)return; if(!currentStorages.includes(v))currentStorages.push(v); document.getElementById('newStorage').value=''; renderStorages(); };
window.removeStorage = function(i){ currentStorages.splice(i,1); renderStorages(); };
function renderStorages(){
  document.getElementById('storagesList').innerHTML = currentStorages.map((s,i)=>`<span class="tag-chip editable">${escapeHtml(s)}<button type="button" onclick="removeStorage(${i})"><i class="fas fa-times"></i></button></span>`).join('') || '<span class="field-hint">Sin capacidades cargadas.</span>';
}

window.addColor = function(){ currentColors.push({name:'',hex:'#FF6A00',image:''}); renderColors(); };
window.removeColor = function(i){ currentColors.splice(i,1); renderColors(); };
function renderColors(){
  document.getElementById('colorsList').innerHTML = currentColors.map((c,i)=>`
    <div class="mini-row">
      <input type="color" value="${escAttr(c.hex)||'#FF6A00'}" oninput="currentColors[${i}].hex=this.value;this.nextElementSibling.value=this.value">
      <input placeholder="#hex" value="${escAttr(c.hex)}" oninput="currentColors[${i}].hex=this.value" style="max-width:90px">
      <input placeholder="Nombre (Gris, Rojo...)" value="${escAttr(c.name)}" oninput="currentColors[${i}].name=this.value">
      <input placeholder="Imagen opc. (URL)" value="${escAttr(c.image)}" oninput="currentColors[${i}].image=this.value">
      <button type="button" class="del mini" onclick="removeColor(${i})"><i class="fas fa-times"></i></button>
    </div>`).join('') || '<p class="field-hint">Sin colores cargados.</p>';
}

window.addSpec = function(){ currentSpecs.push({icon:'fa-mobile-screen',label:'',value:''}); renderSpecs(); };
window.removeSpec = function(i){ currentSpecs.splice(i,1); renderSpecs(); };
function renderSpecs(){
  const opts = window.__SPEC_ICON_OPTS||'';
  document.getElementById('specsList').innerHTML = currentSpecs.map((s,i)=>{
    const sel = opts.replace('value="'+s.icon+'"', 'value="'+s.icon+'" selected');
    return `<div class="mini-row">
      <select onchange="currentSpecs[${i}].icon=this.value">${sel}</select>
      <input placeholder="Etiqueta (Pantalla)" value="${escAttr(s.label)}" oninput="currentSpecs[${i}].label=this.value">
      <input placeholder="Valor (6.8&quot;)" value="${escAttr(s.value)}" oninput="currentSpecs[${i}].value=this.value">
      <button type="button" class="del mini" onclick="removeSpec(${i})"><i class="fas fa-times"></i></button>
    </div>`;
  }).join('') || '<p class="field-hint">Sin características cargadas.</p>';
}

/* ---------- imágenes ---------- */
async function handleImageUpload(e){
  const files=Array.from(e.target.files||[]); if(!files.length)return;
  const zone=document.getElementById('uploadZone'); zone.innerHTML='<i class="fas fa-spinner fa-spin"></i><p>Subiendo...</p>';
  for(const file of files){
    try{
      const safe=file.name.replace(/[^a-zA-Z0-9.]/g,'_');
      const path='products/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'-'+safe;
      const { error } = await supabase.storage.from('product-images').upload(path,file,{upsert:false}); if(error)throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path); currentImages.push(data.publicUrl);
    }catch(err){ console.error(err); toast('No se pudo subir '+file.name,'err'); }
  }
  zone.innerHTML='<i class="fas fa-cloud-upload-alt"></i><p>Hacé clic o arrastrá imágenes</p><span>La primera es la portada</span>';
  e.target.value=''; renderImages();
}
function renderImages(){
  document.getElementById('imagePreviews').innerHTML = currentImages.map((u,i)=>`<div class="img-prev">${i===0?'<span class="img-main">Portada</span>':''}<img src="${u}" alt=""><button type="button" onclick="removeImage(${i})"><i class="fas fa-times"></i></button></div>`).join('');
}
window.removeImage = function(i){ currentImages.splice(i,1); renderImages(); };

/* ---------- save ---------- */
async function saveProduct(e){
  e.preventDefault();
  const btn=document.getElementById('saveBtn'); btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try{
    const status=val('p_status'); const isHidden=document.getElementById('p_hidden').checked;
    const states = currentStates.filter(s=>(s.label||'').trim()).map(s=>({label:s.label.trim(),price:s.price===''?null:Number(s.price),note:(s.note||'').trim(),recommended:!!s.recommended}));
    const colors = currentColors.filter(c=>(c.name||'').trim()).map(c=>({name:c.name.trim(),hex:c.hex||'#FF6A00',image:(c.image||'').trim()||null}));
    const specs = currentSpecs.filter(s=>(s.label||'').trim()&&(s.value||'').trim()).map(s=>({icon:s.icon||'fa-circle-info',label:s.label.trim(),value:s.value.trim()}));
    const payload = {
      name:val('p_name').trim(), sku:val('p_sku').trim()||null, category:val('p_category')||null,
      brand:val('p_brand').trim()||null, model:val('p_model').trim()||null,
      price:parseFloat(val('p_price'))||0, old_price:val('p_old_price')?parseFloat(val('p_old_price')):null,
      stock:parseInt(val('p_stock'))||0, status, is_active:status==='active'&&!isHidden,
      is_featured:document.getElementById('p_featured').checked, is_hidden:isHidden,
      badge:val('p_badge').trim()||null, description:val('p_desc').trim()||null,
      images:currentImages, image_url:currentImages[0]||null,
      condition:val('p_condition').trim()||null, condition_badge:val('p_condition_badge').trim()||null, condition_note:val('p_condition_note').trim()||null,
      state_variants:states, storage_options:currentStorages, color_options:colors, specs,
      installments:val('p_installments').trim()||null, price_no_tax:val('p_price_no_tax')?parseFloat(val('p_price_no_tax')):null,
      warranty:val('p_warranty').trim()||null, shipping_note:val('p_shipping_note').trim()||null,
      updated_at:new Date().toISOString()
    };
    if(!payload.name) throw new Error('El nombre es obligatorio');
    let error;
    if(currentEditId) ({ error } = await supabase.from('products').update(payload).eq('id',currentEditId));
    else ({ error } = await supabase.from('products').insert(payload));
    if(error) throw error;
    toast(currentEditId?'Producto actualizado':'Producto creado','ok'); closeProductModal(); loadProducts();
  }catch(err){ console.error(err); toast('Error: '+err.message,'err'); }
  finally{ btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Guardar'; }
}

/* ---------- helpers ---------- */
function val(id){ return (document.getElementById(id)?.value ?? ''); }
function set(id,v){ const el=document.getElementById(id); if(el) el.value=(v ?? ''); }
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
function toast(msg,type){ const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'"></i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }
window.handleLogout = async () => { if(confirm('¿Cerrar sesión?')){ const { logout } = await import('../hooks/useAuth.js'); await logout(); } };
