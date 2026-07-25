// ========================================
// NOTA · blog público (12.D)
// ========================================
(function () {
  'use strict';
  var P = null, CATS = {};

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function initial(n){ return String(n||'?').trim().charAt(0).toUpperCase() || '?'; }
  function fmtDate(iso){ try{ return new Date(iso).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'}); }catch(e){ return ''; } }
  function readTime(html){ var w=(html||'').replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(Boolean).length; return Math.max(1, Math.round(w/200)); }
  function getParam(k){ return new URLSearchParams(location.search).get(k); }
  function waNumber(){ return (window.CMS_CONFIG&&window.CMS_CONFIG.whatsapp?String(window.CMS_CONFIG.whatsapp).replace(/[^0-9]/g,''):'5493782437674'); }

  function boot(){
    var id = getParam('id'), slug = getParam('slug');
    if (!id && !slug) { notFound('No se indicó una nota.'); return; }
    if (typeof supabase === 'undefined' || !supabase) { notFound('No se pudo conectar.'); return; }
    var q = supabase.from('posts').select('*');
    q = id ? q.eq('id', id) : q.eq('slug', slug);
    q.maybeSingle().then(function (res) {
      if (res.error) { console.error(res.error); notFound('Error al cargar la nota.'); return; }
      if (!res.data || res.data.status !== 'published') { notFound('Esta nota no está disponible.'); return; }
      P = res.data;
      supabase.from('post_categories').select('*').then(function (cr) {
        (cr.data || []).forEach(function (c) { CATS[c.id] = c.name; });
        document.title = (P.meta_title || P.title) + ' | Cell Space Argentina';
        if (P.meta_description) upsertMeta('description', P.meta_description);
        render(); wire(); buildTOC(); initProgress(); lightboxImgs(); revealInit(); loadMore();
      });
    }).catch(function (e) { console.error(e); notFound('No se pudo cargar la nota.'); });
  }

  function upsertMeta(name, content){ var m=document.querySelector('meta[name="'+name+'"]'); if(!m){ m=document.createElement('meta'); m.setAttribute('name',name); document.head.appendChild(m);} m.setAttribute('content',content); }

  function notFound(msg){
    document.getElementById('postRoot').innerHTML = '<div class="post-empty"><i class="fas fa-newspaper"></i><h2>'+esc(msg)+'</h2><a href="blog.html" class="post-ask" style="display:inline-block;text-align:center;text-decoration:none;"><span style="color:var(--orange);font-weight:700;"><i class="fas fa-arrow-left"></i> Volver al blog</span></a></div>';
  }

  function render(){
    var cat = P.category_id && CATS[P.category_id] ? CATS[P.category_id] : '';
    var hero = P.image_url ? '<figure class="post-hero post-reveal"><img src="'+esc(P.image_url)+'" alt="'+esc(P.title)+'"></figure>' : '';
    var tags = Array.isArray(P.tags) ? P.tags.filter(Boolean) : [];
    var tagsHtml = tags.length ? '<div class="post-tags post-reveal"><span class="lbl">Etiquetas</span>' + tags.map(function (t){ return '<span class="post-tag">#'+esc(t)+'</span>'; }).join('') + '</div>' : '';

    document.getElementById('postRoot').innerHTML =
      '<article>'+
        '<header class="post-head post-reveal">'+
          '<nav class="post-crumbs"><a href="index.html">Inicio</a><span>/</span><a href="blog.html">Blog</a><span>/</span><span>'+(cat? esc(cat) : 'Nota')+'</span></nav>'+
          (cat? '<span class="post-cat">'+esc(cat)+'</span>' : '')+
          '<h1 class="post-title">'+esc(P.title)+'</h1>'+
          (P.excerpt? '<p class="post-excerpt">'+esc(P.excerpt)+'</p>' : '')+
          '<div class="post-meta">'+
            '<span class="who"><span class="av">'+initial(P.author)+'</span>'+(P.author? esc(P.author.split('@')[0]) : 'Cell Space')+'</span>'+
            '<span class="sep"></span><span>'+fmtDate(P.publish_at||P.created_at)+'</span>'+
            '<span class="sep"></span><span><i class="far fa-clock"></i> '+readTime(P.content)+' min de lectura</span>'+
          '</div>'+
        '</header>'+
        hero+
        '<div class="post-layout">'+
          '<div class="post-prose post-reveal" id="postProse">'+(P.content || '<p><em>Sin contenido.</em></p>')+'</div>'+
          '<aside class="post-aside">'+
            '<details class="post-toc" id="postToc" open><summary>En esta nota</summary><ul id="tocList"></ul></details>'+
            '<div class="post-cta"><p>¿Te quedó alguna duda sobre este tema?</p><a href="#" id="postAsk"><i class="fab fa-whatsapp"></i> Escribinos</a></div>'+
          '</aside>'+
        '</div>'+
        tagsHtml+
        '<div class="post-ask post-reveal"><h3>¿Querés que lo revisemos nosotros?</h3><p>Coordiná un diagnóstico sin cargo por WhatsApp.</p><a href="#" id="postAsk2"><i class="fab fa-whatsapp"></i> Solicitar turno</a></div>'+
        '<section class="post-more post-reveal" id="postMore" style="display:none;"></section>'+
      '</article>';

    var ask = function (e) {
      e.preventDefault();
      var msg = '¡Hola! Leí la nota "' + P.title + '" y quería consultarles algo.';
      window.open('https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(msg), '_blank');
    };
    var a1 = document.getElementById('postAsk'); if (a1) a1.addEventListener('click', ask);
    var a2 = document.getElementById('postAsk2'); if (a2) a2.addEventListener('click', ask);
  }

  function wire(){
    document.getElementById('postLbClose').addEventListener('click', closeLightbox);
    document.getElementById('postLightbox').addEventListener('click', function (e){ if (e.target.id==='postLightbox') closeLightbox(); });
    document.addEventListener('keydown', function (e){ if (e.key==='Escape') closeLightbox(); });
  }

  /* tabla de contenidos + scroll-spy */
  function buildTOC(){
    var prose = document.getElementById('postProse'); if (!prose) return;
    var heads = prose.querySelectorAll('h2, h3'); if (!heads.length) { var t=document.getElementById('postToc'); if(t) t.style.display='none'; return; }
    var list = document.getElementById('tocList'); var html = '';
    heads.forEach(function (h, i) {
      var id = 'h-' + i; h.id = id;
      html += '<li><a class="'+(h.tagName==='H3'?'lvl3':'')+'" href="#'+id+'" data-target="'+id+'">'+esc(h.textContent)+'</a></li>';
    });
    list.innerHTML = html;
    list.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return; e.preventDefault();
      var el = document.getElementById(a.dataset.target); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 84, behavior:'smooth' });
    });
    var links = list.querySelectorAll('a');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es){
      es.forEach(function (en){
        if (en.isIntersecting) {
          links.forEach(function (l){ l.classList.toggle('on', l.dataset.target === en.target.id); });
        }
      });
    }, { rootMargin:'-80px 0px -70% 0px', threshold:0 });
    heads.forEach(function (h){ io.observe(h); });
  }

  /* barra de progreso */
  function initProgress(){
    var bar = document.getElementById('readBar'); if (!bar) return;
    var onScroll = function () {
      var h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      bar.style.width = (h > 0 ? Math.min(100, (window.pageYOffset / h) * 100) : 0) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive:true }); onScroll();
  }

  /* lightbox de imágenes del contenido */
  function lightboxImgs(){
    var prose = document.getElementById('postProse'); if (!prose) return;
    prose.querySelectorAll('img').forEach(function (img){
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () { openLightbox(img.src); });
    });
  }
  function openLightbox(url){ document.getElementById('postLbImg').src = url; document.getElementById('postLightbox').classList.add('open'); document.body.style.overflow='hidden'; }
  function closeLightbox(){ document.getElementById('postLightbox').classList.remove('open'); document.body.style.overflow=''; }

  /* seguí leyendo */
  function loadMore(){
    var q = supabase.from('posts').select('*').eq('status','published').neq('id', P.id).order('created_at', { ascending:false }).limit(3);
    q.then(function (r) {
      var list = (r.data || []).filter(function (p){ return !p.publish_at || new Date(p.publish_at) <= new Date(); });
      if (!list.length) return;
      var box = document.getElementById('postMore'); box.style.display = '';
      box.innerHTML = '<h3 class="post-more-h">Seguí leyendo</h3><div class="post-more-grid">' + list.map(function (s) {
        var img = s.image_url || '';
        var m = img ? '<img src="'+esc(img)+'" alt="'+esc(s.title)+'" loading="lazy">' : '<div class="no"><i class="fas fa-newspaper"></i></div>';
        var c = s.category_id && CATS[s.category_id] ? CATS[s.category_id] : '';
        return '<a class="post-more-card" href="post.html?id='+esc(s.id)+'"><div class="m">'+m+'</div><div class="b">'+(c?'<span class="c">'+esc(c)+'</span>':'')+'<p class="t">'+esc(s.title)+'</p></div></a>';
      }).join('') + '</div>';
    }).catch(function () {});
  }

  function revealInit(){
    var els = document.querySelectorAll('.post-reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e){ e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es){ es.forEach(function (en){ if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold:.1 });
    els.forEach(function (e){ io.observe(e); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
