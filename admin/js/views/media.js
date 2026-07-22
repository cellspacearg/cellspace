import { supabase } from '../config.js';
import { store } from '../core/state.js';

const BUCKET = 'product-images';
const IMG_EXT = ['png','jpg','jpeg','gif','webp','svg','avif'];

let currentFolder = '';                 // '' = raíz
let lastFolders = [];                   // carpetas visibles en la vista actual
let lastFiles = [];                     // archivos del último listado
const knownFolders = new Set(['products','services','pages','media']);

// ---------- VISTA ----------
export async function mediaView() {
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
        <div class="topbar-left"><button class="sidebar-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button><h1 class="page-title">Gestor de Archivos</h1></div>
        <div class="topbar-right"><div class="user-menu">
          <button class="user-btn" id="userMenuBtn"><div class="user-avatar">${userInitial}</div><div class="user-info"><span class="user-name">${userName}</span><span class="user-role">Administrador</span></div><i class="fas fa-chevron-down"></i></button>
          <div class="user-dropdown" id="userDropdown"><a href="#/dashboard" class="dropdown-item"><i class="fas fa-home"></i><span>Dashboard</span></a><div class="dropdown-divider"></div><a href="#" class="dropdown-item logout" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i><span>Cerrar sesión</span></a></div>
        </div></div>
      </header>

      <main class="admin-content"><div class="content-wrapper">
        <!-- Toolbar -->
        <div class="products-toolbar">
          <div class="toolbar-filters">
            <div class="breadcrumb" id="mediaBreadcrumb"></div>
            <div class="search-box"><i class="fas fa-search"></i><input type="text" id="mediaSearch" placeholder="Filtrar por nombre..."></div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn-secondary" id="newFolderBtn" onclick="newFolder()"><i class="fas fa-folder-plus"></i> Nueva carpeta</button>
            <button class="btn-primary" onclick="document.getElementById('mediaFileInput').click()"><i class="fas fa-upload"></i> Subir archivos</button>
            <input type="file" id="mediaFileInput" accept="image/*" multiple style="display:none">
          </div>
        </div>

        <!-- Upload zone -->
        <div class="upload-zone media-upload" id="mediaUploadZone">
          <input type="file" id="mediaFileInput2" accept="image/*" multiple style="display:none">
          <i class="fas fa-cloud-upload-alt"></i>
          <p>Arrastrá imágenes acá o hacé clic</p>
          <span id="mediaUploadTarget">Se guardan en: / (raíz)</span>
        </div>

        <div class="products-count" id="mediaCount">Cargando...</div>
        <div class="media-grid" id="mediaGrid"></div>
      </div></main>

      <footer class="admin-footer"><div class="footer-content"><span>&copy; 2026 Cell Space Argentina.</span><span class="footer-version">CMS v1.0.0</span></div></footer>
    </div>
  </div>

  <!-- LIGHTBOX -->
  <div class="modal-overlay" id="mediaLightbox">
    <div class="lightbox">
      <button class="modal-close lb-close" onclick="closeLightbox()"><i class="fas fa-times"></i></button>
      <div class="lb-img-wrap"><img id="lbImg" src="" alt=""></div>
      <div class="lb-info">
        <h3 id="lbName"></h3>
        <div class="lb-meta" id="lbMeta"></div>
        <div class="lb-url"><input type="text" id="lbUrl" readonly></div>
        <div class="lb-actions">
          <button class="btn-secondary" onclick="copyLbUrl()"><i class="fas fa-copy"></i> Copiar URL</button>
          <a class="btn-secondary" id="lbOpen" href="#" target="_blank"><i class="fas fa-external-link-alt"></i> Abrir</a>
          <button class="btn-secondary" style="color:var(--admin-error)" onclick="deleteFromLightbox()"><i class="fas fa-trash"></i> Eliminar</button>
        </div>
      </div>
    </div>
  </div>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
}

// ---------- MOUNT ----------
export function mediaViewOnMount() {
  wireLayout();

  const zone = document.getElementById('mediaUploadZone');
  const input2 = document.getElementById('mediaFileInput2');
  const input1 = document.getElementById('mediaFileInput');
  zone.addEventListener('click', e => { if (e.target.tagName !== 'INPUT') input2.click(); });
  input2.addEventListener('change', e => handleUpload(e.target.files));
  input1.addEventListener('change', e => handleUpload(e.target.files));
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); handleUpload(e.dataTransfer.files); });

  document.getElementById('mediaSearch').addEventListener('input', renderGrid);

  // cerrar lightbox con clic fuera / ESC
  document.getElementById('mediaLightbox').addEventListener('click', e => { if (e.target.id === 'mediaLightbox') closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  loadFolder('');
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

// ---------- LISTAR ----------
async function loadFolder(folder) {
  currentFolder = folder || '';
  const grid = document.getElementById('mediaGrid');
  grid.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando archivos...</p>';
  document.getElementById('mediaUploadTarget').textContent = 'Se guardan en: /' + (currentFolder || '(raíz)');
  document.getElementById('newFolderBtn').style.display = currentFolder ? 'none' : '';
  renderBreadcrumb();

  try {
    const { data, error } = await supabase.storage.from(BUCKET).list(currentFolder, {
      limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' }
    });
    if (error) throw error;

    const folders = [];
    const files = [];
    (data || []).forEach(e => {
      // Supabase devuelve subcarpetas como entradas con id null
      if (e.id === null || e.id === undefined) { folders.push(e.name); knownFolders.add(e.name); }
      else files.push(e);
    });

    if (currentFolder === '') {
      // En la raíz mostramos las carpetas conocidas + las descubiertas (sin duplicados)
      lastFolders = [...knownFolders].sort();
    } else {
      lastFolders = folders.sort();
    }
    lastFiles = files;
    renderGrid();
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<p class="loading-text" style="color:#ff4444">Error al cargar: ' + e.message + '</p>';
  }
}

function renderBreadcrumb() {
  const bc = document.getElementById('mediaBreadcrumb');
  if (!currentFolder) { bc.innerHTML = '<span class="bc-current"><i class="fas fa-folder-open"></i> Raíz</span>'; return; }
  bc.innerHTML = `<a href="#" onclick="goFolder('');return false;"><i class="fas fa-folder-open"></i> Raíz</a>
    <span class="bc-sep">/</span><span class="bc-current">${escapeHtml(currentFolder)}</span>`;
}

window.goFolder = function (folder) {
  document.getElementById('mediaSearch').value = '';
  loadFolder(folder);
};

// ---------- RENDER ----------
function renderGrid() {
  const grid = document.getElementById('mediaGrid');
  const q = (document.getElementById('mediaSearch').value || '').toLowerCase().trim();
  const folders = lastFolders;
  const files = lastFiles.filter(f => !q || (f.name || '').toLowerCase().includes(q));

  document.getElementById('mediaCount').textContent =
    (currentFolder ? '' : folders.length + ' carpeta(s) · ') + files.length + ' archivo(s)';

  if (!folders.length && !files.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-folder-open"></i></div>
      <h2>Carpeta vacía</h2><p>Subí archivos o creá una carpeta para empezar.</p></div>`;
    return;
  }

  const folderCards = folders.map(name => `
    <div class="media-card media-folder" onclick="goFolder('${escJs(name)}')">
      <div class="media-thumb folder-thumb"><i class="fas fa-folder"></i></div>
      <div class="media-name">${escapeHtml(name)}</div>
      <div class="media-sub">Carpeta</div>
    </div>`).join('');

  const fileCards = files.map(f => {
    const path = currentFolder ? currentFolder + '/' + f.name : f.name;
    const url = publicUrl(path);
    const isImg = isImage(f.name);
    const date = f.created_at ? new Date(f.created_at).toLocaleDateString('es-AR') : '';
    const size = f.metadata?.size ? formatBytes(f.metadata.size) : '';
    return `
    <div class="media-card" onclick="previewFile('${escJs(path)}','${escJs(url)}','${escJs(f.name)}','${date}','${size}')">
      <div class="media-thumb">${isImg ? '<img src="'+url+'" alt="" loading="lazy">' : '<i class="fas fa-file"></i>'}</div>
      <div class="media-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
      <div class="media-sub">${[size, date].filter(Boolean).join(' · ') || '&nbsp;'}</div>
      <div class="media-actions" onclick="event.stopPropagation()">
        <button title="Copiar URL" onclick="copyUrl('${escJs(url)}')"><i class="fas fa-link"></i></button>
        <button title="Renombrar" onclick="renameFile('${escJs(path)}','${escJs(f.name)}')"><i class="fas fa-pen"></i></button>
        <button title="Eliminar" class="del" onclick="deleteFile('${escJs(path)}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');

  grid.innerHTML = folderCards + fileCards;
}

// ---------- SUBIR ----------
async function handleUpload(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const zone = document.getElementById('mediaUploadZone');
  const original = zone.innerHTML;
  zone.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Subiendo ' + files.length + ' archivo(s)...</p>';
  let ok = 0;
  for (const file of files) {
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safe;
      const path = currentFolder ? currentFolder + '/' + name : name;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (error) throw error;
      ok++;
    } catch (err) { console.error(err); toast('No se pudo subir ' + file.name, 'err'); }
  }
  zone.innerHTML = original;
  // re-vincular inputs tras reescribir el innerHTML
  const input2 = document.getElementById('mediaFileInput2');
  if (input2) { input2.addEventListener('change', e => handleUpload(e.target.files)); }
  if (ok) { toast(ok + ' archivo(s) subido(s)', 'ok'); loadFolder(currentFolder); }
}

// ---------- CARPETA NUEVA ----------
window.newFolder = function () {
  const name = slugFolder(prompt('Nombre de la nueva carpeta (sin espacios):'));
  if (!name) return;
  if (knownFolders.has(name)) { toast('Esa carpeta ya existe', 'err'); return; }
  knownFolders.add(name);
  toast('Carpeta "' + name + '" creada (se materializa al subir el 1er archivo)', 'ok');
  renderGrid();
};

// ---------- PREVIEW / LIGHTBOX ----------
let lbCurrentPath = '';
window.previewFile = function (path, url, name, date, size) {
  lbCurrentPath = path;
  document.getElementById('lbImg').src = url;
  document.getElementById('lbName').textContent = name;
  document.getElementById('lbMeta').textContent = [size, date].filter(Boolean).join(' · ');
  document.getElementById('lbUrl').value = url;
  document.getElementById('lbOpen').href = url;
  document.getElementById('mediaLightbox').classList.add('open');
};
window.closeLightbox = function () { document.getElementById('mediaLightbox').classList.remove('open'); };
window.copyLbUrl = function () { copyUrl(document.getElementById('lbUrl').value); };
window.deleteFromLightbox = async function () {
  if (!lbCurrentPath) return;
  await deleteFile(lbCurrentPath);
  closeLightbox();
};

// ---------- ACCIONES ----------
window.copyUrl = async function (url) {
  try { await navigator.clipboard.writeText(url); toast('URL copiada al portapapeles', 'ok'); }
  catch { toast('No se pudo copiar', 'err'); }
};

window.renameFile = async function (path, oldName) {
  const ext = oldName.includes('.') ? oldName.slice(oldName.lastIndexOf('.')) : '';
  const base = oldName.includes('.') ? oldName.slice(0, oldName.lastIndexOf('.')) : oldName;
  let newName = prompt('Nuevo nombre (sin extensión):', base);
  if (newName === null) return;
  newName = slugFile(newName) + ext;
  if (!newName || newName === oldName) return;
  const prefix = currentFolder ? currentFolder + '/' : '';
  const toPath = prefix + newName;
  try {
    const { error } = await supabase.storage.from(BUCKET).move(path, toPath);
    if (error) throw error;
    toast('Archivo renombrado', 'ok');
    loadFolder(currentFolder);
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.deleteFile = async function (path) {
  if (!confirm('¿Eliminar este archivo? No se puede deshacer.')) return;
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
    toast('Archivo eliminado', 'ok');
    loadFolder(currentFolder);
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

// ---------- HELPERS ----------
function publicUrl(path) { return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl; }
function isImage(name) { const e = (name || '').split('.').pop().toLowerCase(); return IMG_EXT.includes(e); }
function formatBytes(b) { if (!b) return ''; const u=['B','KB','MB','GB']; let i=0; let n=b; while(n>=1024&&i<u.length-1){n/=1024;i++;} return n.toFixed(n<10&&i>0?1:0)+' '+u[i]; }
function slugFolder(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,40); }
function slugFile(s){ return String(s||'').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,80); }
function escJs(s){ return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg,type){ const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'"></i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }
window.handleLogout = async () => { if(confirm('¿Cerrar sesión?')){ const { logout } = await import('../hooks/useAuth.js'); await logout(); } };
