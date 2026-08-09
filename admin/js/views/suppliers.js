import { supabase } from '../config.js?v=cb15';
import { store } from '../core/state.js?v=cb15';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js?v=cb15';

let allSuppliers = [];
let purchasesBySupplier = {};
let currentEditId = null;
let currentPurchasesFor = null;

export async function suppliersView(){
  return layout({
    title: 'Proveedores',
    toolbar: toolbar({
      searchId: 'sSearch',
      searchPlaceholder: 'Buscar proveedor por nombre o contacto...',
      countId: 'sCount',
      action: { label: 'Nuevo proveedor', icon: 'fas fa-plus', onclick: 'openSupplierModal()' },
    }),
    content: `<div class="admin-products-grid" id="suppliersList"></div><div id="supModalRoot"></div>`,
  });
}

export function suppliersViewOnMount(){
  mountLayout();
  document.getElementById('sSearch').addEventListener('input', applyFilters);
  loadAll();
}

async function loadAll(){
  const list = document.getElementById('suppliersList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando proveedores...</p>';
  try {
    const [s, p] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('supplier_purchases').select('supplier_id,amount,description,invoice_number,purchased_at').order('purchased_at', { ascending: false }),
    ]);
    if (s.error) throw s.error;
    allSuppliers = s.data || [];
    purchasesBySupplier = {};
    (p.data || []).forEach(x => { (purchasesBySupplier[x.supplier_id] = purchasesBySupplier[x.supplier_id] || []).push(x); });
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar: ${escapeHtml(e.message)}</p>`;
  }
}

function totalOf(id){ return (purchasesBySupplier[id] || []).reduce((s, x) => s + (Number(x.amount) || 0), 0); }

function applyFilters(){
  const q = (document.getElementById('sSearch').value || '').toLowerCase().trim();
  const list = allSuppliers.filter(s =>
    !q || (s.name || '').toLowerCase().includes(q) || (s.contact_name || '').toLowerCase().includes(q));
  const totalGeneral = allSuppliers.reduce((acc, s) => acc + totalOf(s.id), 0);
  document.getElementById('sCount').textContent = `${list.length} proveedor(es) · $${money(totalGeneral)} en compras`;
  render(list);
}

function render(list){
  const cont = document.getElementById('suppliersList');
  if (!list.length){
    cont.innerHTML = emptyState({
      icon: 'fas fa-truck-field', title: 'No hay proveedores',
      text: 'Agregá tu primer proveedor.',
      action: { label: 'Nuevo proveedor', icon: 'fas fa-plus', onclick: 'openSupplierModal()' },
    });
    return;
  }
  cont.innerHTML = list.map(s => {
    const nP = (purchasesBySupplier[s.id] || []).length;
    return `<div class="admin-product-card">
      <div class="ap-thumb" style="background:#FF6A0022;color:#FF6A00;font-size:20px;"><i class="fas fa-truck"></i></div>
      <div class="ap-body">
        <div class="ap-top">${s.is_active === false ? '<span class="ap-state st-hidden">Inactivo</span>' : '<span class="ap-state" style="background:#4CAF5022;color:#4CAF50;">Activo</span>'}</div>
        <h4 class="ap-name">${escapeHtml(s.name || '')}</h4>
        <div class="ap-meta">${escapeHtml(s.contact_name || '')}${s.phone ? ' · ' + escapeHtml(s.phone) : ''}${s.email ? ' · ' + escapeHtml(s.email) : ''}</div>
        <div class="ap-meta">${nP} compra(s) · <b style="color:#fff;">$${money(totalOf(s.id))}</b>${s.cuit ? ' · CUIT ' + escapeHtml(s.cuit) : ''}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="btn-secondary" style="padding:9px 14px;font-size:13px;" onclick="openPurchases('${s.id}')"><i class="fas fa-receipt"></i> Compras</button>
        <button class="btn-primary" style="padding:9px 14px;font-size:13px;" onclick="editSupplier('${s.id}')"><i class="fas fa-pen"></i> Editar</button>
        <button class="btn-secondary" style="padding:9px 12px;font-size:13px;color:#ff6b6b;" onclick="deleteSupplier('${s.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- alta/edición proveedor ---------- */
function supplierModalHtml(){
  return `
  <div class="cs-modal-backdrop" onclick="closeSupModal(event)">
    <div class="cs-modal" onclick="event.stopPropagation()">
      <div class="cs-modal-head"><h3 id="supTitle" style="margin:0;color:#fff;">Nuevo proveedor</h3>
        <button class="cs-modal-x" onclick="closeSupModal()"><i class="fas fa-times"></i></button></div>
      <div class="cs-modal-body">
        <div class="g-grid">
          <div class="g-field g-col2"><label>Empresa / Nombre *</label><input id="s_name" type="text"></div>
          <div class="g-field"><label>Contacto</label><input id="s_contact" type="text"></div>
          <div class="g-field"><label>Teléfono</label><input id="s_phone" type="text"></div>
          <div class="g-field"><label>Email</label><input id="s_email" type="text"></div>
          <div class="g-field"><label>CUIT</label><input id="s_cuit" type="text"></div>
          <div class="g-field g-col2"><label>Dirección</label><input id="s_address" type="text"></div>
          <div class="g-field g-col2"><label>Notas</label><textarea id="s_notes" rows="2"></textarea></div>
          <div class="g-field g-col2"><label style="display:flex;align-items:center;gap:8px;"><input id="s_active" type="checkbox" checked> Activo</label></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;">
          <button class="btn-secondary" onclick="closeSupModal()">Cancelar</button>
          <button class="btn-primary" id="sSaveBtn" onclick="saveSupplier()"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </div>
    </div>
  </div>`;
}
window.openSupplierModal = function(){
  currentEditId = null;
  document.getElementById('supModalRoot').innerHTML = supplierModalHtml();
  injectSupStyles();
};
window.editSupplier = function(id){
  const s = allSuppliers.find(x => x.id === id); if (!s) return;
  currentEditId = id;
  document.getElementById('supModalRoot').innerHTML = supplierModalHtml();
  injectSupStyles();
  document.getElementById('supTitle').textContent = 'Editar proveedor';
  const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v ?? ''; };
  set('s_name', s.name); set('s_contact', s.contact_name); set('s_phone', s.phone); set('s_email', s.email);
  set('s_cuit', s.cuit); set('s_address', s.address); set('s_notes', s.notes);
  document.getElementById('s_active').checked = s.is_active !== false;
};
window.closeSupModal = function(e){
  if (e && e.target && !e.target.classList.contains('cs-modal-backdrop')) return;
  document.getElementById('supModalRoot').innerHTML = '';
};
window.saveSupplier = async function(){
  const btn = document.getElementById('sSaveBtn'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const v = id => (document.getElementById(id)?.value ?? '').trim();
    if (!v('s_name')) throw new Error('El nombre del proveedor es obligatorio');
    const payload = { name: v('s_name'), contact_name: v('s_contact') || null, phone: v('s_phone') || null, email: v('s_email') || null,
      cuit: v('s_cuit') || null, address: v('s_address') || null, notes: v('s_notes') || null,
      is_active: document.getElementById('s_active').checked, updated_at: new Date().toISOString() };
    let error;
    if (currentEditId) ({ error } = await supabase.from('suppliers').update(payload).eq('id', currentEditId));
    else ({ error } = await supabase.from('suppliers').insert(payload));
    if (error) throw error;
    toast(currentEditId ? 'Proveedor actualizado' : 'Proveedor creado', 'ok');
    closeSupModal(); loadAll();
  } catch (err) { toast('Error: ' + err.message, 'err'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; } }
};
window.deleteSupplier = async function(id){
  const s = allSuppliers.find(x => x.id === id); if (!s) return;
  if (!confirm(`¿Eliminar el proveedor "${s.name}" y sus compras registradas?`)) return;
  try { const { error } = await supabase.from('suppliers').delete().eq('id', id); if (error) throw error; toast('Proveedor eliminado', 'ok'); loadAll(); }
  catch (e) { toast('Error: ' + e.message, 'err'); }
};

/* ---------- compras del proveedor ---------- */
window.openPurchases = function(id){
  const s = allSuppliers.find(x => x.id === id); if (!s) return;
  currentPurchasesFor = id;
  const list = purchasesBySupplier[id] || [];
  const rows = list.map(p => `<tr>
    <td style="padding:8px 6px;color:#ddd;">${escapeHtml(p.description || '(sin detalle)')}${p.invoice_number ? '<br><span style="color:#888;font-size:12px;">Factura ' + escapeHtml(p.invoice_number) + '</span>' : ''}</td>
    <td style="padding:8px 6px;color:#888;white-space:nowrap;">${p.purchased_at ? new Date(p.purchased_at).toLocaleDateString('es-AR') : ''}</td>
    <td style="padding:8px 6px;color:#fff;text-align:right;white-space:nowrap;">$${money(p.amount)}</td>
  </tr>`).join('') || '<tr><td colspan="3" style="color:#888;padding:8px 6px;">Sin compras registradas.</td></tr>';
  document.getElementById('supModalRoot').innerHTML = `
  <div class="cs-modal-backdrop" onclick="closeSupModal(event)">
    <div class="cs-modal" onclick="event.stopPropagation()">
      <div class="cs-modal-head"><h3 style="margin:0;color:#fff;">Compras · ${escapeHtml(s.name)}</h3>
        <button class="cs-modal-x" onclick="closeSupModal()"><i class="fas fa-times"></i></button></div>
      <div class="cs-modal-body">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
        <h4 class="cs-modal-sec" style="color:var(--orange,#FF6A00);font-size:12px;margin:20px 0 8px;">Registrar compra</h4>
        <div class="g-grid">
          <div class="g-field g-col2"><label>Detalle</label><input id="p_desc" type="text" placeholder="Ej: 10 pantallas iPhone 11"></div>
          <div class="g-field"><label>Monto $ *</label><input id="p_amount" type="number" step="0.01" min="0"></div>
          <div class="g-field"><label>N° factura</label><input id="p_invoice" type="text"></div>
          <div class="g-field"><label>Fecha</label><input id="p_date" type="date"></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-secondary" onclick="closeSupModal()">Cerrar</button>
          <button class="btn-primary" id="pSaveBtn" onclick="savePurchase()"><i class="fas fa-plus"></i> Registrar compra</button>
        </div>
      </div>
    </div>
  </div>`;
  injectSupStyles();
};
window.savePurchase = async function(){
  const btn = document.getElementById('pSaveBtn'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
  try {
    const amount = parseFloat(document.getElementById('p_amount').value);
    if (isNaN(amount) || amount < 0) throw new Error('Monto inválido');
    const dateV = document.getElementById('p_date').value;
    const { error } = await supabase.from('supplier_purchases').insert({
      supplier_id: currentPurchasesFor,
      description: document.getElementById('p_desc').value.trim() || null,
      invoice_number: document.getElementById('p_invoice').value.trim() || null,
      amount, purchased_at: dateV ? new Date(dateV).toISOString() : new Date().toISOString(),
      created_by: store.getState().user?.id || null,
    });
    if (error) throw error;
    toast('Compra registrada', 'ok');
    closeSupModal(); loadAll();
  } catch (err) { toast('Error: ' + err.message, 'err'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Registrar compra'; } }
};

/* ---------- estilos + helpers ---------- */
function injectSupStyles(){
  if (document.getElementById('cs-sup-style')) return;
  const s = document.createElement('style'); s.id = 'cs-sup-style';
  s.textContent = `
    .cs-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;}
    .cs-modal{background:#151515;border:1px solid #2a2a2a;border-radius:16px;max-width:600px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6);}
    .cs-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #2a2a2a;}
    .cs-modal-x{background:none;border:none;color:#888;font-size:18px;cursor:pointer;} .cs-modal-x:hover{color:#fff;}
    .cs-modal-body{padding:20px;}
    .g-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .g-field{display:flex;flex-direction:column;gap:5px;} .g-field.g-col2{grid-column:1/-1;}
    .g-field label{color:#bbb;font-size:12px;}
    .cs-modal-body input, .cs-modal-body textarea{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;}`;
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
