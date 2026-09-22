import { supabase } from '../config.js?v=cb22';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb22';

let allServices = [];
let currentEditId = null;
let currentGallery = [];
let currentDeviceFilter = '';

const SERVICE_TYPES = [
  'Cambio de pantalla','Cambio de batería','Pin de carga / conector',
  'Face ID / Touch ID','Micrófono / parlante','Cámara',
  'Software / flasheo','Liberación / desbloqueo','Microsoldadura','Diagnóstico',
  'Armado de PC','Mantenimiento','Otro'
];

const DEVICE_TYPES = {
  celular:    { label: 'Celular',     icon: 'fas fa-mobile-screen', color: '#FF6A00' },
  tablet:     { label: 'Tablet',      icon: 'fas fa-tablet-screen-button', color: '#2F7BFF' },
  consola:    { label: 'Consola',     icon: 'fas fa-gamepad', color: '#8b5cf6' },
  pc:         { label: 'PC',          icon: 'fas fa-desktop', color: '#10c46a' },
  notebook:   { label: 'Notebook',    icon: 'fas fa-laptop', color: '#FFD700' },
  netbook:    { label: 'Netbook',     icon: 'fas fa-laptop-code', color: '#E8B4B8' },
  mac:        { label: 'Mac / Apple', icon: 'fab fa-apple', color: '#888' },
  otro:       { label: 'Otro',        icon: 'fas fa-microchip', color: '#666' },
};

// ---------- VISTA ----------
export async function servicesView() {
  const typeOptions = SERVICE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
  const deviceOptions = Object.entries(DEVICE_TYPES).map(([k,d]) => `<option value="${k}">${d.label}</option>`).join('');

  let brands = [];
  try {
    const { data, error } = await supabase.from('services').select('brand');
    if (!error && data) brands = [...new Set(data.map(r => r.brand).filter(Boolean))].sort();
  } catch (e) { console.warn('No se pudieron cargar marcas de servicios', e); }

  const content = `
    <div class="section-filters" id="quickFilters"></div>
    <div class="admin-products-grid" id="servicesGrid"></div>`;

  const toolbarHtml = toolbar({
    searchId: 'serviceSearch',
    searchPlaceholder: 'Buscar por título, marca o modelo...',
    filters: [
      { id: 'filterType', options: [{ v:'', l:'Todos los tipos' }, ...SERVICE_TYPES.map(t => ({ v:t, l:t }))] },
      { id: 'filterDevice', options: [{ v:'', l:'Todos los equipos' }, ...Object.entries(DEVICE_TYPES).map(([k,d]) => ({ v:k, l:d.label }))] },
      { id: 'filterBrand', options: [{ v:'', l:'Todas las marcas' }, ...brands.map(b => ({ v:b, l:b }))] },
    ],
    countId: 'servicesCount',
    action: { label: 'Nuevo Servicio', icon: 'fas fa-plus', onclick: 'openServiceModal()' },
  });

  const modal = `
  <div class="modal-overlay" id="serviceModal">
    <div class="modal-box modal-xl">
      <div class="modal-header">
        <h2 id="svcModalTitle">Nuevo Servicio</h2>
        <button class="modal-close" onclick="closeServiceModal()"><i class="fas fa-times"></i></button>
      </div>
      <form id="serviceForm">
        <div class="prod-modal-body">
          <div class="prod-modal-form">

            <div class="prod-tabs">
              <button type="button" class="prod-tab active" data-tab="basico"><span class="prod-tab-num">1</span> Básico</button>
              <button type="button" class="prod-tab" data-tab="descripcion"><span class="prod-tab-num">2</span> Descripción</button>
              <button type="button" class="prod-tab" data-tab="visibilidad"><span class="prod-tab-num">3</span> Visibilidad</button>
            </div>

            <div class="prod-tab-panel" data-panel="basico">
              <div class="form-row"><div class="form-group full"><label>Título *</label><input type="text" id="s_title" required placeholder="Ej: Cambio de pantalla iPhone 13"></div></div>
              <div class="form-row">
                <div class="form-group"><label>Tipo de servicio</label><select id="s_type"><option value="">Seleccionar...</option>${typeOptions}</select></div>
                <div class="form-group"><label>Tipo de equipo</label><select id="s_device_type"><option value="">Seleccionar...</option>${deviceOptions}</select></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Marca</label><input type="text" id="s_brand" placeholder="Apple, Samsung..."></div>
                <div class="form-group"><label>Modelo</label><input type="text" id="s_model" placeholder="iPhone 13, A54..."></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Precio desde</label><input type="number" id="s_price_from" step="0.01" min="0" placeholder="Opcional"></div>
                <div class="form-group"><label>Precio hasta</label><input type="number" id="s_price_to" step="0.01" min="0" placeholder="Opcional, >= precio desde"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Precio fijo</label><input type="number" id="s_price" step="0.01" min="0" placeholder="Si no querés rango, dejar vacío = Consultar"></div>
              </div>
            </div>

            <div class="prod-tab-panel" data-panel="descripcion" hidden>
              <div class="form-row"><div class="form-group full">
                <label>Descripción</label>
                <div class="rte-toolbar">
                  <button type="button" class="rte-btn" data-cmd="bold" title="Negrita"><b>B</b></button>
                  <button type="button" class="rte-btn" data-cmd="italic" title="Cursiva"><i>I</i></button>
                  <button type="button" class="rte-btn" data-cmd="underline" title="Subrayado"><u>U</u></button>
                  <span class="rte-sep"></span>
                  <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista"><i class="fas fa-list-ul"></i></button>
                  <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="Lista numerada"><i class="fas fa-list-ol"></i></button>
                  <span class="rte-sep"></span>
                  <button type="button" class="rte-btn" data-cmd="createLink" title="Insertar link"><i class="fas fa-link"></i></button>
                  <button type="button" class="rte-btn" data-cmd="removeFormat" title="Limpiar formato"><i class="fas fa-eraser"></i></button>
                </div>
                <div class="rte-editor" id="rteEditor" contenteditable="true" data-placeholder="Describí el servicio..."></div>
              </div></div>

              <div class="form-row"><div class="form-group full">
                <label>Video de YouTube (URL)</label>
                <input type="url" id="s_video" placeholder="https://www.youtube.com/watch?v=...">
                <small class="field-hint">Opcional. Se muestra como complemento del servicio.</small>
              </div></div>

              <div class="form-row"><div class="form-group full">
                <label>Galería de imágenes</label>
                <div class="upload-zone" id="svcUploadZone">
                  <input type="file" id="s_gallery" accept="image/*" multiple style="display:none">
                  <i class="fas fa-cloud-upload-alt"></i>
                  <p>Hacé clic o arrastrá imágenes</p>
                  <span>La primera se usa como imagen principal</span>
                </div>
                <div class="image-previews" id="svcImagePreviews"></div>
              </div></div>
            </div>

            <div class="prod-tab-panel" data-panel="visibilidad" hidden>
              <div class="form-row checks">
                <label class="check"><input type="checkbox" id="s_visible" checked><span>Visible en el sitio</span></label>
                <label class="check"><input type="checkbox" id="s_featured"><span>Destacado</span></label>
              </div>
              <div class="form-row"><div class="form-group full"><label>Badge</label><input type="text" id="s_badge" placeholder="OFERTA, NUEVO..."></div></div>
              <div class="form-row"><div class="form-group full"><label class="seo-label"><i class="fas fa-search"></i> SEO</label></div></div>
              <div class="form-row"><div class="form-group full"><label>Meta título</label><input type="text" id="s_meta_title" placeholder="Título para Google"></div></div>
              <div class="form-row"><div class="form-group full"><label>Meta descripción</label><textarea id="s_meta_desc" rows="2" placeholder="Descripción corta para buscadores"></textarea></div></div>
            </div>

          </div>

          <div class="prod-modal-preview">
            <h4>Vista previa</h4>
            <div class="preview-service" id="servicePreview">
              <div class="pvs-type" id="pvs_type">SERVICIO</div>
              <div class="pvs-img" id="pvs_img"><i class="fas fa-screwdriver-wrench"></i></div>
              <div class="pvs-name" id="pvs_name">Título del servicio</div>
              <div class="pvs-meta" id="pvs_meta"></div>
              <div class="pvs-price" id="pvs_price">Consultar</div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="padding:16px 24px;">
          <button type="button" class="btn-secondary" onclick="closeServiceModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="svcSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>`;

  return layout({ title: 'Servicios Técnicos', toolbar: toolbarHtml, content }) + modal;
}

// ---------- MOUNT ----------
export function servicesViewOnMount() {
  mountLayout();
  document.getElementById('serviceSearch').addEventListener('input', applyFilters);
  document.getElementById('filterType').addEventListener('change', applyFilters);
  document.getElementById('filterDevice').addEventListener('change', applyFilters);
  document.getElementById('filterBrand').addEventListener('change', applyFilters);
  document.getElementById('serviceForm').addEventListener('submit', saveService);

  document.querySelectorAll('.prod-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  ['s_title','s_brand','s_model','s_price','s_price_from','s_price_to'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
  });
  document.getElementById('s_type').addEventListener('change', updatePreview);
  document.getElementById('s_device_type').addEventListener('change', updatePreview);

  // Editor enriquecido: mousedown para no perder la selección
  document.querySelectorAll('.rte-btn').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      if (cmd === 'createLink') {
        const url = prompt('URL del enlace:', 'https://');
        if (url) document.execCommand('createLink', false, url);
      } else {
        document.execCommand(cmd, false, null);
      }
      document.getElementById('rteEditor').focus();
    });
  });

  // Upload galería
  const zone = document.getElementById('svcUploadZone');
  const fileInput = document.getElementById('s_gallery');
  zone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleGalleryUpload);
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag');
    fileInput.files = e.dataTransfer.files; handleGalleryUpload({ target: fileInput });
  });

  loadServices();
}

function switchTab(tabId){
  document.querySelectorAll('.prod-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.prod-tab-panel').forEach(p => p.hidden = p.dataset.panel !== tabId);
  document.querySelector('.prod-modal-form').scrollTop = 0;
}

function updatePreview(){
  const title = val('s_title').trim() || 'Título del servicio';
  const type = val('s_type') || 'SERVICIO';
  const deviceKey = val('s_device_type');
  const device = DEVICE_TYPES[deviceKey];
  const brand = val('s_brand').trim();
  const model = val('s_model').trim();
  const img = currentGallery[0];

  document.getElementById('pvs_type').textContent = type.toUpperCase();
  document.getElementById('pvs_name').textContent = title;
  document.getElementById('pvs_meta').textContent = [brand, model].filter(Boolean).join(' · ');
  document.getElementById('pvs_img').innerHTML = img
    ? `<img src="${escAttr(img)}" alt="">`
    : `<i class="${device ? device.icon : 'fas fa-screwdriver-wrench'}"></i>`;

  const priceFrom = val('s_price_from'), priceTo = val('s_price_to'), price = val('s_price');
  document.getElementById('pvs_price').textContent = priceDisplay({
    price_from: priceFrom === '' ? null : parseFloat(priceFrom),
    price_to: priceTo === '' ? null : parseFloat(priceTo),
    price: price === '' ? null : parseFloat(price),
  });
}

// ---------- DATA ----------
async function loadServices() {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando servicios...</p>';
  try {
    const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allServices = data || [];
    applyFilters();
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<p class="loading-text" style="color:#ff4444">Error al cargar: ' + e.message + '</p>';
  }
}

function renderQuickFilters(){
  const counts = {};
  allServices.forEach(s => { const d = s.device_type || 'otro'; counts[d] = (counts[d]||0) + 1; });
  const keys = Object.keys(DEVICE_TYPES).filter(k => counts[k] > 0);
  const html = [`<button type="button" class="section-pill ${currentDeviceFilter==='' ? 'on':''}" data-device="">Todos: ${allServices.length}</button>`]
    .concat(keys.map(k => `<button type="button" class="section-pill ${currentDeviceFilter===k?'on':''}" data-device="${k}" style="--cat-color:${DEVICE_TYPES[k].color}"><i class="${DEVICE_TYPES[k].icon}"></i> ${escapeHtml(DEVICE_TYPES[k].label)}: ${counts[k]}</button>`))
    .join('');
  const box = document.getElementById('quickFilters');
  box.innerHTML = html;
  box.querySelectorAll('.section-pill').forEach(pill => pill.addEventListener('click', () => {
    currentDeviceFilter = pill.dataset.device;
    applyFilters();
  }));
}

function applyFilters() {
  const q = (document.getElementById('serviceSearch').value || '').toLowerCase().trim();
  const tp = document.getElementById('filterType').value;
  const dv = document.getElementById('filterDevice').value;
  const br = document.getElementById('filterBrand').value;

  const list = allServices.filter(s => {
    const matchQ = !q || (s.title||'').toLowerCase().includes(q) || (s.brand||'').toLowerCase().includes(q) || (s.model||'').toLowerCase().includes(q);
    const matchT = !tp || s.service_type === tp;
    const matchDv = !dv || (s.device_type||'otro') === dv;
    const matchBr = !br || s.brand === br;
    const matchQuick = !currentDeviceFilter || (s.device_type||'otro') === currentDeviceFilter;
    return matchQ && matchT && matchDv && matchBr && matchQuick;
  });

  document.getElementById('servicesCount').textContent = list.length + ' servicio(s)';
  renderQuickFilters();
  renderServices(list);
}

function renderServices(list) {
  const grid = document.getElementById('servicesGrid');
  if (!list.length) {
    grid.innerHTML = emptyState({
      icon: 'fas fa-screwdriver-wrench',
      title: 'No hay servicios',
      text: 'Creá tu primer servicio técnico para publicarlo.',
      action: { label: 'Crear Servicio', icon: 'fas fa-plus', onclick: 'openServiceModal()' },
    });
    return;
  }

  const grouped = {};
  list.forEach(s => { const d = s.device_type || 'otro'; (grouped[d] = grouped[d] || []).push(s); });

  grid.innerHTML = Object.entries(grouped)
    .filter(([_, arr]) => arr.length > 0)
    .map(([deviceKey, arr]) => {
      const d = DEVICE_TYPES[deviceKey] || DEVICE_TYPES.otro;
      return `
        <div class="cat-section">
          <div class="cat-section-head" style="--cat-color: ${d.color}">
            <i class="${d.icon}"></i>
            <span>${escapeHtml(d.label)}</span>
            <span class="cat-section-count">${arr.length}</span>
          </div>
          <div class="cat-section-list">
            ${arr.map(s => renderServiceCard(s, d)).join('')}
          </div>
        </div>`;
    }).join('');
}

function renderServiceCard(s, d) {
  const gal = Array.isArray(s.gallery) ? s.gallery : [];
  const thumb = s.image_url || gal[0];
  const state = !s.is_visible ? 'Oculto' : (s.status === 'draft' ? 'Borrador' : 'Visible');
  const stateClass = !s.is_visible ? 'st-hidden' : (s.status === 'draft' ? 'st-draft' : 'st-active');
  return `<div class="admin-product-card" style="--cat-color: ${d.color}">
      <div class="ap-thumb">${thumb ? '<img src="'+thumb+'" alt="">' : `<i class="${d.icon}"></i>`}</div>
      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-cat">${escapeHtml(s.service_type || 'Servicio')}</span>
          <span class="ap-state ${stateClass}">${state}</span>
          ${s.is_featured ? '<span class="ap-feat"><i class="fas fa-star"></i></span>' : ''}
          ${s.badge ? `<span class="ap-state st-draft">${escapeHtml(s.badge)}</span>` : ''}
        </div>
        <h4 class="ap-name">${escapeHtml(s.title)}</h4>
        <div class="ap-meta">${[s.brand, s.model].filter(Boolean).map(escapeHtml).join(' · ')}${s.video_url ? ' · <i class="fas fa-video"></i> video' : ''}${gal.length ? ' · <i class="fas fa-images"></i> '+gal.length : ''}</div>
        <div class="ap-price">${escapeHtml(priceDisplay(s))}</div>
      </div>
      <div class="ap-actions">
        <button title="Editar" onclick="editService('${s.id}')"><i class="fas fa-pen"></i></button>
        <button title="Duplicar" onclick="duplicateService('${s.id}')"><i class="fas fa-copy"></i></button>
        <button title="Eliminar" class="del" onclick="deleteService('${s.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
}

/** Texto de precio de un servicio. Compatible con registros viejos (price + is_price_from). */
function priceDisplay(s) {
  const from = s.price_from != null && s.price_from !== '' ? Number(s.price_from) : null;
  const to = s.price_to != null && s.price_to !== '' ? Number(s.price_to) : null;
  if (from != null) {
    return to != null ? `Desde $${money(from)} — hasta $${money(to)}` : `Desde $${money(from)}`;
  }
  if (s.price != null && s.price !== '') {
    return (s.is_price_from ? 'Desde ' : '') + '$' + money(s.price);
  }
  return 'Consultar';
}
function money(n) { return Number(n || 0).toLocaleString('es-AR'); }

// ---------- MODAL ----------
window.openServiceModal = function () {
  currentEditId = null; currentGallery = [];
  document.getElementById('svcModalTitle').textContent = 'Nuevo Servicio';
  document.getElementById('serviceForm').reset();
  document.getElementById('s_visible').checked = true;
  document.getElementById('rteEditor').innerHTML = '';
  renderGallery();
  switchTab('basico');
  updatePreview();
  document.getElementById('serviceModal').classList.add('open');
};

window.editService = async function (id) {
  const s = allServices.find(x => x.id === id);
  if (!s) return;
  currentEditId = id;
  currentGallery = Array.isArray(s.gallery) ? [...s.gallery] : (s.image_url ? [s.image_url] : []);
  document.getElementById('svcModalTitle').textContent = 'Editar Servicio';
  set('s_title', s.title); set('s_type', s.service_type); set('s_device_type', s.device_type || '');
  set('s_brand', s.brand); set('s_model', s.model);
  set('s_price', s.price); set('s_price_from', s.price_from); set('s_price_to', s.price_to);
  set('s_video', s.video_url);
  set('s_badge', s.badge);
  set('s_meta_title', s.meta_title); set('s_meta_desc', s.meta_description);
  document.getElementById('s_featured').checked = !!s.is_featured;
  document.getElementById('s_visible').checked = s.is_visible !== false;
  document.getElementById('rteEditor').innerHTML = s.description || '';
  renderGallery();
  switchTab('basico');
  updatePreview();
  document.getElementById('serviceModal').classList.add('open');
};

window.closeServiceModal = function () { document.getElementById('serviceModal').classList.remove('open'); };

window.deleteService = async function (id) {
  if (!confirm('¿Eliminar este servicio?')) return;
  try {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
    toast('Servicio eliminado', 'ok'); loadServices();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.duplicateService = async function (id) {
  const s = allServices.find(x => x.id === id);
  if (!s) return;
  const copy = { ...s }; delete copy.id; delete copy.created_at; delete copy.updated_at;
  copy.title = (s.title || '') + ' (copia)';
  try {
    const { error } = await supabase.from('services').insert(copy);
    if (error) throw error;
    toast('Servicio duplicado', 'ok'); loadServices();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

// ---------- SAVE ----------
async function saveService(e) {
  e.preventDefault();
  const btn = document.getElementById('svcSaveBtn');

  if (!val('s_title').trim()) { toast('El título es obligatorio', 'err'); return; }
  const priceFromRaw = val('s_price_from'), priceToRaw = val('s_price_to');
  if (priceFromRaw !== '' && priceToRaw !== '' && parseFloat(priceToRaw) < parseFloat(priceFromRaw)) {
    toast('El precio hasta debe ser mayor o igual al precio desde', 'err'); return;
  }

  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const rawDesc = document.getElementById('rteEditor').innerHTML;
    const desc = (!rawDesc || rawDesc === '<br>' || rawDesc.replace(/<[^>]*>/g,'').trim() === '') ? null : rawDesc;
    const isVisible = document.getElementById('s_visible').checked;
    const payload = {
      title: val('s_title').trim(),
      service_type: val('s_type') || null,
      device_type: val('s_device_type') || null,
      brand: val('s_brand').trim() || null,
      model: val('s_model').trim() || null,
      price: val('s_price') === '' ? null : parseFloat(val('s_price')),
      price_from: priceFromRaw === '' ? null : parseFloat(priceFromRaw),
      price_to: priceToRaw === '' ? null : parseFloat(priceToRaw),
      description: desc,
      video_url: val('s_video').trim() || null,
      badge: val('s_badge').trim() || null,
      meta_title: val('s_meta_title').trim() || null,
      meta_description: val('s_meta_desc').trim() || null,
      is_visible: isVisible,
      is_featured: document.getElementById('s_featured').checked,
      status: isVisible ? 'active' : 'draft',
      gallery: currentGallery,
      image_url: currentGallery[0] || null,
      updated_at: new Date().toISOString()
    };

    let error;
    if (currentEditId) ({ error } = await supabase.from('services').update(payload).eq('id', currentEditId));
    else ({ error } = await supabase.from('services').insert(payload));
    if (error) throw error;

    toast(currentEditId ? 'Servicio actualizado' : 'Servicio creado', 'ok');
    closeServiceModal(); loadServices();
  } catch (err) {
    console.error(err); toast('Error: ' + err.message, 'err');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
  }
}

// ---------- GALLERY ----------
async function handleGalleryUpload(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const zone = document.getElementById('svcUploadZone');
  zone.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Subiendo...</p>';
  for (const file of files) {
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const path = 'services/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safe;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      currentGallery.push(data.publicUrl);
    } catch (err) { console.error(err); toast('No se pudo subir ' + file.name, 'err'); }
  }
  zone.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Hacé clic o arrastrá imágenes</p><span>La primera se usa como imagen principal</span>';
  e.target.value = ''; renderGallery(); updatePreview();
}

function renderGallery() {
  const box = document.getElementById('svcImagePreviews');
  if (!box) return;
  box.innerHTML = currentGallery.map((url, i) =>
    `<div class="img-prev">${i===0?'<span class="img-main">Principal</span>':''}<img src="${url}" alt=""><button type="button" onclick="removeGallery(${i})"><i class="fas fa-times"></i></button></div>`
  ).join('');
}
window.removeGallery = function (i) { currentGallery.splice(i, 1); renderGallery(); updatePreview(); };

// ---------- HELPERS ----------
function val(id) { return (document.getElementById(id)?.value ?? ''); }
function set(id, v) { const el = document.getElementById(id); if (el) el.value = (v ?? ''); }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok');
  t.innerHTML = '<i class="fas ' + (type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check') + '"></i> ' + msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}
