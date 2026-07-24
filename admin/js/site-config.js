/* =========================================================
   CELL SPACE · CMS → SITIO PÚBLICO  (capa 12.A)
   Conecta la configuración del panel con el sitio SIN tocar
   el diseño. Todo con fallback: si falla, el sitio queda igual.
   ========================================================= */
(function () {
  'use strict';

  // No correr dentro del panel (el panel ya tiene su propia lógica)
  if (location.pathname.indexOf('/admin') !== -1) return;

  // Tus credenciales PÚBLICAS (las mismas que en js/config.js; son públicas por diseño)
  var SUPABASE_URL = 'https://cfoajkbzsqyimbfjhfsa.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_PO6r84B1ZNAwFXZAQ_pVfQ_7Ij3qRpS';

  // Defaults = lo que tu sitio YA usa hoy. Si la DB trae estos mismos,
  // NO tocamos nada → el diseño queda idéntico.
  var DEFAULTS = {
    color_primary: '#FF6A00',
    color_secondary: '#ff8533',
    font_family: 'Montserrat',
    border_radius: '12',
    whatsapp: '5493782437674',
    maintenance_mode: false
  };

  // ---- Cliente Supabase a prueba de orden/estilo de config.js ----
  function getClient() {
    try {
      var sb = window.supabase;
      if (sb && typeof sb.createClient === 'function') return sb.createClient(SUPABASE_URL, SUPABASE_ANON); // SDK intacto
      if (sb && typeof sb.from === 'function') return sb; // config.js ya dejó un cliente en window.supabase
      if (window.__cmsSupabase) return window.__cmsSupabase;
    } catch (e) { /* noop */ }
    return null;
  }

  function isHome() {
    var p = location.pathname.replace(/\/+$/, '');
    return p === '' || /\/index\.html?$/.test(p);
  }

  // ---- 1) Colores / fuentes / bordes como variables CSS ----
  function applyAppearance(cfg) {
    var root = document.documentElement;
    var setIfChanged = function (varName, value, def) {
      if (value && value.toLowerCase() !== def.toLowerCase()) {
        root.style.setProperty(varName, value);
      }
    };
    // Transición suave al aplicar (no rompe, solo se siente vivo)
    root.style.transition = 'background-color .4s ease, color .4s ease';
    setIfChanged('--orange', cfg.color_primary, DEFAULTS.color_primary);
    setIfChanged('--orange-hover', cfg.color_secondary, DEFAULTS.color_secondary);
    setIfChanged('--cs-radius', (cfg.border_radius || DEFAULTS.border_radius) + 'px', DEFAULTS.border_radius + 'px');
    if (cfg.font_family && cfg.font_family.toLowerCase() !== DEFAULTS.font_family.toLowerCase()) {
      // Carga la fuente de Google si no está y la aplica al body
      loadGoogleFont(cfg.font_family);
      document.body.style.fontFamily = "'" + cfg.font_family + "', sans-serif";
    }
  }

  function loadGoogleFont(family) {
    if (document.querySelector('link[data-cms-font="' + family + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.setAttribute('data-cms-font', family);
    l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family) + ':wght@300;400;500;600;700;800;900&display=swap';
    document.head.appendChild(l);
  }

  // ---- 2) Favicon dinámico ----
  function applyFavicon(url) {
    if (!url) return;
    var link = document.querySelector("link[rel*='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = url;
  }

  // ---- 3) SEO global (solo home) ----
  function applySEO(cfg) {
    if (!isHome()) return;
    if (cfg.meta_title) document.title = cfg.meta_title;
    if (cfg.meta_description) upsertMeta('description', cfg.meta_description);
    if (cfg.meta_keywords) upsertMeta('keywords', cfg.meta_keywords);
    if (cfg.og_image) { upsertMeta('og:image', cfg.og_image, true); upsertMeta('twitter:image', cfg.og_image, true); }
  }
  function upsertMeta(name, content, isProp) {
    var attr = isProp ? 'property' : 'name';
    var m = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute(attr, name); document.head.appendChild(m); }
    m.setAttribute('content', content);
  }

  // ---- 4) Modo mantenimiento ----
  function applyMaintenance(cfg) {
    if (!cfg.maintenance_mode) return;
    // Deja pasar al panel por si necesitás entrar a desactivarlo
    if (location.pathname.indexOf('/admin') !== -1) return;
    var wa = (cfg.whatsapp || DEFAULTS.whatsapp).replace(/[^0-9]/g, '');
    var msg = cfg.maintenance_message || 'Estamos realizando mejoras. Volvemos en unos minutos.';
    var overlay = document.createElement('div');
    overlay.className = 'cs-maintenance';
    overlay.innerHTML =
      '<div class="cs-maint-grid" aria-hidden="true"></div>' +
      '<div class="cs-maint-scan" aria-hidden="true"></div>' +
      '<div class="cs-maint-inner">' +
        '<img src="assets/logo.png" alt="Cell Space" class="cs-maint-logo" onerror="this.style.display=\'none\'">' +
        '<span class="cs-maint-kicker">CELL SPACE · SISTEMA</span>' +
        '<h1 class="cs-maint-title">EN<br>MANTENIMIENTO</h1>' +
        '<p class="cs-maint-msg">' + escapeHtml(msg) + '</p>' +
        '<div class="cs-maint-dots" aria-hidden="true"><span></span><span></span><span></span></div>' +
        '<a class="cs-maint-wa" href="https://wa.me/' + wa + '" target="_blank" rel="noopener">' +
          '<i class="fab fa-whatsapp"></i> Mientras tanto, escribinos por WhatsApp' +
        '</a>' +
      '</div>';
    document.documentElement.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- Orquestador ----
  function applyAll(cfg) {
    window.CMS_CONFIG = cfg; // disponible para 12.B / 12.C / 12.D
    try { applyAppearance(cfg); } catch (e) {}
    try { applyFavicon(cfg.favicon_url); } catch (e) {}
    try { applySEO(cfg); } catch (e) {}
    try { applyMaintenance(cfg); } catch (e) {}
    // Dispara un evento por si 12.B+ quieren reaccionar a la config
    document.dispatchEvent(new CustomEvent('cms:config', { detail: cfg }));
  }

  function boot() {
    var client = getClient();
    if (!client) { console.warn('[CMS] Supabase no disponible → sitio con contenido estático.'); return; }
    client.from('site_settings').select('*').eq('id', 'default').maybeSingle()
      .then(function (res) {
        if (res && res.data) applyAll(res.data);
        // si no hay fila, no hacemos nada → sitio estático (fallback)
      })
      .catch(function (err) { console.warn('[CMS] No se cargó la config → sitio estático.', err && err.message); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
