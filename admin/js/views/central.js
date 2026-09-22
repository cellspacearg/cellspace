import { supabase } from '../config.js?v=cb22';
import { store } from '../core/state.js?v=cb22';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb22';

// Central Space — administración de GUÍAS técnicas.
// Todas las guías comparten la MISMA estructura: meta + requisitos (lista) + pasos ordenados.

let allGuides = [];
let brands = [];
let categories = [];
let currentEditId = null;
let steps = [];         // [{ title, content }]
let requirements = [];  // [string]
let currentCover = null;
let currentQuickFilter = ''; // '' | 'published' | 'draft' | 'archived' | 'vip'

const STATUS = {
  draft:     { label: 'Borrador',  color: '#FFD700', icon: 'fas fa-pencil' },
  published: { label: 'Publicada', color: '#10c46a', icon: 'fas fa-bullhorn' },
  archived:  { label: 'Archivada', color: '#888',    icon: 'fas fa-archive' },
};

const DIFFICULTY = {
  1: { label: 'Muy fácil', color: '#10c46a' },
  2: { label: 'Fácil',     color: '#4CAF50' },
  3: { label: 'Media',     color: '#FFD700' },
  4: { label: 'Difícil',   color: '#FF9800' },
  5: { label: 'Experto',   color: '#f44336' },
};

export async function centralView(){
  try {
    const [b, c] = await Promise.all([
      supabase.from('cs_brands').select('id,name').order('name'),
      supabase.from('cs_categories').select('id,name').order('sort_order'),
    ]);
    brands = b.data || [];
    categories = c.data || [];
  } catch (e) { console.warn('No se pudieron cargar marcas/categorías de Central Space', e); }

  const brandOpts = ['<option value="">Marca (opcional)</option>'].concat(brands.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`)).join('');
  const catOpts = ['<option value="">Categoría (opcional)</option>'].concat(categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)).join('');
  const diffOpts = Object.entries(DIFFICULTY).map(([v, d]) => `<option value="${v}" style="color:${d.color}">${escapeHtml(d.label)}</option>`).join('');

  const content = `
    <div class="section-filters" id="gQuickFilters"></div>
    <div class="admin-products-grid" id="guidesList"></div>`;

  const toolbarHtml = toolbar({
    searchId: 'gSearch',
    searchPlaceholder: 'Buscar por título, slug o marca...',
    countId: 'gCount',
    filters: [
      { id: 'gFilterStatus', options: [
        { v: '', l: 'Todos los estados' },
        { v: 'draft', l: 'Borradores' },
        { v: 'published', l: 'Publicadas' },
        { v: 'archived', l: 'Archivadas' },
      ]},
      { id: 'gFilterDifficulty', options: [
        { v: '', l: 'Todas las dificultades' },
        ...Object.entries(DIFFICULTY).map(([v, d]) => ({ v, l: d.label })),
      ]},
    ],
    action: { label: 'Nueva guía', icon: 'fas fa-plus', onclick: 'openGuideModal()' },
  });

  const modal = `
  <div class="modal-overlay" id="guideModal">
    <div class="modal-box modal-xl">
      <div class="modal-header"><h2 id="gModalTitle">Nueva guía</h2><button class="modal-close" onclick="closeGuideModal()"><i class="fas fa-times"></i></button></div>
      <form id="guideForm">
        <div class="prod-modal-body">
          <div class="prod-modal-form">
            <div class="form-row"><div class="form-group full"><label>Título *</label><input type="text" id="g_title" placeholder="Ej: Cómo hacer FRP en Samsung A15"></div></div>
            <div class="form-row"><div class="form-group full"><label>Slug (URL)</label><input type="text" id="g_slug" placeholder="se genera del título"></div></div>
            <div class="form-row">
              <div class="form-group"><label>Marca</label><select id="g_brand">${brandOpts}</select></div>
              <div class="form-group"><label>Categoría</label><select id="g_category">${catOpts}</select></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Dificultad</label><select id="g_difficulty">${diffOpts}</select></div>
              <div class="form-group"><label>Estado</label>
                <select id="g_status">
                  <option value="draft">Borrador</option>
                  <option value="published">Publicada</option>
                  <option value="archived">Archivada</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Método</label><input type="text" id="g_method" placeholder="Ej: Test Point, ADB, Odin..."></div>
              <div class="form-group"><label>Badge</label><input type="text" id="g_badge" placeholder="Ej: NUEVO"></div>
            </div>
            <div class="form-row"><div class="form-group full"><label>Advertencia</label><input type="text" id="g_warning" placeholder="Ej: Riesgo de brickeo si..."></div></div>
            <div class="form-row"><div class="form-group full"><label>Resumen</label><textarea id="g_summary" rows="2" placeholder="Descripción corta de la guía"></textarea></div></div>

            <div class="form-row"><div class="form-group full">
              <label>Portada</label>
              <div class="upload-zone" id="coverUploadZone">
                <input type="file" id="g_cover_file" accept="image/*" style="display:none">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Hacé clic o arrastrá una imagen</p>
              </div>
              <div class="image-previews" id="coverPreview"></div>
            </div></div>

            <div class="form-row checks">
              <label class="check"><input type="checkbox" id="g_vip"><span>Contenido VIP</span></label>
            </div>

            <div class="psec"><h4 class="psec-t"><i class="fas fa-list-check"></i> Requisitos</h4>
              <div id="g_reqs"></div>
              <button type="button" class="btn-secondary mini" onclick="addReq()"><i class="fas fa-plus"></i> Agregar requisito</button>
            </div>

            <div class="psec"><h4 class="psec-t"><i class="fas fa-shoe-prints"></i> Pasos</h4>
              <div id="g_steps"></div>
              <button type="button" class="btn-secondary mini" onclick="addStep()"><i class="fas fa-plus"></i> Agregar paso</button>
            </div>
          </div>

          <div class="prod-modal-preview">
            <h4>Vista previa</h4>
            <div class="guide-preview">
              <div class="pv-cover" id="gp_cover"><i class="fas fa-book"></i></div>
              <div class="pv-title" id="gp_title">Título de la guía</div>
              <div class="pv-meta" id="gp_meta"></div>
              <p id="gp_summary" style="font-size:12.5px;color:#ccc;margin:0 0 10px;"></p>
              <p id="gp_warning" style="font-size:12px;color:#FFD700;margin:0 0 10px;"></p>
              <ul id="gp_reqs" style="font-size:12px;color:#bbb;margin:0 0 10px;padding-left:18px;"></ul>
              <div id="gp_steps"></div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="padding:16px 24px;">
          <button type="button" class="btn-secondary" onclick="closeGuideModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="gSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>`;

  return layout({ title: 'Central Space — Guías', toolbar: toolbarHtml, content }) + modal;
}

export function centralViewOnMount(){
  mountLayout();
  document.getElementById('gSearch').addEventListener('input', applyFilters);
  document.getElementById('gFilterStatus').addEventListener('change', applyFilters);
  document.getElementById('gFilterDifficulty').addEventListener('change', applyFilters);
  document.getElementById('guideForm').addEventListener('submit', e => { e.preventDefault(); saveGuide(); });

  document.getElementById('g_title').addEventListener('input', e => {
    const s = document.getElementById('g_slug');
    if (!s.dataset.touched) s.value = slugify(e.target.value);
    updatePreview();
  });
  document.getElementById('g_slug').addEventListener('input', e => { e.target.dataset.touched = '1'; });
  ['g_brand','g_category','g_difficulty','g_summary','g_warning'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
    document.getElementById(id).addEventListener('change', updatePreview);
  });

  const zone = document.getElementById('coverUploadZone'), fi = document.getElementById('g_cover_file');
  zone.addEventListener('click', () => fi.click());
  fi.addEventListener('change', handleCoverUpload);
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); fi.files = e.dataTransfer.files; handleCoverUpload({ target: fi }); });

  loadAll();
}

async function loadAll(){
  const list = document.getElementById('guidesList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando guías...</p>';
  try {
    const { data, error } = await supabase.from('cs_guides').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allGuides = data || [];
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar: ${escapeHtml(e.message)}</p>`;
  }
}

function renderQuickFilters(){
  const counts = { published: 0, draft: 0, archived: 0, vip: 0 };
  allGuides.forEach(g => {
    const st = g.status || 'draft';
    if (counts[st] != null) counts[st]++;
    if (g.is_vip) counts.vip++;
  });
  const pills = [
    { k: '', label: `Todas: ${allGuides.length}` },
    { k: 'published', label: `Publicadas: ${counts.published}` },
    { k: 'draft', label: `Borradores: ${counts.draft}` },
    { k: 'archived', label: `Archivadas: ${counts.archived}` },
    { k: 'vip', label: `VIP: ${counts.vip}` },
  ];
  const box = document.getElementById('gQuickFilters');
  box.innerHTML = pills.map(p => `<button type="button" class="section-pill ${currentQuickFilter===p.k?'on':''}" data-quick="${p.k}">${escapeHtml(p.label)}</button>`).join('');
  box.querySelectorAll('.section-pill').forEach(pill => pill.addEventListener('click', () => {
    currentQuickFilter = pill.dataset.quick;
    applyFilters();
  }));
}

function applyFilters(){
  const q = (document.getElementById('gSearch').value || '').toLowerCase().trim();
  const st = document.getElementById('gFilterStatus').value;
  const diff = document.getElementById('gFilterDifficulty').value;
  const list = allGuides.filter(g => {
    const br = brands.find(b => b.id === g.brand_id);
    const matchQ = !q || (g.title||'').toLowerCase().includes(q) || (g.slug||'').toLowerCase().includes(q) || ((br&&br.name)||'').toLowerCase().includes(q);
    const matchSt = !st || (g.status || 'draft') === st;
    const matchDiff = !diff || String(g.difficulty) === diff;
    const matchQuick = !currentQuickFilter || (currentQuickFilter === 'vip' ? !!g.is_vip : (g.status || 'draft') === currentQuickFilter);
    return matchQ && matchSt && matchDiff && matchQuick;
  });
  document.getElementById('gCount').textContent =
    `${list.length} guía(s) · ${allGuides.filter(g => g.status === 'published').length} publicada(s)`;
  renderQuickFilters();
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
    const s = STATUS[g.status || 'draft'] || { label: g.status, color: '#888', icon: 'fas fa-circle' };
    const cat = categories.find(c => c.id === g.category_id);
    const br = brands.find(b => b.id === g.brand_id);
    const nSteps = Array.isArray(g.steps) ? g.steps.length : 0;
    const updated = g.updated_at ? new Date(g.updated_at).toLocaleDateString('es-AR') : '—';
    const isArchived = g.status === 'archived';
    return `<div class="admin-product-card" style="--cat-color:${s.color}">
      <div class="ap-thumb" style="overflow:hidden;">${g.cover_url ? `<img src="${escapeHtml(g.cover_url)}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-book"></i>'}</div>
      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-state" style="background:${s.color}22;color:${s.color};"><i class="${s.icon}"></i> ${escapeHtml(s.label)}</span>
          ${g.is_vip ? '<span class="ap-state" style="background:#e0a23a22;color:#e0a23a;"><i class="fas fa-crown"></i> VIP</span>' : ''}
        </div>
        <h4 class="ap-name">${escapeHtml(g.title || '(sin título)')}</h4>
        <div class="ap-meta">${escapeHtml((br && br.name) || '—')}${cat ? ' · ' + escapeHtml(cat.name) : ''} · ${nSteps} paso(s)</div>
        <div class="ap-meta"><i class="fas fa-eye"></i> ${g.views || 0} vistas · actualizada el ${updated}</div>
      </div>
      <div class="ap-actions">
        <button title="Editar" onclick="editGuide('${g.id}')"><i class="fas fa-pen"></i></button>
        <button title="Duplicar" onclick="duplicateGuide('${g.id}')"><i class="fas fa-copy"></i></button>
        ${isArchived
          ? `<button title="Restaurar a borrador" onclick="restoreGuide('${g.id}')"><i class="fas fa-rotate-left"></i></button>`
          : `<button title="${g.status==='published'?'Despublicar':'Publicar'}" onclick="toggleGuidePublish('${g.id}')"><i class="fas ${g.status==='published'?'fa-eye-slash':'fa-bullhorn'}"></i></button>
             <button title="Archivar" onclick="archiveGuide('${g.id}')"><i class="fas fa-archive"></i></button>`}
        <button title="Eliminar" class="del" onclick="deleteGuide('${g.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- preview en vivo ---------- */
function updatePreview(){
  const title = val('g_title').trim() || 'Título de la guía';
  const br = brands.find(b => b.id === val('g_brand'));
  const cat = categories.find(c => c.id === val('g_category'));
  const diff = DIFFICULTY[parseInt(val('g_difficulty'), 10) || 3];
  const summary = val('g_summary').trim();
  const warning = val('g_warning').trim();

  document.getElementById('gp_cover').innerHTML = currentCover ? `<img src="${escAttr(currentCover)}" alt="">` : '<i class="fas fa-book"></i>';
  document.getElementById('gp_title').textContent = title;
  document.getElementById('gp_meta').innerHTML = [
    br ? escapeHtml(br.name) : null,
    cat ? escapeHtml(cat.name) : null,
    `<span style="color:${diff.color}">${escapeHtml(diff.label)}</span>`,
  ].filter(Boolean).join(' · ');

  const summaryEl = document.getElementById('gp_summary');
  summaryEl.textContent = summary; summaryEl.style.display = summary ? '' : 'none';
  const warnEl = document.getElementById('gp_warning');
  warnEl.textContent = warning ? ('⚠ ' + warning) : ''; warnEl.style.display = warning ? '' : 'none';

  document.getElementById('gp_reqs').innerHTML = requirements.filter(r => (r||'').trim()).map(r => `<li>${escapeHtml(r)}</li>`).join('');
  document.getElementById('gp_steps').innerHTML = steps.filter(s => (s.title||'').trim() || (s.content||'').trim()).map((s,i) => {
    const content = s.content || '';
    const short = content.length > 90 ? content.slice(0,90) + '…' : content;
    return `<div class="pv-step"><span class="pv-step-num">${i+1}.</span><div><strong>${escapeHtml(s.title || '(sin título)')}</strong><br>${escapeHtml(short)}</div></div>`;
  }).join('');
}

/* ---------- modal ---------- */
window.openGuideModal = function(){
  currentEditId = null; steps = []; requirements = []; currentCover = null;
  document.getElementById('gModalTitle').textContent = 'Nueva guía';
  document.getElementById('guideForm').reset();
  document.getElementById('g_slug').dataset.touched = '';
  document.getElementById('g_status').value = 'draft';
  document.getElementById('g_difficulty').value = '3';
  renderCoverPreview();
  renderReqs(); renderSteps(); updatePreview();
  document.getElementById('guideModal').classList.add('open');
};

window.editGuide = function(id){
  const g = allGuides.find(x => x.id === id); if (!g) return;
  currentEditId = id;
  steps = Array.isArray(g.steps) ? g.steps.map(s => ({ title: s.title || '', content: s.content || '' })) : [];
  requirements = Array.isArray(g.requirements) ? [...g.requirements] : [];
  currentCover = g.cover_url || null;
  document.getElementById('gModalTitle').textContent = 'Editar guía';
  set('g_title', g.title);
  const sl = document.getElementById('g_slug'); sl.value = g.slug || ''; sl.dataset.touched = '1';
  set('g_brand', g.brand_id); set('g_category', g.category_id); set('g_difficulty', g.difficulty || 3);
  set('g_status', g.status || 'draft'); set('g_summary', g.summary); set('g_method', g.method);
  set('g_badge', g.badge); set('g_warning', g.warning);
  document.getElementById('g_vip').checked = !!g.is_vip;
  renderCoverPreview();
  renderReqs(); renderSteps(); updatePreview();
  document.getElementById('guideModal').classList.add('open');
};

window.closeGuideModal = function(){ document.getElementById('guideModal').classList.remove('open'); };

/* requisitos (los setters van por window: los oninput inline corren en scope global) */
window.addReq = function(){ requirements.push(''); renderReqs(); };
window.removeReq = function(i){ requirements.splice(i, 1); renderReqs(); };
window.csSetReq = function(i, v){ if (requirements[i] !== undefined) { requirements[i] = v; updatePreview(); } };
function renderReqs(){
  const c = document.getElementById('g_reqs'); if (!c) return;
  c.innerHTML = requirements.map((r, i) => `
    <div class="guide-req">
      <input type="text" value="${escapeAttr(r)}" placeholder="Ej: Cable USB, drivers instalados...">
      <button type="button" class="btn-secondary mini" style="color:#ff6b6b;" onclick="removeReq(${i})"><i class="fas fa-times"></i></button>
    </div>`).join('') || '<p class="field-hint">Sin requisitos.</p>';
  c.querySelectorAll('.guide-req input').forEach((inp, i) => inp.addEventListener('input', e => csSetReq(i, e.target.value)));
  updatePreview();
}

/* pasos: alta/baja/edición + reordenar (drag & drop y botones ▲▼) */
window.addStep = function(){ steps.push({ title: '', content: '' }); renderSteps(); };
window.removeStep = function(i){ steps.splice(i, 1); renderSteps(); };
window.csSetStep = function(i, field, v){ if (steps[i]) { steps[i][field] = v; updatePreview(); } };
function moveStep(from, to){
  if (to < 0 || to >= steps.length || from === to) return;
  const [item] = steps.splice(from, 1);
  steps.splice(to, 0, item);
  renderSteps();
}
window.moveStep = moveStep;
window.csMoveStepUp = function(i){ moveStep(i, i - 1); };
window.csMoveStepDown = function(i){ moveStep(i, i + 1); };
window.csStepDragStart = function(e, i){ e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); e.currentTarget.classList.add('dragging'); };
window.csStepDragEnd = function(e){ e.currentTarget.classList.remove('dragging'); };
window.csStepDragOver = function(e){ e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
window.csStepDrop = function(e, i){
  e.preventDefault();
  const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
  if (!isNaN(from)) moveStep(from, i);
};
function renderSteps(){
  const c = document.getElementById('g_steps'); if (!c) return;
  c.innerHTML = steps.map((s, i) => `
    <div class="guide-step" draggable="true"
      ondragstart="csStepDragStart(event,${i})" ondragend="csStepDragEnd(event)"
      ondragover="csStepDragOver(event)" ondrop="csStepDrop(event,${i})">
      <div class="step-head">
        <span class="step-drag" title="Arrastrar para reordenar"><i class="fas fa-grip-vertical"></i></span>
        <span class="step-num">Paso ${i + 1}</span>
        <input type="text" value="${escapeAttr(s.title)}" placeholder="Título del paso" style="flex:1;" data-step-title="${i}">
        <button type="button" class="btn-secondary mini" onclick="csMoveStepUp(${i})" ${i===0?'disabled':''} title="Subir"><i class="fas fa-chevron-up"></i></button>
        <button type="button" class="btn-secondary mini" onclick="csMoveStepDown(${i})" ${i===steps.length-1?'disabled':''} title="Bajar"><i class="fas fa-chevron-down"></i></button>
        <button type="button" class="btn-secondary mini" style="color:#ff6b6b;" onclick="removeStep(${i})" title="Eliminar"><i class="fas fa-trash"></i></button>
      </div>
      <div class="step-fields">
        <textarea rows="3" placeholder="Descripción del paso..." data-step-content="${i}">${escapeHtml(s.content)}</textarea>
      </div>
    </div>`).join('') || '<p class="field-hint">Sin pasos. Agregá al menos uno.</p>';
  c.querySelectorAll('[data-step-title]').forEach(inp => inp.addEventListener('input', e => csSetStep(parseInt(e.target.dataset.stepTitle,10), 'title', e.target.value)));
  c.querySelectorAll('[data-step-content]').forEach(ta => ta.addEventListener('input', e => csSetStep(parseInt(e.target.dataset.stepContent,10), 'content', e.target.value)));
  updatePreview();
}

/* portada al bucket cms-media */
async function handleCoverUpload(e){
  const file = e.target.files && e.target.files[0]; if (!file) return;
  const zone = document.getElementById('coverUploadZone');
  zone.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Subiendo...</p>';
  try {
    const path = 'guides/' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const { error } = await supabase.storage.from('cms-media').upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('cms-media').getPublicUrl(path);
    currentCover = data.publicUrl;
    toast('Portada subida', 'ok');
  } catch (err) { toast('Error al subir: ' + err.message, 'err'); }
  zone.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Hacé clic o arrastrá una imagen</p>';
  e.target.value = ''; renderCoverPreview(); updatePreview();
}
function renderCoverPreview(){
  const box = document.getElementById('coverPreview'); if (!box) return;
  box.innerHTML = currentCover
    ? `<div class="img-prev"><img src="${escapeHtml(currentCover)}" alt=""><button type="button" onclick="removeCover()"><i class="fas fa-times"></i></button></div>`
    : '';
}
window.removeCover = function(){ currentCover = null; renderCoverPreview(); updatePreview(); };

/* ---------- guardar / acciones ---------- */
window.saveGuide = async function(){
  const btn = document.getElementById('gSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const title = val('g_title').trim(); if (!title) throw new Error('El título es obligatorio');
    let slug = slugify(val('g_slug')) || slugify(title);
    if (allGuides.some(g => g.slug === slug && g.id !== currentEditId)) throw new Error('Ya existe una guía con ese slug');
    const cleanSteps = steps.filter(s => (s.title || '').trim() || (s.content || '').trim());
    const cleanReqs = requirements.map(r => (r || '').trim()).filter(Boolean);
    const status = val('g_status');

    const payload = {
      title, slug,
      summary: val('g_summary').trim() || null,
      category_id: val('g_category') || null,
      brand_id: val('g_brand') || null,
      difficulty: parseInt(val('g_difficulty'), 10) || 3,
      method: val('g_method').trim() || null,
      warning: val('g_warning').trim() || null,
      requirements: cleanReqs,
      steps: cleanSteps,
      cover_url: currentCover || null,
      badge: val('g_badge').trim() || null,
      is_vip: document.getElementById('g_vip').checked,
      status,
      author_id: store.getState().user?.id || null,
      updated_by: store.getState().user?.id || null,
      published_at: status === 'published' ? new Date().toISOString() : null,
      archived_at: status === 'archived' ? new Date().toISOString() : null,
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
    toast(next === 'published' ? 'Guía publicada' : 'Guía despublicada', 'ok');
    loadAll();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.archiveGuide = async function(id){
  const g = allGuides.find(x => x.id === id); if (!g) return;
  if (!confirm(`¿Archivar la guía "${g.title}"? Deja de estar publicada.`)) return;
  try {
    const { error } = await supabase.from('cs_guides')
      .update({ status: 'archived', archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    toast('Guía archivada', 'ok'); loadAll();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.restoreGuide = async function(id){
  try {
    const { error } = await supabase.from('cs_guides')
      .update({ status: 'draft', archived_at: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    toast('Guía restaurada a borrador', 'ok'); loadAll();
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

window.duplicateGuide = async function(id){
  const g = allGuides.find(x => x.id === id); if (!g) return;
  const copy = { ...g }; delete copy.id; delete copy.created_at; delete copy.updated_at;
  copy.title = (g.title || '') + ' (copia)';
  copy.slug = slugify(copy.title) + '-' + Date.now().toString(36);
  copy.status = 'draft'; copy.published_at = null; copy.archived_at = null; copy.views = 0;
  try {
    const { error } = await supabase.from('cs_guides').insert(copy);
    if (error) throw error;
    toast('Guía duplicada', 'ok'); loadAll();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

/* ---------- helpers ---------- */
function val(id){ return (document.getElementById(id)?.value ?? ''); }
function set(id, v){ const el = document.getElementById(id); if (el) el.value = v ?? ''; }
function slugify(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-'); }
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escapeAttr(s){ return escapeHtml(s).replace(/"/g, '&quot;'); }
function escAttr(s){ return escapeAttr(s); }
function toast(msg, type){
  const t = document.createElement('div');
  t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok');
  t.innerHTML = `<i class="fas ${type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${escapeHtml(msg)}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}
