// ========================================
// BLOG PÚBLICO · listado (12.D)
// ========================================
(function () {
  'use strict';
  var ALL = [], CATS = {}, activeCat = '', q = '';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function initial(name){ return String(name||'?').trim().charAt(0).toUpperCase() || '?'; }
  function fmtDate(iso){ try{ return new Date(iso).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return ''; } }
  function readTime(html){ var t=(html||'').replace(/<[^>]*>/g,' '); var w=t.trim().split(/\s+/).filter(Boolean).length; return Math.max(1, Math.round(w/200)); }
  function isLive(p){
    if (p.status !== 'published') return false;
    if (p.publish_at && new Date(p.publish_at) > new Date()) return false; // programada para el futuro → aún no
    return true;
  }

  function boot(){
    var root = document.getElementById('blogBody');
    if (!root) return;
    if (typeof supabase === 'undefined' || !supabase) { hideEmpty(); return; }
    Promise.all([
      supabase.from('posts').select('*').order('created_at', { ascending: false }),
      supabase.from('post_categories').select('*')
    ]).then(function (res) {
      var pr = res[0], cr = res[1];
      if (pr.error) { console.warn('[CMS] blog fallback', pr.error.message); hideEmpty(); return; }
      (cr.data || []).forEach(function (c) { CATS[c.id] = c.name; });
      ALL = (pr.data || []).filter(isLive);
      if (!ALL.length) { hideEmpty(); return; }
      buildChips(); wire(); paint(); reveal();
    }).catch(function (e) { console.warn('[CMS] blog fallback', e && e.message); hideEmpty(); });
  }

  function hideEmpty(){
    var body = document.getElementById('blogBody');
    if (body) body.innerHTML = '<div class="blog-empty"><i class="fas fa-feather-pointed"></i><h3>Pronto publicamos</h3><p>Estamos preparando notas y guías del taller. Volvé en unos días.</p></div>';
    var chips = document.getElementById('blogChips'); if (chips) chips.style.display = 'none';
  }

  function buildChips(){
    var used = {}; ALL.forEach(function (p) { if (p.category_id && CATS[p.category_id]) used[p.category_id] = CATS[p.category_id]; });
    var ids = Object.keys(used);
    var box = document.getElementById('blogChips'); if (!box || !ids.length) { if (box) box.style.display = 'none'; return; }
    box.innerHTML = '<button class="blog-chip on" data-cat="">Todas</button>' +
      ids.map(function (id) { return '<button class="blog-chip" data-cat="'+esc(id)+'">'+esc(used[id])+'</button>'; }).join('');
  }

  function filtered(){
    return ALL.filter(function (p) {
      var mc = !activeCat || p.category_id === activeCat;
      var mq = !q || (p.title||'').toLowerCase().indexOf(q) !== -1 || (p.excerpt||'').toLowerCase().indexOf(q) !== -1 || (Array.isArray(p.tags)?p.tags.join(' '):'').toLowerCase().indexOf(q) !== -1;
      return mc && mq;
    });
  }

  function metaRow(p, big){
    var cat = p.category_id && CATS[p.category_id] ? CATS[p.category_id] : '';
    var who = '<span class="who"><span class="av">'+initial(p.author)+'</span>'+(p.author? esc(p.author.split('@')[0]) : 'Cell Space')+'</span>';
    var date = fmtDate(p.publish_at || p.created_at);
    var rt = readTime(p.content) + ' min de lectura';
    if (big) return '<div class="bf-meta">'+who+(cat?'<span class="sep"></span><span>'+esc(cat)+'</span>':'')+'<span class="sep"></span><span>'+date+'</span><span class="sep"></span><span>'+rt+'</span></div>';
    return '<div class="bc-foot">'+who+'<span class="meta"><span>'+date+'</span><span class="sep"></span><span>'+rt+'</span></span></div>';
  }

  function paint(){
    var list = filtered();
    var body = document.getElementById('blogBody');
    var count = document.getElementById('blogCount');
    if (count) count.textContent = list.length + ' nota(s)';
    if (!list.length) { body.innerHTML = '<div class="blog-empty"><i class="fas fa-search"></i><h3>Sin resultados</h3><p>Probá con otra palabra o categoría.</p></div>'; return; }

    var feat = null, rest = list;
    if (!activeCat && !q) { feat = list[0]; rest = list.slice(1); }

    var html = '';
    if (feat) {
      var img = feat.image_url || '';
      html += '<a class="blog-feature" href="post.html?id='+esc(feat.id)+'">'+
        '<div class="bf-media">'+(img? '<img src="'+esc(img)+'" alt="'+esc(feat.title)+'" loading="lazy">' : '')+'</div>'+
        '<div class="bf-body">'+
          (feat.category_id&&CATS[feat.category_id]? '<span class="bf-cat">'+esc(CATS[feat.category_id])+'</span>' : '<span class="bf-cat">Nota destacada</span>')+
          '<h2 class="bf-title">'+esc(feat.title)+'</h2>'+
          (feat.excerpt? '<p class="bf-excerpt">'+esc(feat.excerpt)+'</p>' : '')+
          metaRow(feat, true)+
          '<span class="bf-read">Leer nota <i class="fas fa-arrow-right"></i></span>'+
        '</div></a>';
    }
    html += '<div class="blog-grid">' + rest.map(card).join('') + '</div>';
    body.innerHTML = html;
    animateIn(body);
  }

  function card(p){
    var img = p.image_url || '';
    var cat = p.category_id && CATS[p.category_id] ? CATS[p.category_id] : '';
    var media = img ? '<img src="'+esc(img)+'" alt="'+esc(p.title)+'" loading="lazy">' : '<div class="no"><i class="fas fa-newspaper"></i></div>';
    return '<a class="blog-card" href="post.html?id='+esc(p.id)+'">'+
      '<div class="bc-media">'+media+(cat? '<span class="bc-cat">'+esc(cat)+'</span>' : '')+'</div>'+
      '<div class="bc-body">'+
        '<h3 class="bc-title">'+esc(p.title)+'</h3>'+
        (p.excerpt? '<p class="bc-excerpt">'+esc(p.excerpt)+'</p>' : '')+
        metaRow(p, false)+
      '</div>'+
      '<span class="bc-go"><i class="fas fa-arrow-right"></i></span>'+
    '</a>';
  }

  function wire(){
    var chips = document.getElementById('blogChips');
    if (chips) chips.addEventListener('click', function (e) {
      var b = e.target.closest('.blog-chip'); if (!b) return;
      activeCat = b.dataset.cat || '';
      chips.querySelectorAll('.blog-chip').forEach(function (c) { c.classList.toggle('on', c === b); });
      paint();
    });
    var search = document.getElementById('blogSearch');
    if (search) search.addEventListener('input', function () { q = search.value.toLowerCase().trim(); paint(); });
  }

  function reveal(){
    var els = document.querySelectorAll('.blog-reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e){ e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es){ es.forEach(function (en){ if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold:.12 });
    els.forEach(function (e){ io.observe(e); });
  }
  function animateIn(scope){
    var items = scope.querySelectorAll('.blog-feature, .blog-card');
    if (!('IntersectionObserver' in window)) { items.forEach(function (i){ i.classList.add('blog-in'); }); return; }
    var io = new IntersectionObserver(function (es){
      es.forEach(function (en){
        if (en.isIntersecting){
          var sibs = Array.prototype.slice.call(scope.querySelectorAll('.blog-feature, .blog-card'));
          en.target.style.animationDelay = Math.min(sibs.indexOf(en.target), 8) * 60 + 'ms';
          en.target.classList.add('blog-in'); io.unobserve(en.target);
        }
      });
    }, { threshold:.1 });
    items.forEach(function (i){ io.observe(i); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
