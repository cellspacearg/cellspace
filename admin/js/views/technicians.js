import { supabase } from '../config.js?v=cb14';
import { store } from '../core/state.js?v=cb14';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb14';

let techs = [];
let movements = [];       // todos los movimientos
let balanceByTech = {};   // saldo actual por técnico
let repairsByTech = {};   // cantidad de reparaciones asignadas
let currentTechFor = null;

const ROLE_LABEL = { technician:'Técnico', tecnico:'Técnico', tecnico_verificado:'Téc. verificado', vip_tech:'VIP Tech' };
const MTYPE = { asignacion:{ label:'Asignación', color:'#4CAF50', sign:'+' }, devolucion:{ label:'Devolución', color:'#2196F3', sign:'+' }, uso:{ label:'Uso', color:'#f44336', sign:'-' }, ajuste:{ label:'Ajuste', color:'#9C27B0', sign:'=' } };

export async function techniciansView(){
  return layout({
    title: 'Técnicos',
    toolbar: toolbar({
      searchId: 'tSearch',
      searchPlaceholder: 'Buscar técnico por nombre o email...',
      countId: 'tCount',
      action: null,
    }),
    content: `<div class="admin-products-grid" id="techsList"></div><div id="techModalRoot"></div>`,
  });
}

export function techniciansViewOnMount(){
  mountLayout();
  document.getElementById('tSearch').addEventListener('input', applyFilters);
  loadAll();
}

async function loadAll(){
  const list = document.getElementById('techsList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando técnicos...</p>';
  try {
    const [p, m, r] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,role,specialty,phone').in('role', ['technician','tecnico','tecnico_verificado','vip_tech']),
      supabase.from('technician_credit_movements').select('*').order('created_at', { ascending: false }),
      supabase.from('repairs').select('technician_id,status'),
    ]);
    if (p.error) throw p.error;
    techs = p.data || [];
    movements = m.data || [];
    balanceByTech = {};
    movements.forEach(mv => { if (!(mv.technician_id in balanceByTech)) balanceByTech[mv.technician_id] = Number(mv.balance_after) || 0; });
    repairsByTech = {};
    (r.data || []).forEach(x => { if (x.technician_id) { repairsByTech[x.technician_id] = repairsByTech[x.technician_id] || { total: 0, open: 0 }; repairsByTech[x.technician_id].total++; if (!['entregado','cancelado'].includes(x.status)) repairsByTech[x.technician_id].open++; } });
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar: ${escapeHtml(e.message)}</p>`;
  }
}

function applyFilters(){
  const q = (document.getElementById('tSearch').value || '').toLowerCase().trim();
  const list = techs.filter(t => !q || (t.full_name || '').toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q));
  const totalCred = techs.reduce((s, t) => s + (balanceByTech[t.id] || 0), 0);
  document.getElementById('tCount').textContent = `${list.length} técnico(s) · $${money(totalCred)} en crédito`;
  render(list);
}

function render(list){
  const cont = document.getElementById('techsList');
  if (!list.length){
    cont.innerHTML = emptyState({ icon: 'fas fa-user-gear', title: 'No hay técnicos', text: 'Cuando asignes el rol técnico a un usuario, aparece acá. (Se hace desde Clientes.)' });
    return;
  }
  cont.innerHTML = list.map(t => {
    const bal = balanceByTech[t.id] || 0;
    const rep = repairsByTech[t.id] || { total: 0, open: 0 };
    const initial = (t.full_name || t.email || '?').charAt(0).toUpperCase();
    return `<div class="admin-product-card">
      <div class="ap-thumb" style="border-radius:50%;background:linear-gradient(135deg,#FF6A00,#ff8533);color:#fff;font-size:24px;font-weight:800;">${escapeHtml(initial)}</div>
      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-state" style="background:#00BCD422;color:#00BCD4;">${escapeHtml(ROLE_LABEL[t.role] || t.role)}</span>
          <span class="ap-state" style="background:${bal >= 0 ? '#4CAF5022' : '#f4433622'};color:${bal >= 0 ? '#4CAF50' : '#f44336'};">Crédito $${money(bal)}</span>
        </div>
        <h4 class="ap-name">${escapeHtml(t.full_name || 'Sin nombre')}</h4>
        <div class="ap-meta">${escapeHtml(t.email || '')}${t.specialty ? ' · ' + escapeHtml(t.specialty) : ''}</div>
        <div class="ap-meta">${rep.total} reparación(es) · ${rep.open} abierta(s)</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="btn-primary" style="padding:9px 14px;font-size:13px;" onclick="openCredit('${t.id}')"><i class="fas fa-wallet"></i> Crédito</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- crédito ---------- */
window.openCredit = function(id){
  const t = techs.find(x => x.id === id); if (!t) return;
  currentTechFor = id;
  const mov = movements.filter(m => m.technician_id === id);
  const bal = balanceByTech[id] || 0;
  const rows = mov.map(m => {
    const mt = MTYPE[m.type] || { label: m.type, color: '#888', sign: '' };
    return `<tr>
      <td style="padding:8px 6px;"><span style="color:${mt.color};font-weight:700;">${mt.sign}$${money(m.amount)}</span> <span style="color:#888;font-size:12px;">${escapeHtml(mt.label)}</span>${m.reason ? '<br><span style="color:#888;font-size:12px;">' + escapeHtml(m.reason) + '</span>' : ''}</td>
      <td style="padding:8px 6px;color:#888;white-space:nowrap;">${m.created_at ? new Date(m.created_at).toLocaleDateString('es-AR') : ''}</td>
      <td style="padding:8px 6px;color:#fff;text-align:right;white-space:nowrap;">$${money(m.balance_after)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="3" style="color:#888;padding:8px 6px;">Sin movimientos.</td></tr>';

  document.getElementById('techModalRoot').innerHTML = `
  <div class="cs-modal-backdrop" onclick="closeTechModal(event)">
    <div class="cs-modal" onclick="event.stopPropagation()">
      <div class="cs-modal-head">
        <div><h3 style="margin:0;color:#fff;">${escapeHtml(t.full_name || t.email)}</h3>
          <div style="margin-top:6px;color:${bal >= 0 ? '#4CAF50' : '#f44336'};font-weight:800;font-size:20px;">Saldo: $${money(bal)}</div></div>
        <button class="cs-modal-x" onclick="closeTechModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="cs-modal-body">
        <h4 class="cs-modal-sec" style="color:var(--orange,#FF6A00);font-size:12px;margin:0 0 8px;">Movimientos</h4>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
        <h4 class="cs-modal-sec" style="color:var(--orange,#FF6A00);font-size:12px;margin:20px 0 8px;">Registrar movimiento</h4>
        <div class="g-grid">
          <div class="g-field"><label>Tipo</label><select id="c_type"><option value="asignacion">Asignar crédito</option><option value="uso">Registrar uso</option><option value="devolucion">Devolución</option><option value="ajuste">Ajuste (saldo exacto)</option></select></div>
          <div class="g-field"><label>Monto $ *</label><input id="c_amount" type="number" step="0.01" min="0"></div>
          <div class="g-field g-col2"><label>Motivo</label><input id="c_reason" type="text" placeholder="Ej: crédito mensual, compra de repuesto"></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-secondary" onclick="closeTechModal()">Cerrar</button>
          <button class="btn-primary" id="cSaveBtn" onclick="saveCredit()"><i class="fas fa-plus"></i> Registrar</button>
        </div>
      </div>
    </div>
  </div>`;
  injectTechStyles();
};
window.closeTechModal = function(e){
  if (e && e.target && !e.target.classList.contains('cs-modal-backdrop')) return;
  document.getElementById('techModalRoot').innerHTML = '';
};
window.saveCredit = async function(){
  const btn = document.getElementById('cSaveBtn'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
  try {
    const amount = parseFloat(document.getElementById('c_amount').value);
    if (isNaN(amount) || amount < 0) throw new Error('Monto inválido');
    const { error } = await supabase.from('technician_credit_movements').insert({
      technician_id: currentTechFor,
      type: document.getElementById('c_type').value,
      amount,
      reason: document.getElementById('c_reason').value.trim() || null,
      created_by: store.getState().user?.id || null,
    });
    if (error) throw error;
    toast('Movimiento registrado', 'ok');
    closeTechModal(); loadAll();
  } catch (err) { toast('Error: ' + err.message, 'err'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Registrar'; } }
};

function injectTechStyles(){
  if (document.getElementById('cs-tech-style')) return;
  const s = document.createElement('style'); s.id = 'cs-tech-style';
  s.textContent = `
    .cs-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;}
    .cs-modal{background:#151515;border:1px solid #2a2a2a;border-radius:16px;max-width:560px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6);}
    .cs-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:18px 20px;border-bottom:1px solid #2a2a2a;}
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
