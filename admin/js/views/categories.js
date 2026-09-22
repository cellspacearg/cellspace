import { supabase } from '../config.js?v=cb22';
import { store } from '../core/state.js?v=cb22';
import { layout, mountLayout } from '../core/layout.js?v=cb22';

let allCategories = [];
let currentEditId = null;
let currentSectionFilter = '';

const SECTIONS = {
  tech:    { label: 'Tecnología',       color: '#FF6A00', icon: 'fas fa-mobile-screen' },
  care:    { label: 'Cuidado Personal', color: '#E8B4B8', icon: 'fas fa-spa' },
  license: { label: 'Licencias',        color: '#2F7BFF', icon: 'fas fa-key' },
  gaming:  { label: 'Gaming',           color: '#8b5cf6', icon: 'fas fa-gamepad' },
  offers:  { label: 'Ofertas',          color: '#ff3b3b', icon: 'fas fa-fire' },
};

export async function categoriesView() {
  const content = `
    <div class="products-toolbar">
      <p class="field-hint" style="margin:0;">
        Estas son las categorías que ven tus clientes.
        Las marcadas "Solo técnicos" solo aparecen para usuarios logueados como técnico o admin.
      </p>
      <button class="btn-primary" onclick="openCategoryModal()">
        <i class="fas fa-plus"></i> Nueva Categoría
      </button>
    </div>

    <div class="section-filters" id="sectionFilters">
      <button class="section-pill on" data-section="">Todos</button>
      <button class="section-pill" data-section="tech" style="--cat-color:#FF6A00">
        <i class="fas fa-mobile-screen"></i> Tecnología
      </button>
      <button class="section-pill" data-section="care" style="--cat-color:#E8B4B8">
        <i class="fas fa-spa"></i> Cuidado Personal
      </button>
      <button class="section-pill" data-section="license" style="--cat-color:#2F7BFF">
        <i class="fas fa-key"></i> Licencias
      </button>
      <button class="section-pill" data-section="gaming" style="--cat-color:#8b5cf6">
        <i class="fas fa-gamepad"></i> Gaming
      </button>
      <button class="section-pill" data-section="offers" style="--cat-color:#ff3b3b">
        <i class="fas fa-fire"></i> Ofertas
      </button>
    </div>

    <div class="products-count" id="categoriesCount">Cargando...</div>
    <div class="admin-products-grid" id="categoriesGrid"></div>`;

  const modal = `
  <div class="modal-overlay" id="categoryModal">
    <div class="modal-box">
      <div class="modal-header"><h2 id="catModalTitle">Nueva Categoría</h2><button class="modal-close" onclick="closeCategoryModal()"><i class="fas fa-times"></i></button></div>
      <form id="categoryForm" class="modal-body">
        <div class="form-row"><div class="form-group full"><label>Nombre *</label><input type="text" id="c_name" required placeholder="Ej: Accesorios"></div></div>
        <div class="form-row">
          <div class="form-group full">
            <label>Rubro *</label>
            <select id="c_section" required>
              <option value="tech">📱 Tecnología</option>
              <option value="care">✨ Cuidado Personal</option>
              <option value="license">💳 Licencias</option>
              <option value="gaming">🎮 Gaming</option>
              <option value="offers">🔥 Ofertas</option>
            </select>
            <p class="field-hint">A qué sección de la tienda pertenece esta categoría.</p>
          </div>
        </div>
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
  </div>`;

  return layout({ title: 'Categorías', content }) + modal;
}

export function categoriesViewOnMount() {
  mountLayout();
  document.getElementById('categoryForm').addEventListener('submit', saveCategory);
  document.querySelectorAll('.section-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.section-pill').forEach(p => p.classList.remove('on'));
      pill.classList.add('on');
      currentSectionFilter = pill.dataset.section;
      renderCategories();
    });
  });
  loadCategories();
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
  if (!allCategories.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><i class="fas fa-tags"></i></div>
      <h2>No hay categorías</h2>
      <p>Creá la primera.</p>
    </div>`;
    return;
  }

  // Filtrar si hay filtro activo
  const filtered = currentSectionFilter
    ? allCategories.filter(c => (c.section || 'tech') === currentSectionFilter)
    : allCategories;

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><i class="fas fa-filter"></i></div>
      <h2>Sin categorías en este rubro</h2>
      <p>Probá con otro filtro o creá una nueva categoría.</p>
    </div>`;
    return;
  }

  // Agrupar por section
  const grouped = {};
  Object.keys(SECTIONS).forEach(k => grouped[k] = []);
  filtered.forEach(c => {
    const s = c.section || 'tech';
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(c);
  });

  // Renderizar
  grid.innerHTML = Object.entries(grouped)
    .filter(([_, cats]) => cats.length > 0)
    .map(([sectionId, cats]) => {
      const sec = SECTIONS[sectionId] || { label: sectionId, color: '#888', icon: 'fas fa-tag' };
      return `
        <div class="cat-section">
          <div class="cat-section-head" style="--cat-color: ${sec.color}">
            <i class="${sec.icon}"></i>
            <span>${sec.label}</span>
            <span class="cat-section-count">${cats.length}</span>
          </div>
          <div class="cat-section-list">
            ${cats.map(c => renderCategoryCard(c, sec)).join('')}
          </div>
        </div>`;
    }).join('');
}

function renderCategoryCard(c, sec) {
  return `
    <div class="admin-product-card" style="--cat-color: ${sec.color}">
      <div class="ap-thumb"><i class="${escAttr(c.icon || 'fas fa-th')}" style="font-size:32px;color:${sec.color}"></i></div>
      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-cat">Orden: ${c.sort_order ?? 0}</span>
          ${c.technician_only
            ? '<span class="ap-state st-draft">Solo técnicos</span>'
            : '<span class="ap-state st-active">Pública</span>'}
        </div>
        <h4 class="ap-name">${escapeHtml(c.name)}</h4>
        <div class="ap-meta">slug: ${escapeHtml(c.slug)}</div>
      </div>
      <div class="ap-actions">
        <button title="Editar" onclick="editCategory('${c.id}')"><i class="fas fa-pen"></i></button>
        <button title="Eliminar" class="del" onclick="deleteCategory('${c.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
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
  document.getElementById('c_section').value = c.section || 'tech';
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
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
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
      section: document.getElementById('c_section').value,
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
