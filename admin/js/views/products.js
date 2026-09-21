import { supabase } from '../config.js?v=cb22';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb22';

let allProducts = [];
let currentEditId = null;
let currentImages = [];
let currentStates = [];   // [{label,price,note,recommended}]
let currentStorages = []; // ['256GB','512GB']
let currentColors = [];   // [{name,hex,image}]
let currentSpecs = [];    // [{icon,label,value}]

const FALLBACK_CATEGORIES = ['Accesorios','Celulares nuevos','Celulares usados','Notebooks / Computadoras','Repuestos generales','Consolas y gamer','Ofertas / Liquidación','Licencias / Software','FRP por servidor','Archivos','Herramientas','Repuestos al por mayor'];
const SPEC_ICONS = [
  ['fa-mobile-screen','Pantalla'],['fa-microchip','Procesador'],['fa-memory','RAM'],
  ['fa-hard-drive','Memoria'],['fa-camera','Cámara'],['fa-battery-full','Batería'],
  ['fa-ruler-combined','Dimensiones'],['fa-weight-hanging','Peso'],['fa-signal','Señal'],
  ['fa-sim-card','SIM'],['fa-wifi','Conectividad'],['fa-fingerprint','Seguridad'],
  ['fa-droplet','Resistencia'],['fa-bolt','Carga'],['fa-cube','Sistema']
];
const SECTION_LABELS = { tech:'Tecnología', care:'Cuidado Personal', license:'Licencias', gaming:'Gaming', offers:'Ofertas' };
const RATING_FIELDS = ['screen:Pantalla','battery:Batería','camera:Cámara','connectivity:Conectividad','audio:Audio','buttons:Botones'];

function flatCategoryOptions(names){
  return names.map(n => `<option value="${escAttr(n)}">${escapeHtml(n)}</option>`).join('');
}
function groupedCategoryOptions(rows){
  const groups = {};
  rows.forEach(r => { const s = r.section || 'tech'; (groups[s] = groups[s] || []).push(r.name); });
  return Object.keys(SECTION_LABELS).filter(k => groups[k] && groups[k].length)
    .map(k => `<optgroup label="${escAttr(SECTION_LABELS[k])}">${flatCategoryOptions(groups[k])}</optgroup>`)
    .join('');
}

export async function productsView() {
  let categoryNames = FALLBACK_CATEGORIES;
  let categoryRows = null;
  try {
    const { data, error } = await supabase.from('categories').select('name, section').order('sort_order', { ascending: true });
    if (!error && data && data.length) { categoryRows = data; categoryNames = data.map(c => c.name); }
  } catch (e) { console.warn('No se pudieron cargar categorías, uso lista de respaldo', e); }
  const catOptionsFlat = flatCategoryOptions(categoryNames);
  const catOptionsModal = categoryRows ? groupedCategoryOptions(categoryRows) : catOptionsFlat;
  const specIconOpts = SPEC_ICONS.map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
  window.__SPEC_ICON_OPTS = specIconOpts;

  const ratingsHtml = RATING_FIELDS.map(pair => {
    const [key,label] = pair.split(':');
    return `<div class="form-group" style="min-width:150px;"><label>${label}</label><select id="p_rating_${key}"><option value="">Sin calificar</option><option value="5">★★★★★</option><option value="4">★★★★☆</option><option value="3">★★★☆</option><option value="2">★★☆</option><option value="1">★☆</option></select></div>`;
  }).join('');

  const content = `<div class="admin-products-grid" id="productsGrid"></div>`;

  const toolbarHtml = toolbar({
    searchId: 'productSearch',
    searchPlaceholder: 'Buscar por nombre, SKU o marca...',
    filters: [
      { id: 'filterCategory', options: [{ v:'', l:'Todas las categorías' }, ...categoryNames.map(c => ({ v:c, l:c }))] },
      { id: 'filterStatus', options: [{ v:'', l:'Todos los estados' }, { v:'active', l:'Activos' }, { v:'draft', l:'Borradores' }, { v:'hidden', l:'Ocultos' }] },
    ],
    countId: 'productsCount',
    action: { label: 'Nuevo Producto', icon: 'fas fa-plus', onclick: 'openProductModal()' },
  });

  const modal = `
  <div class="modal-overlay" id="productModal">
    <div class="modal-box modal-xl">
      <div class="modal-header"><h2 id="modalTitle">Nuevo Producto</h2><button class="modal-close" onclick="closeProductModal()"><i class="fas fa-times"></i></button></div>
      <form id="productForm">
        <div class="prod-modal-body">
          <div class="prod-modal-form">

            <div class="prod-tabs">
              <button type="button" class="prod-tab active" data-tab="basico"><span class="prod-tab-num">1</span> Básico</button>
              <button type="button" class="prod-tab" data-tab="galeria"><span class="prod-tab-num">2</span> Galería</button>
              <button type="button" class="prod-tab" data-tab="condicion"><span class="prod-tab-num">3</span> Condición</button>
              <button type="button" class="prod-tab" data-tab="extras"><span class="prod-tab-num">4</span> Extras</button>
            </div>

            <div class="prod-tab-panel" data-panel="basico">
              <div class="form-row"><div class="form-group full"><label>Nombre *</label><input type="text" id="p_name" required minlength="5" placeholder="Mínimo 5 caracteres"></div></div>
              <div class="form-row">
                <div class="form-group"><label>Categoría *</label><select id="p_category" required><option value="">Seleccionar...</option>${catOptionsModal}</select></div>
                <div class="form-group"><label>SKU</label><input type="text" id="p_sku" placeholder="Ej: IPH15-256"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Marca</label><input type="text" id="p_brand" placeholder="Apple, Samsung..."></div>
                <div class="form-group"><label>Modelo</label><input type="text" id="p_model" placeholder="iPhone 15 Pro"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Precio transferencia *</label><input type="number" id="p_price" step="0.01" min="0" required></div>
                <div class="form-group"><label>Precio anterior</label><input type="number" id="p_old_price" step="0.01" min="0" placeholder="Para mostrar descuento"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Stock *</label><input type="number" id="p_stock" min="0" value="0" required></div>
                <div class="form-group"><label>Estado</label>
                  <select id="p_status">
                    <option value="active">Publicado</option>
                    <option value="draft">Borrador</option>
                    <option value="hidden">Oculto</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="prod-tab-panel" data-panel="galeria" hidden>
              <div class="upload-zone" id="uploadZone"><input type="file" id="p_images" accept="image/*" multiple style="display:none"><i class="fas fa-cloud-upload-alt"></i><p>Hacé clic o arrastrá imágenes</p><span>La primera es la portada · se suben todas juntas</span></div>
              <div class="image-previews" id="imagePreviews"></div>
              <div class="form-row" style="margin-top:16px;"><div class="form-group full"><label>Video de YouTube (opcional)</label><input type="text" id="p_video_url" placeholder="https://youtube.com/watch?v=..."></div></div>
            </div>

            <div class="prod-tab-panel" data-panel="condicion" hidden>
              <div class="form-row">
                <div class="form-group">
                  <label>Estado del equipo *</label>
                  <select id="p_device_condition">
                    <option value="nuevo">Nuevo</option>
                    <option value="reacondicionado">Reacondicionado</option>
                    <option value="usado">Usado</option>
                    <option value="swap">Swap</option>
                  </select>
                  <p class="field-hint">Usado, Swap y Reacondicionado quedan pendientes de tu revisión antes de publicarse.</p>
                </div>
                <div class="form-group"><label>Etiqueta</label><input type="text" id="p_condition_badge" placeholder="Bueno, Muy bueno..."></div>
              </div>
              <div class="form-row"><div class="form-group full"><label>Nota de condición</label><textarea id="p_condition_note" rows="2" placeholder="El producto tiene marcas en carcasa..."></textarea></div></div>
              <div class="form-row">
                <div class="form-group"><label>Batería (%)</label><input type="number" id="p_battery_health" min="0" max="100" placeholder="95"></div>
                <div class="form-group checks" style="align-self:flex-end;"><label class="check"><input type="checkbox" id="p_imei_verified"><span>IMEI verificado</span></label></div>
              </div>
              <div id="ratingsBlock">
                <p class="field-hint" style="margin-bottom:8px;">Calificación por componente (solo para equipos no nuevos).</p>
                <div class="form-row" style="flex-wrap:wrap;gap:12px;display:flex;">
                  ${ratingsHtml}
                </div>
              </div>
            </div>

            <div class="prod-tab-panel" data-panel="extras" hidden>
              <div class="form-row"><div class="form-group full"><label>Descripción</label><textarea id="p_desc" rows="4"></textarea></div></div>
              <div class="form-row">
                <div class="form-group"><label>Garantía</label><input type="text" id="p_warranty" placeholder="12 meses de garantía"></div>
                <div class="form-group"><label>Cuotas / financiación</label><input type="text" id="p_installments" placeholder="Hasta 12 cuotas de $X sin interés"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Precio sin impuestos</label><input type="number" id="p_price_no_tax" step="0.01" min="0"></div>
                <div class="form-group"><label>Precio por transferencia</label><input type="number" id="p_price_transfer" step="0.01" min="0" placeholder="Con descuento por transferencia"></div>
              </div>
              <div class="form-row"><div class="form-group full"><label>Nota de envío</label><input type="text" id="p_shipping_note" placeholder="Envío gratis a todo el país / Llega en 24h..."></div></div>
              <div class="form-row">
                <div class="form-group"><label>Cantidad vendida</label><input type="number" id="p_sold_count" min="0" value="0" placeholder="Se muestra como '12 vendidos'"></div>
                <div class="form-group"><label>Badge</label><input type="text" id="p_badge" placeholder="NUEVO, -20%..."></div>
              </div>
              <div class="form-row checks">
                <label class="check"><input type="checkbox" id="p_featured"><span>Destacado en home</span></label>
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
            </div>

          </div>

          <div class="prod-modal-preview">
            <h4>Vista previa</h4>
            <div class="preview-product" id="productPreview">
              <div class="pv-img" id="pv_img"><i class="fas fa-image"></i></div>
              <div class="pv-brand" id="pv_brand" style="display:none"></div>
              <div class="pv-name" id="pv_name">Nombre del producto</div>
              <div>
                <span class="pv-price" id="pv_price">$0</span><span class="pv-old" id="pv_old" style="display:none"></span><span class="pv-pct" id="pv_pct" style="display:none"></span>
              </div>
              <div class="pv-cuotas" id="pv_cuotas" style="display:none"><i class="fas fa-credit-card"></i> <span id="pv_cuotas_text"></span></div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="padding:16px 24px;">
          <button type="button" class="btn-secondary" onclick="closeProductModal()">Cancelar</button>
          <button type="button" class="btn-secondary" id="saveAndNewBtn"><i class="fas fa-plus"></i> Guardar y crear otro</button>
          <button type="submit" class="btn-primary" id="saveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>`;

  return layout({ title: 'Productos', toolbar: toolbarHtml, content }) + modal;
}

export function productsViewOnMount() {
  mountLayout();
  document.getElementById('productSearch').addEventListener('input', applyFilters);
  document.getElementById('filterCategory').addEventListener('change', applyFilters);
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('productForm').addEventListener('submit', e => { e.preventDefault(); doSave(false); });
  document.getElementById('saveAndNewBtn').addEventListener('click', () => doSave(true));

  document.querySelectorAll('.prod-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  document.getElementById('p_device_condition').addEventListener('change', updateRatingsVisibility);
  ['p_name','p_brand','p_price','p_old_price','p_installments'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
  });

  const zone = document.getElementById('uploadZone'), fi = document.getElementById('p_images');
  zone.addEventListener('click', () => fi.click());
  fi.addEventListener('change', handleImageUpload);
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); fi.files = e.dataTransfer.files; handleImageUpload({ target: fi }); });

  loadProducts();
}

function switchTab(tabId){
  document.querySelectorAll('.prod-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.prod-tab-panel').forEach(p => p.hidden = p.dataset.panel !== tabId);
  document.querySelector('.prod-modal-form').scrollTop = 0;
}

function updateRatingsVisibility(){
  const cond = document.getElementById('p_device_condition').value;
  const block = document.getElementById('ratingsBlock');
  if (block) block.style.display = cond === 'nuevo' ? 'none' : '';
}

function updatePreview(){
  const name = val('p_name').trim() || 'Nombre del producto';
  const brand = val('p_brand').trim();
  const price = parseFloat(val('p_price')) || 0;
  const oldPrice = parseFloat(val('p_old_price')) || 0;
  const img = currentImages[0];

  document.getElementById('pv_name').textContent = name;
  const pvBrand = document.getElementById('pv_brand');
  pvBrand.textContent = brand; pvBrand.style.display = brand ? '' : 'none';
  document.getElementById('pv_img').innerHTML = img ? `<img src="${escAttr(img)}" alt="">` : '<i class="fas fa-image"></i>';
  document.getElementById('pv_price').textContent = '$' + Math.round(price).toLocaleString('es-AR');

  const pvOld = document.getElementById('pv_old'), pvPct = document.getElementById('pv_pct');
  if (oldPrice > price && price > 0) {
    pvOld.textContent = '$' + Math.round(oldPrice).toLocaleString('es-AR'); pvOld.style.display = '';
    pvPct.textContent = '-' + Math.round((1 - price / oldPrice) * 100) + '%'; pvPct.style.display = '';
  } else { pvOld.style.display = 'none'; pvPct.style.display = 'none'; }

  const installments = val('p_installments').trim();
  const pvCuotas = document.getElementById('pv_cuotas');
  if (installments) { document.getElementById('pv_cuotas_text').textContent = installments; pvCuotas.style.display = ''; }
  else pvCuotas.style.display = 'none';
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
  if (!list.length) {
    grid.innerHTML = emptyState({
      icon: 'fas fa-box-open',
      title: 'No hay productos',
      text: 'Creá tu primer producto.',
      action: { label: 'Crear Producto', icon: 'fas fa-plus', onclick: 'openProductModal()' },
    });
    return;
  }
  grid.innerHTML = list.map(p => {
    const imgs = Array.isArray(p.images)?p.images:[];
    const thumb = p.image_url || imgs[0];
    const state = p.is_hidden?'Oculto':(p.status==='draft'?'Borrador':'Activo');
    const stateClass = p.is_hidden?'st-hidden':(p.status==='draft'?'st-draft':'st-active');
    const price = '$'+Number(p.price||0).toLocaleString('es-AR');
    const oldP = p.old_price?'<span class="p-old">$'+Number(p.old_price).toLocaleString('es-AR')+'</span>':'';
    const specsN = Array.isArray(p.specs)?p.specs.length:0;
    const pending = p.review_status === 'pending';
    return `<div class="admin-product-card">
      <div class="ap-thumb">${thumb?'<img src="'+thumb+'" alt="">':'<i class="fas fa-image"></i>'}</div>
      <div class="ap-body">
        <div class="ap-top"><span class="ap-cat">${p.category||'Sin categoría'}</span><span class="ap-state ${stateClass}">${state}</span>${p.is_featured?'<span class="ap-feat"><i class="fas fa-star"></i></span>':''}</div>
        ${pending?'<div style="background:rgba(255,106,0,0.15);border:1px solid rgba(255,106,0,0.4);color:#FF6A00;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;margin:6px 0;display:inline-block;"><i class="fas fa-clock"></i> Pendiente de revisión</div>':''}
        <h4 class="ap-name">${escapeHtml(p.name)}</h4>
        <div class="ap-meta">${p.sku?'SKU: '+escapeHtml(p.sku)+' · ':''}Stock: ${p.stock??0}${specsN?' · <i class="fas fa-list-check"></i> '+specsN+' specs':''}</div>
        <div class="ap-price">${price} ${oldP}</div>
        ${pending?`<div style="display:flex;gap:8px;margin-top:8px;">
          <button type="button" class="btn-primary mini" style="flex:1;" onclick="approveProduct('${p.id}')"><i class="fas fa-check"></i> Aprobar</button>
          <button type="button" class="btn-secondary mini" style="flex:1;" onclick="rejectProduct('${p.id}')"><i class="fas fa-xmark"></i> Rechazar</button>
        </div>`:''}
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

window.approveProduct = async function (id) {
  try {
    const { error } = await supabase.from('products').update({ review_status: 'approved' }).eq('id', id);
    if (error) throw error;
    toast('Publicación aprobada', 'ok'); loadProducts();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};
window.rejectProduct = async function (id) {
  if (!confirm('¿Rechazar esta publicación? Va a quedar oculta de la tienda hasta que la edites y la vuelvas a enviar a revisión.')) return;
  try {
    const { error } = await supabase.from('products').update({ review_status: 'rejected', is_hidden: true }).eq('id', id);
    if (error) throw error;
    toast('Publicación rechazada', 'ok'); loadProducts();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

/* ---------- MODAL ---------- */
function resetModalUi(){
  switchTab('basico');
  renderAllLists();
  updateRatingsVisibility();
  updatePreview();
}

window.openProductModal = function () {
  currentEditId=null; currentImages=[]; currentStates=[]; currentStorages=[]; currentColors=[]; currentSpecs=[];
  document.getElementById('modalTitle').textContent='Nuevo Producto';
  document.getElementById('productForm').reset();
  document.getElementById('p_status').value='active';
  document.getElementById('saveAndNewBtn').style.display='';
  resetModalUi();
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
  set('p_price',p.price); set('p_old_price',p.old_price); set('p_stock',p.stock);
  set('p_status', p.is_hidden ? 'hidden' : (p.status||'active'));
  set('p_badge',p.badge); set('p_desc',p.description); set('p_condition_badge',p.condition_badge);
  set('p_condition_note',p.condition_note); set('p_installments',p.installments); set('p_price_no_tax',p.price_no_tax);
  set('p_warranty',p.warranty); set('p_shipping_note',p.shipping_note); set('p_video_url', p.video_url);
  set('p_device_condition', p.device_condition||'nuevo');
  set('p_price_transfer', p.price_transfer);
  set('p_sold_count', p.sold_count||0);
  set('p_battery_health', p.battery_health);
  document.getElementById('p_imei_verified').checked=!!p.imei_verified;
  const ratings = p.component_ratings||{};
  RATING_FIELDS.forEach(pair => { const k = pair.split(':')[0]; set('p_rating_'+k, ratings[k]||''); });
  document.getElementById('p_featured').checked=!!p.is_featured;
  document.getElementById('saveAndNewBtn').style.display='none';
  resetModalUi();
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
/* IMPORTANTE: este archivo es un módulo ES6, así que currentStates/currentColors/
   currentSpecs NO existen en el scope global. Los handlers inline del HTML se
   ejecutan en scope global, por eso van a través de estos setters expuestos. */
window.setStateField = function (i, field, value) { if (currentStates[i]) currentStates[i][field] = value; };
window.setColorField = function (i, field, value) { if (currentColors[i]) currentColors[i][field] = value; };
window.setSpecField  = function (i, field, value) { if (currentSpecs[i])  currentSpecs[i][field]  = value; };

function renderAllLists(){ renderImages(); renderStates(); renderStorages(); renderColors(); renderSpecs(); }

window.addState = function(){ currentStates.push({label:'',price:'',note:'',recommended:false}); renderStates(); };
window.removeState = function(i){ currentStates.splice(i,1); renderStates(); };
function renderStates(){
  document.getElementById('statesList').innerHTML = currentStates.map((s,i)=>`
    <div class="mini-row">
      <input placeholder="Etiqueta (Bueno, Nuevo...)" value="${escAttr(s.label)}" oninput="setStateField(${i},'label',this.value)">
      <input type="number" step="0.01" placeholder="Precio" value="${escAttr(s.price)}" oninput="setStateField(${i},'price',this.value)">
      <input placeholder="Nota (opc.)" value="${escAttr(s.note)}" oninput="setStateField(${i},'note',this.value)">
      <label class="check mini-check"><input type="checkbox" ${s.recommended?'checked':''} onchange="setStateField(${i},'recommended',this.checked)"><span>Recomendado</span></label>
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
      <input type="color" value="${escAttr(c.hex)||'#FF6A00'}" oninput="setColorField(${i},'hex',this.value);this.nextElementSibling.value=this.value">
      <input placeholder="#hex" value="${escAttr(c.hex)}" oninput="setColorField(${i},'hex',this.value)" style="max-width:90px">
      <input placeholder="Nombre (Gris, Rojo...)" value="${escAttr(c.name)}" oninput="setColorField(${i},'name',this.value)">
      <input placeholder="Imagen opc. (URL)" value="${escAttr(c.image)}" oninput="setColorField(${i},'image',this.value)">
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
      <select onchange="setSpecField(${i},'icon',this.value)">${sel}</select>
      <input placeholder="Etiqueta (Pantalla)" value="${escAttr(s.label)}" oninput="setSpecField(${i},'label',this.value)">
      <input placeholder="Valor (6.8&quot;)" value="${escAttr(s.value)}" oninput="setSpecField(${i},'value',this.value)">
      <button type="button" class="del mini" onclick="removeSpec(${i})"><i class="fas fa-times"></i></button>
    </div>`;
  }).join('') || '<p class="field-hint">Sin características cargadas.</p>';
}

/* ---------- imágenes ---------- */
async function handleImageUpload(e){
  const files=Array.from(e.target.files||[]); if(!files.length)return;
  const zone=document.getElementById('uploadZone'); zone.innerHTML='<i class="fas fa-spinner fa-spin"></i><p>Subiendo...</p>';
  // Subida en paralelo: todas las fotos se suben al mismo tiempo, no una por una.
  const results = await Promise.all(files.map(async file => {
    try{
      const safe=file.name.replace(/[^a-zA-Z0-9.]/g,'_');
      const path='products/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'-'+safe;
      const { error } = await supabase.storage.from('product-images').upload(path,file,{upsert:false}); if(error)throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path); return data.publicUrl;
    }catch(err){ console.error(err); toast('No se pudo subir '+file.name,'err'); return null; }
  }));
  results.forEach(url => { if (url) currentImages.push(url); });
  zone.innerHTML='<i class="fas fa-cloud-upload-alt"></i><p>Hacé clic o arrastrá imágenes</p><span>La primera es la portada · se suben todas juntas</span>';
  e.target.value=''; renderImages(); updatePreview();
}
function renderImages(){
  document.getElementById('imagePreviews').innerHTML = currentImages.map((u,i)=>`<div class="img-prev">${i===0?'<span class="img-main">Portada</span>':''}<img src="${u}" alt=""><button type="button" onclick="removeImage(${i})"><i class="fas fa-times"></i></button></div>`).join('');
}
window.removeImage = function(i){ currentImages.splice(i,1); renderImages(); updatePreview(); };

/* ---------- validación ---------- */
function validateProduct(){
  const name = val('p_name').trim();
  if (name.length < 5) return 'El nombre debe tener al menos 5 caracteres';
  const price = parseFloat(val('p_price'));
  if (!(price > 0)) return 'El precio debe ser mayor a 0';
  if (!val('p_category')) return 'La categoría es obligatoria';
  const stock = parseInt(val('p_stock'));
  if (isNaN(stock) || stock < 0) return 'El stock no puede ser negativo';
  return null;
}

/* ---------- save ---------- */
async function doSave(andNew){
  if (andNew && currentEditId) andNew = false; // "Guardar y crear otro" solo aplica a productos nuevos

  const errMsg = validateProduct();
  if (errMsg) { toast(errMsg, 'err'); return; }

  const saveBtn = document.getElementById('saveBtn');
  const saveNewBtn = document.getElementById('saveAndNewBtn');
  const busyBtn = andNew ? saveNewBtn : saveBtn;
  const busyBtnOriginalHtml = busyBtn.innerHTML;
  saveBtn.disabled = true; saveNewBtn.disabled = true;
  busyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

  try{
    const statusSel = val('p_status') || 'active';
    const isHidden = statusSel === 'hidden';
    const status = isHidden ? 'active' : statusSel;
    const states = currentStates.filter(s=>(s.label||'').trim()).map(s=>({label:s.label.trim(),price:s.price===''?null:Number(s.price),note:(s.note||'').trim(),recommended:!!s.recommended}));
    const colors = currentColors.filter(c=>(c.name||'').trim()).map(c=>({name:c.name.trim(),hex:c.hex||'#FF6A00',image:(c.image||'').trim()||null}));
    const specs = currentSpecs.filter(s=>(s.label||'').trim()&&(s.value||'').trim()).map(s=>({icon:s.icon||'fa-circle-info',label:s.label.trim(),value:s.value.trim()}));
    const deviceCondition = val('p_device_condition')||'nuevo';
    const componentRatings = {};
    RATING_FIELDS.forEach(pair => { const k = pair.split(':')[0]; const v = val('p_rating_'+k); if (v) componentRatings[k] = parseInt(v); });
    // Nuevo se publica solo; usado/swap/reacondicionado quedan pendientes de tu revisión,
    // salvo que ya estuvieran aprobados antes (para no volver a ocultar algo que editás).
    const prevReviewStatus = currentEditId ? (allProducts.find(x=>x.id===currentEditId)?.review_status) : null;
    const reviewStatus = deviceCondition==='nuevo' ? 'approved' : (prevReviewStatus==='approved' ? 'approved' : 'pending');
    const payload = {
      name:val('p_name').trim(), sku:val('p_sku').trim()||null, category:val('p_category')||null,
      brand:val('p_brand').trim()||null, model:val('p_model').trim()||null,
      price:parseFloat(val('p_price'))||0, old_price:val('p_old_price')?parseFloat(val('p_old_price')):null,
      stock:parseInt(val('p_stock'))||0, status, is_active:status==='active'&&!isHidden,
      price_transfer:val('p_price_transfer')?parseFloat(val('p_price_transfer')):null,
      sold_count:parseInt(val('p_sold_count'))||0,
      is_featured:document.getElementById('p_featured').checked, is_hidden:isHidden,
      badge:val('p_badge').trim()||null, description:val('p_desc').trim()||null,
      images:currentImages, image_url:currentImages[0]||null, video_url:val('p_video_url').trim()||null,
      condition_badge:val('p_condition_badge').trim()||null, condition_note:val('p_condition_note').trim()||null,
      device_condition:deviceCondition, review_status:reviewStatus,
      imei_verified:document.getElementById('p_imei_verified').checked,
      battery_health:val('p_battery_health')?parseInt(val('p_battery_health')):null,
      component_ratings:componentRatings,
      state_variants:states, storage_options:currentStorages, color_options:colors, specs,
      installments:val('p_installments').trim()||null, price_no_tax:val('p_price_no_tax')?parseFloat(val('p_price_no_tax')):null,
      warranty:val('p_warranty').trim()||null, shipping_note:val('p_shipping_note').trim()||null,
      updated_at:new Date().toISOString()
    };
    let error;
    if(currentEditId) ({ error } = await supabase.from('products').update(payload).eq('id',currentEditId));
    else ({ error } = await supabase.from('products').insert(payload));
    if(error) throw error;
    toast(currentEditId?'Producto actualizado':'Producto creado','ok');
    if (andNew) resetFormForNew(); else closeProductModal();
    loadProducts();
  }catch(err){ console.error(err); toast('Error: '+err.message,'err'); }
  finally{
    saveBtn.disabled=false; saveBtn.innerHTML='<i class="fas fa-save"></i> Guardar';
    saveNewBtn.disabled=false; saveNewBtn.innerHTML='<i class="fas fa-plus"></i> Guardar y crear otro';
  }
}

function resetFormForNew(){
  currentEditId=null; currentImages=[]; currentStates=[]; currentStorages=[]; currentColors=[]; currentSpecs=[];
  document.getElementById('productForm').reset();
  document.getElementById('p_status').value='active';
  document.getElementById('modalTitle').textContent='Nuevo Producto';
  document.getElementById('saveAndNewBtn').style.display='';
  resetModalUi();
  const nameInput = document.getElementById('p_name');
  nameInput.focus();
  document.getElementById('productModal').scrollTop = 0;
}

/* ---------- helpers ---------- */
function val(id){ return (document.getElementById(id)?.value ?? ''); }
function set(id,v){ const el=document.getElementById(id); if(el) el.value=(v ?? ''); }
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
function toast(msg,type){ const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'"></i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }
