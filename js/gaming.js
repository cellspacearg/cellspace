// ========================================
// PÁGINA GAMING (pública) — PARTE 12 + catálogo FazerCards de 3 niveles
// Sección "USB y productos propios": products/gaming_products_public (Parte 12).
// Sección "Catálogo Gaming": fazercards_products (solo is_active=true),
// navegación Categoría > Juego > Producto, calcada a la demo aprobada del
// panel admin. Entrega digital: por ahora manual por WhatsApp (Fase 4).
// ========================================
(function () {
  'use strict';

  /* =========================================================
     PRODUCTOS PROPIOS (USB PS2, etc.) — grilla plana sin cambios
     ========================================================= */
  var allProducts = [];
  var activeTipo = 'todos';
  var activePlatform = 'todas';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { n = Number(n) || 0; return n % 1 === 0 ? n.toLocaleString('es-AR') : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function waNumber() { return (window.CMS_CONFIG && window.CMS_CONFIG.whatsapp ? String(window.CMS_CONFIG.whatsapp).replace(/[^0-9]/g, '') : '5493782437674'); }

  function loadProducts() {
    if (typeof supabase === 'undefined' || !supabase) return Promise.resolve([]);
    return supabase.from('gaming_products_public').select('*')
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error) { console.error(res.error); return []; }
        return res.data || [];
      })
      .catch(function (e) { console.error(e); return []; });
  }

  function platformsAvailable() {
    var set = {};
    allProducts.forEach(function (p) { if (p.platform) set[p.platform] = true; });
    return Object.keys(set).sort();
  }

  function filteredProducts() {
    return allProducts.filter(function (p) {
      if (activeTipo !== 'todos' && p.gaming_type !== activeTipo) return false;
      if (activePlatform !== 'todas' && p.platform !== activePlatform) return false;
      return true;
    });
  }

  function renderPlatformPills() {
    var box = document.getElementById('gamingPlatformPills');
    if (!box) return;
    var plats = platformsAvailable();
    if (!plats.length) { box.innerHTML = ''; return; }
    var html = '<button class="gaming-pill' + (activePlatform === 'todas' ? ' active' : '') + '" data-plat="todas">Todas las plataformas</button>';
    html += plats.map(function (pl) {
      return '<button class="gaming-pill' + (activePlatform === pl ? ' active' : '') + '" data-plat="' + esc(pl) + '">' + esc(pl) + '</button>';
    }).join('');
    box.innerHTML = html;
  }

  function markActiveCats() {
    document.querySelectorAll('.gaming-cat-card').forEach(function (c) {
      c.classList.toggle('active', c.dataset.tipo === activeTipo);
    });
  }

  function renderGrid() {
    var grid = document.getElementById('gamingGrid');
    if (!grid) return;
    var list = filteredProducts();

    if (!list.length) {
      grid.innerHTML = '<p style="text-align:center;padding:40px;color:#888;grid-column:1/-1;">No se encontraron productos con estos filtros.</p>';
      updateCount(0);
      return;
    }

    grid.innerHTML = list.map(function (p) {
      var isDigital = p.is_digital === true || (p.gaming_type && p.gaming_type !== 'usb');
      var stock = Number(p.stock) || 0;
      var sinStock = !isDigital && stock <= 0;

      var imageHtml = p.image_url
        ? '<div class="product-image-placeholder" style="position:relative;overflow:hidden;aspect-ratio:1/1;padding:0;">' +
            '<img src="' + esc(p.image_url) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;">' +
          '</div>'
        : '<div class="product-image-placeholder">' +
            '<i class="fas fa-gamepad" style="font-size:48px;color:#8b5cf6;"></i>' +
            '<span style="font-size:12px;color:#888;">' + esc(p.platform || 'Gaming') + '</span>' +
          '</div>';

      var tipoBadge = '<span class="gaming-tipo-badge ' + (isDigital ? 'digital' : 'fisico') + '">' +
        (isDigital ? 'Digital · Entrega inmediata' : 'Físico · Con envío') + '</span>';

      var platBadge = p.platform ? '<span class="product-badge new">' + esc(p.platform) + '</span>' : '';

      var oldPriceHtml = p.old_price ? '<span class="price-old">$' + money(p.old_price) + '</span>' : '';

      var gamesListHtml = '';
      if (p.gaming_type === 'usb' && Array.isArray(p.games_list) && p.games_list.length) {
        var extra = p.games_list.length > 3 ? ' +' + (p.games_list.length - 3) : '';
        gamesListHtml = '<p style="color:#888;font-size:12px;margin-bottom:10px;">' +
          esc(p.games_list.slice(0, 3).join(', ')) + extra + '</p>';
      }

      var durationHtml = p.duration ? '<p style="color:#888;font-size:12px;margin-bottom:10px;"><i class="fas fa-clock"></i> ' + esc(p.duration) + '</p>' : '';

      var stockHtml = !isDigital
        ? (sinStock
            ? '<div style="color:#FF4444;font-size:12px;font-weight:700;margin-bottom:10px;">SIN STOCK</div>'
            : (stock <= 3 ? '<div style="color:#FFD700;font-size:12px;font-weight:600;margin-bottom:10px;">¡Últimas ' + stock + ' unidades!</div>' : ''))
        : '';

      var actionBtn = isDigital
        ? '<button class="btn-wa-card" onclick="gamingBuyWhatsapp(\'' + esc(p.id) + '\')"><i class="fab fa-whatsapp"></i> Consultar por WhatsApp</button>'
        : (sinStock
            ? '<button class="btn-add-cart" disabled><i class="fas fa-ban"></i> Sin stock</button>'
            : '<button class="btn-add-cart" onclick="gamingAddToCart(\'' + esc(p.id) + '\')"><i class="fas fa-shopping-cart"></i> Agregar al carrito</button>');

      return '' +
        '<div class="product-card">' +
          platBadge + tipoBadge + imageHtml +
          '<div class="product-info">' +
            '<h3 class="product-title">' + esc(p.name) + '</h3>' +
            gamesListHtml + durationHtml +
            '<div class="product-price"><span class="price-current">$' + money(p.price) + '</span>' + oldPriceHtml + '</div>' +
            stockHtml +
            '<div class="product-actions">' + actionBtn + '</div>' +
          '</div>' +
        '</div>';
    }).join('');

    updateCount(list.length);
  }

  function updateCount(n) {
    var el = document.getElementById('gamingCount');
    if (el) el.textContent = n + (n === 1 ? ' producto encontrado' : ' productos encontrados');
  }

  window.gamingBuyWhatsapp = function (id) {
    var p = allProducts.find(function (x) { return String(x.id) === String(id); });
    if (!p) return;
    var msg = 'Hola Cell Space! Quiero comprar: ' + p.name + ' - $' + money(p.price);
    window.open('https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(msg), '_blank');
  };

  /* ---------- carrito (localStorage compartido, mismo formato que index.js/tienda.js) ---------- */
  function getCart() { try { return JSON.parse(localStorage.getItem('cellspace_cart') || '[]'); } catch (e) { return []; } }
  function setCart(c) { localStorage.setItem('cellspace_cart', JSON.stringify(c)); }

  window.gamingAddToCart = function (id) {
    var p = allProducts.find(function (x) { return String(x.id) === String(id); });
    if (!p) return;
    var cart = getCart();
    var ex = cart.find(function (it) { return String(it.id) === String(id); });
    if (ex) { ex.quantity += 1; }
    else { cart.push({ id: p.id, name: p.name, price: Number(p.price) || 0, image: p.image_url || null, quantity: 1, stock: Number(p.stock) || 0 }); }
    setCart(cart);
    updateCartCount();
    if (window.csToast) csToast('Agregado al carrito', 'success'); else alert('Agregado al carrito');
  };

  function updateCartCount() {
    var cart = getCart();
    var n = cart.reduce(function (s, it) { return s + it.quantity; }, 0);
    var el = document.getElementById('cartCount');
    if (el) { el.textContent = n; el.style.display = n > 0 ? 'flex' : 'none'; }
  }

  window.toggleCart = function () {
    var m = document.getElementById('cartModal');
    if (m) { m.classList.toggle('active'); if (m.classList.contains('active')) renderCart(); }
  };

  function renderCart() {
    var c = document.getElementById('cartItems');
    if (!c) return;
    var cart = getCart();
    if (!cart.length) {
      c.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">Tu carrito está vacío</p>';
      var t0 = document.getElementById('cartTotal'); if (t0) t0.textContent = '$0';
      return;
    }
    c.innerHTML = cart.map(function (it) {
      return '<div class="cart-item">' +
        '<div style="width:70px;height:70px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;">' +
          (it.image ? '<img src="' + esc(it.image) + '" style="width:100%;height:100%;object-fit:cover;">' : '<i class="fas fa-gamepad" style="color:var(--orange)"></i>') +
        '</div>' +
        '<div class="cart-item-info">' +
          '<h4 class="cart-item-title">' + esc(it.name) + '</h4>' +
          '<p class="cart-item-price">$' + money(it.price) + '</p>' +
          '<div style="display:flex;gap:8px;align-items:center;margin-top:8px;">' +
            '<button onclick="gamingUpdQty(\'' + esc(it.id) + '\',-1)" style="padding:4px 10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;cursor:pointer;">-</button>' +
            '<span>' + it.quantity + '</span>' +
            '<button onclick="gamingUpdQty(\'' + esc(it.id) + '\',1)" style="padding:4px 10px;background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:6px;cursor:pointer;">+</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    var t = cart.reduce(function (s, it) { return s + (Number(it.price) || 0) * it.quantity; }, 0);
    var tEl = document.getElementById('cartTotal'); if (tEl) tEl.textContent = '$' + money(t);
  }

  window.gamingUpdQty = function (id, d) {
    var cart = getCart();
    var it = cart.find(function (x) { return String(x.id) === String(id); });
    if (!it) return;
    it.quantity += d;
    if (it.quantity <= 0) cart = cart.filter(function (x) { return String(x.id) !== String(id); });
    setCart(cart);
    updateCartCount();
    renderCart();
  };

  window.checkout = function () {
    var cart = getCart();
    if (!cart.length) { if (window.csToast) csToast('Tu carrito está vacío', 'warn'); else alert('Tu carrito está vacío'); return; }
    window.location.href = 'checkout.html';
  };

  window.performSearch = function () {
    var input = document.getElementById('headerSearchInput');
    var q = input ? input.value.trim() : '';
    window.location.href = 'tienda.html' + (q ? '?q=' + encodeURIComponent(q) : '');
  };

  /* =========================================================
     CATÁLOGO FAZERCARDS — navegación de 3 niveles
     Categoría > Juego > Producto (calcado a la demo aprobada).
     Solo productos con is_active=true (activados desde el panel admin).
     ========================================================= */
  var fzcProducts = [];
  var catalogLevel = 1;
  var catalogCategory = null;
  var catalogSubcategory = null;
  var regionMode = 'compatible'; // 'compatible' | 'all'

  var COMPATIBLE_REGIONS = ['AR', 'LATAM', 'GLOBAL'];
  function isCompatibleRegion(region) { return !region || COMPATIBLE_REGIONS.indexOf(String(region).toUpperCase()) !== -1; }
  function regionClass(region) {
    region = String(region || '').toUpperCase();
    if (region === 'LATAM') return 'latam';
    if (region === 'GLOBAL') return 'global';
    if (region === 'AR') return 'ar';
    return 'other';
  }
  function regionLabel(region) {
    region = String(region || '').toUpperCase();
    if (region === 'LATAM') return '🇦🇷 LATAM';
    if (region === 'GLOBAL') return '🌎 GLOBAL';
    if (region === 'AR') return '🇦🇷 AR';
    return '⚠️ ' + region;
  }

  var CATEGORY_META = {
    giftcard: { label: 'Tarjetas de regalo', icon: 'fa-credit-card' },
    topup: { label: 'Recarga de servicio', icon: 'fa-bolt' },
    gamekey: { label: 'Claves de juego', icon: 'fa-key' },
  };

  function loadFazercardsProducts() {
    if (typeof supabase === 'undefined' || !supabase) return Promise.resolve([]);
    return supabase.from('fazercards_products').select('*').eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error) { console.error(res.error); return []; }
        return res.data || [];
      })
      .catch(function (e) { console.error(e); return []; });
  }

  function fzcVisible() {
    if (regionMode === 'all') return fzcProducts;
    return fzcProducts.filter(function (p) { return isCompatibleRegion(p.fazercards_region || p.region); });
  }

  function catalogLevel1Groups() {
    var map = {};
    fzcVisible().forEach(function (p) {
      if (!map[p.category]) map[p.category] = { category: p.category, count: 0, subcats: {}, minPrice: Infinity };
      var g = map[p.category];
      g.count++;
      if (p.subcategory) g.subcats[p.subcategory] = true;
      var price = Number(p.price_ars) || 0;
      if (price > 0 && price < g.minPrice) g.minPrice = price;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function catalogLevel2Groups(category) {
    var map = {};
    fzcVisible().filter(function (p) { return p.category === category; }).forEach(function (p) {
      var key = p.subcategory || '—';
      if (!map[key]) map[key] = { subcategory: key, region: p.fazercards_region || p.region || 'GLOBAL', count: 0, minPrice: Infinity, image: null };
      var g = map[key];
      g.count++;
      var price = Number(p.price_ars) || 0;
      if (price > 0 && price < g.minPrice) g.minPrice = price;
      if (!g.image && p.image_url) g.image = p.image_url;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.subcategory.localeCompare(b.subcategory); });
  }

  function catalogLevel3Products(category, subcategory) {
    return fzcProducts.filter(function (p) { return p.category === category && p.subcategory === subcategory; })
      .sort(function (a, b) { return Number(a.price_usd) - Number(b.price_usd); });
  }

  function renderRegionBar() {
    var label = document.getElementById('gamingRegionLabel');
    var btn = document.getElementById('gamingRegionToggle');
    if (!label || !btn) return;
    if (regionMode === 'compatible') {
      label.innerHTML = '<i class="fas fa-circle-check"></i> Mostrando: Compatibles con Argentina';
      btn.textContent = 'Ver todas las regiones';
    } else {
      label.innerHTML = '<i class="fas fa-globe"></i> Mostrando: Todas las regiones';
      btn.textContent = 'Ver solo compatibles con Argentina';
    }
  }

  window.__toggleRegionFilter = function () {
    regionMode = regionMode === 'compatible' ? 'all' : 'compatible';
    renderRegionBar();
    window.__catalogGoLevel1();
  };

  function renderCatalogBreadcrumb() {
    var el = document.getElementById('gc3Breadcrumb');
    if (!el) return;
    var html = '<a onclick="window.__catalogGoLevel1()"><i class="fas fa-home"></i> Catálogo</a>';
    if (catalogLevel >= 2) {
      var meta = CATEGORY_META[catalogCategory] || { label: catalogCategory };
      html += ' <span class="gc3-sep">/</span> ';
      html += catalogLevel === 2
        ? '<span class="gc3-current">' + esc(meta.label) + '</span>'
        : '<a onclick="window.__catalogGoLevel2(\'' + esc(catalogCategory) + '\')">' + esc(meta.label) + '</a>';
    }
    if (catalogLevel === 3) html += ' <span class="gc3-sep">/</span> <span class="gc3-current">' + esc(catalogSubcategory) + '</span>';
    el.innerHTML = html;
  }

  function renderCatalogContent() {
    var el = document.getElementById('gc3Content');
    if (!el) return;
    if (catalogLevel === 1) el.innerHTML = renderLevel1Html();
    else if (catalogLevel === 2) el.innerHTML = renderLevel2Html(catalogCategory);
    else el.innerHTML = renderLevel3Html(catalogCategory, catalogSubcategory);
  }

  function renderLevel1Html() {
    var groups = catalogLevel1Groups();
    if (!groups.length) return '<p style="text-align:center;padding:40px;color:#888;">Todavía no hay productos activados en esta sección.</p>';
    return '<div class="gc3-grid">' + groups.map(function (g) {
      var meta = CATEGORY_META[g.category] || { label: g.category, icon: 'fa-box' };
      var min = g.minPrice === Infinity ? null : g.minPrice;
      var subcount = Object.keys(g.subcats).length;
      return '' +
        '<div class="gc3-card" onclick="window.__catalogGoLevel2(\'' + esc(g.category) + '\')">' +
          '<div class="gc3-card-icon"><i class="fas ' + meta.icon + '"></i></div>' +
          '<div class="gc3-card-name">' + esc(meta.label) + '</div>' +
          '<div class="gc3-card-meta">' + subcount + (subcount === 1 ? ' juego' : ' juegos') + ' · ' + g.count + (g.count === 1 ? ' producto' : ' productos') + '</div>' +
          (min != null ? '<div class="gc3-card-price">Desde $' + money(min) + ' ARS</div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  function renderLevel2Html(category) {
    var groups = catalogLevel2Groups(category);
    if (!groups.length) return '<p style="text-align:center;padding:40px;color:#888;">No hay juegos activados en esta categoría todavía.</p>';
    return '<div class="gc3-grid">' + groups.map(function (g) {
      var region = String(g.region || 'GLOBAL').toUpperCase();
      var min = g.minPrice === Infinity ? null : g.minPrice;
      return '' +
        '<div class="gc3-card gc3-card-image" onclick="window.__catalogGoLevel3(\'' + esc(category) + '\',\'' + esc(g.subcategory) + '\')">' +
          '<div class="gc3-card-img">' +
            '<span class="gc3-region-badge ' + regionClass(region) + '">' + regionLabel(region) + '</span>' +
            (g.image ? '<img src="' + esc(g.image) + '" alt="">' : '<i class="fas fa-gamepad"></i>') +
          '</div>' +
          '<div class="gc3-card-body">' +
            '<div class="gc3-card-name">' + esc(g.subcategory) + '</div>' +
            '<div class="gc3-card-price">' + g.count + (g.count === 1 ? ' producto' : ' productos') + (min != null ? ' · Desde $' + money(min) + ' ARS' : '') + '</div>' +
          '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function renderLevel3Html(category, subcategory) {
    var list = catalogLevel3Products(category, subcategory);
    var first = list[0] || {};
    var region = String(first.fazercards_region || first.region || 'GLOBAL').toUpperCase();
    var compatible = isCompatibleRegion(region);
    var meta = CATEGORY_META[category] || { label: category };
    return '' +
      '<div class="gc3-detail">' +
        '<div class="gc3-gameinfo">' +
          '<div class="gc3-gameimg">' + (first.image_url ? '<img src="' + esc(first.image_url) + '" alt="">' : '<i class="fas fa-gamepad"></i>') + '</div>' +
          '<h2>' + esc(subcategory) + '</h2>' +
          '<div class="gc3-gameregion ' + regionClass(region) + '">' + regionLabel(region) + ' · ' + (compatible ? 'Compatible con Argentina' : 'Verificá antes de comprar') + '</div>' +
          '<div class="gc3-gamenote">' +
            '<strong><i class="fas fa-info-circle"></i> Nota</strong>' +
            (compatible ? 'Región compatible con Argentina.' : '⚠️ Esta región puede no funcionar en cuentas argentinas.') + ' Categoría: ' + esc(meta.label) + '.' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="gc3-prod-header"><h3>Productos</h3><span class="gc3-prod-count">' + list.length + (list.length === 1 ? ' producto' : ' productos') + '</span></div>' +
          '<div class="gc3-prod-list">' + list.map(renderCatalogProductRow).join('') + '</div>' +
        '</div>' +
      '</div>';
  }

  function renderCatalogProductRow(p) {
    var priceArs = Number(p.price_ars) || 0;
    return '' +
      '<div class="gc3-prod-item">' +
        '<span class="gc3-prod-name">' + esc(p.name) + '</span>' +
        '<span class="gc3-prod-usd">USD ' + money(p.price_usd) + '</span>' +
        '<span class="gc3-prod-ars">$' + money(priceArs) + ' ARS</span>' +
        '<button class="gc3-prod-wa" onclick="window.__fzcBuyWhatsapp(\'' + esc(p.id) + '\')"><i class="fab fa-whatsapp"></i> Consultar por WhatsApp</button>' +
      '</div>';
  }

  window.__catalogGoLevel1 = function () {
    catalogLevel = 1; catalogCategory = null; catalogSubcategory = null;
    renderCatalogBreadcrumb(); renderCatalogContent();
  };
  window.__catalogGoLevel2 = function (category) {
    catalogLevel = 2; catalogCategory = category; catalogSubcategory = null;
    renderCatalogBreadcrumb(); renderCatalogContent();
  };
  window.__catalogGoLevel3 = function (category, subcategory) {
    catalogLevel = 3; catalogCategory = category; catalogSubcategory = subcategory;
    renderCatalogBreadcrumb(); renderCatalogContent();
  };

  // Mensaje pre-armado tal cual lo pidio el negocio, incluyendo Player ID a
  // completar si el producto lo requiere (recargas de juegos moviles).
  window.__fzcBuyWhatsapp = function (id) {
    var p = fzcProducts.find(function (x) { return String(x.id) === String(id); });
    if (!p) return;
    var region = String(p.fazercards_region || p.region || 'GLOBAL').toUpperCase();
    var priceArs = Number(p.price_ars) || 0;
    var lines = [
      'Hola Cell Space! Quiero comprar:',
      '',
      '📦 Juego: ' + p.subcategory,
      '🎮 Producto: ' + p.name,
      '💰 Precio: $' + money(priceArs) + ' ARS',
      '🌎 Región: ' + region,
    ];
    if (p.requires_player_id) lines.push('🎮 Player ID: [COMPLETAR ACÁ]');
    lines.push('', 'Por favor confirmame disponibilidad y forma de pago.');
    var msg = lines.join('\n');
    window.open('https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(msg), '_blank');
  };

  /* ---------- wiring ---------- */
  function wire() {
    document.querySelectorAll('.gaming-cat-card').forEach(function (c) {
      c.addEventListener('click', function () {
        activeTipo = c.dataset.tipo || 'todos';
        markActiveCats();
        renderGrid();
        var grid = document.getElementById('gamingGrid');
        if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    var pillsBox = document.getElementById('gamingPlatformPills');
    if (pillsBox) {
      pillsBox.addEventListener('click', function (e) {
        var btn = e.target.closest('.gaming-pill');
        if (!btn) return;
        activePlatform = btn.dataset.plat;
        renderPlatformPills();
        renderGrid();
      });
    }

    var cm = document.getElementById('cartModal');
    if (cm) cm.addEventListener('click', function (e) { if (e.target === cm) toggleCart(); });
  }

  function boot() {
    updateCartCount();
    renderRegionBar();

    loadProducts().then(function (list) {
      allProducts = list;
      renderPlatformPills();
      renderGrid();
      wire();
    });

    loadFazercardsProducts().then(function (list) {
      fzcProducts = list;
      renderCatalogBreadcrumb();
      renderCatalogContent();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
