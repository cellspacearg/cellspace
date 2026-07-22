import { supabase } from '../config.js';
import { store } from '../core/state.js';

let allServices = [];
let currentEditId = null;
let currentGallery = [];

const SERVICE_TYPES = [
  'Cambio de pantalla','Cambio de batería','Pin de carga / conector',
  'Face ID / Touch ID','Micrófono / parlante','Cámara',
  'Software / flasheo','Liberación / desbloqueo','Microsoldadura','Diagnóstico','Otro'
];

// ---------- VISTA ----------
export async function servicesView() {
  const state = store.getState();
  const userName = state.user?.email?.split('@')[0] || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();
  const typeOptions = SERVICE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');

  return `
  <div class="admin-layout">
    <aside class="admin-sidebar" id="adminSidebar">
      <div class="sidebar-header">
        <img src="../assets/logo.png" alt="Cell Space" class="sidebar-logo" onerror="this.style.display='none'">
        <div class="sidebar-brand"><span class="brand-name">CELL SPACE</span><span class="brand-sub">CMS Panel</span></div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section"><span class="nav-section-title">Principal</span>
          <a href="#/dashboard" class="nav-item"><i class="fas fa-home"></i><span>Dashboard</span></a></div>
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
        <div class="topbar-left">
          <button class="sidebar-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button>
          <h1 class="page-title">Servicios Técnicos</h1>
        </div>
        <div class="topbar-right">
          <div class="user-menu">
            <button class="user-btn" id="userMenuBtn">
              <div class="user-avatar">${userInitial}</div>
              <div class="user-info"><span class="user-name">${userName}</span><span class="user-role">Administrador</span></div>
              <i class="fas fa-chevron-down"></i>
            </button>
            <div class="user-dropdown" id="userDropdown">
              <a href="#/dashboard" class="dropdown-item"><i class="fas fa-home"></i><span>Dashboard</span></a>
              <div class="dropdown-divider"></div>
              <a href="#" class="dropdown-item logout" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i><span>Cerrar sesión</span></a>
            </div>
          </div>
        </div>
      </header>

      <main class="admin-content">
        <div class="content-wrapper">
          <div class="products-toolbar">
            <div class="toolbar-filters">
              <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="serviceSearch" placeholder="Buscar por título, marca o modelo...">
              </div>
              <select id="filterType" class="filter-select">
                <option value="">Todos los servicios</option>
                ${typeOptions}
              </select>
              <select id="filterVis" class="filter-select">
                <option value="">Todas las visibilidades</option>
                <option value="visible">Visibles</option>
                <option value="hidden">Ocultos</option>
                <option value="draft">Borradores</option>
              </select>
            </div>
            <button class="btn-primary" onclick="openServiceModal()"><i class="fas fa-plus"></i> Nuevo Servicio</button>
          </div>

          <div class="products-count" id="servicesCount">Cargando...</div>
          <div class="admin-products-grid" id="servicesGrid"></div>
        </div>
      </main>

      <footer class="admin-footer">
        <div class="footer-content"><span>&copy; 2026 Cell Space Argentina.</span><span class="footer-version">CMS v1.0.0</span></div>
      </footer>
    </div>
  </div>

  <!-- MODAL SERVICIO -->
  <div class="modal-overlay" id="serviceModal">
    <div class="modal-box modal-lg">
      <div class="modal-header">
        <h2 id="svcModalTitle">Nuevo Servicio</h2>
        <button class="modal-close" onclick="closeServiceModal()"><i class="fas fa-times"></i></button>
      </div>
      <form id="serviceForm" class="modal-body">
        <div class="form-row"><div class="form-group full"><label>Título *</label><input type="text" id="s_title" required placeholder="Ej: Cambio de pantalla iPhone 13"></div></div>
        <div class="form-row">
          <div class="form-group"><label>Tipo de servicio</label><select id="s_type"><option value="">Seleccionar...</option>${typeOptions}</select></div>
          <div class="form-group"><label>Marca</label><input type="text" id="s_brand" placeholder="Apple, Samsung..."></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Modelo</label><input type="text" id="s_model" placeholder="iPhone 13, A54..."></div>
          <div class="form-group"><label>Precio</label><input type="number" id="s_price" step="0.01" min="0" placeholder="Dejar vacío = Consultar"></div>
        </div>
        <div class="form-row checks">
          <label class="check"><input type="checkbox" id="s_price_from"><span>Mostrar como "Desde $..."</span></label>
          <label class="check"><input type="checkbox" id="s_featured"><span>Destacado</span></label>
          <label class="check"><input type="checkbox" id="s_visible" checked><span>Visible en el sitio</span></label>
        </div>

        <!-- Editor enriquecido -->
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

        <!-- Video -->
        <div class="form-row"><div class="form-group full">
          <label>Video de YouTube (URL)</label>
          <input type="url" id="s_video" placeholder="https://www.youtube.com/watch?v=...">
          <small class="field-hint">Opcional. Se muestra como complemento del servicio.</small>
        </div></div>

        <!-- Galería -->
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

        <!-- SEO -->
        <div class="form-row"><div class="form-group full"><label class="seo-label"><i class="fas fa-search"></i> SEO</label></div></div>
        <div class="form-row"><div class="form-group full"><label>Meta título</label><input type="text" id="s_meta_title" placeholder="Título para Google"></div></div>
        <div class="form-row"><div class="form-group full"><label>Meta descripción</label><textarea id="s_meta_desc" rows="2" placeholder="Descripción corta para buscadores"></textarea></div></div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeServiceModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="svcSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>
  `;
}

// ---------- MOUNT ----------
export function servicesViewOnMount() {
  wireLayout();
  document.getElementById('serviceSearch').addEventListener('input', applyFilters);
  document.getElementById('filterType').addEventListener('change', applyFilters);
  document.getElementById('filterVis').addEventListener('change', applyFilters);
  document.getElementById('serviceForm').addEventListener('submit', saveService);

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

function wireLayout() {
  const t = document.getElementById('sidebarToggle'), s = document.getElementById('adminSidebar'), o = document.getElementById('sidebarOverlay');
  if (t) t.onclick = () => { s.classList.toggle('open'); o.classList.toggle('active'); };
  if (o) o.onclick = () => { s.classList.remove('open'); o.classList.remove('active'); };
  const ub = document.getElementById('userMenuBtn'), ud = document.getElementById('userDropdown');
  if (ub) ub.onclick = e => { e.stopPropagation(); ud.classList.toggle('active'); };
  document.addEventListener('click', () => ud && ud.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.getAttribute('href') === (window.location.hash || '')));
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

function applyFilters() {
  const q = (document.getElementById('serviceSearch').value || '').toLowerCase().trim();
  const tp = document.getElementById('filterType').value;
  const vis = document.getElementById('filterVis').value;

  const list = allServices.filter(s => {
    const matchQ = !q || (s.title||'').toLowerCase().includes(q) || (s.brand||'').toLowerCase().includes(q) || (s.model||'').toLowerCase().includes(q);
    const matchT = !tp || s.service_type === tp;
    let matchV = true;
    if (vis === 'visible') matchV = s.is_visible && s.status !== 'draft';
    if (vis === 'hidden') matchV = !s.is_visible;
    if (vis === 'draft') matchV = s.status === 'draft';
    return matchQ && matchT && matchV;
  });

  document.getElementById('servicesCount').textContent = list.length + ' servicio(s)';
  renderServices(list);
}

function renderServices(list) {
  const grid = document.getElementById('servicesGrid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><i class="fas fa-screwdriver-wrench"></i></div>
      <h2>No hay servicios</h2>
      <p>Creá tu primer servicio técnico para publicarlo.</p>
      <div class="empty-actions"><button class="btn-primary" onclick="openServiceModal()"><i class="fas fa-plus"></i> Crear Servicio</button></div>
    </div>`;
    return;
  }
  grid.innerHTML = list.map(s => {
    const gal = Array.isArray(s.gallery) ? s.gallery : [];
    const thumb = s.image_url || gal[0];
    const state = !s.is_visible ? 'Oculto' : (s.status === 'draft' ? 'Borrador' : 'Visible');
    const stateClass = !s.is_visible ? 'st-hidden' : (s.status === 'draft' ? 'st-draft' : 'st-active');
    let priceTxt = 'Consultar';
    if (s.price != null && s.price !== '') priceTxt = (s.is_price_from ? 'Desde ' : '') + '$' + Number(s.price).toLocaleString('es-AR');
    return `<div class="admin-product-card">
      <div class="ap-thumb">${thumb ? '<img src="'+thumb+'" alt="">' : '<i class="fas fa-screwdriver-wrench"></i>'}</div>
      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-cat">${escapeHtml(s.service_type || 'Servicio')}</span>
          <span class="ap-state ${stateClass}">${state}</span>
          ${s.is_featured ? '<span class="ap-feat"><i class="fas fa-star"></i></span>' : ''}
        </div>
        <h4 class="ap-name">${escapeHtml(s.title)}</h4>
        <div class="ap-meta">${[s.brand, s.model].filter(Boolean).map(escapeHtml).join(' · ')}${s.video_url ? ' · <i class="fas fa-video"></i> video' : ''}${gal.length ? ' · <i class="fas fa-images"></i> '+gal.length : ''}</div>
        <div class="ap-price">${escapeHtml(priceTxt)}</div>
      </div>
      <div class="ap-actions">
        <button title="Editar" onclick="editService('${s.id}')"><i class="fas fa-pen"></i></button>
        <button title="Duplicar" onclick="duplicateService('${s.id}')"><i class="fas fa-copy"></i></button>
        <button title="Eliminar" class="del" onclick="deleteService('${s.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

// ---------- MODAL ----------
window.openServiceModal = function () {
  currentEditId = null; currentGallery = [];
  document.getElementById('svcModalTitle').textContent = 'Nuevo Servicio';
  document.getElementById('serviceForm').reset();
  document.getElementById('s_visible').checked = true;
  document.getElementById('rteEditor').innerHTML = '';
  renderGallery();
  document.getElementById('serviceModal').classList.add('open');
};

window.editService = async function (id) {
  const s = allServices.find(x => x.id === id);
  if (!s) return;
  currentEditId = id;
  currentGallery = Array.isArray(s.gallery) ? [...s.gallery] : (s.image_url ? [s.image_url] : []);
  document.getElementById('svcModalTitle').textContent = 'Editar Servicio';
  set('s_title', s.title); set('s_type', s.service_type); set('s_brand', s.brand);
  set('s_model', s.model); set('s_price', s.price); set('s_video', s.video_url);
  set('s_meta_title', s.meta_title); set('s_meta_desc', s.meta_description);
  document.getElementById('s_price_from').checked = !!s.is_price_from;
  document.getElementById('s_featured').checked = !!s.is_featured;
  document.getElementById('s_visible').checked = s.is_visible !== false;
  document.getElementById('rteEditor').innerHTML = s.description || '';
  renderGallery();
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
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const rawDesc = document.getElementById('rteEditor').innerHTML;
    const desc = (!rawDesc || rawDesc === '<br>' || rawDesc.replace(/<[^>]*>/g,'').trim() === '') ? null : rawDesc;
    const isVisible = document.getElementById('s_visible').checked;
    const payload = {
      title: val('s_title').trim(),
      service_type: val('s_type') || null,
      brand: val('s_brand').trim() || null,
      model: val('s_model').trim() || null,
      price: val('s_price') === '' ? null : parseFloat(val('s_price')),
      is_price_from: document.getElementById('s_price_from').checked,
      description: desc,
      video_url: val('s_video').trim() || null,
      meta_title: val('s_meta_title').trim() || null,
      meta_description: val('s_meta_desc').trim() || null,
      is_visible: isVisible,
      is_featured: document.getElementById('s_featured').checked,
      status: isVisible ? 'active' : 'draft',
      gallery: currentGallery,
      image_url: currentGallery[0] || null,
      updated_at: new Date().toISOString()
    };
    if (!payload.title) throw new Error('El título es obligatorio');

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
  e.target.value = ''; renderGallery();
}

function renderGallery() {
  const box = document.getElementById('svcImagePreviews');
  if (!box) return;
  box.innerHTML = currentGallery.map((url, i) =>
    `<div class="img-prev">${i===0?'<span class="img-main">Principal</span>':''}<img src="${url}" alt=""><button type="button" onclick="removeGallery(${i})"><i class="fas fa-times"></i></button></div>`
  ).join('');
}
window.removeGallery = function (i) { currentGallery.splice(i, 1); renderGallery(); };

// ---------- HELPERS ----------
function val(id) { return (document.getElementById(id)?.value ?? ''); }
function set(id, v) { const el = document.getElementById(id); if (el) el.value = (v ?? ''); }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok');
  t.innerHTML = '<i class="fas ' + (type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check') + '"></i> ' + msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}
window.handleLogout = async () => { if (confirm('¿Cerrar sesión?')) { const { logout } = await import('../hooks/useAuth.js'); await logout(); } };
