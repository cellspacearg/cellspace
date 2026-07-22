import { supabase } from '../config.js';
import { store } from '../core/state.js';

let allPages = [];
let currentEditId = null;

const BLOCK_TYPES = [
  { v: 'heading',  l: 'Título' },
  { v: 'text',     l: 'Texto' },
  { v: 'image',    l: 'Imagen' },
  { v: 'hero',     l: 'Hero / Portada' },
  { v: 'faq',      l: 'Preguntas (FAQ)' },
  { v: 'buttons',  l: 'Botones' },
  { v: 'divider',  l: 'Separador' }
];

const SEED = [
  { title: 'Inicio',                 slug: 'inicio' },
  { title: 'Nosotros',               slug: 'nosotros' },
  { title: 'Contacto',               slug: 'contacto' },
  { title: 'Garantía',               slug: 'garantia' },
  { title: 'Preguntas Frecuentes',   slug: 'preguntas-frecuentes' },
  { title: 'Políticas',              slug: 'politicas' }
];

// ---------- VISTA ----------
export async function pagesView() {
  const state = store.getState();
  const userName = state.user?.email?.split('@')[0] || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();
  const typeOptions = BLOCK_TYPES.map(t => `<option value="${t.v}">${t.l}</option>`).join('');

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
          <h1 class="page-title">Páginas</h1>
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
                <input type="text" id="pageSearch" placeholder="Buscar por título o slug...">
              </div>
              <select id="filterPageStatus" class="filter-select">
                <option value="">Todos los estados</option>
                <option value="published">Publicadas</option>
                <option value="draft">Borradores</option>
              </select>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn-secondary" onclick="seedPages()"><i class="fas fa-wand-magic-sparkles"></i> Crear páginas predeterminadas</button>
              <button class="btn-primary" onclick="openPageModal()"><i class="fas fa-plus"></i> Nueva Página</button>
            </div>
          </div>

          <div class="products-count" id="pagesCount">Cargando...</div>
          <div class="admin-products-grid" id="pagesGrid"></div>
        </div>
      </main>

      <footer class="admin-footer">
        <div class="footer-content"><span>&copy; 2026 Cell Space Argentina.</span><span class="footer-version">CMS v1.0.0</span></div>
      </footer>
    </div>
  </div>

  <!-- MODAL PÁGINA -->
  <div class="modal-overlay" id="pageModal">
    <div class="modal-box modal-lg">
      <div class="modal-header">
        <h2 id="pageModalTitle">Nueva Página</h2>
        <button class="modal-close" onclick="closePageModal()"><i class="fas fa-times"></i></button>
      </div>
      <form id="pageForm" class="modal-body">
        <div class="form-row">
          <div class="form-group"><label>Título *</label><input type="text" id="pg_title" required></div>
          <div class="form-group"><label>Slug (URL) *</label><input type="text" id="pg_slug" required placeholder="ej: nosotros"></div>
        </div>
        <div class="form-row checks">
          <label class="check"><input type="checkbox" id="pg_visible" checked><span>Visible en el sitio</span></label>
          <label class="check"><input type="checkbox" id="pg_published"><span>Publicada</span></label>
        </div>
        <div class="form-row">
          <div class="form-group full"><label>Meta título (SEO)</label><input type="text" id="pg_meta_title"></div>
        </div>
        <div class="form-row">
          <div class="form-group full"><label>Meta descripción (SEO)</label><textarea id="pg_meta_desc" rows="2"></textarea></div>
        </div>

        <!-- BLOQUES -->
        <div class="form-row"><div class="form-group full">
          <label class="seo-label"><i class="fas fa-cubes"></i> Contenido por bloques</label>
          <div class="blocks-add">
            <select id="newBlockType">${typeOptions}</select>
            <button type="button" class="btn-primary" onclick="addBlock()"><i class="fas fa-plus"></i> Agregar bloque</button>
          </div>
          <div class="blocks-list" id="blocksList"></div>
          <p class="field-hint">Tip: usá ▲ ▼ para reordenar. El editor con arrastrar y soltar llega en la próxima etapa.</p>
        </div></div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closePageModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="pgSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>
  `;
}

// ---------- MOUNT ----------
export function pagesViewOnMount() {
  wireLayout();
  document.getElementById('pageSearch').addEventListener('input', applyFilters);
  document.getElementById('filterPageStatus').addEventListener('change', applyFilters);
  document.getElementById('pageForm').addEventListener('submit', savePage);
  document.getElementById('pg_title').addEventListener('input', e => {
    const slug = document.getElementById('pg_slug');
    if (!slug.dataset.touched) slug.value = slugify(e.target.value);
  });
  document.getElementById('pg_slug').addEventListener('input', e => { e.target.dataset.touched = '1'; });
  loadPages();
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
async function loadPages() {
  const grid = document.getElementById('pagesGrid');
  grid.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando páginas...</p>';
  try {
    const { data, error } = await supabase.from('pages').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    allPages = data || [];
    applyFilters();
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<p class="loading-text" style="color:#ff4444">Error al cargar: ' + e.message + '</p>';
  }
}

function applyFilters() {
  const q = (document.getElementById('pageSearch').value || '').toLowerCase().trim();
  const st = document.getElementById('filterPageStatus').value;
  const list = allPages.filter(p => {
    const matchQ = !q || (p.title||'').toLowerCase().includes(q) || (p.slug||'').toLowerCase().includes(q);
    const matchS = !st || p.status === st;
    return matchQ && matchS;
  });
  document.getElementById('pagesCount').textContent = list.length + ' página(s)';
  renderPages(list);
}

function renderPages(list) {
  const grid = document.getElementById('pagesGrid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><i class="fas fa-file-circle-plus"></i></div>
      <h2>No hay páginas</h2>
      <p>Creá una página nueva o generá las predeterminadas.</p>
      <div class="empty-actions">
        <button class="btn-secondary" onclick="seedPages()"><i class="fas fa-wand-magic-sparkles"></i> Páginas predeterminadas</button>
        <button class="btn-primary" onclick="openPageModal()"><i class="fas fa-plus"></i> Nueva Página</button>
      </div></div>`;
    return;
  }
  grid.innerHTML = list.map(p => {
    const blocks = Array.isArray(p.blocks) ? p.blocks : [];
    const state = p.status === 'published' ? 'Publicada' : 'Borrador';
    const stateClass = p.status === 'published' ? 'st-active' : 'st-draft';
    return `<div class="admin-product-card">
      <div class="ap-thumb"><i class="fas fa-file-alt"></i></div>
      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-cat">/${escapeHtml(p.slug)}</span>
          <span class="ap-state ${stateClass}">${state}</span>
          ${p.is_visible ? '' : '<span class="ap-state st-hidden">Oculta</span>'}
        </div>
        <h4 class="ap-name">${escapeHtml(p.title)}</h4>
        <div class="ap-meta"><i class="fas fa-cubes"></i> ${blocks.length} bloque(s)${p.meta_title ? ' · SEO ✓' : ''}</div>
      </div>
      <div class="ap-actions">
        <button title="Editar" onclick="editPage('${p.id}')"><i class="fas fa-pen"></i></button>
        <button title="Duplicar" onclick="duplicatePage('${p.id}')"><i class="fas fa-copy"></i></button>
        <button title="Eliminar" class="del" onclick="deletePage('${p.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

// ---------- SEED ----------
window.seedPages = async function () {
  try {
    const existing = new Set(allPages.map(p => p.slug));
    const toInsert = SEED.filter(s => !existing.has(s.slug)).map(s => ({
      title: s.title, slug: s.slug, status: 'draft', is_visible: true, blocks: []
    }));
    if (!toInsert.length) { toast('Las páginas predeterminadas ya existen', 'ok'); return; }
    const { error } = await supabase.from('pages').insert(toInsert);
    if (error) throw error;
    toast(toInsert.length + ' página(s) creada(s)', 'ok');
    loadPages();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

// ---------- MODAL ----------
window.openPageModal = function () {
  currentEditId = null;
  document.getElementById('pageModalTitle').textContent = 'Nueva Página';
  document.getElementById('pageForm').reset();
  document.getElementById('pg_visible').checked = true;
  document.getElementById('pg_slug').dataset.touched = '';
  document.getElementById('blocksList').innerHTML = '';
  document.getElementById('pageModal').classList.add('open');
};

window.editPage = async function (id) {
  const p = allPages.find(x => x.id === id);
  if (!p) return;
  currentEditId = id;
  document.getElementById('pageModalTitle').textContent = 'Editar Página';
  set('pg_title', p.title); set('pg_slug', p.slug);
  document.getElementById('pg_slug').dataset.touched = '1';
  set('pg_meta_title', p.meta_title); set('pg_meta_desc', p.meta_description);
  document.getElementById('pg_visible').checked = p.is_visible !== false;
  document.getElementById('pg_published').checked = p.status === 'published';
  renderBlocks(Array.isArray(p.blocks) ? p.blocks : []);
  document.getElementById('pageModal').classList.add('open');
};

window.closePageModal = function () { document.getElementById('pageModal').classList.remove('open'); };

window.deletePage = async function (id) {
  if (!confirm('¿Eliminar esta página?')) return;
  try {
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) throw error;
    toast('Página eliminada', 'ok'); loadPages();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.duplicatePage = async function (id) {
  const p = allPages.find(x => x.id === id);
  if (!p) return;
  const copy = { ...p }; delete copy.id; delete copy.created_at; delete copy.updated_at;
  copy.title = (p.title || '') + ' (copia)';
  copy.slug = (p.slug || '') + '-copia-' + Date.now().toString().slice(-4);
  try {
    const { error } = await supabase.from('pages').insert(copy);
    if (error) throw error;
    toast('Página duplicada', 'ok'); loadPages();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

// ---------- BLOQUES ----------
window.addBlock = function () {
  const type = document.getElementById('newBlockType').value;
  const blocks = collectBlocks();
  blocks.push({ id: uid(), type, data: defaultData(type) });
  renderBlocks(blocks);
};

window.removeBlock = function (id) {
  const blocks = collectBlocks().filter(b => b.id !== id);
  renderBlocks(blocks);
};

window.moveBlock = function (id, dir) {
  const blocks = collectBlocks();
  const i = blocks.findIndex(b => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= blocks.length) return;
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  renderBlocks(blocks);
};

window.changeBlockType = function (id, newType) {
  const blocks = collectBlocks();
  const b = blocks.find(x => x.id === id);
  if (b) { b.type = newType; b.data = defaultData(newType); }
  renderBlocks(blocks);
};

window.addFaqItem = function (id) {
  const blocks = collectBlocks();
  const b = blocks.find(x => x.id === id);
  if (b) { b.data.items = b.data.items || []; b.data.items.push({ q: '', a: '' }); }
  renderBlocks(blocks);
};
window.removeFaqItem = function (id, idx) {
  const blocks = collectBlocks();
  const b = blocks.find(x => x.id === id);
  if (b) b.data.items.splice(idx, 1);
  renderBlocks(blocks);
};
window.addButtonItem = function (id) {
  const blocks = collectBlocks();
  const b = blocks.find(x => x.id === id);
  if (b) { b.data.items = b.data.items || []; b.data.items.push({ label: '', url: '', style: 'primary' }); }
  renderBlocks(blocks);
};
window.removeButtonItem = function (id, idx) {
  const blocks = collectBlocks();
  const b = blocks.find(x => x.id === id);
  if (b) b.data.items.splice(idx, 1);
  renderBlocks(blocks);
};

window.uploadBlockImage = function (id, inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  const prev = inputEl.closest('.block-body').querySelector('.blk-img-prev');
  const urlInput = inputEl.closest('.block-body').querySelector('[data-f="url"]');
  prev.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  const safe = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const path = 'pages/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safe;
  supabase.storage.from('product-images').upload(path, file, { upsert: false })
    .then(({ error }) => {
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      if (urlInput) urlInput.value = data.publicUrl;
      prev.innerHTML = '<img src="' + data.publicUrl + '" alt="">';
    })
    .catch(err => { toast('No se pudo subir la imagen', 'err'); prev.innerHTML = ''; console.error(err); });
  inputEl.value = '';
};

function defaultData(type) {
  switch (type) {
    case 'heading': return { text: '', level: 'h2' };
    case 'text':    return { text: '' };
    case 'image':   return { url: '', alt: '', align: 'center' };
    case 'hero':    return { title: '', subtitle: '', image: '', button_label: '', button_url: '' };
    case 'faq':     return { items: [] };
    case 'buttons': return { items: [] };
    case 'divider': return {};
    default:        return {};
  }
}

// Lee el estado actual del DOM (fuente de verdad) sin perder lo escrito
function collectBlocks() {
  const out = [];
  document.querySelectorAll('#blocksList .block-item').forEach(el => {
    const id = el.dataset.id;
    const type = el.querySelector('[data-f="type"]').value;
    let data = {};
    if (type === 'heading') {
      data = { text: el.querySelector('[data-f="text"]').value, level: el.querySelector('[data-f="level"]').value };
    } else if (type === 'text') {
      data = { text: el.querySelector('[data-f="text"]').value };
    } else if (type === 'image') {
      data = { url: el.querySelector('[data-f="url"]').value, alt: el.querySelector('[data-f="alt"]').value, align: el.querySelector('[data-f="align"]').value };
    } else if (type === 'hero') {
      data = {
        title: el.querySelector('[data-f="title"]').value,
        subtitle: el.querySelector('[data-f="subtitle"]').value,
        image: el.querySelector('[data-f="image"]').value,
        button_label: el.querySelector('[data-f="button_label"]').value,
        button_url: el.querySelector('[data-f="button_url"]').value
      };
    } else if (type === 'faq') {
      data = { items: [] };
      el.querySelectorAll('.faq-item').forEach(fi => data.items.push({ q: fi.querySelector('[data-f="q"]').value, a: fi.querySelector('[data-f="a"]').value }));
    } else if (type === 'buttons') {
      data = { items: [] };
      el.querySelectorAll('.btn-item').forEach(bi => data.items.push({ label: bi.querySelector('[data-f="label"]').value, url: bi.querySelector('[data-f="url"]').value, style: bi.querySelector('[data-f="style"]').value }));
    } else if (type === 'divider') {
      data = {};
    }
    out.push({ id, type, data });
  });
  return out;
}

function renderBlocks(blocks) {
  const box = document.getElementById('blocksList');
  if (!blocks.length) { box.innerHTML = '<p class="blocks-empty">Aún no hay bloques. Agregá el primero arriba.</p>'; return; }
  box.innerHTML = blocks.map((b, i) => {
    const typeLabel = (BLOCK_TYPES.find(t => t.v === b.type) || {}).l || b.type;
    const typeSel = BLOCK_TYPES.map(t => `<option value="${t.v}" ${t.v===b.type?'selected':''}>${t.l}</option>`).join('');
    return `<div class="block-item" data-id="${b.id}">
      <div class="block-head">
        <span class="block-type-badge">${escapeHtml(typeLabel)}</span>
        <select data-f="type" onchange="changeBlockType('${b.id}', this.value)">${typeSel}</select>
        <div class="block-controls">
          <button type="button" title="Subir" onclick="moveBlock('${b.id}',-1)" ${i===0?'disabled':''}><i class="fas fa-arrow-up"></i></button>
          <button type="button" title="Bajar" onclick="moveBlock('${b.id}',1)" ${i===blocks.length-1?'disabled':''}><i class="fas fa-arrow-down"></i></button>
          <button type="button" title="Eliminar" class="del" onclick="removeBlock('${b.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="block-body">${renderBlockBody(b)}</div>
    </div>`;
  }).join('');
}

function renderBlockBody(b) {
  const d = b.data || {};
  switch (b.type) {
    case 'heading':
      return `<div class="blk-row"><input data-f="text" placeholder="Texto del título" value="${escAttr(d.text)}"></div>
        <div class="blk-row short"><select data-f="level">
          <option value="h1" ${d.level==='h1'?'selected':''}>H1</option>
          <option value="h2" ${d.level==='h2'||!d.level?'selected':''}>H2</option>
          <option value="h3" ${d.level==='h3'?'selected':''}>H3</option>
        </select></div>`;
    case 'text':
      return `<textarea data-f="text" rows="4" placeholder="Escribí el texto del bloque...">${escapeHtml(d.text)}</textarea>`;
    case 'image':
      return `<div class="blk-row"><input data-f="url" placeholder="URL de la imagen" value="${escAttr(d.url)}"></div>
        <div class="blk-row">
          <label class="blk-upload"><i class="fas fa-upload"></i> Subir imagen
            <input type="file" accept="image/*" onchange="uploadBlockImage('${b.id}', this)"></label>
          <div class="blk-img-prev">${d.url ? '<img src="'+escAttr(d.url)+'" alt="">' : ''}</div>
        </div>
        <div class="blk-row"><input data-f="alt" placeholder="Texto alternativo (alt)" value="${escAttr(d.alt)}"></div>
        <div class="blk-row short"><select data-f="align">
          <option value="left" ${d.align==='left'?'selected':''}>Izquierda</option>
          <option value="center" ${d.align==='center'||!d.align?'selected':''}>Centro</option>
          <option value="right" ${d.align==='right'?'selected':''}>Derecha</option>
        </select></div>`;
    case 'hero':
      return `<div class="blk-row"><input data-f="title" placeholder="Título del hero" value="${escAttr(d.title)}"></div>
        <div class="blk-row"><input data-f="subtitle" placeholder="Subtítulo" value="${escAttr(d.subtitle)}"></div>
        <div class="blk-row"><input data-f="image" placeholder="URL de imagen de fondo" value="${escAttr(d.image)}"></div>
        <div class="blk-row two"><input data-f="button_label" placeholder="Texto del botón" value="${escAttr(d.button_label)}"><input data-f="button_url" placeholder="URL del botón" value="${escAttr(d.button_url)}"></div>`;
    case 'faq':
      return `<div class="faq-list">${(d.items||[]).map((it,idx)=>`
        <div class="faq-item">
          <input data-f="q" placeholder="Pregunta" value="${escAttr(it.q)}">
          <textarea data-f="a" rows="2" placeholder="Respuesta">${escapeHtml(it.a)}</textarea>
          <button type="button" class="del mini" onclick="removeFaqItem('${b.id}',${idx})"><i class="fas fa-times"></i></button>
        </div>`).join('')}
        <button type="button" class="btn-secondary mini" onclick="addFaqItem('${b.id}')"><i class="fas fa-plus"></i> Agregar pregunta</button></div>`;
    case 'buttons':
      return `<div class="btn-list">${(d.items||[]).map((it,idx)=>`
        <div class="btn-item">
          <input data-f="label" placeholder="Texto" value="${escAttr(it.label)}">
          <input data-f="url" placeholder="URL" value="${escAttr(it.url)}">
          <select data-f="style"><option value="primary" ${it.style==='primary'||!it.style?'selected':''}>Primario</option><option value="secondary" ${it.style==='secondary'?'selected':''}>Secundario</option></select>
          <button type="button" class="del mini" onclick="removeButtonItem('${b.id}',${idx})"><i class="fas fa-times"></i></button>
        </div>`).join('')}
        <button type="button" class="btn-secondary mini" onclick="addButtonItem('${b.id}')"><i class="fas fa-plus"></i> Agregar botón</button></div>`;
    case 'divider':
      return `<p class="field-hint">Separador visual (sin configuración).</p>`;
    default: return '';
  }
}

// ---------- SAVE ----------
async function savePage(e) {
  e.preventDefault();
  const btn = document.getElementById('pgSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const title = val('pg_title').trim();
    let slug = slugify(val('pg_slug'));
    if (!title) throw new Error('El título es obligatorio');
    if (!slug) slug = slugify(title);
    if (allPages.some(p => p.slug === slug && p.id !== currentEditId)) throw new Error('Ya existe una página con ese slug');

    const payload = {
      title, slug,
      status: document.getElementById('pg_published').checked ? 'published' : 'draft',
      is_visible: document.getElementById('pg_visible').checked,
      meta_title: val('pg_meta_title').trim() || null,
      meta_description: val('pg_meta_desc').trim() || null,
      blocks: collectBlocks().map(b => ({ type: b.type, data: b.data })),
      updated_at: new Date().toISOString()
    };

    let error;
    if (currentEditId) ({ error } = await supabase.from('pages').update(payload).eq('id', currentEditId));
    else ({ error } = await supabase.from('pages').insert(payload));
    if (error) throw error;

    toast(currentEditId ? 'Página actualizada' : 'Página creada', 'ok');
    closePageModal(); loadPages();
  } catch (err) {
    console.error(err); toast('Error: ' + err.message, 'err');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
  }
}

// ---------- HELPERS ----------
function val(id) { return (document.getElementById(id)?.value ?? ''); }
function set(id, v) { const el = document.getElementById(id); if (el) el.value = (v ?? ''); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
function slugify(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-');
}
function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok');
  t.innerHTML = '<i class="fas ' + (type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check') + '"></i> ' + msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}
window.handleLogout = async () => { if (confirm('¿Cerrar sesión?')) { const { logout } = await import('../hooks/useAuth.js'); await logout(); } };
