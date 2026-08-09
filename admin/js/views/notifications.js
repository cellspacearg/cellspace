import { supabase } from '../config.js?v=cb12';
import { layout, mountLayout, toolbar, emptyState, refreshNotifBadge } from '../core/layout.js?v=cb12';

let allNotifs = [];

const TYPE = { order:{ label:'Pedido', color:'#2196F3', icon:'fa-shopping-cart' }, repair:{ label:'Reparación', color:'#FF9800', icon:'fa-wrench' }, stock:{ label:'Stock', color:'#f44336', icon:'fa-triangle-exclamation' }, general:{ label:'General', color:'#888', icon:'fa-bell' } };

export async function notificationsView(){
  return layout({
    title: 'Notificaciones',
    toolbar: toolbar({
      searchId: 'nfSearch',
      searchPlaceholder: 'Buscar notificación...',
      countId: 'nfCount',
      filters: [ { id: 'nfFilter', options: [ { v:'', l:'Todas' }, { v:'unread', l:'Sin leer' } ]} ],
      action: { label: 'Marcar todas leídas', icon: 'fas fa-check-double', onclick: 'markAllRead()' },
    }),
    content: `<div class="admin-products-grid" id="notifsList"></div>`,
  });
}

export function notificationsViewOnMount(){
  mountLayout();
  document.getElementById('nfSearch').addEventListener('input', applyFilters);
  document.getElementById('nfFilter').addEventListener('change', applyFilters);
  loadAll();
}

async function loadAll(){
  const list = document.getElementById('notifsList');
  list.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>';
  try {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(300);
    if (error) throw error;
    allNotifs = data || [];
    applyFilters();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="loading-text" style="color:#ff4444">Error al cargar: ${escapeHtml(e.message)}</p>`;
  }
}

function applyFilters(){
  const q = (document.getElementById('nfSearch').value || '').toLowerCase().trim();
  const f = document.getElementById('nfFilter').value;
  const list = allNotifs.filter(n =>
    (!q || (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q)) &&
    (!f || (f === 'unread' ? !n.is_read : true)));
  const unread = allNotifs.filter(n => !n.is_read).length;
  document.getElementById('nfCount').textContent = `${list.length} notificación(es) · ${unread} sin leer`;
  render(list);
}

function render(list){
  const cont = document.getElementById('notifsList');
  if (!list.length){
    cont.innerHTML = emptyState({ icon: 'fas fa-bell', title: 'Sin notificaciones', text: 'Cuando entre un pedido o una reparación, aparece acá.' });
    return;
  }
  cont.innerHTML = list.map(n => {
    const t = TYPE[n.type] || TYPE.general;
    const when = n.created_at ? new Date(n.created_at).toLocaleString('es-AR') : '';
    return `<div class="admin-product-card" style="${n.is_read ? 'opacity:.6;' : ''}">
      <div class="ap-thumb" style="background:${t.color}22;color:${t.color};font-size:18px;"><i class="fas ${t.icon}"></i></div>
      <div class="ap-body">
        <div class="ap-top"><span class="ap-state" style="background:${t.color}22;color:${t.color};">${escapeHtml(t.label)}</span>${n.is_read ? '' : '<span class="ap-state" style="background:#FF6A0022;color:#FF6A00;">Nuevo</span>'}</div>
        <h4 class="ap-name">${escapeHtml(n.title || '')}</h4>
        <div class="ap-meta">${escapeHtml(n.body || '')} · ${escapeHtml(when)}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${n.link ? `<a class="btn-primary" style="padding:9px 14px;font-size:13px;text-decoration:none;" href="${escapeHtml(n.link)}" onclick="markRead('${n.id}')"><i class="fas fa-arrow-right"></i> Ir</a>` : ''}
        <button class="btn-secondary" style="padding:9px 12px;font-size:13px;" onclick="markRead('${n.id}', ${!n.is_read})"><i class="fas ${n.is_read ? 'fa-envelope' : 'fa-envelope-open'}"></i></button>
        <button class="btn-secondary" style="padding:9px 12px;font-size:13px;color:#ff6b6b;" onclick="deleteNotif('${n.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

window.markRead = async function(id, read = true){
  try {
    const { error } = await supabase.from('notifications').update({ is_read: read }).eq('id', id);
    if (error) throw error;
    const n = allNotifs.find(x => x.id === id); if (n) n.is_read = read;
    applyFilters(); refreshNotifBadge();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};
window.markAllRead = async function(){
  try {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    if (error) throw error;
    allNotifs.forEach(n => n.is_read = true);
    toast('Todas marcadas como leídas', 'ok'); applyFilters(); refreshNotifBadge();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};
window.deleteNotif = async function(id){
  try {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
    allNotifs = allNotifs.filter(x => x.id !== id); applyFilters(); refreshNotifBadge();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function toast(msg, type){
  const t = document.createElement('div');
  t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok');
  t.innerHTML = `<i class="fas ${type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${escapeHtml(msg)}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}
