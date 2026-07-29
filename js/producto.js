// ========================================
// FICHA DE PRODUCTO (pública) — 12.B
// ========================================
(function () {
  'use strict';
  var P = null;                 // producto en memoria
  var gallery = [];             // urls
  var activeImg = 0;
  var activeState = 0;          // índice de variante de estado
  var activeColor = 0;
  var activeStorage = 0;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function money(n){ n=Number(n)||0; return (n%1===0)? n.toLocaleString('es-AR') : n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function getParam(k){ return new URLSearchParams(location.search).get(k); }
  function waNumber(){ return (window.CMS_CONFIG&&window.CMS_CONFIG.whatsapp?String(window.CMS_CONFIG.whatsapp).replace(/[^0-9]/g,''):'5493782437674'); }

  function boot(){
    var id = getParam('id');
    if(!id){ notFound('No se indicó un producto.'); return; }
    if(typeof supabase==='undefined'||!supabase){ notFound('No se pudo conectar con el catálogo.'); return; }
    supabase.from('products').select('*').eq('id', id).maybeSingle().then(function(res){
      if(res.error){ console.error(res.error); notFound('Error al cargar el producto.'); return; }
      if(!res.data){ notFound('Este producto no existe o no está disponible.'); return; }
      P = res.data;
      if(P.is_hidden===true || P.status==='draft' || P.review_status==='pending' || P.review_status==='rejected'){ notFound('Este producto no está disponible.'); return; }
      gallery = (Array.isArray(P.images)&&P.images.length)? P.images.slice() : (P.image_url?[P.image_url]:[]);
      document.title = (P.name||'Producto') + ' | Cell Space Argentina';
      render();
      wire();
      revealInit();
    }).catch(function(e){ console.error(e); notFound('No se pudo cargar el producto.'); });
  }

  function notFound(msg){
    document.getElementById('pdRoot').innerHTML =
      '<div class="pd-empty"><i class="fas fa-box-open"></i><h2>'+esc(msg)+'</h2><a href="tienda.html" class="pd-btn-primary"><i class="fas fa-arrow-left"></i> Volver a la tienda</a></div>';
  }

  /* ---------- precio efectivo según variante ---------- */
  function states(){ return Array.isArray(P.state_variants)? P.state_variants.filter(function(s){return s&&s.label;}):[]; }
  function effectivePrice(){ var st=states(); if(st.length&&st[activeState]&&st[activeState].price!=null) return Number(st[activeState].price); return Number(P.price)||0; }
  function effectiveOld(){ var st=states(); if(st.length&&st[activeState]&&st[activeState].price!=null) return null; return P.old_price?Number(P.old_price):null; }

  /* ---------- render ---------- */
  function render(){
    var st = states();
    var colors = Array.isArray(P.color_options)?P.color_options.filter(function(c){return c&&c.name;}):[];
    var storages = Array.isArray(P.storage_options)?P.storage_options.filter(Boolean):[];
    var specs = Array.isArray(P.specs)?P.specs.filter(function(s){return s&&s.label&&s.value;}):[];
    var rating = Number(P.rating)||0;
    var stars=''; for(var i=0;i<5;i++) stars += i<rating?'★':'☆';

    document.getElementById('pdCrumbCat').textContent = P.category||'Producto';

    var thumbs = gallery.map(function(u,i){
      return '<button class="pd-thumb '+(i===activeImg?'on':'')+'" data-i="'+i+'"><img src="'+esc(u)+'" alt=""></button>';
    }).join('');

    var mainImg = gallery[activeImg] || P.image_url || '';

    /* variantes de estado */
    var statesHtml = st.length ? ('<div class="pd-block"><div class="pd-block-h">Elegí el estado</div><div class="pd-states">'+
      st.map(function(s,i){
        var rec = s.recommended?'<span class="pd-rec">Recomendado</span>':'';
        var pr = s.price!=null? '<span class="pd-st-price">$'+money(s.price)+'</span>' : '';
        return '<button class="pd-state '+(i===activeState?'on':'')+'" data-i="'+i+'">'+
          '<span class="pd-st-dot"></span><span class="pd-st-label">'+esc(s.label)+rec+'</span>'+pr+'</button>';
      }).join('') +'</div></div>') : '';

    /* capacidades */
    var storHtml = storages.length ? ('<div class="pd-block"><div class="pd-block-h">Capacidad</div><div class="pd-chips">'+
      storages.map(function(s,i){ return '<button class="pd-chip '+(i===activeStorage?'on':'')+'" data-i="'+i+'">'+esc(s)+'</button>'; }).join('') +'</div></div>') : '';

    /* colores */
    var colHtml = colors.length ? ('<div class="pd-block"><div class="pd-block-h">Color: <span id="pdColorName" class="pd-color-name">'+esc((colors[activeColor]||{}).name||'')+'</span></div><div class="pd-swatches">'+
      colors.map(function(c,i){ return '<button class="pd-swatch '+(i===activeColor?'on':'')+'" data-i="'+i+'" style="--c:'+esc(c.hex||'#888')+'" title="'+esc(c.name)+'"></button>'; }).join('') +'</div></div>') : '';

    /* precio + ahorro */
    var price = effectivePrice(), old = effectiveOld();
    var saveHtml='';
    if(old && old>price){ var save=old-price; var pct=Math.round(save/old*100); saveHtml='<div class="pd-save"><i class="fas fa-tag"></i> Ahorrás $'+money(save)+' ('+pct+'%)</div>'; }

    var condBadge = P.condition_badge ? '<span class="pd-cond-badge"><i class="fas fa-check"></i> '+esc(P.condition_badge)+'</span>' : '';
    var condNote = P.condition_note ? '<p class="pd-cond-note">'+esc(P.condition_note)+'</p>' : '';

    /* garantías / envío fila */
    var perks = [];
    if(P.warranty) perks.push(['fa-shield-halved', P.warranty]);
    if(P.shipping_note) perks.push(['fa-truck-fast', P.shipping_note]);
    perks.push(['fa-rotate-left','Garantía Cell Space']);
    var perksHtml = perks.map(function(pk){ return '<div class="pd-perk"><i class="fas '+pk[0]+'"></i><span>'+esc(pk[1])+'</span></div>'; }).join('');

    /* specs */
    var specsHtml = specs.length ? ('<div class="pd-specs">'+ specs.map(function(s){
      return '<div class="pd-spec"><div class="pd-spec-ic"><i class="fas '+esc(s.icon||'fa-circle-info')+'"></i></div><div><span class="pd-spec-l">'+esc(s.label)+'</span><strong class="pd-spec-v">'+esc(s.value)+'</strong></div></div>';
    }).join('') +'</div>') : '<p class="pd-muted">Sin especificaciones cargadas.</p>';

    var descHtml = P.description ? '<div class="pd-desc">'+esc(P.description).replace(/\n/g,'<br>')+'</div>' : '<p class="pd-muted">Sin descripción.</p>';

    /* evaluación técnica (usado / swap / reacondicionado) */
    var CONDITION_LABELS = { usado:'Usado', swap:'Swap', reacondicionado:'Reacondicionado', nuevo:'Nuevo' };
    var isUsed = P.device_condition && P.device_condition !== 'nuevo';
    var ratings = P.component_ratings || {};
    var RATING_LABELS = { screen:'Pantalla', battery:'Batería', camera:'Cámara', connectivity:'Conectividad', audio:'Audio', buttons:'Botones' };
    var hasRatings = Object.keys(ratings).some(function(k){ return ratings[k]; });

    var verifiedBadgeHtml = isUsed ? (
      '<div class="pd-verified">' +
        '<span class="pd-verified-badge"><i class="fas fa-shield-check"></i> CELL SPACE VERIFIED — '+esc(CONDITION_LABELS[P.device_condition]||P.device_condition)+'</span>' +
        '<div class="pd-verified-list">' +
          (P.imei_verified? '<span><i class="fas fa-check"></i> IMEI verificado</span>' : '') +
          (P.battery_health? '<span><i class="fas fa-check"></i> Batería '+P.battery_health+'%</span>' : '') +
          '<span><i class="fas fa-check"></i> Revisado por técnicos Cell Space</span>' +
          '<span><i class="fas fa-check"></i> Garantía Cell Space</span>' +
        '</div>' +
      '</div>'
    ) : '';

    var evalPanelHtml = hasRatings ? (
      '<ul class="pd-eval-list">' +
      Object.keys(RATING_LABELS).filter(function(k){return ratings[k];}).map(function(k){
        var v = ratings[k];
        var starsEval = '★'.repeat(v)+'☆'.repeat(5-v);
        return '<li><span>'+RATING_LABELS[k]+'</span><span class="pd-eval-stars">'+starsEval+'</span></li>';
      }).join('') +
      '</ul>'
    ) : '<p class="pd-muted">Sin evaluación técnica cargada.</p>';

    document.getElementById('pdRoot').innerHTML =
    '<section class="pd-top">'+
      '<div class="pd-gallery">'+
        '<div class="pd-stage" id="pdStage">'+
          (mainImg? '<div class="pd-zoom" id="pdZoom"><img id="pdMainImg" src="'+esc(mainImg)+'" alt="'+esc(P.name)+'"></div>' : '<div class="pd-noimg"><i class="fas fa-image"></i></div>')+
          '<button class="pd-loupe" id="pdLoupe" title="Ampliar"><i class="fas fa-magnifying-glass-plus"></i></button>'+
        '</div>'+
        (thumbs? '<div class="pd-thumbs" id="pdThumbs">'+thumbs+'</div>' : '')+
      '</div>'+

      '<div class="pd-buy">'+
        '<div class="pd-head">'+
          (P.brand? '<span class="pd-brand">'+esc(P.brand)+'</span>' : '')+
          '<h1 class="pd-title">'+esc(P.name)+'</h1>'+
          (rating? '<div class="pd-rating"><span class="pd-stars">'+stars+'</span><span class="pd-rev">'+(P.reviews||0)+' opiniones</span></div>' : '')+
          condBadge+ condNote+
        '</div>'+

        '<div class="pd-pricebox">'+
          '<div class="pd-priceline">'+ (old? '<span class="pd-old">$'+money(old)+'</span>' : '') +'</div>'+
          '<div class="pd-price" id="pdPrice">$'+money(price)+'</div>'+
          saveHtml+
          (P.installments? '<div class="pd-install"><i class="fas fa-credit-card"></i> '+esc(P.installments)+'</div>' : '')+
          (P.price_no_tax? '<div class="pd-notax">Precio sin impuestos: $'+money(P.price_no_tax)+'</div>' : '')+
        '</div>'+

        statesHtml+ storHtml+ colHtml+

        '<div class="pd-cta">'+
          '<button class="pd-btn-primary" id="pdAddCart"><i class="fas fa-cart-plus"></i> Agregar al carrito</button>'+
          '<button class="pd-btn-wa" id="pdBuyWa"><i class="fab fa-whatsapp"></i> Comprar / consultar</button>'+
        '</div>'+

        '<div class="pd-perks">'+perksHtml+'</div>'+
        verifiedBadgeHtml+
      '</div>'+
    '</section>'+

    '<section class="pd-tabs" data-reveal>'+
      '<div class="pd-tabbar" id="pdTabbar">'+
        '<button class="pd-tab on" data-tab="desc">Descripción</button>'+
        '<button class="pd-tab" data-tab="specs">Características técnicas</button>'+
        (isUsed? '<button class="pd-tab" data-tab="eval">Evaluación técnica</button>' : '')+
        '<button class="pd-tab" data-tab="ship">Envío y garantía</button>'+
      '</div>'+
      '<div class="pd-panel on" data-panel="desc">'+descHtml+'</div>'+
      '<div class="pd-panel" data-panel="specs">'+specsHtml+'</div>'+
      (isUsed? '<div class="pd-panel" data-panel="eval">'+evalPanelHtml+'</div>' : '')+
      '<div class="pd-panel" data-panel="ship">'+
        '<ul class="pd-ship-list">'+
          '<li><i class="fas fa-truck"></i><div><strong>Envío a todo el país</strong><span>'+(P.shipping_note?esc(P.shipping_note):'Despachamos por OCA y Andreani en 24hs hábiles.')+'</span></div></li>'+
          '<li><i class="fas fa-shield-halved"></i><div><strong>Garantía</strong><span>'+(P.warranty?esc(P.warranty):'Garantía escrita en todos nuestros productos.')+'</span></div></li>'+
          '<li><i class="fas fa-rotate-left"></i><div><strong>Devoluciones</strong><span>Si no es lo que esperabas, coordinamos el cambio.</span></div></li>'+
        '</ul>'+
      '</div>'+
    '</section>';

    updateCartCount();
  }

  /* ---------- interacciones ---------- */
  function wire(){
    var root = document.getElementById('pdRoot');

    /* thumbs */
    root.addEventListener('click', function(e){
      var th = e.target.closest('.pd-thumb'); if(th){ setImg(Number(th.dataset.i)); return; }
      var stb = e.target.closest('.pd-state'); if(stb){ activeState=Number(stb.dataset.i); refreshPrice(); markStates(); return; }
      var ch = e.target.closest('.pd-chip'); if(ch){ activeStorage=Number(ch.dataset.i); markChips(); return; }
      var sw = e.target.closest('.pd-swatch'); if(sw){ activeColor=Number(sw.dataset.i); applyColor(); return; }
      var tab = e.target.closest('.pd-tab'); if(tab){ switchTab(tab.dataset.tab); return; }
    });

    /* zoom lupa */
    var stage = document.getElementById('pdStage');
    if(stage){
      stage.addEventListener('mousemove', function(e){
        var z = document.getElementById('pdZoom'); if(!z||!gallery[activeImg]) return;
        var r = z.getBoundingClientRect();
        var x = ((e.clientX-r.left)/r.width)*100, y=((e.clientY-r.top)/r.height)*100;
        z.style.backgroundImage='url('+gallery[activeImg]+')';
        z.style.backgroundPosition = x+'% '+y+'%';
        z.classList.add('zooming');
      });
      stage.addEventListener('mouseleave', function(){ var z=document.getElementById('pdZoom'); if(z) z.classList.remove('zooming'); });
    }
    var loupe = document.getElementById('pdLoupe');
    if(loupe) loupe.addEventListener('click', function(){ if(gallery[activeImg]) openLightbox(gallery[activeImg]); });
    var mainImg = document.getElementById('pdMainImg');
    if(mainImg) mainImg.addEventListener('click', function(){ if(gallery[activeImg]) openLightbox(gallery[activeImg]); });

    /* agregar / comprar */
    var add = document.getElementById('pdAddCart'); if(add) add.addEventListener('click', addToCart);
    var wa = document.getElementById('pdBuyWa'); if(wa) wa.addEventListener('click', buyWhatsApp);

    /* lightbox close */
    document.getElementById('pdLbClose').addEventListener('click', closeLightbox);
    document.getElementById('pdLightbox').addEventListener('click', function(e){ if(e.target.id==='pdLightbox') closeLightbox(); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeLightbox(); });

    /* carrito modal fuera */
    var cm = document.getElementById('cartModal'); if(cm) cm.addEventListener('click', function(e){ if(e.target===cm) toggleCart(); });
  }

  function setImg(i){ activeImg=i; var m=document.getElementById('pdMainImg'); if(m) m.src=gallery[i]; var z=document.getElementById('pdZoom'); if(z){ z.style.backgroundImage=''; z.classList.remove('zooming'); }
    document.querySelectorAll('.pd-thumb').forEach(function(t){ t.classList.toggle('on', Number(t.dataset.i)===i); }); }

  function markStates(){ document.querySelectorAll('.pd-state').forEach(function(b){ b.classList.toggle('on', Number(b.dataset.i)===activeState); }); }
  function markChips(){ document.querySelectorAll('.pd-chip').forEach(function(b){ b.classList.toggle('on', Number(b.dataset.i)===activeStorage); }); }
  function applyColor(){
    var colors = Array.isArray(P.color_options)?P.color_options:[]; var c=colors[activeColor]||{};
    var nm=document.getElementById('pdColorName'); if(nm) nm.textContent=c.name||'';
    document.querySelectorAll('.pd-swatch').forEach(function(b){ b.classList.toggle('on', Number(b.dataset.i)===activeColor); });
    if(c.image){ var idx=gallery.indexOf(c.image); if(idx>=0) setImg(idx); else { gallery.unshift(c.image); setImg(0); rebuildThumbs(); } }
  }
  function rebuildThumbs(){
    var box=document.getElementById('pdThumbs'); if(!box) return;
    box.innerHTML = gallery.map(function(u,i){ return '<button class="pd-thumb '+(i===activeImg?'on':'')+'" data-i="'+i+'"><img src="'+esc(u)+'" alt=""></button>'; }).join('');
  }

  function refreshPrice(){
    var price=effectivePrice(), old=effectiveOld();
    var el=document.getElementById('pdPrice'); if(el){ el.classList.add('flip'); setTimeout(function(){ el.textContent='$'+money(price); el.classList.remove('flip'); },140); }
    /* old + ahorro */
    var line=document.querySelector('.pd-priceline'); if(line) line.innerHTML = old? '<span class="pd-old">$'+money(old)+'</span>' : '';
    var saveWrap=document.querySelector('.pd-save');
    if(old&&old>price){ var save=old-price, pct=Math.round(save/old*100);
      if(saveWrap) saveWrap.innerHTML='<i class="fas fa-tag"></i> Ahorrás $'+money(save)+' ('+pct+'%)';
      else { var d=document.createElement('div'); d.className='pd-save'; d.innerHTML='<i class="fas fa-tag"></i> Ahorrás $'+money(save)+' ('+pct+'%)'; document.querySelector('.pd-pricebox').insertBefore(d, document.querySelector('.pd-install')||null); }
    } else if(saveWrap){ saveWrap.remove(); }
  }

  function switchTab(name){
    document.querySelectorAll('.pd-tab').forEach(function(t){ t.classList.toggle('on', t.dataset.tab===name); });
    document.querySelectorAll('.pd-panel').forEach(function(p){ p.classList.toggle('on', p.dataset.panel===name); });
  }

  /* ---------- lightbox ---------- */
  function openLightbox(url){ var lb=document.getElementById('pdLightbox'); document.getElementById('pdLbImg').src=url; lb.classList.add('open'); document.body.style.overflow='hidden'; }
  function closeLightbox(){ document.getElementById('pdLightbox').classList.remove('open'); document.body.style.overflow=''; }

  /* ---------- scroll reveal ---------- */
  function revealInit(){
    var els=document.querySelectorAll('[data-reveal]'); if(!('IntersectionObserver' in window)){ els.forEach(function(e){e.classList.add('in');}); return; }
    var io=new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } }); },{threshold:.12});
    els.forEach(function(e){ io.observe(e); });
  }

  /* ---------- carrito ---------- */
  function getCart(){ return JSON.parse(localStorage.getItem('cellspace_cart')||'[]'); }
  function setCart(c){ localStorage.setItem('cellspace_cart', JSON.stringify(c)); }
  function addToCart(){
    var cart=getCart(); var id=P.id; var price=effectivePrice();
    var st=states(); var label=P.name; if(st.length&&st[activeState]) label+=' ('+st[activeState].label+')';
    var ex=cart.find(function(it){ return it.id==id; });
    if(ex){ ex.quantity+=1; } else { cart.push({ id:id, name:label, price:price, image:gallery[activeImg]||P.image_url||null, quantity:1 }); }
    setCart(cart); updateCartCount(); pulse(document.getElementById('pdAddCart')); notify('✅ Agregado al carrito');
  }
  function buyWhatsApp(){
    var st=states(); var price=effectivePrice();
    var colors=Array.isArray(P.color_options)?P.color_options:[]; var storages=Array.isArray(P.storage_options)?P.storage_options:[];
    var msg='¡Hola! Me interesa este producto:\n\n• '+P.name+
      (st.length&&st[activeState]? '\n• Estado: '+st[activeState].label : '')+
      (storages[activeStorage]? '\n• Capacidad: '+storages[activeStorage] : '')+
      (colors[activeColor]? '\n• Color: '+colors[activeColor].name : '')+
      '\n• Precio: $'+money(price)+'\n\n¿Lo tienen disponible?';
    window.open('https://wa.me/'+waNumber()+'?text='+encodeURIComponent(msg),'_blank');
  }
  function updateCartCount(){
    var cart=getCart(); var n=cart.reduce(function(s,it){return s+it.quantity;},0);
    var el=document.getElementById('cartCount'); if(el){ el.textContent=n; el.style.display=n>0?'flex':'none'; }
  }
  function pulse(btn){ if(!btn)return; btn.classList.add('pulsed'); setTimeout(function(){btn.classList.remove('pulsed');},500); }
  function notify(m){ var d=document.createElement('div'); d.className='pd-toast'; d.textContent=m; document.body.appendChild(d); setTimeout(function(){d.style.opacity='0';setTimeout(function(){d.remove();},300);},2600); }

  /* carrito modal render (mínimo) */
  window.toggleCart=function(){ var m=document.getElementById('cartModal'); if(m){ m.classList.toggle('active'); if(m.classList.contains('active')) renderCart(); } };
  function renderCart(){
    var c=document.getElementById('cartItems'); if(!c)return; var cart=getCart();
    if(!cart.length){ c.innerHTML='<p style="text-align:center;padding:40px;color:#888;">Tu carrito está vacío</p>'; document.getElementById('cartTotal').textContent='$0'; return; }
    c.innerHTML=cart.map(function(it){ return '<div class="cart-item"><div style="width:70px;height:70px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;">'+(it.image?'<img src="'+esc(it.image)+'" style="width:100%;height:100%;object-fit:cover;">':'<i class="fas fa-box" style="color:var(--orange)"></i>')+'</div><div class="cart-item-info"><h4 class="cart-item-title">'+esc(it.name)+'</h4><p class="cart-item-price">$'+money(it.price)+'</p><div style="display:flex;gap:8px;align-items:center;margin-top:8px;"><button onclick="updQty(\''+esc(it.id)+'\',-1)" style="padding:4px 10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;cursor:pointer;">-</button><span>'+it.quantity+'</span><button onclick="updQty(\''+esc(it.id)+'\',1)" style="padding:4px 10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;cursor:pointer;">+</button></div></div></div>'; }).join('');
    var t=cart.reduce(function(s,it){return s+(Number(it.price)||0)*it.quantity;},0); document.getElementById('cartTotal').textContent='$'+money(t);
  }
  window.updQty=function(id,d){ var cart=getCart(); var it=cart.find(function(x){return x.id==id;}); if(!it)return; it.quantity+=d; if(it.quantity<=0)cart=cart.filter(function(x){return x.id!=id;}); setCart(cart); updateCartCount(); renderCart(); };
  window.checkout=function(){ var cart=getCart(); if(!cart.length){alert('Tu carrito está vacío');return;} window.location.href='checkout.html'; };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
