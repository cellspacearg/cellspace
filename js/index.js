// ========================================
// INICIO · CMS (12.B) — destacados vivos + ficha
// ========================================

var featuredFallback = [
  { id: 1, name: "Chimera Tool Premium - 5000 Teléfonos", category: "Licencias", brand: "Chimera", price: 181.00, old_price: 220.00, image_url: "assets/products/chimera.png", rating: 5, badge: "OFERTA", stock: 15 },
  { id: 2, name: "Z3X Box - Samsung Edition", category: "Hardware", brand: "Z3X", price: 145.00, old_price: null, image_url: "assets/products/z3x.png", rating: 4, badge: null, stock: 8 },
  { id: 3, name: "NCK Dongle - Full Activation", category: "Licencias", brand: "NCK", price: 89.00, old_price: 120.00, image_url: "assets/products/nck.png", rating: 5, badge: "OFERTA", stock: 25 },
  { id: 4, name: "Medusa Pro 2 Box", category: "Hardware", brand: "Medusa", price: 299.00, old_price: 350.00, image_url: "assets/products/medusa.png", rating: 5, badge: "Últimas unidades", stock: 3 }
];
var currentFeatured = featuredFallback.slice();
var navigating = false;

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function money(n) {
  n = Number(n) || 0;
  return (n % 1 === 0) ? n.toLocaleString('es-AR') : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function injectListFx() {
  if (document.getElementById('cs-list-fx')) return;
  var s = document.createElement('style'); s.id = 'cs-list-fx';
  s.textContent =
    '.product-card{transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s,border-color .28s;position:relative;}' +
    '.product-card:hover{transform:translateY(-6px);box-shadow:0 20px 44px rgba(0,0,0,.55),0 0 0 1px rgba(255,106,0,.4);}' +
    '.product-card:hover .product-image-placeholder img{transform:scale(1.06);}' +
    '.product-image-placeholder img{transition:transform .5s cubic-bezier(.2,.8,.2,1);}' +
    '.product-card.cs-enter{animation:csCardIn .5s cubic-bezier(.2,.8,.2,1) both;}' +
    '@keyframes csCardIn{from{opacity:0;transform:translateY(20px) scale(.98);}to{opacity:1;transform:none;}}' +
    '.product-card.cs-go{animation:csCardGo .26s ease;}' +
    '@keyframes csCardGo{0%{transform:scale(1);}45%{transform:scale(.97);box-shadow:0 0 0 3px rgba(255,106,0,.55),0 18px 40px rgba(0,0,0,.5);}100%{transform:scale(1);}}';
  document.head.appendChild(s);
}
function stagger(grid) {
  if (!grid) return;
  grid.querySelectorAll('.product-card').forEach(function (c, i) {
    c.classList.remove('cs-enter'); void c.offsetWidth;
    c.classList.add('cs-enter'); c.style.animationDelay = Math.min(i, 8) * 45 + 'ms';
  });
}
function attachCardFx(grid) {
  if (!grid || grid.dataset.fx) return; grid.dataset.fx = '1';
  grid.addEventListener('click', function (e) {
    if (navigating) return;
    if (e.target.closest('.btn-add-cart') || e.target.closest('.btn-wishlist')) return;
    var card = e.target.closest('.product-card');
    if (!card || !card.dataset.pid) return;
    navigating = true; card.classList.add('cs-go');
    var url = 'producto.html?id=' + encodeURIComponent(card.dataset.pid);
    setTimeout(function () { window.location.href = url; }, 220);
  });
}

async function loadFeatured() {
  try {
    if (typeof supabase === 'undefined' || !supabase) return featuredFallback.slice();
    var r = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (r.error) throw r.error;
    var vis = (r.data || []).filter(function (p) { return p.is_featured === true && p.is_hidden !== true && p.status !== 'draft'; });
    return vis.length ? vis.slice(0, 8) : featuredFallback.slice();
  } catch (e) { console.warn('[CMS] home fallback', e && e.message); return featuredFallback.slice(); }
}

function getCart() { return (typeof window.cart !== 'undefined') ? window.cart : JSON.parse(localStorage.getItem('cellspace_cart') || '[]'); }
function setCart(c) { if (typeof window.cart !== 'undefined') window.cart = c; localStorage.setItem('cellspace_cart', JSON.stringify(c)); }

function paintFeatured(list) {
  currentFeatured = list;
  var grid = document.getElementById('featuredProducts'); if (!grid) return;
  grid.innerHTML = list.map(function (product) {
    var badgeHtml = '';
    if (product.badge) {
      var bc = 'product-badge'; if (product.badge === 'NUEVO') bc += ' new'; if (product.badge === 'OFERTA') bc += ' sale';
      badgeHtml = '<span class="' + bc + '">' + esc(product.badge) + '</span>';
    }
    var oldPriceHtml = product.old_price ? '<span class="price-old">$' + money(product.old_price) + '</span>' : '';
    var rating = Number(product.rating) || 0; var stars = '';
    for (var i = 0; i < rating; i++) stars += '★'; for (var j = rating; j < 5; j++) stars += '☆';
    var cat = esc(product.category || '');

    var imageHtml = product.image_url
      ? '<div class="product-image-placeholder" style="position:relative;overflow:hidden;aspect-ratio:1/1;padding:0;">' +
          '<img src="' + esc(product.image_url) + '" alt="' + esc(product.name) + '" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;">' +
        '</div>'
      : '<div class="product-image-placeholder"><i class="fas fa-box-open" style="font-size:48px;color:var(--orange);opacity:0.5;"></i><span style="font-size:12px;color:#888;margin-top:10px;">' + cat + '</span></div>';

    return '' +
      '<div class="product-card" data-pid="' + esc(product.id) + '" style="cursor:pointer;">' +
        badgeHtml + imageHtml +
        '<div class="product-info">' +
          '<h3 class="product-title">' + esc(product.name) + '</h3>' +
          '<div class="product-price"><span class="price-current">$' + money(product.price) + '</span>' + oldPriceHtml + '</div>' +
          '<div class="product-rating"><span class="stars">' + stars + '</span></div>' +
          '<div class="product-actions">' +
            '<button class="btn-add-cart" onclick="addToCart(\'' + esc(product.id) + '\')"><i class="fas fa-shopping-cart"></i> Agregar</button>' +
            '<button class="btn-wishlist" onclick="addToWishlist(\'' + esc(product.id) + '\')"><i class="far fa-heart"></i></button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }).join('');
  stagger(grid);
}

function renderFeaturedProducts() {
  var grid = document.getElementById('featuredProducts'); if (!grid) return;
  grid.innerHTML = '<p style="text-align:center;padding:40px;color:#888;grid-column:1/-1;">Cargando destacados...</p>';
  loadFeatured().then(paintFeatured);
}

function addToCart(productId) {
  var product = currentFeatured.find(function (p) { return p.id == productId; }); if (!product) return;
  var cart = getCart(); var ex = cart.find(function (i) { return i.id == productId; });
  if (ex) ex.quantity += 1;
  else cart.push({ id: product.id, name: product.name, price: Number(product.price) || 0, image: product.image_url || null, quantity: 1 });
  setCart(cart); updateCartCount(); showNotification('✅ Producto agregado al carrito');
}
function updateCartCount() {
  var n = getCart().reduce(function (s, i) { return s + i.quantity; }, 0);
  var el = document.getElementById('cartCount'); if (el) { el.textContent = n; el.style.display = n > 0 ? 'flex' : 'none'; }
}
function toggleCart() { var m = document.getElementById('cartModal'); if (m) { m.classList.toggle('active'); if (m.classList.contains('active')) renderCart(); } }
function renderCart() {
  var c = document.getElementById('cartItems'); if (!c) return; var cart = getCart();
  if (!cart.length) { c.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">Tu carrito está vacío</p>'; document.getElementById('cartTotal').textContent = '$0'; return; }
  c.innerHTML = cart.map(function (it) {
    var thumb = it.image ? '<img src="' + esc(it.image) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">' : '<i class="fas fa-box" style="font-size:24px;color:var(--orange);"></i>';
    return '<div class="cart-item"><div style="width:80px;height:80px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;">' + thumb + '</div>' +
      '<div class="cart-item-info"><h4 class="cart-item-title">' + esc(it.name) + '</h4><p class="cart-item-price">$' + money(it.price) + '</p>' +
      '<div style="display:flex;gap:10px;margin-top:10px;align-items:center;">' +
      '<button onclick="updateQuantity(\'' + esc(it.id) + '\', -1)" style="padding:5px 10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:white;cursor:pointer;">-</button>' +
      '<span>' + it.quantity + '</span>' +
      '<button onclick="updateQuantity(\'' + esc(it.id) + '\', 1)" style="padding:5px 10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:white;cursor:pointer;">+</button>' +
      '<button onclick="removeFromCart(\'' + esc(it.id) + '\')" style="margin-left:auto;padding:5px 10px;background:#ff4444;border:none;border-radius:5px;color:white;cursor:pointer;">🗑️</button>' +
      '</div></div></div>';
  }).join('');
  var t = cart.reduce(function (s, i) { return s + (Number(i.price) || 0) * i.quantity; }, 0);
  document.getElementById('cartTotal').textContent = '$' + money(t);
}
function removeFromCart(id) { var c = getCart(); c = c.filter(function (i) { return i.id != id; }); setCart(c); updateCartCount(); renderCart(); }
function updateQuantity(id, d) { var c = getCart(); var it = c.find(function (i) { return i.id == id; }); if (!it) return; it.quantity += d; if (it.quantity <= 0) { removeFromCart(id); return; } setCart(c); updateCartCount(); renderCart(); }
function checkout() {
  var cart = getCart(); if (!cart.length) { alert('Tu carrito está vacío'); return; }
  var msg = '¡Hola! Quiero hacer el siguiente pedido:\n\n';
  cart.forEach(function (i) { msg += '- ' + i.name + ' x' + i.quantity + ' = $' + money((Number(i.price) || 0) * i.quantity) + '\n'; });
  var t = cart.reduce(function (s, i) { return s + (Number(i.price) || 0) * i.quantity; }, 0); msg += '\nTotal: $' + money(t);
  var wa = (window.CMS_CONFIG && window.CMS_CONFIG.whatsapp ? String(window.CMS_CONFIG.whatsapp).replace(/[^0-9]/g, '') : '5493782437674');
  window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(msg), '_blank');
}
function addToWishlist() { showNotification('❤️ Producto agregado a favoritos'); }
function showNotification(message) {
  var n = document.createElement('div'); n.textContent = message;
  n.style.cssText = 'position:fixed;top:100px;right:20px;background:var(--orange);color:white;padding:15px 25px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:9999;font-weight:600;';
  document.body.appendChild(n);
  setTimeout(function () { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s'; setTimeout(function () { n.remove(); }, 300); }, 3000);
}

function openIMEIChecker() { var m = document.getElementById('imeiModal'); if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; } }
function closeIMEIChecker() { var m = document.getElementById('imeiModal'); if (m) { m.classList.remove('active'); document.body.style.overflow = ''; } }
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href'); if (href === '#') return;
      var t = document.querySelector(href);
      if (t) { e.preventDefault(); window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - 150, behavior: 'smooth' }); }
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  injectListFx();
  renderFeaturedProducts();
  updateCartCount();
  initSmoothScroll();
  attachCardFx(document.getElementById('featuredProducts'));

  var cm = document.getElementById('cartModal');
  if (cm) cm.addEventListener('click', function (e) { if (e.target === cm) toggleCart(); });
  var im = document.getElementById('imeiModal');
  if (im) im.addEventListener('click', function (e) { if (e.target === im) closeIMEIChecker(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeIMEIChecker(); var m = document.getElementById('cartModal'); if (m && m.classList.contains('active')) toggleCart(); }
  });
  var f = document.getElementById('imeiForm');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var imei = document.getElementById('imeiInput').value.trim();
    if (imei.length < 10) { alert('⚠️ IMEI inválido. Debe tener al menos 10 dígitos'); return; }
    var r = document.getElementById('imeiResult');
    r.innerHTML = '<p style="text-align:center;color:#888;">Verificando...</p>'; r.style.display = 'block';
    setTimeout(function () {
      r.innerHTML = '<div style="text-align:center;"><i class="fas fa-check-circle" style="font-size:48px;color:#4CAF50;margin-bottom:15px;"></i><h3 style="color:#4CAF50;margin-bottom:10px;">IMEI Verificado</h3><p><strong>IMEI:</strong> ' + esc(imei) + '</p><p><strong>Estado:</strong> Disponible</p></div>';
    }, 1500);
  });
  console.log('✅ index.js cargado correctamente');
});
