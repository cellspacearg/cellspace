import { supabase } from '../config.js';
import { store } from '../core/state.js';

let allPages = [];
let currentEditId = null;

const SEED = [
  { title:'Inicio', slug:'inicio' },
  { title:'Nosotros', slug:'nosotros' },
  { title:'Contacto', slug:'contacto' },
  { title:'Garantía', slug:'garantia' },
  { title:'Preguntas Frecuentes', slug:'preguntas-frecuentes' },
  { title:'Políticas', slug:'politicas' }
];

export async function pagesView() {
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
        <div class="topbar-left"><button class="sidebar-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button><h1 class="page-title">Páginas</h1></div>
        <div class="topbar-right"><div class="user-menu">
          <button class="user-btn" id="userMenuBtn"><div class="user-avatar">${userInitial}</div><div class="user-info"><span class="user-name">${userName}</span><span class="user-role">Administrador</span></div><i class="fas fa-chevron-down"></i></button>
          <div class="user-dropdown" id="userDropdown"><a href="#/dashboard" class="dropdown-item"><i class="fas fa-home"></i><span>Dashboard</span></a><div class="dropdown-divider"></div><a href="#" class="dropdown-item logout" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i><span>Cerrar sesión</span></a></div>
        </div></div>
      </header>

      <main class="admin-content"><div class="content-wrapper">
        <div class="products-toolbar">
          <div class="toolbar-filters">
            <div class="search-box"><i class="fas fa-search"></i><input type="text" id="pageSearch" placeholder="Buscar por título o slug..."></div>
            <select id="filterPageStatus" class="filter-select"><option value="">Todos los estados</option><option value="published">Publicadas</option><option value="draft">Borradores</option></select>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn-secondary" onclick="seedPages()"><i class="fas fa-wand-magic-sparkles"></i> Páginas predeterminadas</button>
            <button class="btn-primary" onclick="openPageModal()"><i class="fas fa-plus"></i> Nueva Página</button>
          </div>
        </div>
        <div class="products-count" id="pagesCount">Cargando...</div>
        <div class="admin-products-grid" id="pagesGrid"></div>
      </div></main>

      <footer class="admin-footer"><div class="footer-content"><span>&copy; 2026 Cell Space Argentina.</span><span class="footer-version">CMS v1.0.0</span></div></footer>
    </div>
  </div>

  <!-- MODAL = SOLO METADATOS -->
  <div class="modal-overlay" id="pageModal">
    <div class="modal-box">
      <div class="modal-header"><h2 id="pageModalTitle">Nueva Página</h2><button class="modal-close" onclick="closePageModal()"><i class="fas fa-times"></i></button></div>
      <form id="pageForm" class="modal-body">
        <div class="form-row">
          <div class="form-group"><label>Título *</label><input type="text" id="pg_title" required></div>
          <div class="form-group"><label>Slug (URL) *</label><input type="text" id="pg_slug" required placeholder="ej: nosotros"></div>
        </div>
        <div class="form-row checks">
          <label class="check"><input type="checkbox" id="pg_visible" checked><span>Visible en el sitio</span></label>
          <label class="check"><input type="checkbox" id="pg_published"><span>Publicada</span></label>
        </div>
        <div class="form-row"><div class="form-group full"><label>Meta título (SEO)</label><input type="text" id="pg_meta_title"></div></div>
        <div class="form-row"><div class="form-group full"><label>Meta descripción (SEO)</label><textarea id="pg_meta_desc" rows="2"></textarea></div></div>

        <div class="builder-entry" id="builderEntry" style="display:none;">
          <i class="fas fa-paint-roller"></i>
          <div><strong>Contenido visual</strong><span id="builderEntryCount"></span><br><small>Editá los bloques (texto, imágenes, carrusel, etc.) en el Constructor Visual.</small></div>
          <button type="button" class="btn-primary" onclick="openBuilderCurrent()"><i class="fas fa-paint-roller"></i> Abrir constructor</button>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closePageModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="pgSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
}

export function pagesViewOnMount() {
  wireLayout();
  document.getElementById('pageSearch').addEventListener('input', applyFilters);
  document.getElementById('filterPageStatus').addEventListener('change', applyFilters);
  document.getElementById('pageForm').addEventListener('submit', savePage);
  document.getElementById('pg_title').addEventListener('input', e => { const s=document.getElementById('pg_slug'); if(!s.dataset.touched) s.value=slugify(e.target.value); });
  document.getElementById('pg_slug').addEventListener('input', e => { e.target.dataset.touched='1'; });
  loadPages();
}

function wireLayout() {
  const t=document.getElementById('sidebarToggle'),s=document.getElementById('adminSidebar'),o=document.getElementById('sidebarOverlay');
  if(t)t.onclick=()=>{s.classList.toggle('open');o.classList.toggle('active');};
  if(o)o.onclick=()=>{s.classList.remove('open');o.classList.remove('active');};
  const ub=document.getElementById('userMenuBtn'),ud=document.getElementById('userDropdown');
  if(ub)ub.onclick=e=>{e.stopPropagation();ud.classList.toggle('active');};
  document.addEventListener('click',()=>ud&&ud.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.toggle('active',i.getAttribute('href')===(window.location.hash||'')));
}

async function loadPages() {
  const grid=document.getElementById('pagesGrid');
  grid.innerHTML='<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando páginas...</p>';
  try {
    const { data, error } = await supabase.from('pages').select('*').order('created_at',{ascending:true});
    if (error) throw error;
    allPages = data || []; applyFilters();
  } catch (e) { console.error(e); grid.innerHTML='<p class="loading-text" style="color:#ff4444">Error al cargar: '+e.message+'</p>'; }
}

function applyFilters() {
  const q=(document.getElementById('pageSearch').value||'').toLowerCase().trim();
  const st=document.getElementById('filterPageStatus').value;
  const list=allPages.filter(p=>(!q||(p.title||'').toLowerCase().includes(q)||(p.slug||'').toLowerCase().includes(q))&&(!st||p.status===st));
  document.getElementById('pagesCount').textContent=list.length+' página(s)';
  renderPages(list);
}

function renderPages(list) {
  const grid=document.getElementById('pagesGrid');
  if(!list.length){ grid.innerHTML=`<div class="empty-state"><div class="empty-icon"><i class="fas fa-file-circle-plus"></i></div><h2>No hay páginas</h2><p>Creá una página nueva o generá las predeterminadas.</p><div class="empty-actions"><button class="btn-secondary" onclick="seedPages()"><i class="fas fa-wand-magic-sparkles"></i> Páginas predeterminadas</button><button class="btn-primary" onclick="openPageModal()"><i class="fas fa-plus"></i> Nueva Página</button></div></div>`; return; }
  grid.innerHTML=list.map(p=>{
    const blocks=Array.isArray(p.blocks)?p.blocks:[];
    const state=p.status==='published'?'Publicada':'Borrador';
    const stateClass=p.status==='published'?'st-active':'st-draft';
    return `<div class="admin-product-card">
      <div class="ap-thumb"><i class="fas fa-file-alt"></i></div>
      <div class="ap-body">
        <div class="ap-top"><span class="ap-cat">/${escapeHtml(p.slug)}</span><span class="ap-state ${stateClass}">${state}</span>${p.is_visible?'':'<span class="ap-state st-hidden">Oculta</span>'}</div>
        <h4 class="ap-name">${escapeHtml(p.title)}</h4>
        <div class="ap-meta"><i class="fas fa-cubes"></i> ${blocks.length} bloque(s)${p.meta_title?' · SEO ✓':''}</div>
      </div>
      <div class="ap-actions">
        <button title="Constructor visual" onclick="openBuilder('${p.id}')"><i class="fas fa-paint-roller"></i></button>
        <button title="Editar datos" onclick="editPage('${p.id}')"><i class="fas fa-pen"></i></button>
        <button title="Duplicar" onclick="duplicatePage('${p.id}')"><i class="fas fa-copy"></i></button>
        <button title="Eliminar" class="del" onclick="deletePage('${p.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

window.seedPages = async function () {
  try {
    const existing=new Set(allPages.map(p=>p.slug));
    const toInsert=SEED.filter(s=>!existing.has(s.slug)).map(s=>({title:s.title,slug:s.slug,status:'draft',is_visible:true,blocks:[]}));
    if(!toInsert.length){ toast('Las páginas predeterminadas ya existen','ok'); return; }
    const { error } = await supabase.from('pages').insert(toInsert);
    if(error) throw error;
    toast(toInsert.length+' página(s) creada(s)','ok'); loadPages();
  } catch(e){ toast('Error: '+e.message,'err'); }
};

window.openPageModal = function () {
  currentEditId=null;
  document.getElementById('pageModalTitle').textContent='Nueva Página';
  document.getElementById('pageForm').reset();
  document.getElementById('pg_visible').checked=true;
  document.getElementById('pg_slug').dataset.touched='';
  document.getElementById('builderEntry').style.display='none';
  document.getElementById('pageModal').classList.add('open');
};

window.editPage = async function (id) {
  const p=allPages.find(x=>x.id===id); if(!p) return;
  currentEditId=id;
  document.getElementById('pageModalTitle').textContent='Editar Página';
  set('pg_title',p.title); set('pg_slug',p.slug); document.getElementById('pg_slug').dataset.touched='1';
  set('pg_meta_title',p.meta_title); set('pg_meta_desc',p.meta_description);
  document.getElementById('pg_visible').checked=p.is_visible!==false;
  document.getElementById('pg_published').checked=p.status==='published';
  const blocks=Array.isArray(p.blocks)?p.blocks:[];
  const entry=document.getElementById('builderEntry');
  entry.style.display='flex';
  document.getElementById('builderEntryCount').textContent=' · '+blocks.length+' bloque(s)';
  document.getElementById('pageModal').classList.add('open');
};

window.closePageModal = function () { document.getElementById('pageModal').classList.remove('open'); };

window.deletePage = async function (id) {
  if(!confirm('¿Eliminar esta página?')) return;
  try { const { error } = await supabase.from('pages').delete().eq('id',id); if(error) throw error; toast('Página eliminada','ok'); loadPages(); }
  catch(e){ toast('Error: '+e.message,'err'); }
};

window.duplicatePage = async function (id) {
  const p=allPages.find(x=>x.id===id); if(!p) return;
  const copy={...p}; delete copy.id; delete copy.created_at; delete copy.updated_at;
  copy.title=(p.title||'')+' (copia)'; copy.slug=(p.slug||'')+'-copia-'+Date.now().toString().slice(-4);
  try { const { error } = await supabase.from('pages').insert(copy); if(error) throw error; toast('Página duplicada','ok'); loadPages(); }
  catch(e){ toast('Error: '+e.message,'err'); }
};

window.openBuilder = function (id) { window.location.hash='#/builder?id='+id; };
window.openBuilderCurrent = function () { if(currentEditId) window.location.hash='#/builder?id='+currentEditId; else toast('Guardá la página primero','err'); };

async function savePage(e) {
  e.preventDefault();
  const btn=document.getElementById('pgSaveBtn');
  btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const title=val('pg_title').trim(); let slug=slugify(val('pg_slug'));
    if(!title) throw new Error('El título es obligatorio');
    if(!slug) slug=slugify(title);
    if(allPages.some(p=>p.slug===slug&&p.id!==currentEditId)) throw new Error('Ya existe una página con ese slug');
    // ⚠️ NO se envía "blocks": así los bloques NUNCA se tocan desde acá (se editan en el constructor)
    const payload = {
      title, slug,
      status: document.getElementById('pg_published').checked?'published':'draft',
      is_visible: document.getElementById('pg_visible').checked,
      meta_title: val('pg_meta_title').trim()||null,
      meta_description: val('pg_meta_desc').trim()||null,
      updated_at: new Date().toISOString()
    };
    let error;
    if(currentEditId) ({ error } = await supabase.from('pages').update(payload).eq('id',currentEditId));
    else ({ error } = await supabase.from('pages').insert(payload));
    if(error) throw error;
    toast(currentEditId?'Página actualizada':'Página creada','ok'); closePageModal(); loadPages();
  } catch(err){ console.error(err); toast('Error: '+err.message,'err'); }
  finally { btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Guardar'; }
}

function val(id){ return (document.getElementById(id)?.value ?? ''); }
function set(id,v){ const el=document.getElementById(id); if(el) el.value=(v ?? ''); }
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function slugify(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-'); }
function toast(msg,type){ const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'"></i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }
window.handleLogout = async () => { if(confirm('¿Cerrar sesión?')){ const { logout } = await import('../hooks/useAuth.js'); await logout(); } };
