// ============================================================
// CENTRAL SPACE · Panel técnico
// Control de acceso + menú + dashboard
// ============================================================

const CS = { user:null, profile:null, tech:null, categories:[] };
const $ = (id) => document.getElementById(id);

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function initials(name, email){
  const base = (name || email || '?').trim();
  const p = base.split(/[\s@._-]+/).filter(Boolean);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}

/* ---------- El sidebar y la topbar se pegan bajo el header del sitio ---------- */
function syncHeaderOffset(){
  const h = document.getElementById('siteHeader');
  const px = h ? Math.round(h.getBoundingClientRect().height) : 0;
  const wrap = document.querySelector('.cs-wrap');
  if (wrap) wrap.style.setProperty('--cs-head-h', px + 'px');
}

/* ---------- Buscador del header del sitio ---------- */
function performHeaderSearch(){
  const i = $('headerSearchInput');
  const q = i ? i.value.trim() : '';
  if (q) window.location.href = 'tienda.html?q=' + encodeURIComponent(q);
}
window.performHeaderSearch = performHeaderSearch;

/* ---------- Contador del carrito ---------- */
function paintCartCount(){
  try{
    const cart = JSON.parse(localStorage.getItem('cellspace_cart') || '[]');
    const n = cart.reduce((s,i) => s + (Number(i.quantity) || 0), 0);
    const el = $('cartCount');
    if (el){ el.textContent = n; el.style.display = n > 0 ? 'flex' : 'none'; }
  }catch(e){ /* ignorado */ }
}

/* ---------- Gate de acceso ---------- */
function gateMessage(icon, title, text, actions){
  $('csGateBox').innerHTML = `
    <i class="fas ${icon} cs-gate-ic"></i>
    <h2>${esc(title)}</h2>
    <p>${text}</p>
    <div class="cs-gate-actions">${actions || ''}</div>`;
}

async function checkAccess(){
  const { data:{ session } } = await supabase.auth.getSession();

  if (!session){
    gateMessage('fa-user-lock', 'Iniciá sesión para entrar',
      'Central Space es el área privada para técnicos de Cell Space.',
      '<a href="login.html?redirect=central-space.html" class="p"><i class="fas fa-sign-in-alt"></i> Iniciar sesión</a>' +
      '<a href="register-client.html" class="s">Crear cuenta</a>');
    return false;
  }
  CS.user = session.user;

  const { data:profile, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, status')
    .eq('id', session.user.id)
    .single();

  if (error){
    console.error('No se pudo leer el perfil:', error);
    gateMessage('fa-triangle-exclamation', 'No pudimos verificar tu cuenta',
      'Volvé a intentarlo en un momento.',
      '<a href="central-space.html" class="p"><i class="fas fa-rotate"></i> Reintentar</a>');
    return false;
  }
  CS.profile = profile;

  if (profile.status === 'suspended'){
    gateMessage('fa-ban', 'Cuenta suspendida',
      'Tu acceso a Central Space está suspendido. Escribinos si creés que es un error.',
      '<a href="https://wa.me/5493782437674" target="_blank" rel="noopener" class="p"><i class="fab fa-whatsapp"></i> Contactar</a>');
    return false;
  }

  if (!['technician','admin'].includes(profile.role)){
    gateMessage('fa-user-lock', 'Central Space es solo para técnicos',
      'Es un espacio para técnicos verificados. Si trabajás en reparación, podés solicitar tu acceso: revisamos cada pedido a mano.',
      '<a href="registro-tecnico.html" class="p"><i class="fas fa-user-plus"></i> Solicitar acceso</a>' +
      '<a href="index.html" class="s">Volver al inicio</a>');
    return false;
  }

  await ensureTechProfile();
  return true;
}

async function ensureTechProfile(){
  const { data } = await supabase.from('cs_tech_profiles')
    .select('*').eq('user_id', CS.user.id).maybeSingle();
  if (data){ CS.tech = data; return; }

  const { data:created } = await supabase.from('cs_tech_profiles')
    .insert({
      user_id: CS.user.id,
      display_name: CS.profile.full_name || CS.profile.email,
      rank: CS.profile.role === 'admin' ? 'Administrador' : 'Técnico',
    }).select().single();
  CS.tech = created || null;
}

/* ---------- Menú ---------- */
const GROUPS = [
  ['herramientas','Herramientas'],
  ['productos','Productos'],
  ['info','Información técnica'],
  ['soporte','Soporte'],
];

async function loadMenu(){
  const { data, error } = await supabase.from('cs_categories')
    .select('*').order('menu_group').order('sort_order');
  CS.categories = error ? [] : (data || []);

  let html = `
    <div class="cs-nav-group">
      <div class="cs-nav-group-t">Principal</div>
      <a href="#/dashboard" class="cs-nav-item" data-route="dashboard">
        <i class="fas fa-house"></i><span>Dashboard</span></a>
    </div>`;

  for (const [key, label] of GROUPS){
    const items = CS.categories.filter(c => c.menu_group === key);
    if (!items.length) continue;
    html += `<div class="cs-nav-group"><div class="cs-nav-group-t">${esc(label)}</div>` +
      items.map(c => `
        <a href="#/c/${esc(c.slug)}" class="cs-nav-item" data-route="c/${esc(c.slug)}">
          <i class="${esc(c.icon || 'fas fa-circle')}"></i><span>${esc(c.name)}</span></a>`).join('') +
      `</div>`;
  }

  html += `
    <div class="cs-nav-group">
      <div class="cs-nav-group-t">Comunidad</div>
      <a href="#/chat" class="cs-nav-item" data-route="chat">
        <i class="fas fa-comments"></i><span>Chat Técnico</span>
        <span class="cs-nav-tag">Pronto</span></a>
    </div>`;

  $('csNav').innerHTML = html;
}

function markActive(route){
  document.querySelectorAll('.cs-nav-item').forEach(el =>
    el.classList.toggle('on', el.dataset.route === route));
}

/* ---------- Dashboard ---------- */
async function countOf(table, filters){
  let q = supabase.from(table).select('*', { count:'exact', head:true });
  if (filters) for (const [k,v] of Object.entries(filters)) q = q.eq(k,v);
  const { count, error } = await q;
  return error ? 0 : (count || 0);
}

async function viewDashboard(){
  const name = CS.tech?.display_name || CS.profile.full_name || CS.profile.email;

  $('csView').innerHTML = `
    <section class="cs-hero">
      <h1>Soluciones profesionales <span>para técnicos</span></h1>
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
            <div><div class="cs-meta-l">Rango</div><div class="cs-meta-v">${esc(CS.tech?.rank || 'Técnico')}</div></div>
            <div><div class="cs-meta-l">Nivel ${CS.tech?.level ?? 1}</div>
                 <div class="cs-bar"><span style="width:${Math.min(100,(CS.tech?.points ?? 0) % 100)}%"></span></div></div>
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

  const [t,g,d,f] = await Promise.all([
    countOf('cs_tools',  { is_active:true }),
    countOf('cs_guides', { status:'published' }),
    countOf('cs_devices', null),
    countOf('cs_files',   null),
  ]);
  $('stTools').textContent   = t;
  $('stGuides').textContent  = g;
  $('stDevices').textContent = d;
  $('stFiles').textContent   = f;

  const { data:tools } = await supabase.from('cs_tools')
    .select('*').eq('is_active', true).order('sort_order').limit(4);

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

  const { data:guides } = await supabase.from('cs_guides')
    .select('*').eq('status','published').order('published_at',{ascending:false}).limit(4);

  $('dashGuides').innerHTML = (guides && guides.length)
    ? guides.map(x => `
      <a class="cs-guide-card" href="#/g/${esc(x.slug)}">
        <div class="cs-guide-cover">
          ${x.cover_url ? `<img src="${esc(x.cover_url)}" alt="${esc(x.title)}" loading="lazy">` : '<i class="fas fa-book"></i>'}
          ${x.badge ? `<span class="cs-guide-badge">${esc(x.badge)}</span>` : ''}
        </div>
        <div class="cs-guide-b">
          <div class="cs-guide-t">${esc(x.title)}</div>
          <div class="cs-guide-m"><span>${x.views || 0} vistas</span>
            <span class="st">${x.is_vip ? '<i class="fas fa-crown"></i> VIP' : ''}</span></div>
        </div>
      </a>`).join('')
    : `<div class="cs-empty" style="grid-column:1/-1"><i class="fas fa-book"></i><h3>Todavía no hay guías</h3><p>Cuando publiques la primera, aparece acá.</p></div>`;
}

function viewSoon(title, text){
  $('csView').innerHTML = `
    <div class="cs-empty"><i class="fas fa-helmet-safety"></i>
      <h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
}

/* ---------- Ficha de guía ---------- */
function fmtBytes(n){ n=Number(n)||0; if(!n) return ''; const u=['B','KB','MB','GB']; const i=Math.floor(Math.log(n)/Math.log(1024)); return (n/Math.pow(1024,i)).toFixed(i?1:0)+' '+u[i]; }
function diffLabel(d){ return ({1:'Muy fácil',2:'Fácil',3:'Media',4:'Difícil',5:'Experto'})[d]||'Media'; }
function starRow(avg){ let s=''; const f=Math.round(avg); for(let i=1;i<=5;i++) s+= i<=f?'★':'☆'; return s; }

async function viewCategory(slug){
  const host = $('csView');
  const cat = CS.categories.find(c => c.slug === slug);
  host.innerHTML = '<div class="cs-empty"><i class="fas fa-spinner fa-spin"></i><h3>Cargando...</h3></div>';
  injectGuideCss();
  try {
    let q = supabase.from('cs_guides').select('slug,title,cover_url,views,is_vip,badge').eq('status','published').order('published_at',{ascending:false});
    if (cat) q = q.eq('category_id', cat.id);
    const { data } = await q;
    const list = data || [];
    host.innerHTML = `
      <div class="cs-gd-crumb"><a href="#/dashboard">Central Space</a> / ${esc(cat ? cat.name : 'Guías')}</div>
      <h1 class="cs-gd-cat-title">${esc(cat ? cat.name : 'Guías')}</h1>
      <div class="cs-guides-grid">${list.length ? list.map(x=>`
        <a class="cs-guide-card" href="#/g/${esc(x.slug)}">
          <div class="cs-guide-cover">${x.cover_url?`<img src="${esc(x.cover_url)}" alt="${esc(x.title)}" loading="lazy">`:'<i class="fas fa-book"></i>'}${x.badge?`<span class="cs-guide-badge">${esc(x.badge)}</span>`:''}</div>
          <div class="cs-guide-b"><div class="cs-guide-t">${esc(x.title)}</div>
            <div class="cs-guide-m"><span>${x.views||0} vistas</span><span class="st">${x.is_vip?'<i class="fas fa-crown"></i> VIP':''}</span></div></div>
        </a>`).join('') : `<div class="cs-empty" style="grid-column:1/-1"><i class="fas fa-book"></i><h3>Todavía no hay guías en esta sección</h3><p>Publicá una desde el panel (Central Space).</p></div>`}</div>`;
  } catch(e){ viewSoon('Error', e.message); }
}

async function viewGuide(slug){
  const host = $('csView');
  host.innerHTML = '<div class="cs-empty"><i class="fas fa-spinner fa-spin"></i><h3>Cargando guía...</h3></div>';
  injectGuideCss();
  try {
    const { data: g, error } = await supabase.from('cs_guides').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    if (!g) { viewSoon('Guía no encontrada', 'Puede que no exista o todavía no esté publicada.'); return; }
    const cat = CS.categories.find(c => c.id === g.category_id);

    const [devRes, brandRes, toolsRes, filesRes, ratingsRes, commentsRes, relRes] = await Promise.all([
      g.device_id ? supabase.from('cs_devices').select('*').eq('id', g.device_id).maybeSingle() : Promise.resolve({data:null}),
      g.brand_id ? supabase.from('cs_brands').select('name,logo_url').eq('id', g.brand_id).maybeSingle() : Promise.resolve({data:null}),
      supabase.from('cs_guide_tools').select('sort_order, cs_tools(*)').eq('guide_id', g.id).order('sort_order'),
      supabase.from('cs_files').select('*').eq('guide_id', g.id).order('created_at'),
      supabase.from('cs_ratings').select('stars').eq('guide_id', g.id),
      supabase.from('cs_comments').select('*').eq('guide_id', g.id).eq('is_hidden', false).order('created_at',{ascending:false}),
      supabase.from('cs_guides').select('slug,title,cover_url').eq('category_id', g.category_id).eq('status','published').neq('id', g.id).limit(5),
    ]);
    const device = devRes.data, brand = brandRes.data;
    const tools = (toolsRes.data||[]).map(r=>r.cs_tools).filter(Boolean);
    const files = filesRes.data||[], ratings = ratingsRes.data||[], comments = commentsRes.data||[], related = relRes.data||[];
    const avg = ratings.length ? ratings.reduce((s,r)=>s+(r.stars||0),0)/ratings.length : 0;
    const steps = Array.isArray(g.steps)? g.steps : [];
    const reqs  = Array.isArray(g.requirements)? g.requirements : [];

    const chip = (ic,txt)=> txt?`<span class="cs-gd-chip"><i class="fas ${ic}"></i> ${esc(txt)}</span>`:'';
    const toolCard = t=>`<div class="cs-side-tool"><div class="cs-side-tool-ic">${t.logo_url?`<img src="${esc(t.logo_url)}">`:'<i class="fas fa-wrench"></i>'}</div>
      <div class="cs-side-tool-b"><div class="cs-side-tool-n">${esc(t.name)}</div><div class="cs-side-tool-v">${esc(t.version||'')}</div></div>
      ${t.website_url?`<a class="cs-side-btn" href="${esc(t.website_url)}" target="_blank" rel="noopener">ABRIR</a>`:''}</div>`;
    const fileRow = f=>`<a class="cs-side-file" ${f.file_url?`href="${esc(f.file_url)}" target="_blank" rel="noopener"`:''}>
      <i class="fas fa-file-arrow-down"></i><div><div class="cs-side-file-n">${esc(f.name)}${f.is_vip?' <i class="fas fa-crown" style="color:#e0a23a"></i>':''}</div>
      <div class="cs-side-file-m">${esc(f.version||'')}${f.size_bytes?' · '+fmtBytes(f.size_bytes):''}</div></div></a>`;

    host.innerHTML = `
    <div class="cs-gd-crumb"><a href="#/dashboard">Central Space</a>${cat?` / <a href="#/c/${esc(cat.slug)}">${esc(cat.name)}</a>`:''} / ${esc(g.title)}</div>
    <div class="cs-gd">
      <div class="cs-gd-main">
        <div class="cs-gd-head">
          <div class="cs-gd-head-txt">
            <h1 class="cs-gd-title">${esc(g.title)}</h1>
            <div class="cs-gd-chips">
              ${chip('fa-mobile-screen', brand?brand.name:'')}${device?chip('fa-microchip', device.os_version?('Android '+device.os_version):''):''}
              ${chip('fa-signal', diffLabel(g.difficulty))}${g.method?chip('fa-screwdriver-wrench', g.method):''}
              <span class="cs-gd-chip"><i class="fas fa-eye"></i> ${g.views||0}</span>
              ${ratings.length?`<span class="cs-gd-chip cs-gd-stars">${starRow(avg)} ${avg.toFixed(1)} (${ratings.length})</span>`:''}
              ${g.is_vip?'<span class="cs-gd-chip vip"><i class="fas fa-crown"></i> VIP</span>':''}
            </div>
          </div>
          ${g.cover_url?`<div class="cs-gd-cover"><img src="${esc(g.cover_url)}" alt="${esc(g.title)}"></div>`:''}
        </div>

        <div class="cs-gd-tabs">
          <button class="cs-gd-tab on" data-tab="guia" onclick="csGuideTab('guia',this)">GUÍA</button>
          <button class="cs-gd-tab" data-tab="req" onclick="csGuideTab('req',this)">REQUISITOS</button>
          <button class="cs-gd-tab" data-tab="tools" onclick="csGuideTab('tools',this)">HERRAMIENTAS</button>
          <button class="cs-gd-tab" data-tab="files" onclick="csGuideTab('files',this)">ARCHIVOS</button>
          <button class="cs-gd-tab" data-tab="com" onclick="csGuideTab('com',this)">COMENTARIOS (${comments.length})</button>
        </div>

        <div class="cs-gd-panel on" data-panel="guia">
          ${g.summary?`<div class="cs-gd-sec">DESCRIPCIÓN</div><p class="cs-gd-desc">${esc(g.summary)}</p>`:''}
          ${g.warning?`<div class="cs-gd-warn"><i class="fas fa-triangle-exclamation"></i> ${esc(g.warning)}</div>`:''}
          <div class="cs-gd-sec">PROCEDIMIENTO PASO A PASO</div>
          <div class="cs-steps">${steps.length? steps.map((s,i)=>`
            <div class="cs-step"><div class="cs-step-n">${i+1}</div>
              <div class="cs-step-b">${s.title?`<div class="cs-step-t">${esc(s.title)}</div>`:''}
              ${s.content?`<div class="cs-step-c">${esc(s.content)}</div>`:''}
              ${s.image?`<img class="cs-step-img" src="${esc(s.image)}" alt="">`:''}</div></div>`).join('')
            : '<p class="cs-gd-desc">Esta guía todavía no tiene pasos cargados.</p>'}</div>
        </div>

        <div class="cs-gd-panel" data-panel="req">
          <div class="cs-gd-sec">REQUISITOS PREVIOS</div>
          <ul class="cs-req-list">${reqs.length? reqs.map(r=>`<li><i class="fas fa-check"></i> ${esc(r)}</li>`).join('') : '<li>Sin requisitos específicos.</li>'}</ul>
        </div>

        <div class="cs-gd-panel" data-panel="tools">
          <div class="cs-gd-sec">HERRAMIENTAS DE ESTA GUÍA</div>
          ${tools.length? tools.map(toolCard).join('') : '<p class="cs-gd-desc">No hay herramientas asociadas.</p>'}
        </div>

        <div class="cs-gd-panel" data-panel="files">
          <div class="cs-gd-sec">ARCHIVOS</div>
          ${files.length? files.map(fileRow).join('') : '<p class="cs-gd-desc">No hay archivos para esta guía.</p>'}
        </div>

        <div class="cs-gd-panel" data-panel="com">
          <div class="cs-gd-sec">COMENTARIOS (${comments.length})</div>
          ${comments.length? comments.map(c=>`<div class="cs-com"><div class="cs-com-b">${esc(c.body||'')}</div>
            <div class="cs-com-m">${new Date(c.created_at).toLocaleDateString('es-AR')} · <i class="fas fa-thumbs-up"></i> ${c.likes||0}</div></div>`).join('')
            : '<p class="cs-gd-desc">Todavía no hay comentarios.</p>'}
        </div>
      </div>

      <aside class="cs-gd-aside">
        ${tools.length?`<div class="cs-side-card"><div class="cs-side-h">HERRAMIENTAS RECOMENDADAS</div>${tools.map(toolCard).join('')}</div>`:''}
        ${files.length?`<div class="cs-side-card"><div class="cs-side-h">ARCHIVOS DISPONIBLES</div>${files.map(fileRow).join('')}</div>`:''}
        ${device?`<div class="cs-side-card"><div class="cs-side-h">INFORMACIÓN DEL DISPOSITIVO</div>
          <dl class="cs-side-info">
            ${brand?`<div><dt>Marca</dt><dd>${esc(brand.name)}</dd></div>`:''}
            <div><dt>Modelo</dt><dd>${esc(device.name||'')}</dd></div>
            ${device.model_code?`<div><dt>Modelo exacto</dt><dd>${esc(device.model_code)}</dd></div>`:''}
            ${device.os_version?`<div><dt>Android</dt><dd>${esc(device.os_version)}</dd></div>`:''}
            ${device.chipset?`<div><dt>Chipset</dt><dd>${esc(device.chipset)}</dd></div>`:''}
            ${device.security_patch?`<div><dt>Seguridad</dt><dd>${esc(device.security_patch)}</dd></div>`:''}
            <div><dt>Dificultad</dt><dd>${diffLabel(g.difficulty)}</dd></div>
          </dl></div>`:''}
        <div class="cs-side-card cs-side-help"><div class="cs-side-h">¿Necesitás ayuda?</div>
          <p>Si tenés problemas con esta guía, abrí un ticket y nuestro equipo te ayuda.</p>
          <a class="cs-side-cta" href="#/chat">ABRIR TICKET</a></div>
        ${related.length?`<div class="cs-side-card"><div class="cs-side-h">TUTORIALES RELACIONADOS</div>
          ${related.map(r=>`<a class="cs-side-rel" href="#/g/${esc(r.slug)}"><i class="fas fa-book"></i> ${esc(r.title)}</a>`).join('')}</div>`:''}
      </aside>
    </div>`;

    // vistas: best-effort (solo admin puede por RLS; ignora error)
    try { supabase.from('cs_guides').update({ views: (g.views||0)+1 }).eq('id', g.id).then(()=>{}, ()=>{}); } catch(e){}
  } catch(e){ console.error(e); viewSoon('No se pudo cargar la guía', e.message || 'Error'); }
}

window.csGuideTab = function(name, btn){
  document.querySelectorAll('.cs-gd-tab').forEach(t=>t.classList.toggle('on', t===btn));
  document.querySelectorAll('.cs-gd-panel').forEach(p=>p.classList.toggle('on', p.dataset.panel===name));
};

function injectGuideCss(){
  if (document.getElementById('cs-guide-detail-css')) return;
  const s = document.createElement('style'); s.id='cs-guide-detail-css';
  s.textContent = `
  .cs-gd-crumb{color:var(--cs-muted);font-size:13px;margin:0 0 14px;}
  .cs-gd-crumb a{color:var(--orange);text-decoration:none;}
  .cs-gd{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start;}
  .cs-gd-main{min-width:0;}
  .cs-gd-head{display:flex;gap:18px;justify-content:space-between;background:var(--cs-panel);border:1px solid var(--cs-line);border-radius:16px;padding:22px;}
  .cs-gd-title{font-family:'Space Grotesk',sans-serif;color:#fff;font-size:26px;margin:0 0 12px;line-height:1.15;}
  .cs-gd-chips{display:flex;flex-wrap:wrap;gap:8px;}
  .cs-gd-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);border:1px solid var(--cs-line-soft);color:#ddd;font-size:12px;padding:6px 10px;border-radius:8px;}
  .cs-gd-chip.vip{background:rgba(224,162,58,.12);border-color:rgba(224,162,58,.4);color:#e0a23a;}
  .cs-gd-stars{color:#e0a23a;}
  .cs-gd-cover{flex-shrink:0;width:150px;border-radius:12px;overflow:hidden;align-self:flex-start;}
  .cs-gd-cover img{width:100%;display:block;}
  .cs-gd-tabs{display:flex;gap:4px;flex-wrap:wrap;margin:20px 0 0;border-bottom:1px solid var(--cs-line-soft);}
  .cs-gd-tab{background:none;border:none;color:var(--cs-muted);font-weight:700;font-size:12.5px;letter-spacing:.4px;padding:12px 14px;cursor:pointer;border-bottom:2px solid transparent;}
  .cs-gd-tab.on{color:var(--orange);border-bottom-color:var(--orange);}
  .cs-gd-panel{display:none;padding:20px 2px;}
  .cs-gd-panel.on{display:block;}
  .cs-gd-sec{color:var(--orange);font-size:12px;font-weight:800;letter-spacing:.6px;margin:6px 0 12px;}
  .cs-gd-desc{color:#ccc;font-size:14.5px;line-height:1.6;margin:0 0 14px;}
  .cs-gd-warn{display:flex;gap:10px;align-items:flex-start;background:rgba(255,106,0,.08);border:1px solid var(--cs-line);border-radius:12px;padding:13px 15px;color:#ffd0a8;font-size:13.5px;margin:0 0 18px;}
  .cs-steps{display:flex;flex-direction:column;gap:14px;}
  .cs-step{display:flex;gap:14px;background:var(--cs-panel);border:1px solid var(--cs-line-soft);border-radius:14px;padding:16px;}
  .cs-step-n{flex-shrink:0;width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--orange),#ff8533);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;}
  .cs-step-t{color:#fff;font-weight:700;font-size:15px;margin-bottom:6px;}
  .cs-step-c{color:#cfcfcf;font-size:14px;line-height:1.55;white-space:pre-line;}
  .cs-step-img{max-width:100%;border-radius:10px;margin-top:10px;}
  .cs-req-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;}
  .cs-req-list li{color:#ddd;font-size:14px;display:flex;gap:9px;align-items:center;}
  .cs-req-list li i{color:var(--cs-green);}
  .cs-com{border-bottom:1px solid var(--cs-line-soft);padding:12px 0;}
  .cs-com-b{color:#ddd;font-size:14px;}
  .cs-com-m{color:var(--cs-muted);font-size:12px;margin-top:5px;}
  .cs-gd-aside{display:flex;flex-direction:column;gap:16px;}
  .cs-side-card{background:var(--cs-panel);border:1px solid var(--cs-line-soft);border-radius:14px;padding:16px;}
  .cs-side-h{color:#fff;font-size:12px;font-weight:800;letter-spacing:.5px;margin-bottom:12px;}
  .cs-side-tool{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--cs-line-soft);}
  .cs-side-tool:last-child{border-bottom:none;}
  .cs-side-tool-ic{width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--orange);}
  .cs-side-tool-ic img{width:100%;height:100%;object-fit:cover;}
  .cs-side-tool-b{flex:1;min-width:0;}
  .cs-side-tool-n{color:#eee;font-size:13.5px;font-weight:600;}
  .cs-side-tool-v{color:var(--cs-muted);font-size:11.5px;}
  .cs-side-btn,.cs-side-cta{background:linear-gradient(135deg,var(--orange),#ff8533);color:#fff;font-size:11.5px;font-weight:700;padding:6px 12px;border-radius:7px;text-decoration:none;}
  .cs-side-file{display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--cs-line-soft);text-decoration:none;color:inherit;}
  .cs-side-file:last-child{border-bottom:none;}
  .cs-side-file i{color:var(--orange);}
  .cs-side-file-n{color:#eee;font-size:13px;}
  .cs-side-file-m{color:var(--cs-muted);font-size:11.5px;}
  .cs-side-info{margin:0;}
  .cs-side-info>div{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--cs-line-soft);}
  .cs-side-info>div:last-child{border-bottom:none;}
  .cs-side-info dt{color:var(--cs-muted);font-size:12.5px;margin:0;}
  .cs-side-info dd{color:#eee;font-size:12.5px;margin:0;text-align:right;}
  .cs-side-help p{color:var(--cs-muted);font-size:13px;line-height:1.5;margin:0 0 12px;}
  .cs-side-cta{display:inline-block;text-align:center;width:100%;padding:11px;border-radius:10px;}
  .cs-side-rel{display:flex;gap:9px;align-items:center;color:#ddd;font-size:13px;text-decoration:none;padding:8px 0;border-bottom:1px solid var(--cs-line-soft);}
  .cs-side-rel:last-child{border-bottom:none;}
  .cs-side-rel i{color:var(--orange);}
  .cs-gd-cat-title{font-family:'Space Grotesk',sans-serif;color:#fff;font-size:26px;margin:0 0 18px;}
  @media (max-width:900px){ .cs-gd{grid-template-columns:1fr;} .cs-gd-cover{width:110px;} }`;
  document.head.appendChild(s);
}

/* ---------- Router ---------- */
function router(){
  const hash = (window.location.hash || '#/dashboard').replace(/^#\//,'');
  const [seg, param] = hash.split('/');
  closeSidebar();

  const app = $('csApp');
  if (app && !app.hidden){
    const top = app.getBoundingClientRect().top + window.scrollY - 100;
    if (window.scrollY > top) window.scrollTo({ top, behavior:'smooth' });
  }

  if (seg === 'dashboard' || seg === ''){ markActive('dashboard'); viewDashboard(); }
  else if (seg === 'c'){ markActive('c/' + param); viewCategory(param); }
  else if (seg === 'g')   viewGuide(param);
  else if (seg === 'vip') viewSoon('Cell Space VIP Tech', 'Los planes VIP se habilitan más adelante.');
  else if (seg === 'chat')viewSoon('Chat Técnico', 'El chat en vivo llega más adelante.');
  else viewSoon('No encontramos esa sección', 'Volvé al dashboard desde el menú.');
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
  syncHeaderOffset();
  paintCartCount();
  window.addEventListener('resize', syncHeaderOffset);

  const hs = $('headerSearchInput');
  if (hs) hs.addEventListener('keydown', e => {
    if (e.key === 'Enter'){ e.preventDefault(); performHeaderSearch(); }
  });

  if (typeof supabase === 'undefined'){
    gateMessage('fa-plug-circle-xmark','Error de conexión',
      'No se pudo iniciar la conexión con el servidor.','');
    return;
  }

  const ok = await checkAccess();
  if (!ok){ syncHeaderOffset(); return; }

  $('csGate').hidden = true;
  $('csApp').hidden = false;
  syncHeaderOffset();

  await loadMenu();
  router();

  window.addEventListener('hashchange', router);
  $('csBurger').addEventListener('click', openSidebar);
  $('csSideClose').addEventListener('click', closeSidebar);
  $('csBackdrop').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });

  $('csSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter'){
      const q = e.target.value.trim();
      if (q) viewSoon('Búsqueda', `El buscador se activa cuando haya contenido cargado. Buscaste: "${q}"`);
    }
  });
});
