// ========================================
// SERVICIOS PÚBLICOS · sección CMS (12.C)
// ========================================
(function () {
  'use strict';
  var ALL = [], activeType = '', q = '';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function money(n){ n=Number(n)||0; return (n%1===0)? n.toLocaleString('es-AR') : n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function isVisible(s){ return s.is_visible !== false && s.status !== 'draft'; }
  function gal(s){ return Array.isArray(s.gallery)? s.gallery : (s.image_url?[s.image_url]:[]); }
  function priceHtml(s, big){
    if (s.price == null || s.price === '') return '<span class="'+(big?'svc-price':'svc-card-price')+' consult">Consultar</span>';
    var from = s.is_price_from ? '<span class="from">Desde</span>' : '';
    return '<span class="'+(big?'svc-price':'svc-card-price')+'">'+from+'$'+money(s.price)+'</span>';
  }
  function stripHtml(html){ var d=document.createElement('div'); d.innerHTML=html||''; return (d.textContent||'').trim(); }

  function boot(){
    var root = document.getElementById('svcBody');
    if (!root) return; // no está la sección → no hacemos nada
    if (typeof supabase === 'undefined' || !supabase) { hideSection(); return; }
    supabase.from('services').select('*').order('created_at', { ascending: false }).then(function (r) {
      if (r.error) { console.warn('[CMS] servicios fallback', r.error.message); hideSection(); return; }
      ALL = (r.data || []).filter(isVisible);
      if (!ALL.length) { hideSection(); return; }
      buildChips();
      wire();
      paint();
      reveal();
    }).catch(function (e) { console.warn('[CMS] servicios fallback', e && e.message); hideSection(); });
  }

  function hideSection(){ var sec=document.getElementById('precios'); if(sec) sec.style.display='none'; }

  function buildChips(){
    var types = []; ALL.forEach(function (s) { if (s.service_type && types.indexOf(s.service_type) === -1) types.push(s.service_type); });
    var box = document.getElementById('svcChips'); if (!box || !types.length) { if(box) box.style.display='none'; return; }
    box.innerHTML = '<button class="svc-chip on" data-type="">Todos</button>' +
      types.map(function (t) { return '<button class="svc-chip" data-type="'+esc(t)+'">'+esc(t)+'</button>'; }).join('');
  }

  function filtered(){
    return ALL.filter(function (s) {
      var mt = !activeType || s.service_type === activeType;
      var mq = !q || (s.title||'').toLowerCase().indexOf(q) !== -1 || (s.brand||'').toLowerCase().indexOf(q) !== -1 || (s.model||'').toLowerCase().indexOf(q) !== -1 || (s.service_type||'').toLowerCase().indexOf(q) !== -1;
      return mt && mq;
    });
  }

  function paint(){
    var list = filtered();
    var body = document.getElementById('svcBody');
    var count = document.getElementById('svcCount');
    if (count) count.textContent = list.length + ' servicio(s)';
    if (!list.length) { body.innerHTML = '<div class="svc-empty"><i class="fas fa-screwdriver-wrench"></i><p>No encontramos servicios con ese filtro.</p></div>'; return; }

    var feat = null, rest = list;
    if (!activeType && !q) { feat = list.filter(function (s) { return s.is_featured; })[0] || null; if (feat) rest = list.filter(function (s) { return s.id !== feat.id; }); }

    var html = '';
    if (feat) html += featureCard(feat);
    html += '<div class="svc-grid">' + rest.map(card).join('') + '</div>';
    body.innerHTML = html;
    animateIn(body);
  }

  function featureCard(s){
    var g = gal(s); var img = g[0];
    var media = img
      ? '<img src="'+esc(img)+'" alt="'+esc(s.title)+'" loading="lazy">' + (s.video_url? '<div class="svc-play"><span class="svc-card-go" style="width:54px;height:54px;background:rgba(0,0,0,.55);color:#fff;"><i class="fas fa-play"></i></span></div>' : '')
      : '<div class="svc-noimg" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#3a3a3a;font-size:54px;"><i class="fas fa-screwdriver-wrench"></i></div>';
    var desc = stripHtml(s.description);
    return '<article class="svc-feature" data-id="'+esc(s.id)+'">'+
      '<div class="svc-f-media">'+media+'</div>'+
      '<div class="svc-f-body">'+
        '<span class="svc-tag"><i class="fas fa-star"></i> Destacado'+(s.service_type? ' · '+esc(s.service_type) : '')+'</span>'+
        '<h3 class="svc-f-title">'+esc(s.title)+'</h3>'+
        ((s.brand||s.model)? '<div class="svc-f-meta">'+[esc(s.brand),esc(s.model)].filter(Boolean).join(' · ')+'</div>' : '')+
        (desc? '<p class="svc-f-desc">'+esc(desc)+'</p>' : '')+
        '<div class="svc-f-foot">'+priceHtml(s,true)+'<span class="svc-f-cta">Ver detalle <i class="fas fa-arrow-right"></i></span></div>'+
      '</div></article>';
  }

  function card(s){
    var g = gal(s); var img = g[0];
    var media = img
      ? '<img src="'+esc(img)+'" alt="'+esc(s.title)+'" loading="lazy">'
      : '<div class="svc-noimg"><i class="fas fa-screwdriver-wrench"></i></div>';
    var badges = '<div class="svc-badges">'+(s.is_featured?'<span class="svc-mini-badge feat">Destacado</span>':'')+(s.service_type?'<span class="svc-mini-badge type">'+esc(s.service_type)+'</span>':'')+'</div>';
    var icons = '<div class="svc-card-icons">'+(s.video_url?'<span title="Video"><i class="fas fa-video"></i></span>':'')+(g.length>1?'<span title="'+g.length+' fotos"><i class="fas fa-images"></i></span>':'')+'</div>';
    return '<article class="svc-card" data-id="'+esc(s.id)+'">'+
      '<div class="svc-card-media">'+media+badges+icons+'</div>'+
      '<div class="svc-card-body">'+
        '<h3 class="svc-card-title">'+esc(s.title)+'</h3>'+
        ((s.brand||s.model)? '<div class="svc-card-meta">'+[esc(s.brand),esc(s.model)].filter(Boolean).join(' · ')+'</div>' : '<div class="svc-card-meta">&nbsp;</div>')+
        '<div class="svc-card-foot">'+priceHtml(s,false)+'<span class="svc-card-go"><i class="fas fa-arrow-right"></i></span></div>'+
      '</div></article>';
  }

  function wire(){
    var chips = document.getElementById('svcChips');
    if (chips) chips.addEventListener('click', function (e) {
      var b = e.target.closest('.svc-chip'); if (!b) return;
      activeType = b.dataset.type || '';
      chips.querySelectorAll('.svc-chip').forEach(function (c) { c.classList.toggle('on', c === b); });
      paint();
    });
    var search = document.getElementById('svcSearch');
    if (search) search.addEventListener('input', function () { q = search.value.toLowerCase().trim(); paint(); });
    var body = document.getElementById('svcBody');
    body.addEventListener('click', function (e) {
      var art = e.target.closest('[data-id]'); if (!art) return;
      art.classList.add('svc-go');
      setTimeout(function () { window.location.href = 'servicio.html?id=' + encodeURIComponent(art.dataset.id); }, 180);
    });
    // micro-pulso al tocar (estilo inyectado una vez)
    if (!document.getElementById('svc-go-fx')) {
      var st = document.createElement('style'); st.id = 'svc-go-fx';
      st.textContent = '.svc-card.svc-go,.svc-feature.svc-go{ animation:svcGo .26s ease; } @keyframes svcGo{0%{transform:scale(1);}45%{transform:scale(.975);box-shadow:0 0 0 3px rgba(255,106,0,.55);}100%{transform:scale(1);}}';
      document.head.appendChild(st);
    }
  }

  function reveal(){
    var els = document.querySelectorAll('.svc-reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: .12 });
    els.forEach(function (e) { io.observe(e); });
  }
  function animateIn(scope){
    var items = scope.querySelectorAll('.svc-feature, .svc-card');
    if (!('IntersectionObserver' in window)) { items.forEach(function (i) { i.classList.add('svc-in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) {
          var sibs = Array.prototype.slice.call(scope.querySelectorAll('.svc-feature, .svc-card'));
          en.target.style.animationDelay = Math.min(sibs.indexOf(en.target), 8) * 55 + 'ms';
          en.target.classList.add('svc-in'); io.unobserve(en.target);
        }
      });
    }, { threshold: .1 });
    items.forEach(function (i) { io.observe(i); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
