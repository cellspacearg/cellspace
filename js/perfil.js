// ========================================
// PERFIL DE USUARIO — Supabase (tabla profiles)
// Incluye "Mis compras" (orders) y "Mis reparaciones" (repairs).
// ========================================

let currentUser = null;
let currentProfile = null;
let originalUsername = '';

const $ = (id) => document.getElementById(id);
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function money(n){ n=Number(n)||0; return (n%1===0)? n.toLocaleString('es-AR') : n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fecha(d){ return d ? new Date(d).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}) : ''; }

const ORDER_PAY = { pending:{t:'Pago pendiente',c:'#FF9800'}, in_process:{t:'En proceso',c:'#2196F3'}, approved:{t:'Pagado',c:'#4CAF50'}, rejected:{t:'Rechazado',c:'#f44336'}, cancelled:{t:'Cancelado',c:'#888'} };
const REPAIR_ST = {
  recibido:{t:'Recibido',c:'#3498db'}, diagnostico:{t:'En diagnóstico',c:'#f39c12'}, presupuesto:{t:'Presupuesto',c:'#f39c12'},
  esperando_aprobacion:{t:'Esperando aprobación',c:'#e67e22'}, en_reparacion:{t:'En reparación',c:'#e67e22'},
  esperando_repuesto:{t:'Esperando repuesto',c:'#9b59b6'}, pausado:{t:'Pausado',c:'#95a5a6'}, reparado:{t:'Reparado',c:'#2ecc71'},
  listo:{t:'Listo para retirar',c:'#2ecc71'}, entregado:{t:'Entregado',c:'#27ae60'}, cancelado:{t:'Cancelado',c:'#e74c3c'}
};

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) { window.location.href = 'login.html'; return; }
  currentUser = session.user;
  await loadProfileData(currentUser);
  setupProfileForm();
  loadMyOrders(currentUser.id);
  loadMyRepairs(currentUser.id);
});

async function loadProfileData(user) {
  try {
    const { data: p, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    currentProfile = p || {};

    const set = (id, v) => { const el = $(id); if (el) el.value = v ?? ''; };
    set('profileUsername', p?.username); originalUsername = p?.username || '';
    set('profileEmail', user.email);
    set('profileName', p?.full_name);
    set('profilePhone', p?.phone);
    set('profileTelegram', p?.telegram);
    set('profileWhatsApp', p?.whatsapp);
    set('profileLocation', p?.location);

    const displayName = p?.full_name || p?.username || user.email.split('@')[0];
    if ($('sidebarName')) $('sidebarName').textContent = displayName;
    if ($('sidebarEmail')) $('sidebarEmail').textContent = user.email;
    if ($('profileInitial')) $('profileInitial').textContent = displayName.charAt(0).toUpperCase();

    const role = p?.role || 'client';
    const roleNames = { client:'Cliente', technician:'Técnico', tecnico:'Técnico', tecnico_verificado:'Técnico verificado', vip_tech:'VIP Tech', admin:'Admin', administrador:'Admin', super_admin:'Admin', colaborador:'Colaborador' };
    if ($('userBadge')) $('userBadge').textContent = roleNames[role] || 'Cliente';

    const isTech = ['technician','tecnico','tecnico_verificado','vip_tech'].includes(role);
    if ($('techFields')) $('techFields').style.display = isTech ? 'block' : 'none';
    if (isTech) {
      set('profileSpecialty', p?.specialty);
      set('profileExperience', p?.experience);
      set('profileBio', p?.bio);
    }

    const photoUrl = p?.avatar_url || user.user_metadata?.avatar_url;
    if (photoUrl && $('profilePhotoImg')) {
      $('profilePhotoImg').src = photoUrl;
      $('profilePhotoImg').style.display = 'block';
      if ($('profileInitial')) $('profileInitial').style.display = 'none';
    }
  } catch (e) {
    console.error('Error cargando perfil:', e);
    if (window.csToast) csToast('No se pudieron cargar los datos del perfil.', 'error');
  }
}

/* ---------- Mis compras ---------- */
async function loadMyOrders(uid){
  const cont = $('myOrders'); if (!cont) return;
  try {
    const { data, error } = await supabase.from('orders')
      .select('order_number,items,total,order_status,payment_status,created_at')
      .eq('user_id', uid).order('created_at', { ascending: false });
    if (error) throw error;
    const list = data || [];
    if (!list.length) { cont.innerHTML = card('<i class="fas fa-bag-shopping"></i> Todavía no tenés compras. <a href="tienda.html" style="color:var(--orange)">Ir a la tienda</a>'); return; }
    cont.innerHTML = list.map(o => {
      const ps = ORDER_PAY[o.payment_status||'pending'] || {t:o.payment_status,c:'#888'};
      const items = Array.isArray(o.items)? o.items : [];
      const n = items.reduce((s,i)=>s+(Number(i.quantity)||1),0);
      return card(`
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;">
          <div>
            <div style="color:#fff;font-weight:700;">${esc(o.order_number||'')} <span style="color:var(--muted);font-weight:400;">· ${fecha(o.created_at)}</span></div>
            <div style="color:var(--muted);font-size:13px;">${n} producto(s)</div>
          </div>
          <div style="text-align:right;">
            <div style="color:#fff;font-weight:800;">$${money(o.total)}</div>
            <span style="background:${ps.c}22;color:${ps.c};font-size:12px;padding:3px 9px;border-radius:8px;">${esc(ps.t)}</span>
          </div>
        </div>`);
    }).join('');
  } catch (e) { cont.innerHTML = card('<span style="color:#f44336">No se pudieron cargar las compras.</span>'); }
}

/* ---------- Mis reparaciones ---------- */
async function loadMyRepairs(uid){
  const cont = $('myRepairs'); if (!cont) return;
  try {
    const { data, error } = await supabase.from('repairs')
      .select('order_number,tracking_code,brand,model,status,received_at,budget')
      .eq('customer_id', uid).order('created_at', { ascending: false });
    if (error) throw error;
    const list = data || [];
    if (!list.length) { cont.innerHTML = card('<i class="fas fa-screwdriver-wrench"></i> No tenés reparaciones registradas. Podés seguir una por código en <a href="reparaciones.html" style="color:var(--orange)">Rastrear reparación</a>.'); return; }
    cont.innerHTML = list.map(r => {
      const st = REPAIR_ST[r.status||'recibido'] || {t:r.status,c:'#888'};
      return card(`
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;">
          <div>
            <div style="color:#fff;font-weight:700;">${esc(r.order_number||'')} <span style="color:var(--muted);font-weight:400;">· ${esc(r.brand||'')} ${esc(r.model||'')}</span></div>
            <div style="color:var(--muted);font-size:13px;">Ingreso ${fecha(r.received_at)} · código <b>${esc(r.tracking_code||'')}</b></div>
          </div>
          <div style="text-align:right;">
            ${r.budget?`<div style="color:#fff;font-weight:800;">$${money(r.budget)}</div>`:''}
            <span style="background:${st.c}22;color:${st.c};font-size:12px;padding:3px 9px;border-radius:8px;">${esc(st.t)}</span>
          </div>
        </div>`);
    }).join('');
  } catch (e) { cont.innerHTML = card('<span style="color:#f44336">No se pudieron cargar las reparaciones.</span>'); }
}

function card(inner){
  return `<div style="background:rgba(21,21,21,0.9);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;margin-bottom:12px;color:#ddd;">${inner}</div>`;
}

/* ---------- Guardar perfil ---------- */
function setupProfileForm() {
  const form = $('profileForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = $('saveBtn'), saveBtnText = $('saveBtnText'), saveBtnLoader = $('saveBtnLoader');
    const resetButton = () => { if(saveBtn) saveBtn.disabled=false; if(saveBtnText) saveBtnText.style.display='inline-block'; if(saveBtnLoader) saveBtnLoader.style.display='none'; };

    const username = ($('profileUsername').value || '').trim().toLowerCase().replace(/\s+/g,'_');
    if (username && username.length < 3) { if(window.csToast) csToast('El usuario debe tener al menos 3 caracteres', 'warn'); return; }

    if (saveBtn) saveBtn.disabled = true;
    if (saveBtnText) saveBtnText.style.display = 'none';
    if (saveBtnLoader) saveBtnLoader.style.display = 'inline-block';

    try {
      if (username && username !== originalUsername) {
        const { data: taken } = await supabase.from('profiles').select('id').ilike('username', username).neq('id', currentUser.id).maybeSingle();
        if (taken) { if(window.csToast) csToast('Ese nombre de usuario ya está en uso.', 'warn'); resetButton(); return; }
      }

      const payload = {
        username: username || null,
        full_name: ($('profileName').value || '').trim() || null,
        phone: ($('profilePhone').value || '').trim() || null,
        telegram: ($('profileTelegram').value || '').trim() || null,
        whatsapp: ($('profileWhatsApp').value || '').trim() || null,
        location: ($('profileLocation').value || '').trim() || null,
        updated_at: new Date().toISOString(),
      };
      const isTech = $('techFields') && $('techFields').style.display !== 'none';
      if (isTech) {
        payload.specialty = ($('profileSpecialty').value || '').trim() || null;
        payload.experience = ($('profileExperience').value || '').trim() || null;
        payload.bio = ($('profileBio').value || '').trim() || null;
      }

      const { error } = await supabase.from('profiles').update(payload).eq('id', currentUser.id);
      if (error) throw error;

      const newPassword = $('newPassword') ? $('newPassword').value : '';
      if (newPassword && newPassword.length >= 6) {
        const { error: passError } = await supabase.auth.updateUser({ password: newPassword });
        if (passError) { if(window.csToast) csToast('No se pudo actualizar la contraseña: ' + passError.message, 'error'); resetButton(); return; }
      }

      alert('✅ Perfil actualizado correctamente');
      window.location.reload();
    } catch (error) {
      console.error('Error al guardar:', error);
      if (window.csToast) csToast('Error al guardar los cambios: ' + error.message, 'error');
      resetButton();
    }
  });
}

function cancelChanges() {
  if (confirm('¿Cancelar? Se pierden los cambios no guardados.')) window.location.reload();
}
function logout() {
  if (confirm('¿Cerrar sesión?')) supabase.auth.signOut().then(() => { window.location.href = 'index.html'; });
}
window.cancelChanges = cancelChanges;
window.logout = logout;
