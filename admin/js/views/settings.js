import { supabase } from '../config.js';
import { store } from '../core/state.js';

let settings = {};

const FIELDS = [
  'site_name','site_tagline','logo_url','favicon_url',
  'whatsapp','email','address','phone',
  'instagram','facebook','youtube','tiktok','telegram',
  'meta_title','meta_description','meta_keywords','og_image',
  'ga_id','meta_pixel_id','extra_head',
  'color_primary','color_secondary','font_family','border_radius',
  'maintenance_mode','maintenance_message'
];

// ---------- VISTA ----------
export async function settingsView() {
  const state = store.getState();
  const userName = state.user?.email?.split('@')[0] || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();

  return `
  <div class="admin-layout">
    <aside class="admin-sidebar" id="adminSidebar">
      <div class="sidebar-header"><img src="../assets/logo.png" alt="Cell Space" class="sidebar-logo" onerror="this.style.display='none'"><div class="sidebar-brand"><span class="brand-name">CELL SPACE</span><span class="brand-sub">CMS Panel</span></div></div>
      <nav class="sidebar-nav">
        <div class="nav-section"><span class="nav-section-title">Principal</span><a href="#/dashboard" class="nav-item"><i class="fas fa-home"></i><span>Dashboard</span></a></div>
        <div class="nav-section"><span class="nav-section-title">Contenido</span>
          <a href="#/products" class="nav-item"><i class="fas fa-box"></i><span>Productos</span></a>
          <a href="#/services" class="nav-item"><i class="fas fa-tools"></i><span>Servicios</span></a>
          <a href="#/pages" class="nav-item"><i class="fas fa-file-alt"></i><span>Páginas</span></a>
          <a href="#/blog" class="nav-item"><i class="fas fa-newspaper"></i><span>Blog</span></a></div>
        <div class="nav-section"><span class="nav-section-title">Gestión</span>
          <a href="#/orders" class="nav-item"><i class="fas fa-shopping-cart"></i><span>Pedidos</span></a>
          <a href="#/customers" class="nav-item"><i class="fas fa-users"></i><span>Clientes</span></a>
          <a href="#/messages" class="nav-item"><i class="fas fa-envelope"></i><span>Mensajes</span></a></div>
        <div class="nav-section"><span class="nav-section-title">Sistema</span>
          <a href="#/media" class="nav-item"><i class="fas fa-images"></i><span>Archivos</span></a>
          <a href="#/settings" class="nav-item"><i class="fas fa-cog"></i><span>Configuración</span></a></div>
      </nav>
      <div class="sidebar-footer"><a href="../index.html" class="nav-item" target="_blank"><i class="fas fa-external-link-alt"></i><span>Ver sitio público</span></a></div>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div class="topbar-left"><button class="sidebar-toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button><h1 class="page-title">Configuración del Sitio</h1></div>
        <div class="topbar-right"><div class="user-menu">
          <button class="user-btn" id="userMenuBtn"><div class="user-avatar">${userInitial}</div><div class="user-info"><span class="user-name">${userName}</span><span class="user-role">Administrador</span></div><i class="fas fa-chevron-down"></i></button>
          <div class="user-dropdown" id="userDropdown"><a href="#/dashboard" class="dropdown-item"><i class="fas fa-home"></i><span>Dashboard</span></a><div class="dropdown-divider"></div><a href="#" class="dropdown-item logout" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i><span>Cerrar sesión</span></a></div>
        </div></div>
      </header>

      <main class="admin-content"><div class="content-wrapper" id="settingsContent">
        <p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando configuración...</p>
      </div></main>

      <footer class="admin-footer"><div class="footer-content"><span>&copy; 2026 Cell Space Argentina.</span><span class="footer-version">CMS v1.0.0</span></div></footer>
    </div>
  </div>
  <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
}

// ---------- MOUNT ----------
export function settingsViewOnMount() {
  wireLayout();
  loadSettings();
}

function wireLayout() {
  const t=document.getElementById('sidebarToggle'),s=document.getElementById('adminSidebar'),o=document.getElementById('sidebarOverlay');
  if(t)t.onclick=()=>{s.classList.toggle('open');o.classList.toggle('active');};
  if(o)o.onclick=()=>{s.classList.remove('open');o.classList.remove('active');};
  const ub=document.getElementById('userMenuBtn'),ud=document.getElementById('userDropdown');
  if(ub)ub.onclick=e=>{e.stopPropagation();ud.classList.toggle('active');};
  document.addEventListener('click',()=>ud&&ud.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.toggle('active',i.getAttribute('href')===(window.location.hash||'').split('?')[0]));
}

// ---------- LOAD ----------
async function loadSettings() {
  try {
    let { data, error } = await supabase.from('site_settings').select('*').eq('id','default').maybeSingle();
    if (error) throw error;
    if (!data) {
      // si por alguna razón no existe la fila, la creo con defaults
      await supabase.from('site_settings').insert({ id:'default' });
      const r = await supabase.from('site_settings').select('*').eq('id','default').single();
      data = r.data;
    }
    settings = data || {};
    renderForm();
  } catch (e) {
    console.error(e);
    document.getElementById('settingsContent').innerHTML = '<p class="loading-text" style="color:#ff4444">Error al cargar: '+e.message+'</p>';
  }
}

// ---------- RENDER FORM ----------
function renderForm() {
  const s = settings;
  document.getElementById('settingsContent').innerHTML = `
  <form id="settingsForm">

    <!-- IDENTIDAD -->
    <section class="settings-card">
      <h3 class="settings-title"><i class="fas fa-fingerprint"></i> Identidad</h3>
      <div class="form-row">
        <div class="form-group"><label>Nombre del sitio</label><input type="text" id="s_site_name" value="${escAttr(s.site_name)}"></div>
        <div class="form-group"><label>Eslogan / tagline</label><input type="text" id="s_site_tagline" value="${escAttr(s.site_tagline)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Logo</label>
          <div class="blk-row"><input id="s_logo_url" placeholder="URL del logo" value="${escAttr(s.logo_url)}" oninput="setPrevImg('prevLogo', this.value)"></div>
          <div class="blk-row"><label class="blk-upload"><i class="fas fa-upload"></i> Subir logo<input type="file" accept="image/*" id="s_logo_file"></label><div class="blk-img-prev" id="prevLogo">${s.logo_url?'<img src="'+escAttr(s.logo_url)+'" alt="">':''}</div></div>
        </div>
        <div class="form-group">
          <label>Favicon</label>
          <div class="blk-row"><input id="s_favicon_url" placeholder="URL del favicon" value="${escAttr(s.favicon_url)}" oninput="setPrevImg('prevFav', this.value)"></div>
          <div class="blk-row"><label class="blk-upload"><i class="fas fa-upload"></i> Subir favicon<input type="file" accept="image/*" id="s_favicon_file"></label><div class="blk-img-prev" id="prevFav">${s.favicon_url?'<img src="'+escAttr(s.favicon_url)+'" alt="">':''}</div></div>
        </div>
      </div>
    </section>

    <!-- CONTACTO Y REDES -->
    <section class="settings-card">
      <h3 class="settings-title"><i class="fas fa-address-book"></i> Contacto y Redes</h3>
      <div class="form-row">
        <div class="form-group"><label>WhatsApp (con código país, sin +)</label><input type="text" id="s_whatsapp" value="${escAttr(s.whatsapp)}" placeholder="5493782437674"></div>
        <div class="form-group"><label>Teléfono</label><input type="text" id="s_phone" value="${escAttr(s.phone)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" id="s_email" value="${escAttr(s.email)}"></div>
        <div class="form-group"><label>Dirección / ubicación</label><input type="text" id="s_address" value="${escAttr(s.address)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label><i class="fab fa-instagram"></i> Instagram</label><input type="text" id="s_instagram" value="${escAttr(s.instagram)}" placeholder="@usuario o URL"></div>
        <div class="form-group"><label><i class="fab fa-facebook"></i> Facebook</label><input type="text" id="s_facebook" value="${escAttr(s.facebook)}" placeholder="URL"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label><i class="fab fa-youtube"></i> YouTube</label><input type="text" id="s_youtube" value="${escAttr(s.youtube)}" placeholder="URL"></div>
        <div class="form-group"><label><i class="fab fa-tiktok"></i> TikTok</label><input type="text" id="s_tiktok" value="${escAttr(s.tiktok)}" placeholder="@usuario o URL"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label><i class="fab fa-telegram"></i> Telegram</label><input type="text" id="s_telegram" value="${escAttr(s.telegram)}" placeholder="@usuario o URL"></div>
        <div class="form-group"></div>
      </div>
    </section>

    <!-- SEO GLOBAL -->
    <section class="settings-card">
      <h3 class="settings-title"><i class="fas fa-search"></i> SEO Global</h3>
      <div class="form-row"><div class="form-group full"><label>Meta título (home)</label><input type="text" id="s_meta_title" value="${escAttr(s.meta_title)}"></div></div>
      <div class="form-row"><div class="form-group full"><label>Meta descripción</label><textarea id="s_meta_description" rows="2">${escapeHtml(s.meta_description)}</textarea></div></div>
      <div class="form-row"><div class="form-group full"><label>Meta keywords (separadas por coma)</label><input type="text" id="s_meta_keywords" value="${escAttr(s.meta_keywords)}"></div></div>
      <div class="form-row">
        <div class="form-group full">
          <label>Imagen para redes (Open Graph)</label>
          <div class="blk-row"><input id="s_og_image" placeholder="URL de la imagen" value="${escAttr(s.og_image)}" oninput="setPrevImg('prevOg', this.value)"></div>
          <div class="blk-row"><label class="blk-upload"><i class="fas fa-upload"></i> Subir imagen OG<input type="file" accept="image/*" id="s_og_file"></label><div class="blk-img-prev" id="prevOg">${s.og_image?'<img src="'+escAttr(s.og_image)+'" alt="">':''}</div></div>
        </div>
      </div>
    </section>

    <!-- ANALÍTICAS -->
    <section class="settings-card">
      <h3 class="settings-title"><i class="fas fa-chart-line"></i> Analíticas</h3>
      <div class="form-row">
        <div class="form-group"><label>Google Analytics (GA4)</label><input type="text" id="s_ga_id" value="${escAttr(s.ga_id)}" placeholder="G-XXXXXXXXXX"></div>
        <div class="form-group"><label>Meta Pixel ID</label><input type="text" id="s_meta_pixel_id" value="${escAttr(s.meta_pixel_id)}" placeholder="1234567890"></div>
      </div>
      <div class="form-row"><div class="form-group full"><label>Snippet extra en &lt;head&gt; (HTML, opcional)</label><textarea id="s_extra_head" rows="3" placeholder="Pegá acá scripts de tracking adicionales...">${escapeHtml(s.extra_head)}</textarea><small class="field-hint">Se inyecta tal cual en el &lt;head&gt; del sitio (Parte 12). Usalo con cuidado.</small></div></div>
    </section>

    <!-- APARIENCIA -->
    <section class="settings-card">
      <h3 class="settings-title"><i class="fas fa-palette"></i> Apariencia</h3>
      <div class="form-row">
        <div class="form-group"><label>Color primario</label><div class="color-field"><input type="color" id="s_color_primary" value="${escAttr(s.color_primary)||'#FF6A00'}" oninput="document.getElementById('s_color_primary_t').value=this.value;updateSwatch()"><input type="text" id="s_color_primary_t" value="${escAttr(s.color_primary)||'#FF6A00'}" oninput="document.getElementById('s_color_primary').value=this.value;updateSwatch()"></div></div>
        <div class="form-group"><label>Color secundario</label><div class="color-field"><input type="color" id="s_color_secondary" value="${escAttr(s.color_secondary)||'#ff8533'}" oninput="document.getElementById('s_color_secondary_t').value=this.value;updateSwatch()"><input type="text" id="s_color_secondary_t" value="${escAttr(s.color_secondary)||'#ff8533'}" oninput="document.getElementById('s_color_secondary').value=this.value;updateSwatch()"></div></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fuente (Google Fonts)</label><input type="text" id="s_font_family" value="${escAttr(s.font_family)||'Montserrat'}" placeholder="Montserrat" oninput="updateSwatch()"></div>
        <div class="form-group"><label>Radio de bordes (px)</label><input type="number" id="s_border_radius" min="0" max="40" value="${escAttr(s.border_radius)||'12'}" oninput="updateSwatch()"></div>
      </div>
      <div class="appearance-preview" id="appearancePreview"></div>
      <p class="field-hint">Vista previa orientativa. Los colores se aplican al sitio público en la Parte 12.</p>
    </section>

    <!-- MANTENIMIENTO -->
    <section class="settings-card">
      <h3 class="settings-title"><i class="fas fa-screwdriver-wrench"></i> Modo Mantenimiento</h3>
      <div class="form-row checks">
        <label class="check"><input type="checkbox" id="s_maintenance_mode" ${s.maintenance_mode?'checked':''}><span>Activar modo mantenimiento (oculta el sitio público)</span></label>
      </div>
      <div class="form-row"><div class="form-group full"><label>Mensaje de mantenimiento</label><textarea id="s_maintenance_message" rows="2">${escapeHtml(s.maintenance_message)}</textarea><small class="field-hint">Se muestra a los visitantes cuando el modo está activo (Parte 12).</small></div></div>
    </section>

    <div class="settings-actions">
      <button type="submit" class="btn-primary" id="sSaveBtn"><i class="fas fa-save"></i> Guardar configuración</button>
    </div>
  </form>`;

  // vincular eventos
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);
  bindUpload('s_logo_file', 's_logo_url', 'prevLogo');
  bindUpload('s_favicon_file', 's_favicon_url', 'prevFav');
  bindUpload('s_og_file', 's_og_image', 'prevOg');
  updateSwatch();
}

function bindUpload(inputId, urlId, prevId) {
  const input = document.getElementById(inputId); if (!input) return;
  input.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const prev = document.getElementById(prevId); prev.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const safe = file.name.replace(/[^a-zA-Z0-9.]/g,'_');
    const path = 'settings/' + Date.now() + '-' + Math.random().toString(36).slice(2,8) + '-' + safe;
    supabase.storage.from('product-images').upload(path, file, { upsert:false })
      .then(({ error }) => { if (error) throw error; const { data } = supabase.storage.from('product-images').getPublicUrl(path); document.getElementById(urlId).value = data.publicUrl; prev.innerHTML = '<img src="'+data.publicUrl+'" alt="">'; })
      .catch(err => { toast('No se pudo subir','err'); prev.innerHTML=''; console.error(err); });
    e.target.value='';
  });
}

window.setPrevImg = function (id, url) { const el=document.getElementById(id); if(el) el.innerHTML = url ? '<img src="'+url+'" alt="">' : ''; };

window.updateSwatch = function () {
  const c1 = (document.getElementById('s_color_primary')?.value) || '#FF6A00';
  const c2 = (document.getElementById('s_color_secondary')?.value) || '#ff8533';
  const font = (document.getElementById('s_font_family')?.value) || 'Montserrat';
  const r = (document.getElementById('s_border_radius')?.value) || '12';
  const box = document.getElementById('appearancePreview'); if (!box) return;
  box.innerHTML = `
    <div class="ap-mock" style="--c1:${c1};--c2:${c2};--ff:${font};--rr:${r}px;">
      <div class="ap-bar"></div>
      <div class="ap-body-mock">
        <div class="ap-h" style="font-family:var(--ff)">Título de ejemplo</div>
        <div class="ap-p">Así se vería un botón con tus colores y bordes.</div>
        <button class="ap-btn" style="font-family:var(--ff)">Botón primario</button>
        <button class="ap-btn2" style="font-family:var(--ff)">Secundario</button>
      </div>
    </div>`;
};

// ---------- SAVE ----------
async function saveSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('sSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const payload = { id: 'default', updated_at: new Date().toISOString() };
    FIELDS.forEach(f => {
      const el = document.getElementById('s_' + f); if (!el) return;
      if (el.type === 'checkbox') payload[f] = el.checked;
      else payload[f] = (el.value ?? '').trim() || null;
    });
    // campos que no deben ser null si están vacíos pero tienen sentido como string
    ['extra_head','maintenance_message'].forEach(f => { const el=document.getElementById('s_'+f); if(el) payload[f] = el.value ?? ''; });

    const { error } = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    settings = { ...settings, ...payload };
    toast('Configuración guardada','ok');
  } catch (err) { console.error(err); toast('Error: '+err.message,'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar configuración'; }
}

// ---------- HELPERS ----------
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
function toast(msg,type){ const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'</i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }
window.handleLogout = async () => { if(confirm('¿Cerrar sesión?')){ const { logout } = await import('../hooks/useAuth.js'); await logout(); } };
