/* =========================================================
   CELL SPACE · CMS → SITIO PÚBLICO  (12.A + footer dinámico 12.D)
   Conecta la configuración del panel SIN tocar el diseño.
   Todo con fallback: si falla o falta un dato, el sitio queda igual.
   ========================================================= */
(function () {
  'use strict';
  if (location.pathname.indexOf('/admin') !== -1) return; // el admin nunca carga esto

  var SUPABASE_URL = 'https://cfoajkbzsqyimbfjhfsa.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_PO6r84B1ZNAwFXZAQ_pVfQ_7Ij3qRpS';
  var DEFAULTS = { color_primary:'#FF6A00', color_secondary:'#ff8533', font_family:'Montserrat', border_radius:'12', whatsapp:'5493782437674', maintenance_mode:false };

  function getClient(){
    try {
      var sb = window.supabase;
      if (sb && typeof sb.createClient === 'function') return sb.createClient(SUPABASE_URL, SUPABASE_ANON);
      if (sb && typeof sb.from === 'function') return sb;
    } catch (e) {}
    return null;
  }
  function isHome(){ var p = location.pathname.replace(/\/+$/, ''); return p === '' || /\/index\.html?$/.test(p); }

  function applyAppearance(cfg){
    var root = document.documentElement;
    var setIf = function (v, val, def){ if (val && val.toLowerCase() !== def.toLowerCase()) root.style.setProperty(v, val); };
    root.style.transition = 'background-color .4s ease, color .4s ease';
    setIf('--orange', cfg.color_primary, DEFAULTS.color_primary);
    setIf('--orange-hover', cfg.color_secondary, DEFAULTS.color_secondary);
    setIf('--cs-radius', (cfg.border_radius || DEFAULTS.border_radius) + 'px', DEFAULTS.border_radius + 'px');
    if (cfg.font_family && cfg.font_family.toLowerCase() !== DEFAULTS.font_family.toLowerCase()) { loadGoogleFont(cfg.font_family); document.body.style.fontFamily = "'" + cfg.font_family + "', sans-serif"; }
  }
  function loadGoogleFont(family){
    if (document.querySelector('link[data-cms-font="' + family + '"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.setAttribute('data-cms-font', family);
    l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family) + ':wght@300;400;500;600;700;800;900&display=swap';
    document.head.appendChild(l);
  }
  function applyFavicon(url){ if (!url) return; var l = document.querySelector("link[rel*='icon']"); if (!l){ l=document.createElement('link'); l.rel='icon'; document.head.appendChild(l);} l.href = url; }
  function applySEO(cfg){
    if (!isHome()) return;
    if (cfg.meta_title) document.title = cfg.meta_title;
    if (cfg.meta_description) upsertMeta('description', cfg.meta_description);
    if (cfg.meta_keywords) upsertMeta('keywords', cfg.meta_keywords);
    if (cfg.og_image) { upsertMeta('og:image', cfg.og_image, true); upsertMeta('twitter:image', cfg.og_image, true); }
  }
  function upsertMeta(name, content, isProp){ var attr = isProp ? 'property' : 'name'; var m = document.querySelector('meta[' + attr + '="' + name + '"]'); if (!m){ m=document.createElement('meta'); m.setAttribute(attr,name); document.head.appendChild(m);} m.setAttribute('content', content); }

  function applyMaintenance(cfg){
    if (!cfg.maintenance_mode) return;
    var wa = (cfg.whatsapp || DEFAULTS.whatsapp).replace(/[^0-9]/g, '');
    var msg = cfg.maintenance_message || 'Estamos realizando mejoras. Volvemos en unos minutos.';
    var o = document.createElement('div'); o.className = 'cs-maintenance';
    o.innerHTML =
      '<div class="cs-maint-grid" aria-hidden="true"></div><div class="cs-maint-scan" aria-hidden="true"></div>'+
      '<div class="cs-maint-inner">'+
        '<img src="assets/logo.png" alt="Cell Space" class="cs-maint-logo" onerror="this.style.display=\'none\'">'+
        '<span class="cs-maint-kicker">CELL SPACE · SISTEMA</span>'+
        '<h1 class="cs-maint-title">EN<br>MANTENIMIENTO</h1>'+
        '<p class="cs-maint-msg">' + escapeHtml(msg) + '</p>'+
        '<div class="cs-maint-dots" aria-hidden="true"><span></span><span></span><span></span></div>'+
        '<a class="cs-maint-wa" href="https://wa.me/' + wa + '" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> Mientras tanto, escribinos por WhatsApp</a>'+
      '</div>';
    document.documentElement.appendChild(o); document.body.style.overflow = 'hidden';
  }

  function normUrl(val, base){
    if (!val) return '';
    var v = String(val).trim();
    if (/^https?:\/\//i.test(v)) return v;
    if (v.charAt(0) === '@') v = v.slice(1);
    return base + v;
  }
  function applyFooter(cfg){
    var map = {
      'fa-instagram': normUrl(cfg.instagram, 'https://instagram.com/'),
      'fa-facebook':  normUrl(cfg.facebook,  'https://facebook.com/'),
      'fa-youtube':   normUrl(cfg.youtube,   'https://youtube.com/'),
      'fa-tiktok':    normUrl(cfg.tiktok,    'https://tiktok.com/@'),
      'fa-telegram':  normUrl(cfg.telegram,  'https://t.me/')
    };
    document.querySelectorAll('.footer-brand .social-links a').forEach(function (a) {
      var i = a.querySelector('i'); if (!i) return;
      for (var cls in map) {
        if (i.classList.contains(cls) && map[cls]) {
          a.href = map[cls]; a.target = '_blank'; a.rel = 'noopener'; break;
        }
      }
    });
    var wa = cfg.whatsapp ? ('+54 9 ' + String(cfg.whatsapp).replace(/^549?/, '').replace(/(\d{4})(\d{6})/, '$1 $2')) : '';
    var contactMap = { 'fa-whatsapp': wa, 'fa-envelope': cfg.email, 'fa-map-marker-alt': cfg.address };
    document.querySelectorAll('.footer-col .contact-info li').forEach(function (li) {
      var i = li.querySelector('i'); if (!i) return;
      for (var cls in contactMap) {
        if (i.classList.contains(cls) && contactMap[cls]) {
          li.innerHTML = i.outerHTML + ' ' + escapeHtml(contactMap[cls]); break;
        }
      }
    });
  }

  function escapeHtml(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function (c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }

  function applyAll(cfg){
    window.CMS_CONFIG = cfg;
    try { applyAppearance(cfg); } catch (e) {}
    try { applyFavicon(cfg.favicon_url); } catch (e) {}
    try { applySEO(cfg); } catch (e) {}
    try { applyFooter(cfg); } catch (e) {}
    try { applyMaintenance(cfg); } catch (e) {}
    document.dispatchEvent(new CustomEvent('cms:config', { detail: cfg }));
  }

  function boot(){
    var client = getClient();
    if (!client) { console.warn('[CMS] Supabase no disponible → sitio estático.'); return; }
    client.from('site_settings').select('*').eq('id', 'default').maybeSingle()
      .then(function (res) { if (res && res.data) applyAll(res.data); })
      .catch(function (err) { console.warn('[CMS] No se cargó la config → sitio estático.', err && err.message); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
