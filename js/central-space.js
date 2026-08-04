// ============================================================
// CENTRAL SPACE · Panel técnico
// Control de acceso + layout + dashboard
// ============================================================

const CS = {
  user: null,
  profile: null,
  tech: null,
  categories: [],
};

const $ = (id) => document.getElementById(id);

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function initials(name, email){
  const base = (name || email || '?').trim();
  const parts = base.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

/* ---------- Gate de acceso ---------- */
function gateMessage(icon, title, text, actions){
  $('csGateBox').innerHTML = `
    <div class="cs-gate-logo"><img src="assets/logo.png" alt="Cell Space"></div>
    <i class="fas ${icon} cs-gate-ic"></i>
    <h2>${esc(title)}</h2>
    <p>${text}</p>
    <div class="cs-gate-actions">${actions || ''}</div>`;
}

async function checkAccess(){
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = 'login.html?redirect=central-space.html';
    return false;
  }
  CS.user = session.user;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, status')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('No se pudo leer el perfil:', error);
    gateMessage('fa-triangle-exclamation', 'No pudimos verificar tu cuenta',
      'Volvé a intentarlo en un momento.',
      '<a href="central-space.html" class="p"><i class="fas fa-rotate"></i> Reintentar</a>' +
      '<a href="index.html" class="s">Ir al inicio</a>');
    return false;
  }

  CS.profile = profile;

  if (profile.status === 'suspended') {
    gateMessage('fa-ban', 'Cuenta suspendida',
      'Tu acceso a Central Space está suspendido. Escribinos si creés que es un error.',
      '<a href="https://wa.me/5493782437674" target="_blank" rel="noopener" class="p"><i class="fab fa-whatsapp"></i> Contactar</a>');
    return false;
  }

  if (!['technician','admin'].includes(profile.role)) {
    gateMessage('fa-user-lock', 'Central Space es solo para técnicos',
      'Es un espacio para técnicos verificados. Si trabajás en reparación, podés solicitar tu acceso: revisamos cada pedido a mano.',
      '<a href="registro-tecnico.html" class="p"><i class="fas fa-user-plus"></i> Solicitar acceso</a>' +
      '<a href="index.html" class="s">Volver al sitio</a>');
    return false;
  }

  await ensureTechProfile();
  return true;
}

async function ensureTechProfile(){
  const { data } = await supabase
    .from('cs_tech_profiles')
    .select('*')
    .eq('user_id', CS.user.id)
    .maybeSingle();

  if (data) { CS.tech = data; return; }

  const { data: created } = await supabase
    .from('cs_tech_profiles')
    .insert({
      user_id: CS.user.id,
      display_name: CS.profile.full_name || CS.profile.email,
      rank: CS.profile.role === 'admin' ? 'Administrador' : 'Técnico',
    })
    .select()
    .single();

  CS.tech = created || null;
}

/* ---------- Menú lateral ---------- */
const GROUPS = [
  ['herramientas','Herramientas'],
  ['productos','Productos'],
  ['info','Información técnica'],
  ['soporte','Soporte'],
];

async function loadMenu(){
  const { data, error } = await supabase
    .from('cs_categories')
    .select('*')
    .order('menu_group')
    .order('sort_order');

  CS.categories = error ? [] : (data || []);

  let html = `
    <div class="cs-nav-group">
      <div class="cs-nav-group-t">Principal</div>
      <a href="#/dashboard" class="cs-nav-item" data-route="dashboard">
        <i class="fas fa-house"></i><span>Dashboard</span>
      </a>
    </div>`;

  for (const [key, label] of GROUPS) {
    const items = CS.categories.filter(c => c.menu_group === key);
    if (!items.length) continue;
    html += `<div class="cs-nav-group"><div class="cs-nav-group-t">${esc(label)}</div>` +
      items.map(c => `
        <a href="#/c/${esc(c.slug)}" class="cs-nav-item" data-route="c/${esc(c.slug)}">
          <i class="${esc(c.icon || 'fas fa-circle')}"></i><span>${esc(c.name)}</span>
        </a>`).join('') +
      `</div>`;
  }

  html += `
    <div class="cs-nav-group">
      <div class="cs-nav-group-t">Comunidad</div>
      <a href="#/chat" class="cs-nav-item" data-route="chat">
        <i class="fas fa-comments"></i><span>Chat Técnico</span>
        <span class="cs-nav-tag">Pronto</span>
      </a>
    </div>`;

  $('csNav').innerHTML = html;
}

function markActive(route){
  document.querySelectorAll('.cs-nav-item').forEach(el => {
    el.classList.toggle('on', el.dataset.route === route);
  });
}

/* ---------- Dashboard ---------- */
async function countOf(table, filters){
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filters) for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count, error } = await q;
  return error ? 0 : (count || 0);
}

async function viewDashboard(){
  const name = CS.tech?.display_name || CS.profile.full_name || CS.profile.email;

  $('csView').innerHTML = `
    <section class="cs-hero">
      <h1>SOLUCIONES PROFESIONALES <span>PARA TÉCNICOS</span></h1>
      <p>Herramientas actualizadas · Soporte real · Resultados garantizados</p>
      <div class="cs-hero-stats">
        <div class="cs-stat"><span class="cs-stat-l">Herramientas</span><div class="cs-stat-v" id="stTools">–</div><span class="cs-stat-s">Activas</span></div>
        <div class="cs-stat"><span class="cs-stat-l">Guías</span><div class="cs-stat-v" id="stGuides">–</div><span class="cs-stat-s">Disponibles</span></div>
        <div class="cs-stat"><span class="cs-stat-l">Modelos</span><div class="cs-stat-v" id="stDevices">–</div><span class="cs-stat-s">Soportados</span></div>
        <div class="cs-stat"><span class="cs-stat-l">Archivos</span><div class="cs-stat-v" id="stFiles">–</div><span class="cs-stat-s">Para descargar</span></div>
      </div>
    </section>

    <div class="cs-grid-2">
      <div>
        <section class="cs-sec">
          <div class="cs-sec-head"><h2>Herramientas destacadas</h2><a href="#/c/herramientas">Ver todas</a></div>
          <div class="cs-grid-4" id="dashTools"><div class="cs-loading"><i class="fas fa-spinner fa-spin"></i></div></div>
        </section>

        <section class="cs-sec">
          <div class="cs-sec-head"><h2>Guías recientes</h2><a href="#/c/guias">Ver todas</a></div>
          <div class="cs-grid-4" id="dashGuides"><div class="cs-loading"><i class="fas fa-spinner fa-spin"></i></div></div>
        </section>
      </div>

      <aside>
        <div class="cs-card cs-profile">
          <div class="cs-profile-av">${esc(initials(name, CS.profile.email))}</div>
          <div class="cs-profile-n">${esc(name)}</div>
          <span class="cs-profile-r">${esc(CS.tech?.rank || 'Técnico')}</span>
          <div class="cs-profile-meta">
            <div>
              <div class="cs-meta-l">Rango</div>
              <div class="cs-meta-v">${esc(CS.tech?.rank || 'Técnico')}</div>
            </div>
            <div>
              <div class="cs-meta-l">Nivel ${CS.tech?.level ?? 1}</div>
              <div class="cs-bar"><span style="width:${Math.min(100, (CS.tech?.points ?? 0) % 100)}%"></span></div>
            </div>
          </div>
          <div class="cs-profile-nums">
            <div><div class="cs-pn-v">${CS.tech?.points ?? 0}</div><div class="cs-pn-l">Puntos</div></div>
            <div><div class="cs-pn-v">${CS.tech?.level ?? 1}</div><div class="cs-pn-l">Nivel</div></div>
            <div><div class="cs-pn-v">0</div><div class="cs-pn-l">Aportes</div></div>
            <div><div class="cs-pn-v">${Number(CS.tech?.reputation ?? 0).toFixed(1)}</div><div class="cs-pn-l">Reputación</div></div>
          </div>
        </div>
      </aside>
    </div>`;

  // Contadores
  const [t, g, d, f] = await Promise.all([
    countOf('cs_tools',   { is_active: true }),
    countOf('cs_guides',  { status: 'published' }),
    countOf('cs_devices', null),
    countOf('cs_files',   null),
  ]);
  $('stTools').textContent   = t;
  $('stGuides').textContent  = g;
  $('stDevices').textContent = d;
  $('stFiles').textContent   = f;

  // Herramientas destacadas
  const { data: tools } = await supabase
    .from('cs_tools').select('*')
    .eq('is_active', true).order('sort_order').limit(4);

  $('dashTools').innerHTML = (tools && tools.length)
    ? tools.map(x => `
      <div class="cs-card cs-tool-card">
        <div class="cs-tool-logo">${x.logo_url ? `<img src="${esc(x.logo_url)}" alt="${esc(x.name)}" loading="lazy">` : '<i class="fas fa-wrench"></i>'}</div>
        <div class="cs-tool-n">${esc(x.name)}</div>
        <div class="cs-tool-v">${esc(x.version || '—')}</div>
        <div class="cs-tool-s">Última versión</div>
        ${x.website_url ? `<a class="cs-tool-btn" href="${esc(x.website_url)}" target="_blank" rel="noopener">ABRIR</a>` : ''}
      </div>`).join('')
    : `<div class="cs-empty" style="grid-column:1/-1"><i class="fas fa-wrench"></i><h3>Todavía no hay herramientas</h3><p>Cargalas desde el CMS y aparecen acá.</p></div>`;

  // Guías recientes
  const { data: guides } = await supabase
    .from('cs_guides').select('*')
    .eq('status', 'published').order('published_at', { ascending: false }).limit(4);

  $('dashGuides').innerHTML = (guides && guides.length)
    ? guides.map(x => `
      <a class="cs-guide-card" href="#/g/${esc(x.slug)}">
        <div class="cs-guide-cover">
          ${x.cover_url ? `<img src="${esc(x.cover_url)}" alt="${esc(x.title)}" loading="lazy">` : '<i class="fas fa-book"></i>'}
          ${x.badge ? `<span class="cs-guide-badge">${esc(x.badge)}</span>` : ''}
        </div>
        <div class="cs-guide-b">
          <div class="cs-guide-t">${esc(x.title)}</div>
          <div class="cs-guide-m">
            <span>${x.views || 0} vistas</span>
            <span class="st">${x.is_vip ? '<i class="fas fa-crown"></i> VIP' : ''}</span>
          </div>
        </div>
      </a>`).join('')
    : `<div class="cs-empty" style="grid-column:1/-1"><i class="fas fa-book"></i><h3>Todavía no hay guías</h3><p>Cuando publiques la primera, aparece acá.</p></div>`;
}

/* ---------- Vistas en construcción ---------- */
function viewSoon(title, text){
  $('csView').innerHTML = `
    <div class="cs-empty">
      <i class="fas fa-helmet-safety"></i>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
    </div>`;
}

/* ---------- Router ---------- */
function router(){
  const hash = (window.location.hash || '#/dashboard').replace(/^#\//, '');
  const [seg, param] = hash.split('/');

  closeSidebar();
  window.scrollTo({ top: 0 });

  if (seg === 'dashboard' || seg === '') {
    markActive('dashboard');
    viewDashboard();
  } else if (seg === 'c') {
    markActive('c/' + param);
    const cat = CS.categories.find(c => c.slug === param);
    viewSoon(cat ? cat.name : 'Sección', 'Esta sección está en construcción.');
  } else if (seg === 'g') {
    viewSoon('Ficha de guía', 'La ficha de guía llega en la próxima etapa.');
  } else if (seg === 'vip') {
    viewSoon('Cell Space VIP Tech', 'Los planes VIP se habilitan más adelante.');
  } else if (seg === 'chat') {
    viewSoon('Chat Técnico', 'El chat en vivo llega más adelante.');
  } else {
    viewSoon('No encontramos esa sección', 'Volvé al dashboard desde el menú.');
  }
}

/* ---------- Sidebar móvil ---------- */
function openSidebar(){
  $('csSidebar').classList.add('open');
  $('csBackdrop').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeSidebar(){
  $('csSidebar').classList.remove('open');
  $('csBackdrop').classList.remove('on');
  document.body.style.overflow = '';
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof supabase === 'undefined') {
    gateMessage('fa-plug-circle-xmark', 'Error de conexión',
      'No se pudo iniciar la conexión con el servidor.', '');
    return;
  }

  const ok = await checkAccess();
  if (!ok) return;

  $('csGate').hidden = true;
  $('csApp').hidden = false;

  $('csAvatarInitials').textContent =
    initials(CS.tech?.display_name || CS.profile.full_name, CS.profile.email);

  await loadMenu();
  router();

  window.addEventListener('hashchange', router);
  $('csBurger').addEventListener('click', openSidebar);
  $('csSideClose').addEventListener('click', closeSidebar);
  $('csBackdrop').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });

  $('csSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (q) viewSoon('Búsqueda', `El buscador se activa cuando haya contenido cargado. Buscaste: "${q}"`);
    }
  });

  $('csAvatarBtn').addEventListener('click', () => { window.location.hash = '#/perfil'; });
});
