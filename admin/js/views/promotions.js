import { supabase } from '../config.js?v=cb16';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb16';

let allPromos = [];
let currentEditId = null;

export async function promotionsView(){
  return layout({
    title: 'Promociones',
    toolbar: toolbar({
      searchId: 'pmSearch',
      searchPlaceholder: 'Buscar por código o título...',
      countId: 'pmCount',
      filters: [
        { id: 'pmFilter', options: [
          { v: '', l: 'Todas' },
          { v: 'active', l: 'Activas' },
          { v: 'inactive', l: 'Inactivas' },
        ]},
      ],
      action: { label: 'Nueva promoción', icon: 'fas fa-plus', onclick: 'openPromoModal()' },
    }),
    content: `<div class="admin-products-grid" id="promosList"></div><div id="pmModalRoot"></div>`,
  });
}

export function promotionsViewOnMount(){
  mountLayout();
  document.getElementById('pmSearch').addEventListener('input', applyFilters);
  document.getElementById('pmFilter').addEventListener('change', applyFilters);
  loadAll();
}

async function loadAll(){
  const list = document.getElementById('promosList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando promociones...</p>';
  try {
    const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allPromos = data || [];
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar: ${escapeHtml(e.message)}</p>`;
  }
}

function discountLabel(p){ return p.discount_type === 'percent' ? `${Number(p.discount_value)}%` : `$${money(p.discount_value)}`; }
function vigente(p){
  const now = new Date();
  if (p.is_active !== true) return false;
  if (p.starts_at && now < new Date(p.starts_at)) return false;
  if (p.ends_at && now > new Date(p.ends_at)) return false;
  if (p.max_uses != null && (p.used_count || 0) >= p.max_uses) return false;
  return true;
}

function applyFilters(){
  const q = (document.getElementById('pmSearch').value || '').toLowerCase().trim();
  const f = document.getElementById('pmFilter').value;
  const list = allPromos.filter(p => {
    const mQ = !q || (p.code || '').toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q);
    const mF = !f || (f === 'active' ? p.is_active === true : p.is_active !== true);
    return mQ && mF;
  });
  document.getElementById('pmCount').textContent = `${list.length} promoción(es) · ${allPromos.filter(vigente).length} vigente(s)`;
  render(list);
}

function render(list){
  const cont = document.getElementById('promosList');
  if (!list.length){
    cont.innerHTML = emptyState({
      icon: 'fas fa-percent', title: 'No hay promociones',
      text: 'Creá tu primer cupón o descuento.',
      action: { label: 'Nueva promoción', icon: 'fas fa-plus', onclick: 'openPromoModal()' },
    });
    return;
  }
  cont.innerHTML = list.map(p => {
    const on = vigente(p);
    const color = on ? '#4CAF50' : '#888';
    const period = [p.starts_at ? 'desde ' + new Date(p.starts_at).toLocaleDateString('es-AR') : '', p.ends_at ? 'hasta ' + new Date(p.ends_at).toLocaleDateString('es-AR') : ''].filter(Boolean).join(' ');
    return `<div class="admin-product-card">
      <div class="ap-thumb" style="background:${color}22;color:${color};font-size:20px;"><i class="fas fa-tags"></i></div>
      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-state" style="background:${color}22;color:${color};">${on ? 'Vigente' : (p.is_active ? 'No vigente' : 'Inactiva')}</span>
          <span class="ap-state" style="background:#FF6A0022;color:#FF6A00;">${discountLabel(p)} OFF</span>
        </div>
        <h4 class="ap-name">${escapeHtml(p.title || '')}${p.code ? ` · <span style="color:var(--orange,#FF6A00);">${escapeHtml(p.code)}</span>` : ''}</h4>
        <div class="ap-meta">${p.min_purchase ? 'Mínimo $' + money(p.min_purchase) + ' · ' : ''}${p.max_uses != null ? (p.used_count || 0) + '/' + p.max_uses + ' usos' : (p.used_count || 0) + ' usos'}${period ? ' · ' + period : ''}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="btn-secondary" style="padding:9px 14px;font-size:13px;" onclick="togglePromo('${p.id}')"><i class="fas ${p.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i> ${p.is_active ? 'Desactivar' : 'Activar'}</button>
        <button class="btn-primary" style="padding:9px 14px;font-size:13px;" onclick="editPromo('${p.id}')"><i class="fas fa-pen"></i> Editar</button>
        <button class="btn-secondary" style="padding:9px 12px;font-size:13px;color:#ff6b6b;" onclick="deletePromo('${p.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- modal ---------- */
function promoModalHtml(){
  return `
  <div class="cs-modal-backdrop" onclick="closePmModal(event)">
    <div class="cs-modal" onclick="event.stopPropagation()">
      <div class="cs-modal-head"><h3 id="pmTitle" style="margin:0;color:#fff;">Nueva promoción</h3>
        <button class="cs-modal-x" onclick="closePmModal()"><i class="fas fa-times"></i></button></div>
      <div class="cs-modal-body">
        <div class="g-grid">
          <div class="g-field g-col2"><label>Título *</label><input id="pm_title" type="text" placeholder="Ej: 10% de bienvenida"></div>
          <div class="g-field"><label>Código de cupón</label><input id="pm_code" type="text" placeholder="Ej: BIENVENIDO10 (opcional)"></div>
          <div class="g-field"><label>Tipo</label><select id="pm_type"><option value="percent">Porcentaje %</option><option value="fixed">Monto fijo $</option></select></div>
          <div class="g-field"><label>Valor del descuento *</label><input id="pm_value" type="number" step="0.01" min="0"></div>
          <div class="g-field"><label>Compra mínima $</label><input id="pm_min" type="number" step="0.01" min="0" value="0"></div>
          <div class="g-field"><label>Usos máximos</label><input id="pm_max" type="number" step="1" min="0" placeholder="vacío = ilimitado"></div>
          <div class="g-field"><label>Vigente desde</label><input id="pm_start" type="date"></div>
          <div class="g-field"><label>Vigente hasta</label><input id="pm_end" type="date"></div>
          <div class="g-field g-col2"><label>Descripción</label><input id="pm_desc" type="text"></div>
          <div class="g-field g-col2"><label style="display:flex;align-items:center;gap:8px;"><input id="pm_active" type="checkbox" checked> Activa</label></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;">
          <button class="btn-secondary" onclick="closePmModal()">Cancelar</button>
          <button class="btn-primary" id="pmSaveBtn" onclick="savePromo()"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </div>
    </div>
  </div>`;
}
window.openPromoModal = function(){
  currentEditId = null;
  document.getElementById('pmModalRoot').innerHTML = promoModalHtml();
  injectPmStyles();
};
window.editPromo = function(id){
  const p = allPromos.find(x => x.id === id); if (!p) return;
  currentEditId = id;
  document.getElementById('pmModalRoot').innerHTML = promoModalHtml();
  injectPmStyles();
  document.getElementById('pmTitle').textContent = 'Editar promoción';
  const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v ?? ''; };
  set('pm_title', p.title); set('pm_code', p.code); set('pm_type', p.discount_type || 'percent'); set('pm_value', p.discount_value);
  set('pm_min', p.min_purchase); set('pm_max', p.max_uses); set('pm_desc', p.description);
  set('pm_start', p.starts_at ? p.starts_at.slice(0, 10) : ''); set('pm_end', p.ends_at ? p.ends_at.slice(0, 10) : '');
  document.getElementById('pm_active').checked = p.is_active !== false;
};
window.closePmModal = function(e){
  if (e && e.target && !e.target.classList.contains('cs-modal-backdrop')) return;
  document.getElementById('pmModalRoot').innerHTML = '';
};
window.savePromo = async function(){
  const btn = document.getElementById('pmSaveBtn'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const v = id => (document.getElementById(id)?.value ?? '').trim();
    const num = id => { const x = parseFloat(v(id)); return isNaN(x) ? null : x; };
    if (!v('pm_title')) throw new Error('El título es obligatorio');
    const value = num('pm_value'); if (value == null || value < 0) throw new Error('Valor de descuento inválido');
    const maxU = v('pm_max') ? parseInt(v('pm_max'), 10) : null;
    const payload = {
      title: v('pm_title'), code: v('pm_code') || null, discount_type: v('pm_type'), discount_value: value,
      min_purchase: num('pm_min') || 0, max_uses: maxU, description: v('pm_desc') || null,
      starts_at: v('pm_start') ? new Date(v('pm_start')).toISOString() : null,
      ends_at: v('pm_end') ? new Date(v('pm_end')).toISOString() : null,
      is_active: document.getElementById('pm_active').checked, updated_at: new Date().toISOString(),
    };
    let error;
    if (currentEditId) ({ error } = await supabase.from('promotions').update(payload).eq('id', currentEditId));
    else ({ error } = await supabase.from('promotions').insert(payload));
    if (error) throw error;
    toast(currentEditId ? 'Promoción actualizada' : 'Promoción creada', 'ok');
    closePmModal(); loadAll();
  } catch (err) { toast('Error: ' + err.message, 'err'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; } }
};
window.togglePromo = async function(id){
  const p = allPromos.find(x => x.id === id); if (!p) return;
  try {
    const { error } = await supabase.from('promotions').update({ is_active: !p.is_active, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    p.is_active = !p.is_active; toast('Promoción actualizada', 'ok'); applyFilters();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};
window.deletePromo = async function(id){
  if (!confirm('¿Eliminar esta promoción?')) return;
  try { const { error } = await supabase.from('promotions').delete().eq('id', id); if (error) throw error; toast('Promoción eliminada', 'ok'); loadAll(); }
  catch (e) { toast('Error: ' + e.message, 'err'); }
};

function injectPmStyles(){
  if (document.getElementById('cs-pm-style')) return;
  const s = document.createElement('style'); s.id = 'cs-pm-style';
  s.textContent = `
    .cs-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;}
    .cs-modal{background:#151515;border:1px solid #2a2a2a;border-radius:16px;max-width:600px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6);}
    .cs-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #2a2a2a;}
    .cs-modal-x{background:none;border:none;color:#888;font-size:18px;cursor:pointer;} .cs-modal-x:hover{color:#fff;}
    .cs-modal-body{padding:20px;}
    .g-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .g-field{display:flex;flex-direction:column;gap:5px;} .g-field.g-col2{grid-column:1/-1;}
    .g-field label{color:#bbb;font-size:12px;}
    .cs-modal-body input, .cs-modal-body select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;}`;
  document.head.appendChild(s);
}
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function money(n){ n = Number(n) || 0; return (n % 1 === 0) ? n.toLocaleString('es-AR') : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function toast(msg, type){
  const t = document.createElement('div');
  t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok');
  t.innerHTML = `<i class="fas ${type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${escapeHtml(msg)}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}
