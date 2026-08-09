import { supabase } from '../config.js?v=cb7';
import { store } from '../core/state.js?v=cb7';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb7';

let allRepairs = [];
let techs = [];
let currentEditId = null;

const STATUS = {
  recibido:             { label: 'Recibido',            color: '#3498db' },
  diagnostico:          { label: 'Diagnóstico',         color: '#f39c12' },
  presupuesto:          { label: 'Presupuesto',         color: '#f39c12' },
  esperando_aprobacion: { label: 'Esperando aprobación',color: '#e67e22' },
  en_reparacion:        { label: 'En reparación',       color: '#e67e22' },
  esperando_repuesto:   { label: 'Esperando repuesto',  color: '#9b59b6' },
  pausado:              { label: 'Pausado',             color: '#95a5a6' },
  reparado:             { label: 'Reparado',            color: '#2ecc71' },
  listo:                { label: 'Listo para retirar',  color: '#2ecc71' },
  entregado:            { label: 'Entregado',           color: '#27ae60' },
  cancelado:            { label: 'Cancelado',           color: '#e74c3c' },
};
const PRIORITY = { baja:'Baja', normal:'Normal', alta:'Alta', urgente:'Urgente' };
const DEVICE = { celular:'Celular', tablet:'Tablet', notebook:'Notebook', pc:'PC', consola:'Consola', otro:'Otro' };

export async function repairsView(){
  return layout({
    title: 'Reparaciones',
    toolbar: toolbar({
      searchId: 'rSearch',
      searchPlaceholder: 'Buscar por orden, código, cliente, IMEI...',
      countId: 'rCount',
      filters: [
        { id: 'rFilterStatus', options: [
          { v: '', l: 'Todos los estados' },
          ...Object.entries(STATUS).map(([v, o]) => ({ v, l: o.label })),
        ]},
      ],
      action: { label: 'Nueva reparación', icon: 'fas fa-plus', onclick: 'openRepairModal()' },
    }),
    content: `<div class="admin-products-grid" id="repairsList"></div><div id="repairModalRoot"></div>`,
  });
}

export function repairsViewOnMount(){
  mountLayout();
  document.getElementById('rSearch').addEventListener('input', applyFilters);
  document.getElementById('rFilterStatus').addEventListener('change', applyFilters);
  loadAll();
}

async function loadAll(){
  const list = document.getElementById('repairsList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando reparaciones...</p>';
  try {
    const [r, t] = await Promise.all([
      supabase.from('repairs').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,email,role').in('role', ['technician','tecnico','tecnico_verificado','vip_tech']),
    ]);
    if (r.error) throw r.error;
    allRepairs = r.data || [];
    techs = t.data || [];
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar: ${escapeHtml(e.message)}</p>`;
  }
}

function applyFilters(){
  const q = (document.getElementById('rSearch').value || '').toLowerCase().trim();
  const st = document.getElementById('rFilterStatus').value;
  const list = allRepairs.filter(r => {
    const mQ = !q ||
      (r.order_number || '').toLowerCase().includes(q) ||
      (r.tracking_code || '').toLowerCase().includes(q) ||
      (r.customer_name || '').toLowerCase().includes(q) ||
      (r.imei || '').toLowerCase().includes(q);
    const mS = !st || (r.status || 'recibido') === st;
    return mQ && mS;
  });
  const abiertas = allRepairs.filter(r => !['entregado','cancelado'].includes(r.status)).length;
  document.getElementById('rCount').textContent = `${list.length} reparación(es) · ${abiertas} abierta(s)`;
  render(list);
}

function render(list){
  const cont = document.getElementById('repairsList');
  if (!list.length){
    cont.innerHTML = emptyState({
      icon: 'fas fa-screwdriver-wrench', title: 'No hay reparaciones',
      text: 'Cargá la primera orden de reparación.',
      action: { label: 'Nueva reparación', icon: 'fas fa-plus', onclick: 'openRepairModal()' },
    });
    return;
  }
  cont.innerHTML = list.map(r => {
    const s = STATUS[r.status || 'recibido'] || { label: r.status, color: '#888' };
    const fecha = r.received_at ? new Date(r.received_at).toLocaleDateString('es-AR') : '';
    return `<div class="admin-product-card">
      <div class="ap-thumb" style="background:${s.color}22;color:${s.color};font-size:20px;"><i class="fas fa-mobile-screen"></i></div>
      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-state" style="background:${s.color}22;color:${s.color};">${escapeHtml(s.label)}</span>
          ${r.priority && r.priority !== 'normal' ? `<span class="ap-state" style="background:#f4433622;color:#f44336;">${escapeHtml(PRIORITY[r.priority] || r.priority)}</span>` : ''}
        </div>
        <h4 class="ap-name">${escapeHtml(r.order_number || '')} · ${escapeHtml(r.brand || '')} ${escapeHtml(r.model || '')}</h4>
        <div class="ap-meta">${escapeHtml(r.customer_name || 'Sin cliente')}${r.customer_phone ? ' · ' + escapeHtml(r.customer_phone) : ''} · <b>código ${escapeHtml(r.tracking_code || '')}</b></div>
        <div class="ap-meta">${escapeHtml((r.problem || '').slice(0, 70))}${(r.problem || '').length > 70 ? '…' : ''} · ${fecha}${r.budget ? ' · $' + money(r.budget) : ''}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <select class="filter-select" style="padding:8px 12px;font-size:13px;" onchange="changeRepairStatus('${r.id}', this.value)">
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${(r.status || 'recibido') === k ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
        <button class="btn-primary" style="padding:9px 14px;font-size:13px;" onclick="editRepair('${r.id}')"><i class="fas fa-pen"></i> Abrir</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- modal / formulario ---------- */
function repairModalHtml(){
  const techOpts = ['<option value="">Sin asignar</option>'].concat(techs.map(t => `<option value="${t.id}">${escapeHtml(t.full_name || t.email)}</option>`)).join('');
  const opt = (obj) => Object.entries(obj).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  return `
  <div class="cs-modal-backdrop" onclick="closeRepairModal(event)">
    <div class="cs-modal" onclick="event.stopPropagation()">
      <div class="cs-modal-head">
        <h3 id="rModalTitle" style="margin:0;color:#fff;">Nueva reparación</h3>
        <button class="cs-modal-x" onclick="closeRepairModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="cs-modal-body">
        <div class="g-grid">
          <div class="g-field g-col2"><label>Cliente (nombre) *</label><input id="r_cname" type="text"></div>
          <div class="g-field"><label>Teléfono</label><input id="r_cphone" type="text"></div>
          <div class="g-field"><label>Email</label><input id="r_cemail" type="text"></div>
          <div class="g-field"><label>DNI</label><input id="r_cdni" type="text"></div>
          <div class="g-field"><label>Tipo de equipo</label><select id="r_dtype">${opt(DEVICE)}</select></div>
          <div class="g-field"><label>Marca</label><input id="r_brand" type="text"></div>
          <div class="g-field"><label>Modelo</label><input id="r_model" type="text"></div>
          <div class="g-field"><label>IMEI</label><input id="r_imei" type="text"></div>
          <div class="g-field"><label>N° de serie</label><input id="r_serial" type="text"></div>
          <div class="g-field g-col2"><label>Falla reportada *</label><textarea id="r_problem" rows="2"></textarea></div>
          <div class="g-field g-col2"><label>Diagnóstico</label><textarea id="r_diag" rows="2"></textarea></div>
          <div class="g-field"><label>Técnico</label><select id="r_tech">${techOpts}</select></div>
          <div class="g-field"><label>Prioridad</label><select id="r_priority">${opt(PRIORITY)}</select></div>
          <div class="g-field"><label>Estado</label><select id="r_status">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select></div>
          <div class="g-field"><label>Garantía</label><input id="r_warranty" type="text" placeholder="Ej: 30 días"></div>
          <div class="g-field"><label>Presupuesto $</label><input id="r_budget" type="number" step="0.01"></div>
          <div class="g-field"><label>Anticipo $</label><input id="r_deposit" type="number" step="0.01"></div>
          <div class="g-field"><label>Costo final $</label><input id="r_cost" type="number" step="0.01"></div>
          <div class="g-field"><label>Fecha estimada</label><input id="r_estimated" type="date"></div>
          <div class="g-field g-col2"><label>Accesorios</label><input id="r_accessories" type="text" placeholder="Ej: funda, chip, memoria"></div>
          <div class="g-field g-col2"><label>Observaciones</label><textarea id="r_notes" rows="2"></textarea></div>
        </div>
        <div id="r_hist"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
          <button class="btn-secondary" onclick="closeRepairModal()">Cancelar</button>
          <button class="btn-primary" id="rSaveBtn" onclick="saveRepair()"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </div>
    </div>
  </div>`;
}

window.openRepairModal = function(){
  currentEditId = null;
  document.getElementById('repairModalRoot').innerHTML = repairModalHtml();
  injectRepairStyles();
  document.getElementById('rModalTitle').textContent = 'Nueva reparación';
};

window.editRepair = async function(id){
  const r = allRepairs.find(x => x.id === id); if (!r) return;
  currentEditId = id;
  document.getElementById('repairModalRoot').innerHTML = repairModalHtml();
  injectRepairStyles();
  document.getElementById('rModalTitle').textContent = `${r.order_number} · código ${r.tracking_code}`;
  const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v ?? ''; };
  set('r_cname', r.customer_name); set('r_cphone', r.customer_phone); set('r_cemail', r.customer_email); set('r_cdni', r.customer_dni);
  set('r_dtype', r.device_type || 'celular'); set('r_brand', r.brand); set('r_model', r.model); set('r_imei', r.imei); set('r_serial', r.serial);
  set('r_problem', r.problem); set('r_diag', r.diagnosis); set('r_tech', r.technician_id); set('r_priority', r.priority || 'normal');
  set('r_status', r.status || 'recibido'); set('r_warranty', r.warranty); set('r_budget', r.budget); set('r_deposit', r.deposit); set('r_cost', r.cost);
  set('r_estimated', r.estimated_at ? r.estimated_at.slice(0,10) : ''); set('r_accessories', r.accessories); set('r_notes', r.notes);
  loadHistory(id);
};

async function loadHistory(id){
  try {
    const { data } = await supabase.from('repair_status_history').select('*').eq('repair_id', id).order('created_at', { ascending: false });
    const cont = document.getElementById('r_hist'); if (!cont) return;
    if (!data || !data.length) return;
    cont.innerHTML = `<h4 class="cs-modal-sec">Historial de estados</h4>` + data.map(h =>
      `<div style="color:#bbb;font-size:13px;padding:5px 0;border-bottom:1px solid #262626;">
        ${new Date(h.created_at).toLocaleString('es-AR')} — <b style="color:#eee;">${escapeHtml((STATUS[h.to_status]||{}).label || h.to_status)}</b>${h.from_status ? ' (antes: ' + escapeHtml((STATUS[h.from_status]||{}).label || h.from_status) + ')' : ''}
      </div>`).join('');
  } catch (e) { /* silencioso */ }
}

window.closeRepairModal = function(e){
  if (e && e.target && !e.target.classList.contains('cs-modal-backdrop')) return;
  document.getElementById('repairModalRoot').innerHTML = '';
};

window.saveRepair = async function(){
  const btn = document.getElementById('rSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const v = id => (document.getElementById(id)?.value ?? '').trim();
    const num = id => { const x = parseFloat(v(id)); return isNaN(x) ? 0 : x; };
    if (!v('r_cname')) throw new Error('El nombre del cliente es obligatorio');
    if (!v('r_problem')) throw new Error('La falla reportada es obligatoria');

    const payload = {
      customer_name: v('r_cname'), customer_phone: v('r_cphone') || null, customer_email: v('r_cemail') || null, customer_dni: v('r_cdni') || null,
      device_type: v('r_dtype'), brand: v('r_brand') || null, model: v('r_model') || null, imei: v('r_imei') || null, serial: v('r_serial') || null,
      problem: v('r_problem'), diagnosis: v('r_diag') || null, technician_id: v('r_tech') || null, priority: v('r_priority'),
      status: v('r_status'), warranty: v('r_warranty') || null, budget: num('r_budget'), deposit: num('r_deposit'), cost: num('r_cost'),
      estimated_at: v('r_estimated') ? new Date(v('r_estimated')).toISOString() : null,
      accessories: v('r_accessories') || null, notes: v('r_notes') || null,
      updated_at: new Date().toISOString(),
    };
    if (v('r_status') === 'entregado') payload.delivered_at = new Date().toISOString();

    let error;
    if (currentEditId) ({ error } = await supabase.from('repairs').update(payload).eq('id', currentEditId));
    else { payload.created_by = store.getState().user?.id || null; ({ error } = await supabase.from('repairs').insert(payload)); }
    if (error) throw error;
    toast(currentEditId ? 'Reparación actualizada' : 'Reparación creada', 'ok');
    closeRepairModal(); loadAll();
  } catch (err) { console.error(err); toast('Error: ' + err.message, 'err'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; } }
};

window.changeRepairStatus = async function(id, status){
  const r = allRepairs.find(x => x.id === id); if (!r) return;
  try {
    const upd = { status, updated_at: new Date().toISOString() };
    if (status === 'entregado') upd.delivered_at = new Date().toISOString();
    const { error } = await supabase.from('repairs').update(upd).eq('id', id);
    if (error) throw error;
    r.status = status;
    toast('Estado actualizado (queda en el historial)', 'ok');
    applyFilters();
  } catch (e) { toast('Error: ' + e.message, 'err'); loadAll(); }
};

/* ---------- estilos + helpers ---------- */
function injectRepairStyles(){
  if (document.getElementById('cs-repair-style')) return;
  const s = document.createElement('style'); s.id = 'cs-repair-style';
  s.textContent = `
    .cs-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;}
    .cs-modal{background:#151515;border:1px solid #2a2a2a;border-radius:16px;max-width:760px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6);}
    .cs-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #2a2a2a;position:sticky;top:0;background:#151515;border-radius:16px 16px 0 0;}
    .cs-modal-x{background:none;border:none;color:#888;font-size:18px;cursor:pointer;} .cs-modal-x:hover{color:#fff;}
    .cs-modal-body{padding:20px;}
    .cs-modal-sec{color:var(--orange,#FF6A00);font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin:20px 0 8px;}
    .g-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .g-field{display:flex;flex-direction:column;gap:5px;} .g-field.g-col2{grid-column:1/-1;}
    .g-field label{color:#bbb;font-size:12px;}
    .cs-modal-body input, .cs-modal-body textarea, .cs-modal-body select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;}
    @media (max-width:600px){ .g-grid{grid-template-columns:1fr;} }`;
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
