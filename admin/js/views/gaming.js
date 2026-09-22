import { supabase } from '../config.js?v=cb22';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb22';

let allGaming = [];
let currentEditId = null;
let currentImage = null;
let currentGamingTypeFilter = '';

const GAMING_TYPES = {
  usb:         { label: 'USB PS2',      icon: 'fas fa-compact-disc', color: '#8b5cf6' },
  giftcard:    { label: 'Gift Card',    icon: 'fas fa-gift',         color: '#10c46a' },
  topup:       { label: 'Top-Up',       icon: 'fas fa-coins',        color: '#FFD700' },
  suscripcion: { label: 'Suscripción',  icon: 'fas fa-crown',        color: '#FF6A00' },
};

const PLATFORMS = [
  'PS2', 'PS3', 'PS4', 'PS5',
  'Xbox 360', 'Xbox One', 'Xbox Series',
  'Steam', 'Roblox', 'Free Fire', 'PUBG Mobile',
  'Nintendo Switch', 'Otro',
];

export async function gamingView() {
  const typeSelectOptions = Object.entries(GAMING_TYPES).map(([k,d]) => `<option value="${k}">${d.label}</option>`).join('');
  const platformOptions = PLATFORMS.map(p => `<option value="${p}">${p}</option>`).join('');

  const content = `
    <p class="field-hint" style="margin:0 0 16px;">Productos digitales y especiales: USB con juegos, gift cards, top-ups y suscripciones.</p>
    <div class="section-filters" id="gamingQuickFilters"></div>
    <div class="admin-products-grid" id="gamingGrid"></div>`;

  const toolbarHtml = toolbar({
    searchId: 'gamingSearch',
    searchPlaceholder: 'Buscar por nombre...',
    filters: [
      { id: 'filterGamingType', options: [{ v:'', l:'Todos los tipos' }, ...Object.entries(GAMING_TYPES).map(([k,d]) => ({ v:k, l:d.label }))] },
    ],
    countId: 'gamingCount',
    action: { label: 'Nuevo producto gaming', icon: 'fas fa-plus', onclick: 'openGamingModal()' },
  });

  const modal = `
  <div class="modal-overlay" id="gamingModal">
    <div class="modal-box modal-xl">
      <div class="modal-header"><h2 id="gamingModalTitle">Nuevo producto gaming</h2><button class="modal-close" onclick="closeGamingModal()"><i class="fas fa-times"></i></button></div>
      <form id="gamingForm">
        <div class="prod-modal-body">
          <div class="prod-modal-form">
            <div class="form-row"><div class="form-group full"><label>Nombre *</label><input type="text" id="g_name" required placeholder="Ej: PS Plus Essential 3 meses"></div></div>
            <div class="form-row">
              <div class="form-group"><label>Tipo *</label><select id="g_type" required>${typeSelectOptions}</select></div>
              <div class="form-group"><label>Plataforma</label><select id="g_platform"><option value="">Seleccionar...</option>${platformOptions}</select></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Precio *</label><input type="number" id="g_price" step="0.01" min="0" required></div>
              <div class="form-group"><label>Precio anterior</label><input type="number" id="g_old_price" step="0.01" min="0" placeholder="Para ofertas"></div>
            </div>
            <div class="form-row"><div class="form-group full"><label>Descripción</label><textarea id="g_description" rows="3"></textarea></div></div>

            <div id="gamingFieldsUsb">
              <div class="form-row">
                <div class="form-group"><label>Marca</label><input type="text" id="g_brand" placeholder="Ej: Sony"></div>
                <div class="form-group"><label>Stock</label><input type="number" id="g_stock" min="0" value="0"></div>
              </div>
              <div class="form-row"><div class="form-group full">
                <label>Lista de juegos (uno por línea)</label>
                <textarea id="g_games_list" class="games-textarea" placeholder="God of War&#10;GTA San Andreas&#10;Metal Gear Solid 3"></textarea>
              </div></div>
            </div>

            <div id="gamingFieldsDigital">
              <div class="form-row"><div class="form-group full"><label>Código de entrega</label><input type="text" id="g_delivery_code" placeholder="Opcional"></div></div>
              <div id="gamingFieldDuration" class="form-row"><div class="form-group full"><label>Duración</label><input type="text" id="g_duration" placeholder="Ej: 3 meses, 1 año"></div></div>
              <p class="field-hint">Digital — sin stock.</p>
            </div>

            <div class="form-row">
              <div class="form-group"><label>Estado</label>
                <select id="g_status">
                  <option value="active">Publicado</option>
                  <option value="draft">Borrador</option>
                  <option value="hidden">Oculto</option>
                </select>
              </div>
            </div>

            <div class="form-row"><div class="form-group full">
              <label>Imagen</label>
              <div class="upload-zone" id="gamingUploadZone">
                <input type="file" id="g_image" accept="image/*" style="display:none">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Hacé clic o arrastrá una imagen</p>
              </div>
              <div class="image-previews" id="gamingImagePreview"></div>
            </div></div>
          </div>

          <div class="prod-modal-preview">
            <h4>Vista previa</h4>
            <div class="preview-product" id="gamingPreview">
              <div class="pv-img" id="gpv_img"><i class="fas fa-gamepad"></i></div>
              <div class="pv-brand" id="gpv_type">USB PS2</div>
              <div class="pv-name" id="gpv_name">Nombre del producto</div>
              <div class="pv-meta" id="gpv_platform" style="font-size:12px;color:var(--admin-text-muted);margin-bottom:6px;"></div>
              <div><span class="pv-price" id="gpv_price">$0</span></div>
              <div style="margin-top:10px;"><span class="gaming-badge" id="gpv_badge"></span></div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="padding:16px 24px;">
          <button type="button" class="btn-secondary" onclick="closeGamingModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="gamingSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>`;

  return layout({ title: 'Gaming', toolbar: toolbarHtml, content }) + modal;
}

export function gamingViewOnMount() {
  mountLayout();
  document.getElementById('gamingSearch').addEventListener('input', applyFilters);
  document.getElementById('filterGamingType').addEventListener('change', applyFilters);
  document.getElementById('gamingForm').addEventListener('submit', saveGamingProduct);

  document.getElementById('g_type').addEventListener('change', updateTypeFields);
  ['g_name','g_platform','g_price'].forEach(id => document.getElementById(id).addEventListener('input', updatePreview));
  document.getElementById('g_platform').addEventListener('change', updatePreview);

  const zone = document.getElementById('gamingUploadZone'), fi = document.getElementById('g_image');
  zone.addEventListener('click', () => fi.click());
  fi.addEventListener('change', handleImageUpload);
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); fi.files = e.dataTransfer.files; handleImageUpload({ target: fi }); });

  loadGaming();
}

function updateTypeFields(){
  const type = document.getElementById('g_type').value;
  const isUsb = type === 'usb';
  document.getElementById('gamingFieldsUsb').style.display = isUsb ? '' : 'none';
  document.getElementById('gamingFieldsDigital').style.display = isUsb ? 'none' : '';
  document.getElementById('gamingFieldDuration').style.display = type === 'suscripcion' ? '' : 'none';
  updatePreview();
}

function updatePreview(){
  const type = val('g_type');
  const d = GAMING_TYPES[type] || GAMING_TYPES.usb;
  const isDigital = type !== 'usb';
  document.getElementById('gpv_type').textContent = d.label.toUpperCase();
  document.getElementById('gpv_name').textContent = val('g_name').trim() || 'Nombre del producto';
  document.getElementById('gpv_platform').textContent = val('g_platform') || '';
  document.getElementById('gpv_price').textContent = '$' + money(parseFloat(val('g_price')) || 0);
  document.getElementById('gpv_img').innerHTML = currentImage ? `<img src="${escAttr(currentImage)}" alt="">` : `<i class="${d.icon}"></i>`;
  const badge = document.getElementById('gpv_badge');
  badge.className = 'gaming-badge ' + (isDigital ? 'digital' : 'fisico');
  badge.innerHTML = isDigital ? '<i class="fas fa-bolt"></i> Digital — entrega inmediata' : '<i class="fas fa-truck"></i> Físico — con envío';
}

async function loadGaming() {
  const grid = document.getElementById('gamingGrid');
  grid.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando productos gaming...</p>';
  try {
    const { data, error } = await supabase.from('products').select('*').not('gaming_type', 'is', null).order('created_at', { ascending: false });
    if (error) throw error;
    allGaming = data || [];
    applyFilters();
  } catch (e) { console.error(e); grid.innerHTML = '<p class="loading-text" style="color:#ff4444">Error al cargar: '+e.message+'</p>'; }
}

function renderQuickFilters(){
  const counts = { usb:0, giftcard:0, topup:0, suscripcion:0 };
  allGaming.forEach(g => { if (counts[g.gaming_type] != null) counts[g.gaming_type]++; });
  const html = [`<button type="button" class="section-pill ${currentGamingTypeFilter===''?'on':''}" data-gtype="">Todos: ${allGaming.length}</button>`]
    .concat(Object.entries(GAMING_TYPES).map(([k,d]) =>
      `<button type="button" class="section-pill ${currentGamingTypeFilter===k?'on':''}" data-gtype="${k}" style="--cat-color:${d.color}"><i class="${d.icon}"></i> ${escapeHtml(d.label)}: ${counts[k]}</button>`
    )).join('');
  const box = document.getElementById('gamingQuickFilters');
  box.innerHTML = html;
  box.querySelectorAll('.section-pill').forEach(pill => pill.addEventListener('click', () => {
    currentGamingTypeFilter = pill.dataset.gtype;
    applyFilters();
  }));
}

function applyFilters(){
  const q = (document.getElementById('gamingSearch').value || '').toLowerCase().trim();
  const tp = document.getElementById('filterGamingType').value;
  const list = allGaming.filter(g => {
    const matchQ = !q || (g.name||'').toLowerCase().includes(q);
    const matchT = !tp || g.gaming_type === tp;
    const matchQuick = !currentGamingTypeFilter || g.gaming_type === currentGamingTypeFilter;
    return matchQ && matchT && matchQuick;
  });
  document.getElementById('gamingCount').textContent = list.length + ' producto(s)';
  renderQuickFilters();
  renderGamingList(list);
}

function renderGamingList(list){
  const grid = document.getElementById('gamingGrid');
  if (!list.length) {
    grid.innerHTML = emptyState({
      icon: 'fas fa-gamepad',
      title: 'No hay productos gaming',
      text: 'Creá el primero.',
      action: { label: 'Nuevo producto gaming', icon: 'fas fa-plus', onclick: 'openGamingModal()' },
    });
    return;
  }
  const grouped = {};
  list.forEach(g => { const t = g.gaming_type; (grouped[t] = grouped[t] || []).push(g); });

  grid.innerHTML = Object.entries(GAMING_TYPES)
    .filter(([k]) => grouped[k] && grouped[k].length)
    .map(([k, d]) => `
      <div class="cat-section">
        <div class="cat-section-head" style="--cat-color: ${d.color}">
          <i class="${d.icon}"></i>
          <span>${escapeHtml(d.label.toUpperCase())}</span>
          <span class="cat-section-count">${grouped[k].length}</span>
        </div>
        <div class="cat-section-list">
          ${grouped[k].map(g => renderGamingCard(g, d)).join('')}
        </div>
      </div>`).join('');
}

function renderGamingCard(g, d){
  const state = g.is_hidden ? 'Oculto' : (g.status==='draft' ? 'Borrador' : 'Publicado');
  const stateClass = g.is_hidden ? 'st-hidden' : (g.status==='draft' ? 'st-draft' : 'st-active');
  const priceTxt = '$' + money(g.price);
  const oldP = g.old_price ? '<span class="p-old">$'+money(g.old_price)+'</span>' : '';
  const isDigital = !!g.is_digital;
  return `<div class="admin-product-card" style="--cat-color: ${d.color}">
    <div class="ap-thumb">${g.image_url ? '<img src="'+g.image_url+'" alt="">' : `<i class="${d.icon}"></i>`}</div>
    <div class="ap-body">
      <div class="ap-top">
        <span class="ap-cat">${escapeHtml(d.label)}</span>
        <span class="ap-state ${stateClass}">${state}</span>
      </div>
      <h4 class="ap-name">${escapeHtml(g.name)}</h4>
      <div class="ap-meta">${escapeHtml(g.platform || 'Sin plataforma')}</div>
      <div class="ap-price">${priceTxt} ${oldP}</div>
      <div style="margin-top:6px;"><span class="gaming-badge ${isDigital?'digital':'fisico'}">
        ${isDigital ? '<i class="fas fa-bolt"></i> Digital — entrega inmediata' : '<i class="fas fa-truck"></i> Físico — con envío'}
      </span></div>
    </div>
    <div class="ap-actions">
      <button title="Editar" onclick="editGamingProduct('${g.id}')"><i class="fas fa-pen"></i></button>
      <button title="Duplicar" onclick="duplicateGamingProduct('${g.id}')"><i class="fas fa-copy"></i></button>
      <button title="Eliminar" class="del" onclick="deleteGamingProduct('${g.id}')"><i class="fas fa-trash"></i></button>
    </div>
  </div>`;
}

/* ---------- MODAL ---------- */
window.openGamingModal = function () {
  currentEditId = null; currentImage = null;
  document.getElementById('gamingModalTitle').textContent = 'Nuevo producto gaming';
  document.getElementById('gamingForm').reset();
  document.getElementById('g_type').value = 'usb';
  document.getElementById('g_status').value = 'active';
  renderImagePreview();
  updateTypeFields();
  document.getElementById('gamingModal').classList.add('open');
};

window.editGamingProduct = function (id) {
  const g = allGaming.find(x => x.id === id); if (!g) return;
  currentEditId = id;
  currentImage = g.image_url || (Array.isArray(g.images) ? g.images[0] : null) || null;
  document.getElementById('gamingModalTitle').textContent = 'Editar producto gaming';
  set('g_name', g.name); set('g_type', g.gaming_type || 'usb'); set('g_platform', g.platform);
  set('g_price', g.price); set('g_old_price', g.old_price); set('g_description', g.description);
  set('g_brand', g.brand); set('g_stock', g.stock ?? 0);
  set('g_games_list', Array.isArray(g.games_list) ? g.games_list.join('\n') : '');
  set('g_delivery_code', g.delivery_code); set('g_duration', g.duration);
  document.getElementById('g_status').value = g.is_hidden ? 'hidden' : (g.status || 'active');
  renderImagePreview();
  updateTypeFields();
  document.getElementById('gamingModal').classList.add('open');
};

window.closeGamingModal = function () { document.getElementById('gamingModal').classList.remove('open'); };

window.deleteGamingProduct = async function (id) {
  if (!confirm('¿Eliminar este producto gaming?')) return;
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    toast('Producto eliminado', 'ok'); loadGaming();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.duplicateGamingProduct = async function (id) {
  const g = allGaming.find(x => x.id === id); if (!g) return;
  const copy = { ...g }; delete copy.id; delete copy.created_at; delete copy.updated_at;
  copy.name = (g.name || '') + ' (copia)';
  try {
    const { error } = await supabase.from('products').insert(copy);
    if (error) throw error;
    toast('Producto duplicado', 'ok'); loadGaming();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.saveGamingProduct = async function (e) {
  if (e && e.preventDefault) e.preventDefault();
  const name = val('g_name').trim();
  if (!name) { toast('El nombre es obligatorio', 'err'); return; }
  const price = parseFloat(val('g_price'));
  if (!(price > 0)) { toast('El precio debe ser mayor a 0', 'err'); return; }

  const btn = document.getElementById('gamingSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const type = val('g_type') || 'usb';
    const isDigital = type !== 'usb';
    const statusSel = val('g_status') || 'active';
    const isHidden = statusSel === 'hidden';
    const status = isHidden ? 'active' : statusSel;
    const gamesList = type === 'usb'
      ? val('g_games_list').split('\n').map(s => s.trim()).filter(Boolean)
      : [];

    const payload = {
      name,
      gaming_type: type,
      platform: val('g_platform') || null,
      price,
      old_price: val('g_old_price') ? parseFloat(val('g_old_price')) : null,
      description: val('g_description').trim() || null,
      is_digital: isDigital,
      status, is_hidden: isHidden, is_active: status==='active' && !isHidden,
      images: currentImage ? [currentImage] : [],
      image_url: currentImage || null,
      brand: type === 'usb' ? (val('g_brand').trim() || null) : null,
      stock: type === 'usb' ? (parseInt(val('g_stock')) || 0) : null,
      games_list: gamesList,
      delivery_code: type !== 'usb' ? (val('g_delivery_code').trim() || null) : null,
      duration: type === 'suscripcion' ? (val('g_duration').trim() || null) : null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (currentEditId) ({ error } = await supabase.from('products').update(payload).eq('id', currentEditId));
    else ({ error } = await supabase.from('products').insert(payload));
    if (error) throw error;

    toast(currentEditId ? 'Producto actualizado' : 'Producto creado', 'ok');
    closeGamingModal(); loadGaming();
  } catch (err) {
    console.error(err); toast('Error: ' + err.message, 'err');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
  }
};

/* ---------- imagen (una sola) ---------- */
async function handleImageUpload(e){
  const file = (e.target.files || [])[0];
  if (!file) return;
  const zone = document.getElementById('gamingUploadZone');
  zone.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Subiendo...</p>';
  try {
    const safe = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const path = 'products/gaming-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safe;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    currentImage = data.publicUrl;
  } catch (err) { console.error(err); toast('No se pudo subir la imagen', 'err'); }
  zone.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Hacé clic o arrastrá una imagen</p>';
  e.target.value = ''; renderImagePreview(); updatePreview();
}

function renderImagePreview(){
  const box = document.getElementById('gamingImagePreview');
  box.innerHTML = currentImage
    ? `<div class="img-prev"><span class="img-main">Principal</span><img src="${currentImage}" alt=""><button type="button" onclick="removeGamingImage()"><i class="fas fa-times"></i></button></div>`
    : '';
}
window.removeGamingImage = function(){ currentImage = null; renderImagePreview(); updatePreview(); };

/* ---------- helpers ---------- */
function val(id){ return (document.getElementById(id)?.value ?? ''); }
function set(id, v){ const el = document.getElementById(id); if (el) el.value = (v ?? ''); }
function money(n){ return Number(n || 0).toLocaleString('es-AR'); }
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escAttr(s){ return escapeHtml(s).replace(/"/g, '&quot;'); }
function toast(msg, type){ const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'"></i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }
