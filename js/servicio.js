// ========================================
// FICHA DE SERVICIO · pública (12.C)
// ========================================
(function () {
  'use strict';
  var S = null, gallery = [], activeImg = 0;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function money(n){ n=Number(n)||0; return (n%1===0)? n.toLocaleString('es-AR') : n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function getParam(k){ return new URLSearchParams(location.search).get(k); }
  function waNumber(){ return (window.CMS_CONFIG&&window.CMS_CONFIG.whatsapp?String(window.CMS_CONFIG.whatsapp).replace(/[^0-9]/g,''):'5493782437674'); }
  function ytId(url){ if(!url) return ''; var m=String(url).match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/); return m? m[1] : ''; }

  function boot(){
    var id = getParam('id');
    if (!id) { notFound('No se indicó un servicio.'); return; }
    if (typeof supabase === 'undefined' || !supabase) { notFound('No se pudo conectar con el catálogo.'); return; }
    supabase.from('services').select('*').eq('id', id).maybeSingle().then(function (res) {
      if (res.error) { console.error(res.error); notFound('Error al cargar el servicio.'); return; }
      if (!res.data) { notFound('Este servicio no está disponible.'); return; }
      S = res.data;
      if (S.is_visible === false || S.status === 'draft') { notFound('Este servicio no está disponible.'); return; }
      gallery = (Array.isArray(S.gallery) && S.gallery.length) ? S.gallery.slice() : (S.image_url ? [S.image_url] : []);
      document.title = (S.title || 'Servicio') + ' | Cell Space Argentina';
      render(); wire(); revealInit(); loadAlso();
    }).catch(function (e) { console.error(e); notFound('No se pudo cargar el servicio.'); });
  }

  function notFound(msg){
    document.getElementById('svRoot').innerHTML = '<div class="sv-empty"><i class="fas fa-screwdriver-wrench"></i><h2>'+esc(msg)+'</h2><a href="servicios.html" class="sv-btn-call" style="display:inline-flex;width:auto;"><i class="fas fa-arrow-left"></i> Volver a servicios</a></div>';
  }

  function render(){
    var g = gallery;
    document.getElementById('svCrumb').textContent = S.service_type || S.title || 'Servicio';
    var mainImg = g[activeImg] || '';
    var thumbs = g.length > 1 ? '<div class="sv-thumbs" id="svThumbs">' + g.map(function (u, i) { return '<button class="sv-thumb '+(i===activeImg?'on':'')+'" data-i="'+i+'"><img src="'+esc(u)+'" alt=""></button>'; }).join('') + '</div>' : '';

    var video = '';
    var vid = ytId(S.video_url);
    if (vid) {
      video = '<div class="sv-video" id="svVideo" data-vid="'+vid+'">'+
        '<img src="https://i.ytimg.com/vi/'+vid+'/hqdefault.jpg" alt="Video" onerror="this.src=\'https://i.ytimg.com/vi/'+vid+'/default.jpg\'">'+
        '<div class="sv-vplay"><span><i class="fas fa-play"></i></span></div></div>';
    }

    var stage = mainImg
      ? '<div class="sv-stage" id="svStage"><img id="svMainImg" src="'+esc(mainImg)+'" alt="'+esc(S.title)+'"><span class="sv-zoom-hint"><i class="fas fa-magnifying-glass-plus"></i></span></div>'
      : '<div class="sv-stage" style="cursor:default;"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#3a3a3a;font-size:60px;"><i class="fas fa-screwdriver-wrench"></i></div></div>';

    var submeta = [S.brand, S.model].filter(Boolean).map(esc);
    var submetaHtml = submeta.length ? '<div class="sv-submeta">'+submeta.join('<span class="dot"></span>')+'</div>' : '';

    var priceHtml = (S.price == null || S.price === '')
      ? '<div class="sv-price consult">Consultar precio</div><div class="sv-price-note">Coordiná el presupuesto por WhatsApp sin compromiso.</div>'
      : (S.is_price_from ? '<div class="sv-from">Desde</div>' : '') + '<div class="sv-price">$'+money(S.price)+'</div><div class="sv-price-note">Precio orientativo · el final depende del diagnóstico.</div>';

    var desc = S.description ? '<div class="sv-desc">'+S.description+'</div>' : '<p class="sv-muted">Sin descripción cargada. Escribinos y te contamos los detalles del servicio.</p>';

    document.getElementById('svRoot').innerHTML =
    '<section class="sv-top">'+
      '<div class="sv-media">'+ stage + thumbs + video +'</div>'+
      '<div class="sv-info">'+
        (S.service_type? '<span class="sv-type"><i class="fas fa-screwdriver-wrench"></i> '+esc(S.service_type)+'</span>' : '')+
        '<h1 class="sv-title">'+esc(S.title)+'</h1>'+
        submetaHtml+
        '<div class="sv-pricebox">'+priceHtml+'</div>'+
        '<div class="sv-cta">'+
          '<a href="#" class="sv-btn-wa" id="svWa"><i class="fab fa-whatsapp"></i> Solicitar por WhatsApp</a>'+
          '<a href="tel:+5493782437674" class="sv-btn-call"><i class="fas fa-phone"></i> Llamar al taller</a>'+
        '</div>'+
        '<div class="sv-perks">'+
          '<div class="sv-perk"><i class="fas fa-shield-halved"></i><span>Garantía escrita</span></div>'+
          '<div class="sv-perk"><i class="fas fa-bolt"></i><span>Diagnóstico express</span></div>'+
          '<div class="sv-perk"><i class="fas fa-tools"></i><span>Repuestos de calidad</span></div>'+
        '</div>'+
      '</div>'+
    '</section>'+

    '<section class="sv-tabs" data-reveal>'+
      '<div class="sv-tabbar" id="svTabbar">'+
        '<button class="sv-tab on" data-tab="desc">Descripción</button>'+
        '<button class="sv-tab" data-tab="ship">Cómo trabajamos</button>'+
      '</div>'+
      '<div class="sv-panel on" data-panel="desc">'+desc+'</div>'+
      '<div class="sv-panel" data-panel="ship">'+
        '<ul class="sv-ship-list">'+
          '<li><i class="fas fa-hand-holding"></i><div><strong>1 · Recepción y diagnóstico</strong><span>Recibimos tu equipo y revisamos a fondo antes de presupuestar.</span></div></li>'+
          '<li><i class="fas fa-file-invoice-dollar"></i><div><strong>2 · Presupuesto sin cargo</strong><span>Te pasamos precio y tiempos. Vos decidís, sin compromiso.</span></div></li>'+
          '<li><i class="fas fa-screwdriver-wrench"></i><div><strong>3 · Reparación</strong><span>Herramientas profesionales y repuestos de primera.</span></div></li>'+
          '<li><i class="fas fa-circle-check"></i><div><strong>4 · Pruebas y entrega</strong><span>Probamos todo y entregamos con garantía escrita.</span></div></li>'+
        '</ul>'+
      '</div>'+
    '</section>'+

    '<section class="sv-also" id="svAlso" data-reveal style="display:none;"></section>';

    var wa = document.getElementById('svWa');
    if (wa) wa.addEventListener('click', function (e) { e.preventDefault(); askWhatsApp(); });
  }

  function wire(){
    var root = document.getElementById('svRoot');
    root.addEventListener('click', function (e) {
      var th = e.target.closest('.sv-thumb'); if (th) { setImg(Number(th.dataset.i)); return; }
      var tab = e.target.closest('.sv-tab'); if (tab) { switchTab(tab.dataset.tab); return; }
    });
    var stage = document.getElementById('svStage');
    if (stage && gallery[activeImg]) stage.addEventListener('click', function () { openLightbox(gallery[activeImg]); });
    var video = document.getElementById('svVideo');
    if (video) video.addEventListener('click', function () {
      var vid = video.dataset.vid;
      video.innerHTML = '<iframe src="https://www.youtube.com/embed/'+vid+'?autoplay=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
    });
    document.getElementById('svLbClose').addEventListener('click', closeLightbox);
    document.getElementById('svLightbox').addEventListener('click', function (e) { if (e.target.id === 'svLightbox') closeLightbox(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });
  }

  function setImg(i){ activeImg = i; var m = document.getElementById('svMainImg'); if (m) m.src = gallery[i];
    document.querySelectorAll('.sv-thumb').forEach(function (t) { t.classList.toggle('on', Number(t.dataset.i) === i); }); }
  function switchTab(name){
    document.querySelectorAll('.sv-tab').forEach(function (t) { t.classList.toggle('on', t.dataset.tab === name); });
    document.querySelectorAll('.sv-panel').forEach(function (p) { p.classList.toggle('on', p.dataset.panel === name); });
  }
  function openLightbox(url){ document.getElementById('svLbImg').src = url; document.getElementById('svLightbox').classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeLightbox(){ document.getElementById('svLightbox').classList.remove('open'); document.body.style.overflow = ''; }

  function askWhatsApp(){
    var msg = '¡Hola! Quiero consultar por este servicio:\n\n• ' + (S.title || '') +
      (S.service_type ? '\n• Tipo: ' + S.service_type : '') +
      ([S.brand, S.model].filter(Boolean).length ? '\n• Equipo: ' + [S.brand, S.model].filter(Boolean).join(' ') : '') +
      (S.price != null && S.price !== '' ? '\n• Precio orientativo: $' + money(S.price) : '') +
      '\n\n¿Disponibilidad y turno?';
    window.open('https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(msg), '_blank');
  }

  /* también ofrecemos */
  function loadAlso(){
    supabase.from('services').select('*').neq('id', S.id).eq('is_visible', true).neq('status', 'draft').order('created_at', { ascending: false }).limit(3)
      .then(function (r) {
        var list = (r.data || []);
        if (!list.length) return;
        var box = document.getElementById('svAlso');
        box.style.display = '';
        box.innerHTML = '<h3 class="sv-also-h">También ofrecemos</h3><div class="sv-also-grid">' + list.map(function (s) {
          var img = (Array.isArray(s.gallery) && s.gallery[0]) || s.image_url || '';
          var m = img ? '<img src="'+esc(img)+'" alt="'+esc(s.title)+'" loading="lazy">' : '<div class="no"><i class="fas fa-screwdriver-wrench"></i></div>';
          var p = (s.price != null && s.price !== '') ? (s.is_price_from ? 'Desde $' : '$') + money(s.price) : 'Consultar';
          return '<a class="sv-also-card" href="servicio.html?id='+esc(s.id)+'"><div class="m">'+m+'</div><div class="b"><p class="t">'+esc(s.title)+'</p><span class="p">'+esc(p)+'</span></div></a>';
        }).join('') + '</div>';
      }).catch(function () {});
  }

  function revealInit(){
    var els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: .12 });
    els.forEach(function (e) { io.observe(e); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
