// ========================================
// PÁGINA GAMING (pública) — PARTE 12
// Vende: USB PS2 (físico), Gift Cards / Top-Ups / Suscripciones (digital).
// Los productos ya existen en la tabla `products` (gaming_type IS NOT NULL).
//
// Nota sobre precios: a diferencia de tienda.html, acá NO se oculta el precio
// a visitantes sin sesión. `anon` no tiene SELECT sobre `products` (los
// invitados leen `products_public`, que no trae columnas de gaming ni precio),
// así que se agregó la vista `gaming_products_public` con permiso de lectura
// para anon/authenticated, y se consulta esa vista para todos por igual.
//
// Nota sobre digital: por ahora la entrega es manual por WhatsApp. El campo
// `delivery_code` ya existe en la tabla para cuando se sumen APIs de
// distribuidores (FazerCards, etc.) que entreguen códigos automáticamente.
// ========================================
(function () {
  'use strict';

  var allProducts = [];
  var activeTipo = 'todos';       // todos | usb | giftcard | topup | suscripcion
  var activePlatform = 'todas';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { n = Number(n) || 0; return n % 1 === 0 ? n.toLocaleString('es-AR') : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function waNumber() { return (window.CMS_CONFIG && window.CMS_CONFIG.whatsapp ? String(window.CMS_CONFIG.whatsapp).replace(/[^0-9]/g, '') : '5493782437674'); }

  var TIPO_LABELS = { usb: 'USB / Pendrive', giftcard: 'Gift Cards', topup: 'Recargas', suscripcion: 'Suscripciones' };

  /* ---------- carga de productos ---------- */
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

  /* ---------- filtros ---------- */
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

  /* ---------- render de la grilla ---------- */
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

  /* ---------- acciones de compra ---------- */
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

  /* ---------- búsqueda del header (fallback a tienda.html) ---------- */
  window.performSearch = function () {
    var input = document.getElementById('headerSearchInput');
    var q = input ? input.value.trim() : '';
    window.location.href = 'tienda.html' + (q ? '?q=' + encodeURIComponent(q) : '');
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
    loadProducts().then(function (list) {
      allProducts = list;
      renderPlatformPills();
      renderGrid();
      wire();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
