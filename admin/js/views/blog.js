import { supabase } from '../config.js';
import { store } from '../core/state.js';

let allPosts = [];
let allCategories = [];
let currentEditId = null;
let currentTags = [];

// ---------- VISTA ----------
export async function blogView() {
  const state = store.getState();
  const userName = state.user?.email?.split('@')[0] || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();

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
        <div class="topbar-left"><button class="sidebar-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button><h1 class="page-title">Blog</h1></div>
        <div class="topbar-right"><div class="user-menu">
          <button class="user-btn" id="userMenuBtn"><div class="user-avatar">${userInitial}</div><div class="user-info"><span class="user-name">${userName}</span><span class="user-role">Administrador</span></div><i class="fas fa-chevron-down"></i></button>
          <div class="user-dropdown" id="userDropdown"><a href="#/dashboard" class="dropdown-item"><i class="fas fa-home"></i><span>Dashboard</span></a><div class="dropdown-divider"></div><a href="#" class="dropdown-item logout" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i><span>Cerrar sesión</span></a></div>
        </div></div>
      </header>

      <main class="admin-content"><div class="content-wrapper">
        <div class="products-toolbar">
          <div class="toolbar-filters">
            <div class="search-box"><i class="fas fa-search"></i><input type="text" id="postSearch" placeholder="Buscar por título o etiqueta..."></div>
            <select id="filterPostCat" class="filter-select"><option value="">Todas las categorías</option></select>
            <select id="filterPostStatus" class="filter-select">
              <option value="">Todos los estados</option>
              <option value="published">Publicados</option>
              <option value="draft">Borradores</option>
              <option value="scheduled">Programados</option>
            </select>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn-secondary" onclick="openCatsModal()"><i class="fas fa-tags"></i> Categorías</button>
            <button class="btn-primary" onclick="openPostModal()"><i class="fas fa-plus"></i> Nueva Publicación</button>
          </div>
        </div>
        <div class="products-count" id="postsCount">Cargando...</div>
        <div class="admin-products-grid" id="postsGrid"></div>
      </div></main>

      <footer class="admin-footer"><div class="footer-content"><span>&copy; 2026 Cell Space Argentina.</span><span class="footer-version">CMS v1.0.0</span></div></footer>
    </div>
  </div>

  <!-- MODAL PUBLICACIÓN -->
  <div class="modal-overlay" id="postModal">
    <div class="modal-box modal-lg">
      <div class="modal-header"><h2 id="postModalTitle">Nueva Publicación</h2><button class="modal-close" onclick="closePostModal()"><i class="fas fa-times"></i></button></div>
      <form id="postForm" class="modal-body">
        <div class="form-row"><div class="form-group full"><label>Título *</label><input type="text" id="b_title" required></div></div>
        <div class="form-row">
          <div class="form-group"><label>Slug (URL) *</label><input type="text" id="b_slug" required></div>
          <div class="form-group"><label>Categoría</label><select id="b_category"><option value="">Sin categoría</option></select></div>
        </div>
        <div class="form-row"><div class="form-group full"><label>Extracto / resumen</label><textarea id="b_excerpt" rows="2" placeholder="Resumen corto para el listado..."></textarea></div></div>

        <!-- Etiquetas -->
        <div class="form-row"><div class="form-group full">
          <label>Etiquetas</label>
          <div class="tags-input" id="tagsBox">
            <span class="tags-list" id="tagsList"></span>
            <input type="text" id="b_tag_input" placeholder="Escribí y presioná Enter o coma...">
          </div>
        </div></div>

        <!-- Estado + programación -->
        <div class="form-row">
          <div class="form-group"><label>Estado</label>
            <select id="b_status"><option value="draft">Borrador</option><option value="published">Publicar ahora</option><option value="scheduled">Programar</option></select>
          </div>
          <div class="form-group" id="scheduleWrap" style="display:none;"><label>Fecha y hora de publicación</label><input type="datetime-local" id="b_publish_at"></div>
        </div>

        <!-- Imagen destacada -->
        <div class="form-row"><div class="form-group full">
          <label>Imagen destacada</label>
          <div class="blk-row"><input id="b_image" placeholder="URL de la imagen"></div>
          <div class="blk-row"><label class="blk-upload"><i class="fas fa-upload"></i> Subir imagen<input type="file" accept="image/*" id="b_image_file"></label><div class="blk-img-prev" id="b_image_prev"></div></div>
        </div></div>

        <!-- Editor enriquecido -->
        <div class="form-row"><div class="form-group full">
          <label>Contenido</label>
          <div class="rte-toolbar">
            <button type="button" class="rte-btn" data-cmd="bold" title="Negrita"><b>B</b></button>
            <button type="button" class="rte-btn" data-cmd="italic" title="Cursiva"><i>I</i></button>
            <button type="button" class="rte-btn" data-cmd="underline" title="Subrayado"><u>U</u></button>
            <span class="rte-sep"></span>
            <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista"><i class="fas fa-list-ul"></i></button>
            <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="Lista numerada"><i class="fas fa-list-ol"></i></button>
            <span class="rte-sep"></span>
            <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="h2" title="Título"><b>H2</b></button>
            <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="blockquote" title="Cita"><i class="fas fa-quote-right"></i></button>
            <button type="button" class="rte-btn" data-cmd="createLink" title="Link"><i class="fas fa-link"></i></button>
            <button type="button" class="rte-btn" data-cmd="removeFormat" title="Limpiar"><i class="fas fa-eraser"></i></button>
          </div>
          <div class="rte-editor" id="blogRteEditor" contenteditable="true" data-placeholder="Escribí el artículo..."></div>
        </div></div>

        <div class="form-row checks">
          <label class="check"><input type="checkbox" id="b_comments"><span>Permitir comentarios</span></label>
        </div>

        <!-- SEO -->
        <div class="form-row"><div class="form-group full"><label class="seo-label"><i class="fas fa-search"></i> SEO</label></div></div>
        <div class="form-row"><div class="form-group full"><label>Meta título</label><input type="text" id="b_meta_title"></div></div>
        <div class="form-row"><div class="form-group full"><label>Meta descripción</label><textarea id="b_meta_desc" rows="2"></textarea></div></div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="previewPost()"><i class="fas fa-eye"></i> Vista previa</button>
          <button type="button" class="btn-secondary" onclick="closePostModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="bSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL CATEGORÍAS -->
  <div class="modal-overlay" id="catsModal">
    <div class="modal-box">
      <div class="modal-header"><h2>Categorías del Blog</h2><button class="modal-close" onclick="closeCatsModal()"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <div class="blk-row" style="margin-bottom:14px;">
          <input id="newCatName" placeholder="Nombre de la categoría">
          <button type="button" class="btn-primary" onclick="addCategory()" style="white-space:nowrap;"><i class="fas fa-plus"></i> Agregar</button>
        </div>
        <div class="cats-list" id="catsList"></div>
      </div>
    </div>
  </div>

  <!-- MODAL VISTA PREVIA -->
  <div class="modal-overlay" id="previewModal">
    <div class="modal-box modal-lg">
      <div class="modal-header"><h2>Vista previa</h2><button class="modal-close" onclick="closePreview()"><i class="fas fa-times"></i></button></div>
      <div class="modal-body"><div class="blog-preview-frame" id="previewFrame"></div></div>
    </div>
  </div>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
}

// ---------- MOUNT ----------
export function blogViewOnMount() {
  wireLayout();
  document.getElementById('postSearch').addEventListener('input', applyFilters);
  document.getElementById('filterPostCat').addEventListener('change', applyFilters);
  document.getElementById('filterPostStatus').addEventListener('change', applyFilters);
  document.getElementById('postForm').addEventListener('submit', savePost);

  // slug autogenerado
  document.getElementById('b_title').addEventListener('input', e => { const s=document.getElementById('b_slug'); if(!s.dataset.touched) s.value=slugify(e.target.value); });
  document.getElementById('b_slug').addEventListener('input', e => { e.target.dataset.touched='1'; });

  // mostrar/ocultar fecha de programación
  document.getElementById('b_status').addEventListener('change', e => {
    document.getElementById('scheduleWrap').style.display = e.target.value === 'scheduled' ? '' : 'none';
  });

  // tags
  const tagInput = document.getElementById('b_tag_input');
  tagInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitTag(tagInput.value); tagInput.value=''; }
    if (e.key === 'Backspace' && !tagInput.value && currentTags.length) { currentTags.pop(); renderTags(); }
  });
  tagInput.addEventListener('blur', () => { if (tagInput.value.trim()) { commitTag(tagInput.value); tagInput.value=''; } });

  // imagen destacada
  document.getElementById('b_image_file').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const prev = document.getElementById('b_image_prev'); prev.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const safe = file.name.replace(/[^a-zA-Z0-9.]/g,'_');
    const path = 'blog/' + Date.now() + '-' + Math.random().toString(36).slice(2,8) + '-' + safe;
    supabase.storage.from('product-images').upload(path, file, { upsert:false })
      .then(({ error }) => { if (error) throw error; const { data } = supabase.storage.from('product-images').getPublicUrl(path); document.getElementById('b_image').value = data.publicUrl; prev.innerHTML = '<img src="'+data.publicUrl+'" alt="">'; })
      .catch(err => { toast('No se pudo subir la imagen','err'); prev.innerHTML=''; console.error(err); });
    e.target.value='';
  });
  document.getElementById('b_image').addEventListener('input', e => {
    const prev = document.getElementById('b_image_prev'); prev.innerHTML = e.target.value ? '<img src="'+e.target.value+'" alt="">' : '';
  });

  // editor enriquecido
  document.querySelectorAll('#postModal .rte-btn').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      if (cmd === 'createLink') { const url = prompt('URL del enlace:','https://'); if (url) document.execCommand('createLink', false, url); }
      else if (cmd === 'formatBlock') { document.execCommand('formatBlock', false, btn.dataset.val); }
      else { document.execCommand(cmd, false, null); }
      document.getElementById('blogRteEditor').focus();
    });
  });

  loadAll();
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

// ---------- DATA ----------
async function loadAll() {
  await loadCategories();
  await loadPosts();
}

async function loadCategories() {
  const { data, error } = await supabase.from('post_categories').select('*').order('name');
  if (error) { console.error(error); allCategories = []; } else allCategories = data || [];
  fillCategorySelects();
}

async function loadPosts() {
  const grid = document.getElementById('postsGrid');
  grid.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando publicaciones...</p>';
  try {
    const { data, error } = await supabase.from('posts').select('*, post_categories(name)').order('created_at', { ascending: false });
    if (error) throw error;
    allPosts = data || [];
    applyFilters();
  } catch (e) { console.error(e); grid.innerHTML = '<p class="loading-text" style="color:#ff4444">Error al cargar: '+e.message+'</p>'; }
}

function fillCategorySelects() {
  const opts = '<option value="">Sin categoría</option>' + allCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  const f = document.getElementById('filterPostCat');
  const curF = f.value;
  f.innerHTML = '<option value="">Todas las categorías</option>' + allCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  f.value = curF;
  const m = document.getElementById('b_category');
  if (m) { const curM = m.value; m.innerHTML = opts; m.value = curM; }
}

function applyFilters() {
  const q = (document.getElementById('postSearch').value||'').toLowerCase().trim();
  const cat = document.getElementById('filterPostCat').value;
  const st = document.getElementById('filterPostStatus').value;
  const list = allPosts.filter(p => {
    const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
    const matchQ = !q || (p.title||'').toLowerCase().includes(q) || tags.includes(q);
    const matchC = !cat || p.category_id === cat;
    const matchS = !st || p.status === st;
    return matchQ && matchC && matchS;
  });
  document.getElementById('postsCount').textContent = list.length + ' publicación(es)';
  renderPosts(list);
}

function statusInfo(p) {
  if (p.status === 'scheduled') {
    const when = p.publish_at ? new Date(p.publish_at).toLocaleString('es-AR', { dateStyle:'short', timeStyle:'short' }) : 'sin fecha';
    return { label: 'Programada · ' + when, cls: 'st-scheduled' };
  }
  if (p.status === 'published') return { label: 'Publicado', cls: 'st-active' };
  return { label: 'Borrador', cls: 'st-draft' };
}

function renderPosts(list) {
  const grid = document.getElementById('postsGrid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-feather-pointed"></i></div><h2>No hay publicaciones</h2><p>Creá tu primer artículo del blog.</p><div class="empty-actions"><button class="btn-primary" onclick="openPostModal()"><i class="fas fa-plus"></i> Nueva Publicación</button></div></div>`;
    return;
  }
  grid.innerHTML = list.map(p => {
    const st = statusInfo(p);
    const catName = p.post_categories?.name || 'Sin categoría';
    const tags = (Array.isArray(p.tags) ? p.tags : []).slice(0,3).map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join('');
    const date = new Date(p.created_at).toLocaleDateString('es-AR');
    const pubIcon = p.status === 'published' ? 'fa-eye' : (p.status === 'scheduled' ? 'fa-clock' : 'fa-eye-slash');
    return `<div class="admin-product-card">
      <div class="ap-thumb">${p.image_url ? '<img src="'+p.image_url+'" alt="">' : '<i class="fas fa-newspaper"></i>'}</div>
      <div class="ap-body">
        <div class="ap-top"><span class="ap-cat">${escapeHtml(catName)}</span><span class="ap-state ${st.cls}">${escapeHtml(st.label)}</span></div>
        <h4 class="ap-name">${escapeHtml(p.title)}</h4>
        <div class="ap-meta">${tags || '<span style="opacity:.6">sin etiquetas</span>'} · ${date}</div>
      </div>
      <div class="ap-actions">
        <button title="${p.status==='published'?'Despublicar':'Publicar'}" onclick="togglePublish('${p.id}', ${p.status==='published'})"><i class="fas ${pubIcon}"></i></button>
        <button title="Editar" onclick="editPost('${p.id}')"><i class="fas fa-pen"></i></button>
        <button title="Duplicar" onclick="duplicatePost('${p.id}')"><i class="fas fa-copy"></i></button>
        <button title="Eliminar" class="del" onclick="deletePost('${p.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

// ---------- TAGS ----------
function commitTag(raw) {
  const t = String(raw||'').trim().replace(/,+$/,'').trim();
  if (!t) return;
  if (!currentTags.some(x => x.toLowerCase() === t.toLowerCase())) currentTags.push(t);
  renderTags();
}
window.removeTag = function (i) { currentTags.splice(i,1); renderTags(); };
function renderTags() {
  document.getElementById('tagsList').innerHTML = currentTags.map((t,i) =>
    `<span class="tag-chip editable">${escapeHtml(t)}<button type="button" onclick="removeTag(${i})"><i class="fas fa-times"></i></button></span>`).join('');
}

// ---------- MODAL POST ----------
window.openPostModal = function () {
  currentEditId = null; currentTags = [];
  document.getElementById('postModalTitle').textContent = 'Nueva Publicación';
  document.getElementById('postForm').reset();
  document.getElementById('b_slug').dataset.touched = '';
  document.getElementById('b_status').value = 'draft';
  document.getElementById('scheduleWrap').style.display = 'none';
  document.getElementById('blogRteEditor').innerHTML = '';
  document.getElementById('b_image_prev').innerHTML = '';
  renderTags();
  document.getElementById('postModal').classList.add('open');
};

window.editPost = async function (id) {
  const p = allPosts.find(x => x.id === id); if (!p) return;
  currentEditId = id;
  document.getElementById('postModalTitle').textContent = 'Editar Publicación';
  set('b_title', p.title); set('b_slug', p.slug); document.getElementById('b_slug').dataset.touched='1';
  set('b_category', p.category_id); set('b_excerpt', p.excerpt);
  set('b_status', p.status); set('b_meta_title', p.meta_title); set('b_meta_desc', p.meta_description);
  set('b_image', p.image_url);
  document.getElementById('b_image_prev').innerHTML = p.image_url ? '<img src="'+p.image_url+'" alt="">' : '';
  document.getElementById('scheduleWrap').style.display = p.status === 'scheduled' ? '' : 'none';
  if (p.publish_at) {
    const d = new Date(p.publish_at); const pad = n => String(n).padStart(2,'0');
    document.getElementById('b_publish_at').value = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
  }
  document.getElementById('b_comments').checked = !!p.allow_comments;
  document.getElementById('blogRteEditor').innerHTML = p.content || '';
  currentTags = Array.isArray(p.tags) ? [...p.tags] : [];
  renderTags();
  document.getElementById('postModal').classList.add('open');
};

window.closePostModal = function () { document.getElementById('postModal').classList.remove('open'); };

window.deletePost = async function (id) {
  if (!confirm('¿Eliminar esta publicación?')) return;
  try { const { error } = await supabase.from('posts').delete().eq('id', id); if (error) throw error; toast('Publicación eliminada','ok'); loadPosts(); }
  catch(e){ toast('Error: '+e.message,'err'); }
};

window.duplicatePost = async function (id) {
  const p = allPosts.find(x => x.id === id); if (!p) return;
  const copy = { ...p }; delete copy.id; delete copy.created_at; delete copy.updated_at;
  copy.title = (p.title||'') + ' (copia)'; copy.slug = (p.slug||'') + '-copia-' + Date.now().toString().slice(-4); copy.status = 'draft';
  try { const { error } = await supabase.from('posts').insert(copy); if (error) throw error; toast('Publicación duplicada','ok'); loadPosts(); }
  catch(e){ toast('Error: '+e.message,'err'); }
};

window.togglePublish = async function (id, isPublished) {
  const newStatus = isPublished ? 'draft' : 'published';
  try {
    const { error } = await supabase.from('posts').update({ status: newStatus, publish_at: newStatus==='published' ? null : undefined, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    toast(newStatus==='published' ? 'Publicación activada' : 'Publicación despublicada','ok'); loadPosts();
  } catch(e){ toast('Error: '+e.message,'err'); }
};

// ---------- SAVE ----------
async function savePost(e) {
  e.preventDefault();
  const btn = document.getElementById('bSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const title = val('b_title').trim(); let slug = slugify(val('b_slug'));
    if (!title) throw new Error('El título es obligatorio');
    if (!slug) slug = slugify(title);
    if (allPosts.some(p => p.slug === slug && p.id !== currentEditId)) throw new Error('Ya existe una publicación con ese slug');

    const status = val('b_status');
    let publish_at = null;
    if (status === 'scheduled') {
      const v = val('b_publish_at');
      if (!v) throw new Error('Indicá la fecha y hora de programación');
      publish_at = new Date(v).toISOString();
    }

    const raw = document.getElementById('blogRteEditor').innerHTML;
    const content = (!raw || raw === '<br>' || raw.replace(/<[^>]*>/g,'').trim() === '') ? null : raw;

    const payload = {
      title, slug,
      excerpt: val('b_excerpt').trim() || null,
      content,
      category_id: val('b_category') || null,
      tags: currentTags,
      image_url: val('b_image').trim() || null,
      status, publish_at,
      allow_comments: document.getElementById('b_comments').checked,
      author: store.getState().user?.email || null,
      meta_title: val('b_meta_title').trim() || null,
      meta_description: val('b_meta_desc').trim() || null,
      updated_at: new Date().toISOString()
    };

    let error;
    if (currentEditId) ({ error } = await supabase.from('posts').update(payload).eq('id', currentEditId));
    else ({ error } = await supabase.from('posts').insert(payload));
    if (error) throw error;

    toast(currentEditId ? 'Publicación actualizada' : 'Publicación creada','ok');
    closePostModal(); loadPosts();
  } catch (err) { console.error(err); toast('Error: '+err.message,'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; }
}

// ---------- PREVIEW ----------
window.previewPost = function () {
  const title = val('b_title') || '(sin título)';
  const html = document.getElementById('blogRteEditor').innerHTML || '<p><em>Sin contenido.</em></p>';
  document.getElementById('previewFrame').innerHTML =
    `<h1 class="pv-title">${escapeHtml(title)}</h1><div class="pv-content">${html}</div>`;
  document.getElementById('previewModal').classList.add('open');
};
window.closePreview = function () { document.getElementById('previewModal').classList.remove('open'); };

// ---------- CATEGORÍAS ----------
window.openCatsModal = function () { renderCats(); document.getElementById('catsModal').classList.add('open'); };
window.closeCatsModal = function () { document.getElementById('catsModal').classList.remove('open'); };

window.addCategory = async function () {
  const input = document.getElementById('newCatName');
  const name = input.value.trim(); if (!name) return;
  const slug = slugify(name);
  try {
    const { error } = await supabase.from('post_categories').insert({ name, slug });
    if (error) throw error;
    input.value = ''; toast('Categoría creada','ok');
    await loadCategories(); renderCats();
  } catch(e){ toast('Error: '+e.message,'err'); }
};

window.deleteCategory = async function (id, name) {
  if (!confirm('¿Eliminar la categoría "'+name+'"? Las publicaciones quedarán sin categoría.')) return;
  try { const { error } = await supabase.from('post_categories').delete().eq('id', id); if (error) throw error; toast('Categoría eliminada','ok'); await loadCategories(); renderCats(); loadPosts(); }
  catch(e){ toast('Error: '+e.message,'err'); }
};

function renderCats() {
  const box = document.getElementById('catsList');
  if (!allCategories.length) { box.innerHTML = '<p class="field-hint">Aún no hay categorías.</p>'; return; }
  box.innerHTML = allCategories.map(c => `
    <div class="cat-row">
      <div><strong>${escapeHtml(c.name)}</strong><span class="field-hint"> /${escapeHtml(c.slug)}</span></div>
      <button type="button" class="del mini" onclick="deleteCategory('${c.id}','${escJs(c.name)}')"><i class="fas fa-trash"></i></button>
    </div>`).join('');
}

// ---------- HELPERS ----------
function val(id){ return (document.getElementById(id)?.value ?? ''); }
function set(id,v){ const el=document.getElementById(id); if(el) el.value=(v ?? ''); }
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escJs(s){ return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function slugify(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-'); }
function toast(msg,type){ const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'</i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }
window.handleLogout = async () => { if(confirm('¿Cerrar sesión?')){ const { logout } = await import('../hooks/useAuth.js'); await logout(); } };
