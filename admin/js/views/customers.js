import { supabase } from '../config.js';
import { layout, mountLayout, toolbar, emptyState } from '../core/layout.js';

let allUsers = [];

const ROLES = {
  client:     { label: 'Cliente',       color: '#4CAF50' },
  technician: { label: 'Técnico',       color: '#FF6A00' },
  admin:      { label: 'Administrador', color: '#2196F3' },
};

export async function customersView(){
  return layout({
    title: 'Clientes y técnicos',
    toolbar: toolbar({
      searchId: 'userSearch',
      searchPlaceholder: 'Buscar por nombre, email o empresa...',
      countId: 'usersCount',
      filters: [
        { id: 'filterRole', options: [
          { v: '', l: 'Todos los roles' },
          { v: 'client', l: 'Clientes' },
          { v: 'technician', l: 'Técnicos' },
          { v: 'admin', l: 'Administradores' },
        ]},
        { id: 'filterStatus', options: [
          { v: '', l: 'Todos los estados' },
          { v: 'active', l: 'Activos' },
          { v: 'suspended', l: 'Suspendidos' },
        ]},
      ],
    }),
    content: `<div class="admin-products-grid" id="usersList"></div>`,
  });
}

export function customersViewOnMount(){
  mountLayout();
  document.getElementById('userSearch').addEventListener('input', applyFilters);
  document.getElementById('filterRole').addEventListener('change', applyFilters);
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  loadUsers();
}

async function loadUsers(){
  const list = document.getElementById('usersList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando usuarios...</p>';
  try {
    const { data, error } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allUsers = data || [];
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar: ${e.message}</p>`;
  }
}

function applyFilters(){
  const q = (document.getElementById('userSearch').value || '').toLowerCase().trim();
  const role = document.getElementById('filterRole').value;
  const status = document.getElementById('filterStatus').value;

  const list = allUsers.filter(u => {
    const mQ = !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.company || '').toLowerCase().includes(q);
    const mR = !role || u.role === role;
    const mS = !status || (u.status || 'active') === status;
    return mQ && mR && mS;
  });

  const techs = allUsers.filter(u => u.role === 'technician').length;
  document.getElementById('usersCount').textContent =
    `${list.length} usuario(s) · ${techs} técnico(s) con acceso a Central Space`;

  render(list);
}

function render(list){
  const cont = document.getElementById('usersList');
  if (!list.length){
    cont.innerHTML = emptyState({
      icon: 'fas fa-users',
      title: 'No hay usuarios',
      text: 'Todavía no hay nadie que coincida con la búsqueda.',
    });
    return;
  }

  cont.innerHTML = list.map(u => {
    const r = ROLES[u.role] || { label: u.role || '—', color: '#888' };
    const suspended = (u.status || 'active') === 'suspended';
    const initial = (u.full_name || u.email || '?').charAt(0).toUpperCase();
    const fecha = u.created_at ? new Date(u.created_at).toLocaleDateString('es-AR') : '';

    return `<div class="admin-product-card">
      <div class="ap-thumb" style="border-radius:50%;background:linear-gradient(135deg,#FF6A00,#ff8533);color:#fff;font-size:26px;font-weight:800;">${escapeHtml(initial)}</div>

      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-state" style="background:${r.color}22;color:${r.color};">${r.label}</span>
          ${suspended ? '<span class="ap-state st-hidden">Suspendido</span>' : ''}
        </div>
        <h4 class="ap-name">${escapeHtml(u.full_name || 'Sin nombre')}</h4>
        <div class="ap-meta">${escapeHtml(u.email || '')}${u.phone ? ' · ' + escapeHtml(u.phone) : ''}</div>
        <div class="ap-meta">${u.company ? escapeHtml(u.company) + ' · ' : ''}${u.specialty ? escapeHtml(u.specialty) + ' · ' : ''}Desde ${fecha}</div>
      </div>

      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <select class="filter-select" style="padding:8px 12px;font-size:13px;"
                onchange="changeRole('${u.id}', this.value)">
          ${Object.entries(ROLES).map(([k, v]) =>
            `<option value="${k}" ${u.role === k ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
        <button class="btn-secondary" style="padding:9px 14px;font-size:13px;"
                onclick="toggleStatus('${u.id}')">
          <i class="fas ${suspended ? 'fa-circle-check' : 'fa-ban'}"></i>
          ${suspended ? 'Reactivar' : 'Suspender'}
        </button>
      </div>
    </div>`;
  }).join('');
}

window.changeRole = async function(id, role){
  const u = allUsers.find(x => x.id === id);
  if (!u) return;
  if (role === 'technician' && u.role !== 'technician'){
    if (!confirm(`¿Dar acceso a Central Space a ${u.full_name || u.email}?\n\nVa a poder ver todas las guías, herramientas y archivos técnicos.`)) {
      render(allUsers); return;
    }
  }
  if (role === 'admin' && u.role !== 'admin'){
    if (!confirm(`¿Convertir a ${u.full_name || u.email} en ADMINISTRADOR?\n\nVa a poder editar y borrar todo el contenido del sitio.`)) {
      render(allUsers); return;
    }
  }
  try {
    const { error } = await supabase.from('profiles')
      .update({ role, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    u.role = role;
    toast('Rol actualizado', 'ok');
    applyFilters();
  } catch (e) { toast('Error: ' + e.message, 'err'); loadUsers(); }
};

window.toggleStatus = async function(id){
  const u = allUsers.find(x => x.id === id);
  if (!u) return;
  const next = (u.status || 'active') === 'suspended' ? 'active' : 'suspended';
  if (next === 'suspended' && !confirm(`¿Suspender a ${u.full_name || u.email}?\n\nNo va a poder entrar a Central Space.`)) return;
  try {
    const { error } = await supabase.from('profiles')
      .update({ status: next, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    u.status = next;
    toast(next === 'suspended' ? 'Usuario suspendido' : 'Usuario reactivado', 'ok');
    applyFilters();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

/* helpers */
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function toast(msg, type){
  const t = document.createElement('div');
  t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok');
  t.innerHTML = `<i class="fas ${type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}
