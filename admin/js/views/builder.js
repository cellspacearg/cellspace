import { supabase } from '../config.js';

let currentPage = null; // { id, title, ... }

const TYPES = [
  { v:'heading',  l:'Título',        i:'fa-heading' },
  { v:'text',     l:'Texto',         i:'fa-paragraph' },
  { v:'image',    l:'Imagen',        i:'fa-image' },
  { v:'hero',     l:'Hero / Portada',i:'fa-panorama' },
  { v:'carousel', l:'Carrusel',      i:'fa-images' },
  { v:'video',    l:'Video',         i:'fa-video' },
  { v:'cards',    l:'Tarjetas',      i:'fa-table-cells' },
  { v:'products', l:'Productos',     i:'fa-box' },
  { v:'services', l:'Servicios',     i:'fa-screwdriver-wrench' },
  { v:'faq',      l:'Preguntas',     i:'fa-circle-question' },
  { v:'buttons',  l:'Botones',       i:'fa-square-caret-right' },
  { v:'map',      l:'Mapa',          i:'fa-map-location-dot' },
  { v:'form',     l:'Formulario',    i:'fa-rectangle-list' },
  { v:'divider',  l:'Separador',     i:'fa-minus' }
];

// ---------- VISTA ----------
export async function builderView() {
  const palette = TYPES.map(t =>
    `<button type="button" class="palette-btn" onclick="addBlock('${t.v}')" title="${t.l}">
       <i class="fas ${t.i}"></i><span>${t.l}</span>
     </button>`).join('');

  return `
  <div class="builder-shell">
    <header class="builder-topbar">
      <div class="bt-left">
        <button class="btn-secondary" onclick="goPages()"><i class="fas fa-arrow-left"></i> Páginas</button>
        <div class="bt-title">
          <i class="fas fa-paint-roller"></i>
          <span>Constructor Visual · <strong id="builderPageTitle">Cargando…</strong></span>
        </div>
      </div>
      <div class="bt-right">
        <span class="bt-count" id="builderCount">0 bloques</span>
        <button class="btn-primary" onclick="saveBuilder()"><i class="fas fa-save"></i> Guardar</button>
      </div>
    </header>

    <div class="builder-body">
      <aside class="builder-palette">
        <h4>Agregar bloque</h4>
        <div class="palette-grid">${palette}</div>
        <p class="field-hint" style="margin-top:14px;">Arrastrá los bloques del canvas para reordenarlos. En celular usá ▲ ▼.</p>
      </aside>

      <main class="builder-canvas-wrap">
        <div class="builder-canvas" id="builderCanvas"></div>
      </main>
    </div>
  </div>`;
}

// ---------- MOUNT ----------
export function builderViewOnMount() {
  const canvas = document.getElementById('builderCanvas');
  // Drag & drop por delegación
  canvas.addEventListener('dragstart', e => {
    const item = e.target.closest('.block-item'); if (!item) return;
    item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
  });
  canvas.addEventListener('dragend', e => {
    const item = e.target.closest('.block-item'); if (item) item.classList.remove('dragging');
    updateCount();
  });
  canvas.addEventListener('dragover', e => {
    e.preventDefault();
    const dragging = canvas.querySelector('.dragging'); if (!dragging) return;
    const after = getDragAfterElement(canvas, e.clientY);
    if (after == null) canvas.appendChild(dragging); else canvas.insertBefore(dragging, after);
  });

  loadPageForBuilder();
}

function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll('.block-item:not(.dragging)')];
  let closest = { offset: Number.NEGATIVE_INFINITY, el: null };
  els.forEach(el => {
    const box = el.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) closest = { offset, el };
  });
  return closest.el;
}

// ---------- LOAD ----------
async function loadPageForBuilder() {
  const id = getIdFromHash();
  const canvas = document.getElementById('builderCanvas');
  if (!id) {
    document.getElementById('builderPageTitle').textContent = '(sin página)';
    canvas.innerHTML = '<p class="blocks-empty">Abrí el constructor desde el listado de Páginas (clic en <i class="fas fa-paint-roller"></i>).</p>';
    return;
  }
  canvas.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando página…</p>';
  try {
    const { data, error } = await supabase.from('pages').select('*').eq('id', id).single();
    if (error) throw error;
    currentPage = data;
    document.getElementById('builderPageTitle').textContent = data.title;
    const blocks = Array.isArray(data.blocks) ? data.blocks : [];
    if (!blocks.length) canvas.innerHTML = '<p class="blocks-empty">Página vacía. Agregá bloques desde la paleta de la izquierda.</p>';
    else blocks.forEach(b => appendBlockNode(b.type, b.data));
    updateCount();
  } catch (e) {
    console.error(e);
    canvas.innerHTML = '<p class="loading-text" style="color:#ff4444">Error: ' + e.message + '</p>';
  }
}

function getIdFromHash() {
  const q = (window.location.hash || '').split('?')[1] || '';
  return new URLSearchParams(q).get('id');
}

// ---------- BLOQUES: agregar / reordenar / eliminar / cambiar tipo ----------
window.addBlock = function (type) {
  const canvas = document.getElementById('builderCanvas');
  const empty = canvas.querySelector('.blocks-empty'); if (empty) empty.remove();
  appendBlockNode(type, defaultData(type));
  updateCount();
  canvas.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.removeBlock = function (id) {
  const node = document.querySelector('.block-item[data-id="' + id + '"]'); if (node) node.remove();
  const canvas = document.getElementById('builderCanvas');
  if (!canvas.querySelectorAll('.block-item').length) canvas.innerHTML = '<p class="blocks-empty">Página vacía. Agregá bloques desde la paleta.</p>';
  updateCount();
};

window.moveBlock = function (id, dir) {
  const node = document.querySelector('.block-item[data-id="' + id + '"]'); if (!node) return;
  if (dir < 0 && node.previousElementSibling) node.parentNode.insertBefore(node, node.previousElementSibling);
  if (dir > 0 && node.nextElementSibling) node.parentNode.insertBefore(node.nextElementSibling, node);
  updateCount();
};

window.changeBlockType = function (id, newType) {
  const node = document.querySelector('.block-item[data-id="' + id + '"]'); if (!node) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = buildBlockHTML(id, newType, defaultData(newType));
  node.replaceWith(tmp.firstElementChild);
};

function appendBlockNode(type, data) {
  const canvas = document.getElementById('builderCanvas');
  const tmp = document.createElement('div');
  tmp.innerHTML = buildBlockHTML(uid(), type, data || defaultData(type));
  canvas.appendChild(tmp.firstElementChild);
}

function updateCount() {
  const n = document.querySelectorAll('#builderCanvas .block-item').length;
  const el = document.getElementById('builderCount'); if (el) el.textContent = n + ' bloque(s)';
}

// ---------- HTML de un bloque ----------
function buildBlockHTML(id, type, data) {
  const t = TYPES.find(x => x.v === type) || { l: type, i: 'fa-cube' };
  const typeSel = TYPES.map(x => `<option value="${x.v}" ${x.v===type?'selected':''}>${x.l}</option>`).join('');
  return `<div class="block-item" data-id="${id}" draggable="true">
    <div class="block-head">
      <span class="drag-handle" title="Arrastrar"><i class="fas fa-grip-vertical"></i></span>
      <span class="block-type-badge"><i class="fas ${t.i}"></i> ${escapeHtml(t.l)}</span>
      <select data-f="type" onchange="changeBlockType('${id}', this.value)">${typeSel}</select>
      <div class="block-controls">
        <button type="button" title="Subir" onclick="moveBlock('${id}',-1)"><i class="fas fa-arrow-up"></i></button>
        <button type="button" title="Bajar" onclick="moveBlock('${id}',1)"><i class="fas fa-arrow-down"></i></button>
        <button type="button" title="Eliminar" class="del" onclick="removeBlock('${id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="block-body">${renderBody(id, type, data)}</div>
  </div>`;
}

function renderBody(id, type, d) {
  d = d || {};
  switch (type) {
    case 'heading':
      return `<div class="blk-row"><input data-f="text" placeholder="Texto del título" value="${escAttr(d.text)}" oninput="setPrev('prevHead_${id}', this.value)"></div>
        <div class="blk-row short"><select data-f="level"><option value="h1" ${d.level==='h1'?'selected':''}>H1</option><option value="h2" ${d.level==='h2'||!d.level?'selected':''}>H2</option><option value="h3" ${d.level==='h3'?'selected':''}>H3</option></select></div>
        <div class="blk-preview"><${d.level||'h2'} class="pv-heading" id="prevHead_${id}">${escapeHtml(d.text)||'Vista previa del título'}</${d.level||'h2'}></div>`;
    case 'text':
      return `<textarea data-f="text" rows="4" placeholder="Escribí el texto del bloque…">${escapeHtml(d.text)}</textarea>`;
    case 'image':
      return `<div class="blk-row"><input data-f="url" placeholder="URL de la imagen" value="${escAttr(d.url)}" oninput="setPrevSrc('prevImg_${id}', this.value)"></div>
        <div class="blk-row"><label class="blk-upload"><i class="fas fa-upload"></i> Subir imagen<input type="file" accept="image/*" onchange="uploadBuilderImage('${id}', this)"></label></div>
        <div class="blk-row"><input data-f="alt" placeholder="Texto alternativo (alt)" value="${escAttr(d.alt)}"></div>
        <div class="blk-row short"><select data-f="align"><option value="left" ${d.align==='left'?'selected':''}>Izquierda</option><option value="center" ${d.align==='center'||!d.align?'selected':''}>Centro</option><option value="right" ${d.align==='right'?'selected':''}>Derecha</option></select></div>
        <div class="blk-preview pv-img-wrap" style="text-align:${d.align||'center'}"><img id="prevImg_${id}" src="${escAttr(d.url)||''}" alt="" style="${d.url?'':'display:none'}"></div>`;
    case 'hero':
      return `<div class="blk-row"><input data-f="title" placeholder="Título del hero" value="${escAttr(d.title)}" oninput="setPrev('prevHeroT_${id}', this.value)"></div>
        <div class="blk-row"><input data-f="subtitle" placeholder="Subtítulo" value="${escAttr(d.subtitle)}" oninput="setPrev('prevHeroS_${id}', this.value)"></div>
        <div class="blk-row"><input data-f="image" placeholder="URL de imagen de fondo (opcional)" value="${escAttr(d.image)}"></div>
        <div class="blk-row two"><input data-f="button_label" placeholder="Texto del botón" value="${escAttr(d.button_label)}"><input data-f="button_url" placeholder="URL del botón" value="${escAttr(d.button_url)}"></div>
        <div class="blk-preview pv-hero"><h3 id="prevHeroT_${id}">${escapeHtml(d.title)||'Título del hero'}</h3><p id="prevHeroS_${id}">${escapeHtml(d.subtitle)||'Subtítulo'}</p>${d.button_label?'<span class="pv-btn">'+escapeHtml(d.button_label)+'</span>':''}</div>`;
    case 'carousel':
      return listEditor(id, d.items, 'carousel', ['image','caption'], ['Imagen (URL)','Leyenda']);
    case 'video':
      return `<div class="blk-row"><input data-f="url" placeholder="URL de YouTube (ej: https://www.youtube.com/watch?v=...)" value="${escAttr(d.url)}" oninput="setPrevSrc('prevVideo_${id}', ytEmbed(this.value))"></div>
        <div class="blk-preview"><iframe id="prevVideo_${id}" src="${escAttr(ytEmbed(d.url))}" frameborder="0" allowfullscreen style="${ytEmbed(d.url)?'':'display:none'}"></iframe></div>`;
    case 'cards':
      return listEditor(id, d.items, 'cards', ['title','text','image','link'], ['Título','Texto','Imagen (URL)','Link']);
    case 'products':
      return `<div class="blk-row two"><select data-f="source"><option value="featured" ${d.source==='featured'||!d.source?'selected':''}>Destacados</option><option value="category" ${d.source==='category'?'selected':''}>Por categoría</option></select><input data-f="limit" type="number" min="1" max="24" value="${d.limit||4}" placeholder="Cantidad"></div>
        <div class="blk-row"><input data-f="category" placeholder="Categoría (si elegiste 'por categoría')" value="${escAttr(d.category)}"></div>
        <div class="blk-preview pv-placeholder"><i class="fas fa-box"></i> Acá se mostrarán los productos según el criterio (se conecta al sitio en la Parte 12).</div>`;
    case 'services':
      return `<div class="blk-row two"><select data-f="source"><option value="featured" ${d.source==='featured'||!d.source?'selected':''}>Destacados</option><option value="category" ${d.source==='category'?'selected':''}>Por tipo</option></select><input data-f="limit" type="number" min="1" max="24" value="${d.limit||4}" placeholder="Cantidad"></div>
        <div class="blk-row"><input data-f="category" placeholder="Tipo de servicio (opcional)" value="${escAttr(d.category)}"></div>
        <div class="blk-preview pv-placeholder"><i class="fas fa-screwdriver-wrench"></i> Acá se mostrarán los servicios según el criterio (se conecta al sitio en la Parte 12).</div>`;
    case 'faq':
      return listEditor(id, d.items, 'faq', ['q','a'], ['Pregunta','Respuesta'], true);
    case 'buttons':
      return listEditor(id, d.items, 'buttons', ['label','url','style'], ['Texto','URL','Estilo']);
    case 'map':
      return `<div class="blk-row"><input data-f="embed" placeholder="Pegá la URL del iframe de Google Maps (src de embed)" value="${escAttr(d.embed)}" oninput="setPrevSrc('prevMap_${id}', this.value)"></div>
        <div class="blk-preview"><iframe id="prevMap_${id}" src="${escAttr(d.embed)}" frameborder="0" style="${d.embed?'':'display:none'}"></iframe></div>`;
    case 'form':
      return `<div class="blk-row"><input data-f="submit_label" placeholder="Texto del botón enviar" value="${escAttr(d.submit_label)||'Enviar'}"></div>
        <div class="blk-row"><input data-f="note" placeholder="Nota / aviso (opcional)" value="${escAttr(d.note)}"></div>
        ${listEditor(id, d.fields, 'form', ['label','type','required'], ['Etiqueta','Tipo','Obligatorio'])}`;
    case 'divider':
      return `<div class="blk-preview"><hr class="pv-divider"></div>`;
    default: return '';
  }
}

// Editor genérico de listas (faq, buttons, cards, carousel, form fields)
function listEditor(id, items, kind, fields, placeholders, faqTextarea) {
  items = Array.isArray(items) ? items : [];
  const rows = items.map((it, idx) => {
    const inputs = fields.map((f, fi) => {
      const ph = placeholders[fi] || f;
      if (f === 'required') return `<label class="check mini-check"><input type="checkbox" data-f="${f}" ${it[f]?'checked':''}><span>Obligatorio</span></label>`;
      if (f === 'type' && kind === 'form') return `<select data-f="${f}"><option value="text" ${it.type==='text'||!it.type?'selected':''}>Texto</option><option value="email" ${it.type==='email'?'selected':''}>Email</option><option value="tel" ${it.type==='tel'?'selected':''}>Teléfono</option><option value="textarea" ${it.type==='textarea'?'selected':''}>Área de texto</option></select>`;
      if (f === 'style') return `<select data-f="${f}"><option value="primary" ${it.style==='primary'||!it.style?'selected':''}>Primario</option><option value="secondary" ${it.style==='secondary'?'selected':''}>Secundario</option></select>`;
      if (faqTextarea && f === 'a') return `<textarea data-f="${f}" rows="2" placeholder="${ph}">${escapeHtml(it[f])}</textarea>`;
      return `<input data-f="${f}" placeholder="${ph}" value="${escAttr(it[f])}">`;
    }).join('');
    return `<div class="list-item"><div class="list-item-fields">${inputs}</div><button type="button" class="del mini" onclick="removeListItem('${id}','${kind}',${idx})"><i class="fas fa-times"></i></button></div>`;
  }).join('');
  return `<div class="list-editor" data-kind="${kind}">${rows}<button type="button" class="btn-secondary mini" onclick="addListItem('${id}','${kind}')"><i class="fas fa-plus"></i> Agregar elemento</button></div>`;
}

window.addListItem = function (id, kind) {
  const node = document.querySelector('.block-item[data-id="'+id+'"]'); if (!node) return;
  const blocks = collectOne(node); // lee el bloque actual
  blocks.data = blocks.data || {};
  const arrKey = (kind === 'form') ? 'fields' : 'items';
  blocks.data[arrKey] = blocks.data[arrKey] || [];
  blocks.data[arrKey].push({});
  // re-render del body
  node.querySelector('.block-body').innerHTML = renderBody(id, blocks.type, blocks.data);
};

window.removeListItem = function (id, kind, idx) {
  const node = document.querySelector('.block-item[data-id="'+id+'"]'); if (!node) return;
  const blocks = collectOne(node);
  const arrKey = (kind === 'form') ? 'fields' : 'items';
  (blocks.data[arrKey] || []).splice(idx, 1);
  node.querySelector('.block-body').innerHTML = renderBody(id, blocks.type, blocks.data);
};

// ---------- PREVIEW helpers ----------
window.setPrev = function (id, val) { const el = document.getElementById(id); if (el) el.textContent = val || el.tagName.toLowerCase()==='h3' ? (val||'') : ''; if (el && !val) el.textContent = 'Vista previa'; };
window.setPrevSrc = function (id, val) {
  const el = document.getElementById(id); if (!el) return;
  if (el.tagName === 'IMG') { el.src = val || ''; el.style.display = val ? '' : 'none'; }
  else { el.src = val || ''; el.style.display = val ? '' : 'none'; }
};
window.ytEmbed = function (url) {
  if (!url) return '';
  const m = String(url).match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? 'https://www.youtube.com/embed/' + m[1] : '';
};

window.uploadBuilderImage = function (id, inputEl) {
  const file = inputEl.files && inputEl.files[0]; if (!file) return;
  const node = inputEl.closest('.block-item');
  const urlInput = node.querySelector('[data-f="url"]');
  const safe = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const path = 'pages/' + Date.now() + '-' + Math.random().toString(36).slice(2,8) + '-' + safe;
  supabase.storage.from('product-images').upload(path, file, { upsert:false })
    .then(({ error }) => {
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      if (urlInput) urlInput.value = data.publicUrl;
      setPrevSrc('prevImg_' + id, data.publicUrl);
    }).catch(err => { toast('No se pudo subir la imagen', 'err'); console.error(err); });
  inputEl.value = '';
};

// ---------- LEER BLOQUES DEL DOM ----------
function collectOne(node) {
  const id = node.dataset.id;
  const type = node.querySelector('[data-f="type"]').value;
  return { id, type, data: readData(node, type) };
}

function readData(node, type) {
  const g = f => { const el = node.querySelector(':scope > .block-body [data-f="'+f+'"]'); return el ? (el.type==='checkbox' ? el.checked : el.value) : ''; };
  const readList = (kind) => {
    const arrKey = (kind === 'form') ? 'fields' : 'items';
    const fieldsMap = {
      faq:['q','a'], buttons:['label','url','style'], cards:['title','text','image','link'],
      carousel:['image','caption'], form:['label','type','required']
    }[kind] || [];
    const out = [];
    node.querySelectorAll('.list-editor[data-kind="'+kind+'"] .list-item').forEach(li => {
      const obj = {};
      fieldsMap.forEach(f => { const el = li.querySelector('[data-f="'+f+'"]'); obj[f] = el ? (el.type==='checkbox' ? el.checked : el.value) : ''; });
      out.push(obj);
    });
    return { [arrKey]: out };
  };
  switch (type) {
    case 'heading': return { text: g('text'), level: g('level') || 'h2' };
    case 'text':    return { text: g('text') };
    case 'image':   return { url: g('url'), alt: g('alt'), align: g('align') || 'center' };
    case 'hero':    return { title: g('title'), subtitle: g('subtitle'), image: g('image'), button_label: g('button_label'), button_url: g('button_url') };
    case 'video':   return { url: g('url') };
    case 'map':     return { embed: g('embed') };
    case 'divider': return {};
    case 'products':
    case 'services':return { source: g('source') || 'featured', limit: parseInt(g('limit')) || 4, category: g('category') };
    case 'form':    return Object.assign({ submit_label: g('submit_label') || 'Enviar', note: g('note') }, readList('form'));
    case 'carousel':return readList('carousel');
    case 'cards':   return readList('cards');
    case 'faq':     return readList('faq');
    case 'buttons': return readList('buttons');
    default:        return {};
  }
}

function collectAll() {
  return [...document.querySelectorAll('#builderCanvas .block-item')].map(n => {
    const b = collectOne(n); return { type: b.type, data: b.data };
  });
}

// ---------- GUARDAR ----------
window.saveBuilder = async function () {
  const id = getIdFromHash();
  if (!id) { toast('Abrí el constructor desde una página', 'err'); return; }
  try {
    const blocks = collectAll();
    const { error } = await supabase.from('pages').update({ blocks, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    toast('Página guardada (' + blocks.length + ' bloques)', 'ok');
  } catch (e) { console.error(e); toast('Error: ' + e.message, 'err'); }
};

window.goPages = function () { window.location.hash = '#/pages'; };

// ---------- DEFAULTS / HELPERS ----------
function defaultData(type) {
  switch (type) {
    case 'heading': return { text:'', level:'h2' };
    case 'text': return { text:'' };
    case 'image': return { url:'', alt:'', align:'center' };
    case 'hero': return { title:'', subtitle:'', image:'', button_label:'', button_url:'' };
    case 'carousel': return { items:[] };
    case 'video': return { url:'' };
    case 'cards': return { items:[] };
    case 'products': return { source:'featured', limit:4, category:'' };
    case 'services': return { source:'featured', limit:4, category:'' };
    case 'faq': return { items:[] };
    case 'buttons': return { items:[] };
    case 'map': return { embed:'' };
    case 'form': return { submit_label:'Enviar', note:'', fields:[] };
    case 'divider': return {};
    default: return {};
  }
}
function uid() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
function toast(msg,type){ const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'"></i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }
