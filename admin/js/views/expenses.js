import { supabase } from '../config.js?v=cb15';
import { store } from '../core/state.js?v=cb15';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb15';

let allExpenses = [];
let currentEditId = null;

const CAT = {
  alquiler:      { label: 'Alquiler',      color: '#9C27B0' },
  servicios:     { label: 'Servicios',     color: '#2196F3' },
  sueldos:       { label: 'Sueldos',       color: '#FF6A00' },
  insumos:       { label: 'Insumos',       color: '#4CAF50' },
  impuestos:     { label: 'Impuestos',     color: '#f44336' },
  marketing:     { label: 'Marketing',     color: '#E91E63' },
  mantenimiento: { label: 'Mantenimiento', color: '#00BCD4' },
  otro:          { label: 'Otro',          color: '#888' },
};

export async function expensesView(){
  return layout({
    title: 'Gastos',
    toolbar: toolbar({
      searchId: 'eSearch',
      searchPlaceholder: 'Buscar gasto por descripción...',
      countId: 'eCount',
      filters: [
        { id: 'eFilterCat', options: [
          { v: '', l: 'Todas las categorías' },
          ...Object.entries(CAT).map(([v, o]) => ({ v, l: o.label })),
        ]},
      ],
      action: { label: 'Nuevo gasto', icon: 'fas fa-plus', onclick: 'openExpenseModal()' },
    }),
    content: `<div id="expSummary"></div><div class="admin-products-grid" id="expensesList"></div><div id="expModalRoot"></div>`,
  });
}

export function expensesViewOnMount(){
  mountLayout();
  document.getElementById('eSearch').addEventListener('input', applyFilters);
  document.getElementById('eFilterCat').addEventListener('change', applyFilters);
  loadAll();
}

async function loadAll(){
  const list = document.getElementById('expensesList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando gastos...</p>';
  try {
    const { data, error } = await supabase.from('expenses').select('*').order('paid_at', { ascending: false });
    if (error) throw error;
    allExpenses = data || [];
    renderSummary();
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar: ${escapeHtml(e.message)}</p>`;
  }
}

function renderSummary(){
  const now = new Date(); const m0 = new Date(now.getFullYear(), now.getMonth(), 1);
  const mes = allExpenses.filter(e => e.paid_at && new Date(e.paid_at) >= m0).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const total = allExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  document.getElementById('expSummary').innerHTML = `
    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px;">
      <div style="flex:1;min-width:180px;background:rgba(244,67,54,0.08);border:1px solid rgba(244,67,54,0.25);border-radius:12px;padding:14px 16px;">
        <div style="color:#888;font-size:12px;">Gastos este mes</div><div style="color:#f44336;font-size:22px;font-weight:800;">$${money(mes)}</div></div>
      <div style="flex:1;min-width:180px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 16px;">
        <div style="color:#888;font-size:12px;">Total registrado</div><div style="color:#fff;font-size:22px;font-weight:800;">$${money(total)}</div></div>
    </div>`;
}

function applyFilters(){
  const q = (document.getElementById('eSearch').value || '').toLowerCase().trim();
  const cat = document.getElementById('eFilterCat').value;
  const list = allExpenses.filter(e =>
    (!q || (e.description || '').toLowerCase().includes(q)) && (!cat || e.category === cat));
  const sum = list.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  document.getElementById('eCount').textContent = `${list.length} gasto(s) · $${money(sum)}`;
  render(list);
}

function render(list){
  const cont = document.getElementById('expensesList');
  if (!list.length){
    cont.innerHTML = emptyState({
      icon: 'fas fa-money-bill-wave', title: 'Sin gastos',
      text: 'Registrá los egresos del negocio.',
      action: { label: 'Nuevo gasto', icon: 'fas fa-plus', onclick: 'openExpenseModal()' },
    });
    return;
  }
  cont.innerHTML = list.map(e => {
    const c = CAT[e.category || 'otro'] || { label: e.category, color: '#888' };
    const fecha = e.paid_at ? new Date(e.paid_at).toLocaleDateString('es-AR') : '';
    return `<div class="admin-product-card">
      <div class="ap-thumb" style="background:${c.color}22;color:${c.color};font-size:20px;"><i class="fas fa-receipt"></i></div>
      <div class="ap-body">
        <div class="ap-top"><span class="ap-state" style="background:${c.color}22;color:${c.color};">${escapeHtml(c.label)}</span></div>
        <h4 class="ap-name">$${money(e.amount)} · ${escapeHtml(e.description || 'Sin detalle')}</h4>
        <div class="ap-meta">${escapeHtml(fecha)}${e.payment_method ? ' · ' + escapeHtml(e.payment_method) : ''}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="btn-primary" style="padding:9px 14px;font-size:13px;" onclick="editExpense('${e.id}')"><i class="fas fa-pen"></i> Editar</button>
        <button class="btn-secondary" style="padding:9px 12px;font-size:13px;color:#ff6b6b;" onclick="deleteExpense('${e.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- modal ---------- */
function expenseModalHtml(){
  const catOpts = Object.entries(CAT).map(([v, o]) => `<option value="${v}">${o.label}</option>`).join('');
  return `
  <div class="cs-modal-backdrop" onclick="closeExpModal(event)">
    <div class="cs-modal" onclick="event.stopPropagation()">
      <div class="cs-modal-head"><h3 id="expTitle" style="margin:0;color:#fff;">Nuevo gasto</h3>
        <button class="cs-modal-x" onclick="closeExpModal()"><i class="fas fa-times"></i></button></div>
      <div class="cs-modal-body">
        <div class="g-grid">
          <div class="g-field"><label>Categoría</label><select id="e_cat">${catOpts}</select></div>
          <div class="g-field"><label>Monto $ *</label><input id="e_amount" type="number" step="0.01" min="0"></div>
          <div class="g-field g-col2"><label>Descripción</label><input id="e_desc" type="text" placeholder="Ej: alquiler local agosto"></div>
          <div class="g-field"><label>Método de pago</label><input id="e_method" type="text" placeholder="Efectivo, transferencia..."></div>
          <div class="g-field"><label>Fecha</label><input id="e_date" type="date"></div>
          <div class="g-field g-col2"><label>Notas</label><textarea id="e_notes" rows="2"></textarea></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;">
          <button class="btn-secondary" onclick="closeExpModal()">Cancelar</button>
          <button class="btn-primary" id="eSaveBtn" onclick="saveExpense()"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </div>
    </div>
  </div>`;
}
window.openExpenseModal = function(){
  currentEditId = null;
  document.getElementById('expModalRoot').innerHTML = expenseModalHtml();
  injectExpStyles();
  document.getElementById('e_date').value = new Date().toISOString().slice(0, 10);
};
window.editExpense = function(id){
  const e = allExpenses.find(x => x.id === id); if (!e) return;
  currentEditId = id;
  document.getElementById('expModalRoot').innerHTML = expenseModalHtml();
  injectExpStyles();
  document.getElementById('expTitle').textContent = 'Editar gasto';
  const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v ?? ''; };
  set('e_cat', e.category || 'otro'); set('e_amount', e.amount); set('e_desc', e.description);
  set('e_method', e.payment_method); set('e_date', e.paid_at ? e.paid_at.slice(0, 10) : ''); set('e_notes', e.notes);
};
window.closeExpModal = function(ev){
  if (ev && ev.target && !ev.target.classList.contains('cs-modal-backdrop')) return;
  document.getElementById('expModalRoot').innerHTML = '';
};
window.saveExpense = async function(){
  const btn = document.getElementById('eSaveBtn'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const amount = parseFloat(document.getElementById('e_amount').value);
    if (isNaN(amount) || amount < 0) throw new Error('Monto inválido');
    const dateV = document.getElementById('e_date').value;
    const payload = {
      category: document.getElementById('e_cat').value,
      description: document.getElementById('e_desc').value.trim() || null,
      payment_method: document.getElementById('e_method').value.trim() || null,
      amount, paid_at: dateV ? new Date(dateV).toISOString() : new Date().toISOString(),
      notes: document.getElementById('e_notes').value.trim() || null,
    };
    let error;
    if (currentEditId) ({ error } = await supabase.from('expenses').update(payload).eq('id', currentEditId));
    else { payload.created_by = store.getState().user?.id || null; ({ error } = await supabase.from('expenses').insert(payload)); }
    if (error) throw error;
    toast(currentEditId ? 'Gasto actualizado' : 'Gasto registrado', 'ok');
    closeExpModal(); loadAll();
  } catch (err) { toast('Error: ' + err.message, 'err'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; } }
};
window.deleteExpense = async function(id){
  if (!confirm('¿Eliminar este gasto?')) return;
  try { const { error } = await supabase.from('expenses').delete().eq('id', id); if (error) throw error; toast('Gasto eliminado', 'ok'); loadAll(); }
  catch (e) { toast('Error: ' + e.message, 'err'); }
};

function injectExpStyles(){
  if (document.getElementById('cs-exp-style')) return;
  const s = document.createElement('style'); s.id = 'cs-exp-style';
  s.textContent = `
    .cs-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;}
    .cs-modal{background:#151515;border:1px solid #2a2a2a;border-radius:16px;max-width:560px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6);}
    .cs-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #2a2a2a;}
    .cs-modal-x{background:none;border:none;color:#888;font-size:18px;cursor:pointer;} .cs-modal-x:hover{color:#fff;}
    .cs-modal-body{padding:20px;}
    .g-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .g-field{display:flex;flex-direction:column;gap:5px;} .g-field.g-col2{grid-column:1/-1;}
    .g-field label{color:#bbb;font-size:12px;}
    .cs-modal-body input, .cs-modal-body textarea, .cs-modal-body select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;}`;
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
