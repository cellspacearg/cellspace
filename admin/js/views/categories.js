import { supabase } from '../config.js';
import { store } from '../core/state.js';

let allCategories = [];
let currentEditId = null;

export async function categoriesView() {
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
          <a href="#/categories" class="nav-item"><i class="fas fa-tags"></i><span>Categorías</span></a>
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
        <div class="topbar-left"><button class="sidebar-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button><h1 class="page-title">Categorías</h1></div>
        <div class="topbar-right"><div class="user-menu">
          <button class="user-btn" id="userMenuBtn"><div class="user-avatar">${userInitial}</div><div class="user-info"><span class="user-name">${userName}</span><span class="user-role">Administrador</span></div><i class="fas fa-chevron-down"></i></button>
          <div class="user-dropdown" id="userDropdown"><a href="#/dashboard" class="dropdown-item"><i class="fas fa-home"></i><span>Dashboard</span></a><div class="dropdown-divider"></div><a href="#" class="dropdown-item logout" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i><span>Cerrar sesión</span></a></div>
        </div></div>
      </header>

      <main class="admin-content"><div class="content-wrapper">
        <div class="products-toolbar">
          <p class="field-hint" style="margin:0;">Estas son las categorías que ven tus clientes en la tienda. Las marcadas "Solo técnicos" solo aparecen para usuarios logueados como técnico o admin.</p>
          <button class="btn-primary" onclick="openCategoryModal()"><i class="fas fa-plus"></i> Nueva Categoría</button>
        </div>
        <div class="products-count" id="categoriesCount">Cargando...</div>
        <div class="admin-products-grid" id="categoriesGrid"></div>
      </div></main>

      <footer class="admin-footer"><div class="footer-content"><span>&copy; 2026 Cell Space Argentina.</span><span class="footer-version">CMS v1.0.0</span></div></footer>
    </div>
  </div>

  <div class="modal-overlay" id="categoryModal">
    <div class="modal-box">
      <div class="modal-header"><h2 id="catModalTitle">Nueva Categoría</h2><button class="modal-close" onclick="closeCategoryModal()"><i class="fas fa-times"></i></button></div>
      <form id="categoryForm" class="modal-body">
        <div class="form-row"><div class="form-group full"><label>Nombre *</label><input type="text" id="c_name" required placeholder="Ej: Accesorios"></div></div>
        <div class="form-row">
          <div class="form-group"><label>Ícono (Font Awesome)</label><input type="text" id="c_icon" placeholder="fas fa-headphones"></div>
          <div class="form-group"><label>Orden</label><input type="number" id="c_order" value="0"></div>
        </div>
        <div class="form-row checks">
          <label class="check"><input type="checkbox" id="c_tech_only"><span>Solo visible para técnicos</span></label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeCategoryModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="catSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
}

export function categoriesViewOnMount() {
  wireLayout();
  document.getElementById('categoryForm').addEventListener('submit', saveCategory);
  loadCategories();
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

async function loadCategories() {
  const grid = document.getElementById('categoriesGrid');
  grid.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando categorías...</p>';
  try {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    allCategories = data || [];
    document.getElementById('categoriesCount').textContent = allCategories.length + ' categoría(s)';
    renderCategories();
  } catch (e) { console.error(e); grid.innerHTML = '<p class="loading-text" style="color:#ff4444">Error al cargar: '+e.message+'</p>'; }
}

function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!allCategories.length) { grid.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-tags"></i></div><h2>No hay categorías</h2><p>Creá la primera.</p></div>`; return; }
  grid.innerHTML = allCategories.map(c => `
    <div class="admin-product-card">
      <div class="ap-thumb"><i class="${escAttr(c.icon || 'fas fa-th')}" style="font-size:32px;color:var(--orange,#FF6A00)"></i></div>
      <div class="ap-body">
        <div class="ap-top"><span class="ap-cat">Orden: ${c.sort_order ?? 0}</span>${c.technician_only ? '<span class="ap-state st-draft">Solo técnicos</span>' : '<span class="ap-state st-active">Pública</span>'}</div>
        <h4 class="ap-name">${escapeHtml(c.name)}</h4>
        <div class="ap-meta">slug: ${escapeHtml(c.slug)}</div>
      </div>
      <div class="ap-actions">
        <button title="Editar" onclick="editCategory('${c.id}')"><i class="fas fa-pen"></i></button>
        <button title="Eliminar" class="del" onclick="deleteCategory('${c.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('');
}

window.openCategoryModal = function () {
  currentEditId = null;
  document.getElementById('catModalTitle').textContent = 'Nueva Categoría';
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryModal').classList.add('open');
};

window.editCategory = function (id) {
  const c = allCategories.find(x => x.id === id); if (!c) return;
  currentEditId = id;
  document.getElementById('catModalTitle').textContent = 'Editar Categoría';
  document.getElementById('c_name').value = c.name || '';
  document.getElementById('c_icon').value = c.icon || '';
  document.getElementById('c_order').value = c.sort_order ?? 0;
  document.getElementById('c_tech_only').checked = !!c.technician_only;
  document.getElementById('categoryModal').classList.add('open');
};

window.closeCategoryModal = function () { document.getElementById('categoryModal').classList.remove('open'); };

window.deleteCategory = async function (id) {
  if (!confirm('¿Eliminar esta categoría? Los productos que la usaban quedarán sin categoría asignada.')) return;
  try {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    toast('Categoría eliminada', 'ok'); loadCategories();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

function slugify(name) {
  return String(name).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function saveCategory(e) {
  e.preventDefault();
  const btn = document.getElementById('catSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const name = document.getElementById('c_name').value.trim();
    if (!name) throw new Error('El nombre es obligatorio');
    const payload = {
      name,
      slug: slugify(name),
      icon: document.getElementById('c_icon').value.trim() || 'fas fa-th',
      sort_order: parseInt(document.getElementById('c_order').value) || 0,
      technician_only: document.getElementById('c_tech_only').checked,
    };
    let error;
    if (currentEditId) ({ error } = await supabase.from('categories').update(payload).eq('id', currentEditId));
    else ({ error } = await supabase.from('categories').insert(payload));
    if (error) throw error;
    toast(currentEditId ? 'Categoría actualizada' : 'Categoría creada', 'ok');
    closeCategoryModal(); loadCategories();
  } catch (err) { toast('Error: ' + err.message, 'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; }
}

function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
function toast(msg, type) { const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'"></i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }
