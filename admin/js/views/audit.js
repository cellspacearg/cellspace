import { supabase } from '../config.js?v=cb16';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb16';

let allLogs = [];

const ACT = { INSERT:{ label:'Creó', color:'#4CAF50' }, UPDATE:{ label:'Modificó', color:'#FF9800' }, DELETE:{ label:'Eliminó', color:'#f44336' } };
const ENTITY = { products:'Producto', profiles:'Usuario', promotions:'Promoción', expenses:'Gasto', suppliers:'Proveedor', repairs:'Reparación', role_permissions:'Permisos', site_settings:'Configuración' };

export async function auditView(){
  return layout({
    title: 'Auditoría',
    toolbar: toolbar({
      searchId: 'auSearch',
      searchPlaceholder: 'Buscar por usuario o entidad...',
      countId: 'auCount',
      filters: [
        { id: 'auEntity', options: [ { v:'', l:'Todas las entidades' }, ...Object.entries(ENTITY).map(([v,l]) => ({ v, l })) ]},
        { id: 'auAction', options: [ { v:'', l:'Todas las acciones' }, { v:'INSERT', l:'Creación' }, { v:'UPDATE', l:'Modificación' }, { v:'DELETE', l:'Eliminación' } ]},
      ],
    }),
    content: `<div class="admin-products-grid" id="auditList"></div><div id="auModalRoot"></div>`,
  });
}

export function auditViewOnMount(){
  mountLayout();
  document.getElementById('auSearch').addEventListener('input', applyFilters);
  document.getElementById('auEntity').addEventListener('change', applyFilters);
  document.getElementById('auAction').addEventListener('change', applyFilters);
  loadAll();
}

async function loadAll(){
  const list = document.getElementById('auditList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando auditoría...</p>';
  try {
    const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    allLogs = data || [];
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar: ${escapeHtml(e.message)}</p>`;
  }
}

function applyFilters(){
  const q = (document.getElementById('auSearch').value || '').toLowerCase().trim();
  const en = document.getElementById('auEntity').value;
  const ac = document.getElementById('auAction').value;
  const list = allLogs.filter(l =>
    (!q || (l.user_email || '').toLowerCase().includes(q) || (l.entity || '').toLowerCase().includes(q)) &&
    (!en || l.entity === en) && (!ac || l.action === ac));
  document.getElementById('auCount').textContent = `${list.length} registro(s)`;
  render(list);
}

function render(list){
  const cont = document.getElementById('auditList');
  if (!list.length){
    cont.innerHTML = emptyState({ icon: 'fas fa-clipboard-list', title: 'Sin registros', text: 'Acá quedan registradas las modificaciones sensibles del sistema.' });
    return;
  }
  cont.innerHTML = list.map((l, i) => {
    const a = ACT[l.action] || { label: l.action, color: '#888' };
    const ent = ENTITY[l.entity] || l.entity;
    const when = l.created_at ? new Date(l.created_at).toLocaleString('es-AR') : '';
    return `<div class="admin-product-card">
      <div class="ap-thumb" style="background:${a.color}22;color:${a.color};font-size:18px;"><i class="fas fa-clock-rotate-left"></i></div>
      <div class="ap-body">
        <div class="ap-top"><span class="ap-state" style="background:${a.color}22;color:${a.color};">${escapeHtml(a.label)} ${escapeHtml(ent)}</span></div>
        <h4 class="ap-name">${escapeHtml(l.user_email || 'sistema')}</h4>
        <div class="ap-meta">${escapeHtml(when)}${l.entity_id ? ' · id ' + escapeHtml(String(l.entity_id).slice(0, 8)) : ''}</div>
      </div>
      <div><button class="btn-secondary" style="padding:9px 14px;font-size:13px;" onclick="viewAudit(${i})"><i class="fas fa-eye"></i> Detalle</button></div>
    </div>`;
  }).join('');
  window.__auditList = list;
}

window.viewAudit = function(i){
  const l = (window.__auditList || [])[i]; if (!l) return;
  const diff = diffHtml(l.before, l.after);
  document.getElementById('auModalRoot').innerHTML = `
  <div class="cs-modal-backdrop" onclick="closeAuModal(event)">
    <div class="cs-modal" onclick="event.stopPropagation()">
      <div class="cs-modal-head"><h3 style="margin:0;color:#fff;">${escapeHtml((ACT[l.action]||{}).label || l.action)} · ${escapeHtml(ENTITY[l.entity] || l.entity)}</h3>
        <button class="cs-modal-x" onclick="closeAuModal()"><i class="fas fa-times"></i></button></div>
      <div class="cs-modal-body">
        <p style="color:#aaa;font-size:13px;margin:0 0 12px;">${escapeHtml(l.user_email || 'sistema')} · ${l.created_at ? new Date(l.created_at).toLocaleString('es-AR') : ''}</p>
        ${diff}
      </div>
    </div>
  </div>`;
  injectAuStyles();
};
window.closeAuModal = function(e){
  if (e && e.target && !e.target.classList.contains('cs-modal-backdrop')) return;
  document.getElementById('auModalRoot').innerHTML = '';
};

function diffHtml(before, after){
  const b = before || {}, a = after || {};
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).filter(k => !['updated_at','created_at'].includes(k));
  const changed = keys.filter(k => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
  if (!changed.length) return '<p style="color:#888;">Sin cambios de campos (o registro completo).</p>';
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr><th style="text-align:left;color:#888;padding:6px;">Campo</th><th style="text-align:left;color:#888;padding:6px;">Antes</th><th style="text-align:left;color:#888;padding:6px;">Después</th></tr>
    ${changed.map(k => `<tr style="border-top:1px solid #262626;">
      <td style="padding:6px;color:#fff;">${escapeHtml(k)}</td>
      <td style="padding:6px;color:#f88;">${escapeHtml(fmt(b[k]))}</td>
      <td style="padding:6px;color:#8f8;">${escapeHtml(fmt(a[k]))}</td></tr>`).join('')}
  </table>`;
}
function fmt(v){ if (v == null) return '—'; if (typeof v === 'object') return JSON.stringify(v).slice(0, 80); return String(v).slice(0, 80); }

function injectAuStyles(){
  if (document.getElementById('cs-au-style')) return;
  const s = document.createElement('style'); s.id = 'cs-au-style';
  s.textContent = `
    .cs-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;}
    .cs-modal{background:#151515;border:1px solid #2a2a2a;border-radius:16px;max-width:640px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6);}
    .cs-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #2a2a2a;}
    .cs-modal-x{background:none;border:none;color:#888;font-size:18px;cursor:pointer;} .cs-modal-x:hover{color:#fff;}
    .cs-modal-body{padding:20px;}`;
  document.head.appendChild(s);
}
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
