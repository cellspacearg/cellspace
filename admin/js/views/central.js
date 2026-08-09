import { supabase } from '../config.js?v=cb6';
import { store } from '../core/state.js?v=cb6';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb6';

// Central Space — administración de GUÍAS técnicas.
// Todas las guías comparten la MISMA estructura: meta + requisitos (lista) + pasos ordenados.

let allGuides = [];
let brands = [];
let categories = [];
let currentEditId = null;
let steps = [];         // [{ title, content }]
let requirements = [];  // [string]

const STATUS = {
  draft:     { label: 'Borrador',  color: '#888' },
  published: { label: 'Publicada', color: '#4CAF50' },
};
const DIFF = { 1: 'Muy fácil', 2: 'Fácil', 3: 'Media', 4: 'Difícil', 5: 'Experto' };

export async function centralView(){
  return layout({
    title: 'Central Space — Guías',
    toolbar: toolbar({
      searchId: 'gSearch',
      searchPlaceholder: 'Buscar guía por título...',
      countId: 'gCount',
      filters: [
        { id: 'gFilterStatus', options: [
          { v: '', l: 'Todos los estados' },
          { v: 'published', l: 'Publicadas' },
          { v: 'draft', l: 'Borradores' },
        ]},
      ],
      action: { label: 'Nueva guía', icon: 'fas fa-plus', onclick: 'openGuideModal()' },
    }),
    content: `<div class="admin-products-grid" id="guidesList"></div><div id="guideModalRoot"></div>`,
  });
}

export function centralViewOnMount(){
  mountLayout();
  document.getElementById('gSearch').addEventListener('input', applyFilters);
  document.getElementById('gFilterStatus').addEventListener('change', applyFilters);
  loadAll();
}

async function loadAll(){
  const list = document.getElementById('guidesList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando guías...</p>';
  try {
    const [g, b, c] = await Promise.all([
      supabase.from('cs_guides').select('*').order('created_at', { ascending: false }),
      supabase.from('cs_brands').select('id,name').order('name'),
      supabase.from('cs_categories').select('id,name').order('sort_order'),
    ]);
    if (g.error) throw g.error;
    allGuides = g.data || [];
    brands = b.data || [];
    categories = c.data || [];
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar: ${escapeHtml(e.message)}</p>`;
  }
}

function applyFilters(){
  const q = (document.getElementById('gSearch').value || '').toLowerCase().trim();
  const st = document.getElementById('gFilterStatus').value;
  const list = allGuides.filter(g => {
    const mQ = !q || (g.title || '').toLowerCase().includes(q);
    const mS = !st || (g.status || 'draft') === st;
    return mQ && mS;
  });
  document.getElementById('gCount').textContent =
    `${list.length} guía(s) · ${allGuides.filter(g => g.status === 'published').length} publicada(s)`;
  render(list);
}

function render(list){
  const cont = document.getElementById('guidesList');
  if (!list.length){
    cont.innerHTML = emptyState({
      icon: 'fas fa-book',
      title: 'No hay guías',
      text: 'Creá la primera guía técnica de Central Space.',
      action: { label: 'Nueva guía', icon: 'fas fa-plus', onclick: 'openGuideModal()' },
    });
    return;
  }
  cont.innerHTML = list.map(g => {
    const s = STATUS[g.status || 'draft'] || { label: g.status, color: '#888' };
    const cat = categories.find(c => c.id === g.category_id);
    const br = brands.find(b => b.id === g.brand_id);
    const nSteps = Array.isArray(g.steps) ? g.steps.length : 0;
    return `<div class="admin-product-card">
      <div class="ap-thumb" style="overflow:hidden;">${g.cover_url ? `<img src="${escapeHtml(g.cover_url)}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-book" style="color:var(--orange,#FF6A00);font-size:22px;"></i>'}</div>
      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-state" style="background:${s.color}22;color:${s.color};">${escapeHtml(s.label)}</span>
          ${g.is_vip ? '<span class="ap-state" style="background:#e0a23a22;color:#e0a23a;">VIP</span>' : ''}
        </div>
        <h4 class="ap-name">${escapeHtml(g.title || '(sin título)')}</h4>
        <div class="ap-meta">${escapeHtml((br && br.name) || '—')}${cat ? ' · ' + escapeHtml(cat.name) : ''} · ${nSteps} paso(s) · ${g.views || 0} vistas</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="btn-secondary" style="padding:9px 14px;font-size:13px;" onclick="toggleGuidePublish('${g.id}')">
          <i class="fas ${g.status === 'published' ? 'fa-eye-slash' : 'fa-bullhorn'}"></i> ${g.status === 'published' ? 'Despublicar' : 'Publicar'}
        </button>
        <button class="btn-primary" style="padding:9px 14px;font-size:13px;" onclick="editGuide('${g.id}')"><i class="fas fa-pen"></i> Editar</button>
        <button class="btn-secondary" style="padding:9px 12px;font-size:13px;color:#ff6b6b;" onclick="deleteGuide('${g.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- modal / formulario ---------- */

function guideModalHtml(){
  const brandOpts = ['<option value="">Marca (opcional)</option>'].concat(brands.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`)).join('');
  const catOpts = ['<option value="">Categoría (opcional)</option>'].concat(categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)).join('');
  const diffOpts = Object.entries(DIFF).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  return `
  <div class="cs-modal-backdrop" onclick="closeGuideModal(event)">
    <div class="cs-modal" onclick="event.stopPropagation()">
      <div class="cs-modal-head">
        <h3 id="gModalTitle" style="margin:0;color:#fff;">Nueva guía</h3>
        <button class="cs-modal-x" onclick="closeGuideModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="cs-modal-body">
        <div class="g-grid">
          <div class="g-field g-col2"><label>Título *</label><input id="g_title" type="text" placeholder="Ej: Cómo hacer FRP en Samsung A15"></div>
          <div class="g-field g-col2"><label>Slug (URL)</label><input id="g_slug" type="text" placeholder="se genera del título"></div>
          <div class="g-field"><label>Marca</label><select id="g_brand">${brandOpts}</select></div>
          <div class="g-field"><label>Categoría</label><select id="g_category">${catOpts}</select></div>
          <div class="g-field"><label>Dificultad</label><select id="g_difficulty">${diffOpts}</select></div>
          <div class="g-field"><label>Estado</label><select id="g_status"><option value="draft">Borrador</option><option value="published">Publicada</option></select></div>
          <div class="g-field g-col2"><label>Resumen</label><textarea id="g_summary" rows="2" placeholder="Descripción corta de la guía"></textarea></div>
          <div class="g-field"><label>Método</label><input id="g_method" type="text" placeholder="Ej: Test Point, ADB, Odin..."></div>
          <div class="g-field"><label>Badge</label><input id="g_badge" type="text" placeholder="Ej: NUEVO"></div>
          <div class="g-field g-col2"><label>Advertencia</label><input id="g_warning" type="text" placeholder="Ej: Riesgo de brickeo si..."></div>
          <div class="g-field g-col2"><label>Portada (URL)</label>
            <div style="display:flex;gap:8px;">
              <input id="g_cover" type="text" placeholder="https://..." style="flex:1;">
              <label class="btn-secondary" style="padding:9px 12px;font-size:13px;cursor:pointer;white-space:nowrap;">
                <i class="fas fa-upload"></i> Subir<input type="file" id="g_cover_file" accept="image/*" style="display:none;" onchange="uploadGuideCover(event)">
              </label>
            </div>
            <div id="g_cover_prev" style="margin-top:8px;"></div>
          </div>
          <div class="g-field g-col2"><label style="display:flex;align-items:center;gap:8px;"><input id="g_vip" type="checkbox"> Contenido VIP (crown)</label></div>
        </div>

        <h4 class="cs-modal-sec">Requisitos</h4>
        <div id="g_reqs"></div>
        <button type="button" class="btn-secondary" style="padding:8px 12px;font-size:13px;margin-top:6px;" onclick="addReq()"><i class="fas fa-plus"></i> Agregar requisito</button>

        <h4 class="cs-modal-sec">Pasos</h4>
        <div id="g_steps"></div>
        <button type="button" class="btn-secondary" style="padding:8px 12px;font-size:13px;margin-top:6px;" onclick="addStep()"><i class="fas fa-plus"></i> Agregar paso</button>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:22px;">
          <button class="btn-secondary" onclick="closeGuideModal()">Cancelar</button>
          <button class="btn-primary" id="gSaveBtn" onclick="saveGuide()"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </div>
    </div>
  </div>`;
}

window.openGuideModal = function(){
  currentEditId = null; steps = []; requirements = [];
  document.getElementById('guideModalRoot').innerHTML = guideModalHtml();
  injectGuideStyles();
  document.getElementById('gModalTitle').textContent = 'Nueva guía';
  renderReqs(); renderSteps();
  document.getElementById('g_title').addEventListener('input', e => {
    const s = document.getElementById('g_slug');
    if (!s.dataset.touched) s.value = slugify(e.target.value);
  });
  document.getElementById('g_slug').addEventListener('input', e => { e.target.dataset.touched = '1'; });
};

window.editGuide = function(id){
  const g = allGuides.find(x => x.id === id); if (!g) return;
  currentEditId = id;
  steps = Array.isArray(g.steps) ? g.steps.map(s => ({ title: s.title || '', content: s.content || '' })) : [];
  requirements = Array.isArray(g.requirements) ? [...g.requirements] : [];
  document.getElementById('guideModalRoot').innerHTML = guideModalHtml();
  injectGuideStyles();
  document.getElementById('gModalTitle').textContent = 'Editar guía';
  const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v ?? ''; };
  set('g_title', g.title); const sl = document.getElementById('g_slug'); sl.value = g.slug || ''; sl.dataset.touched = '1';
  set('g_brand', g.brand_id); set('g_category', g.category_id); set('g_difficulty', g.difficulty || 3);
  set('g_status', g.status || 'draft'); set('g_summary', g.summary); set('g_method', g.method);
  set('g_badge', g.badge); set('g_warning', g.warning); set('g_cover', g.cover_url);
  document.getElementById('g_vip').checked = !!g.is_vip;
  if (g.cover_url) document.getElementById('g_cover_prev').innerHTML = `<img src="${escapeHtml(g.cover_url)}" style="max-height:80px;border-radius:8px;">`;
  renderReqs(); renderSteps();
};

window.closeGuideModal = function(e){
  if (e && e.target && !e.target.classList.contains('cs-modal-backdrop')) return;
  document.getElementById('guideModalRoot').innerHTML = '';
};

/* requisitos (los setters van por window: los oninput inline corren en scope global) */
window.addReq = function(){ requirements.push(''); renderReqs(); };
window.removeReq = function(i){ requirements.splice(i, 1); renderReqs(); };
window.csSetReq = function(i, val){ if (requirements[i] !== undefined) requirements[i] = val; };
function renderReqs(){
  const c = document.getElementById('g_reqs'); if (!c) return;
  c.innerHTML = requirements.map((r, i) => `
    <div style="display:flex;gap:8px;margin-bottom:6px;">
      <input type="text" value="${escapeAttr(r)}" placeholder="Ej: Cable USB, drivers instalados..." style="flex:1;" oninput="csSetReq(${i}, this.value)">
      <button type="button" class="btn-secondary" style="padding:8px 10px;color:#ff6b6b;" onclick="removeReq(${i})"><i class="fas fa-times"></i></button>
    </div>`).join('') || '<p style="color:#888;font-size:13px;">Sin requisitos.</p>';
}

/* pasos */
window.addStep = function(){ steps.push({ title: '', content: '' }); renderSteps(); };
window.removeStep = function(i){ steps.splice(i, 1); renderSteps(); };
window.csSetStep = function(i, field, val){ if (steps[i]) steps[i][field] = val; };
function renderSteps(){
  const c = document.getElementById('g_steps'); if (!c) return;
  c.innerHTML = steps.map((s, i) => `
    <div style="border:1px solid #2a2a2a;border-radius:10px;padding:12px;margin-bottom:10px;">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <span style="color:var(--orange,#FF6A00);font-weight:800;">Paso ${i + 1}</span>
        <input type="text" value="${escapeAttr(s.title)}" placeholder="Título del paso" style="flex:1;" oninput="csSetStep(${i},'title',this.value)">
        <button type="button" class="btn-secondary" style="padding:8px 10px;color:#ff6b6b;" onclick="removeStep(${i})"><i class="fas fa-trash"></i></button>
      </div>
      <textarea rows="3" placeholder="Descripción del paso..." style="width:100%;" oninput="csSetStep(${i},'content',this.value)">${escapeHtml(s.content)}</textarea>
    </div>`).join('') || '<p style="color:#888;font-size:13px;">Sin pasos. Agregá al menos uno.</p>';
}

/* subir portada al bucket cms-media */
window.uploadGuideCover = async function(e){
  const file = e.target.files && e.target.files[0]; if (!file) return;
  try {
    const path = 'guides/' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const { error } = await supabase.storage.from('cms-media').upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('cms-media').getPublicUrl(path);
    document.getElementById('g_cover').value = data.publicUrl;
    document.getElementById('g_cover_prev').innerHTML = `<img src="${escapeHtml(data.publicUrl)}" style="max-height:80px;border-radius:8px;">`;
    toast('Portada subida', 'ok');
  } catch (err) { toast('Error al subir: ' + err.message, 'err'); }
};

window.saveGuide = async function(){
  const btn = document.getElementById('gSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const v = id => (document.getElementById(id)?.value ?? '').trim();
    const title = v('g_title'); if (!title) throw new Error('El título es obligatorio');
    let slug = slugify(v('g_slug')) || slugify(title);
    if (allGuides.some(g => g.slug === slug && g.id !== currentEditId)) throw new Error('Ya existe una guía con ese slug');
    const cleanSteps = steps.filter(s => (s.title || '').trim() || (s.content || '').trim());
    const cleanReqs = requirements.map(r => (r || '').trim()).filter(Boolean);

    const payload = {
      title, slug,
      summary: v('g_summary') || null,
      category_id: v('g_category') || null,
      brand_id: v('g_brand') || null,
      difficulty: parseInt(v('g_difficulty'), 10) || 3,
      method: v('g_method') || null,
      warning: v('g_warning') || null,
      requirements: cleanReqs,
      steps: cleanSteps,
      cover_url: v('g_cover') || null,
      badge: v('g_badge') || null,
      is_vip: document.getElementById('g_vip').checked,
      status: v('g_status'),
      author_id: store.getState().user?.id || null,
      published_at: v('g_status') === 'published' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (currentEditId) ({ error } = await supabase.from('cs_guides').update(payload).eq('id', currentEditId));
    else ({ error } = await supabase.from('cs_guides').insert(payload));
    if (error) throw error;

    toast(currentEditId ? 'Guía actualizada' : 'Guía creada', 'ok');
    closeGuideModal(); loadAll();
  } catch (err) { console.error(err); toast('Error: ' + err.message, 'err'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; } }
};

window.toggleGuidePublish = async function(id){
  const g = allGuides.find(x => x.id === id); if (!g) return;
  const next = g.status === 'published' ? 'draft' : 'published';
  try {
    const { error } = await supabase.from('cs_guides')
      .update({ status: next, published_at: next === 'published' ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    g.status = next;
    toast(next === 'published' ? 'Guía publicada' : 'Guía despublicada', 'ok');
    applyFilters();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.deleteGuide = async function(id){
  const g = allGuides.find(x => x.id === id); if (!g) return;
  if (!confirm(`¿Eliminar la guía "${g.title}"? Esta acción no se puede deshacer.`)) return;
  try {
    const { error } = await supabase.from('cs_guides').delete().eq('id', id);
    if (error) throw error;
    toast('Guía eliminada', 'ok'); loadAll();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

/* ---------- estilos + helpers ---------- */
function injectGuideStyles(){
  if (document.getElementById('cs-guide-style')) return;
  const s = document.createElement('style');
  s.id = 'cs-guide-style';
  s.textContent = `
    .cs-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;}
    .cs-modal{background:#151515;border:1px solid #2a2a2a;border-radius:16px;max-width:720px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6);}
    .cs-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #2a2a2a;position:sticky;top:0;background:#151515;border-radius:16px 16px 0 0;}
    .cs-modal-x{background:none;border:none;color:#888;font-size:18px;cursor:pointer;}
    .cs-modal-x:hover{color:#fff;}
    .cs-modal-body{padding:20px;}
    .cs-modal-sec{color:var(--orange,#FF6A00);font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin:20px 0 8px;}
    .g-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .g-field{display:flex;flex-direction:column;gap:5px;}
    .g-field.g-col2{grid-column:1/-1;}
    .g-field label{color:#bbb;font-size:12px;}
    .cs-modal-body input[type=text], .cs-modal-body textarea, .cs-modal-body select{
      background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;}
    @media (max-width:600px){ .g-grid{grid-template-columns:1fr;} }`;
  document.head.appendChild(s);
}
function slugify(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-'); }
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escapeAttr(s){ return escapeHtml(s).replace(/"/g, '&quot;'); }
function toast(msg, type){
  const t = document.createElement('div');
  t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok');
  t.innerHTML = `<i class="fas ${type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${escapeHtml(msg)}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}
