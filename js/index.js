// ========================================
// CELL SPACE - INDEX.JS  +  INTEGRACIÓN CMS (12.B)
// ========================================

/* [12.B] Fallback hardcodeado: se usa SOLO si Supabase no trae destacados. */
var featuredFallback = [
  { id: 1, name: "Chimera Tool Premium - 5000 Teléfonos", category: "Licencias", brand: "Chimera", price: 181.00, old_price: 220.00, image_url: "assets/products/chimera.png", rating: 5, badge: "OFERTA", stock: 15 },
  { id: 2, name: "Z3X Box - Samsung Edition", category: "Hardware", brand: "Z3X", price: 145.00, old_price: null, image_url: "assets/products/z3x.png", rating: 4, badge: null, stock: 8 },
  { id: 3, name: "NCK Dongle - Full Activation", category: "Licencias", brand: "NCK", price: 89.00, old_price: 120.00, image_url: "assets/products/nck.png", rating: 5, badge: "OFERTA", stock: 25 },
  { id: 4, name: "Medusa Pro 2 Box", category: "Hardware", brand: "Medusa", price: 299.00, old_price: 350.00, image_url: "assets/products/medusa.png", rating: 5, badge: "Últimas unidades", stock: 3 }
];
var currentFeatured = featuredFallback.slice(); /* [12.B] la lista que realmente se está mostrando */

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function money(n) { return Number(n || 0).toFixed(2); }

/* [12.B] trae destacados del CMS; si falla o no hay, usa el fallback */
async function loadFeatured() {
  try {
    if (typeof supabase === 'undefined' || !supabase) return featuredFallback.slice();
    const { data, error } = await supabase
      .from('products').select('*')
      .eq('is_featured', true).eq('is_active', true)
      .or('is_hidden.is.null,is_hidden.eq.false')
      .order('created_at', { ascending: false }).limit(8);
    if (error) throw error;
    return (data && data.length) ? data : featuredFallback.slice();
  } catch (e) {
    console.warn('[CMS] home: destacados en fallback', e && e.message);
    return featuredFallback.slice();
  }
}

function getCart() {
  if (typeof window.cart !== 'undefined') return window.cart;
  return JSON.parse(localStorage.getItem('cellspace_cart') || '[]');
}
function setCart(newCart) {
  if (typeof window.cart !== 'undefined') window.cart = newCart;
  localStorage.setItem('cellspace_cart', JSON.stringify(newCart));
}

/* [12.B] render unificado (CMS o fallback), con imagen real */
function paintFeatured(list) {
  currentFeatured = list;
  var grid = document.getElementById('featuredProducts');
  if (!grid) return;

  grid.innerHTML = list.map(function (product) {
    var badgeHtml = '';
    if (product.badge) {
      var badgeClass = 'product-badge';
      if (product.badge === 'NUEVO') badgeClass += ' new';
      if (product.badge === 'OFERTA') badgeClass += ' sale';
      badgeHtml = '<span class="' + badgeClass + '">' + esc(product.badge) + '</span>';
    }
    var oldPriceHtml = product.old_price ? '<span class="price-old">$' + money(product.old_price) + '</span>' : '';
    var rating = Number(product.rating) || 0;
    var stars = '';
    for (var i = 0; i < rating; i++) stars += '★';
    for (var j = rating; j < 5; j++) stars += '☆';
    var cat = esc(product.category || '');

    var imageHtml = product.image_url
      ? '<div class="product-image-placeholder" style="position:relative;overflow:hidden;padding:0;">' +
          '<img src="' + esc(product.image_url) + '" alt="' + esc(product.name) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">' +
        '</div>'
      : '<div class="product-image-placeholder">' +
          '<i class="fas fa-box-open" style="font-size:48px;color:var(--orange);opacity:0.5;"></i>' +
          '<span style="font-size:12px;color:#888;margin-top:10px;">' + cat + '</span>' +
        '</div>';

    return '' +
      '<div class="product-card">' +
        badgeHtml + imageHtml +
        '<div class="product-info">' +
          '<h3 class="product-title">' + esc(product.name) + '</h3>' +
          '<div class="product-price">' +
            '<span class="price-current">$' + money(product.price) + '</span>' + oldPriceHtml +
          '</div>' +
          '<div class="product-rating"><span class="stars">' + stars + '</span></div>' +
          '<div class="product-actions">' +
            '<button class="btn-add-cart" onclick="addToCart(\'' + esc(product.id) + '\')"><i class="fas fa-shopping-cart"></i> Agregar</button>' +
            '<button class="btn-wishlist" onclick="addToWishlist(\'' + esc(product.id) + '\')"><i class="far fa-heart"></i></button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }).join('');
}

function renderFeaturedProducts() {
  var grid = document.getElementById('featuredProducts');
  if (!grid) return;
  grid.innerHTML = '<p style="text-align:center;padding:40px;color:#888;grid-column:1/-1;">Cargando destacados...</p>';
  loadFeatured().then(paintFeatured);
}

function addToCart(productId) {
  /* [12.B] busca en la lista que se está mostrando (CMS o fallback) */
  var product = currentFeatured.find(function (p) { return p.id == productId; });
  if (!product) return;
  var cart = getCart();
  var existingItem = cart.find(function (item) { return item.id == productId; });
  if (existingItem) { existingItem.quantity += 1; }
  else { cart.push({ id: product.id, name: product.name, price: Number(product.price) || 0, image: product.image_url || null, quantity: 1 }); }
  setCart(cart); updateCartCount(); showNotification('✅ Producto agregado al carrito');
}

function updateCartCount() {
  var cart = getCart();
  var count = cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
  var countEl = document.getElementById('cartCount');
  if (countEl) { countEl.textContent = count; countEl.style.display = count > 0 ? 'flex' : 'none'; }
}

function toggleCart() {
  var modal = document.getElementById('cartModal');
  if (modal) { modal.classList.toggle('active'); if (modal.classList.contains('active')) renderCart(); }
}

function renderCart() {
  var container = document.getElementById('cartItems');
  if (!container) return;
  var cart = getCart();
  if (cart.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">Tu carrito está vacío</p>';
    document.getElementById('cartTotal').textContent = '$0';
    return;
  }
  container.innerHTML = cart.map(function (item) {
    var thumb = item.image
      ? '<img src="' + esc(item.image) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">'
      : '<i class="fas fa-box" style="font-size:24px;color:var(--orange);"></i>';
    return '' +
      '<div class="cart-item">' +
        '<div style="width:80px;height:80px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;">' + thumb + '</div>' +
        '<div class="cart-item-info">' +
          '<h4 class="cart-item-title">' + esc(item.name) + '</h4>' +
          '<p class="cart-item-price">$' + money(item.price) + '</p>' +
          '<div style="display:flex;gap:10px;margin-top:10px;align-items:center;">' +
            '<button onclick="updateQuantity(\'' + esc(item.id) + '\', -1)" style="padding:5px 10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:white;cursor:pointer;">-</button>' +
            '<span>' + item.quantity + '</span>' +
            '<button onclick="updateQuantity(\'' + esc(item.id) + '\', 1)" style="padding:5px 10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:white;cursor:pointer;">+</button>' +
            '<button onclick="removeFromCart(\'' + esc(item.id) + '\')" style="margin-left:auto;padding:5px 10px;background:#ff4444;border:none;border-radius:5px;color:white;cursor:pointer;">🗑️</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }).join('');
  var total = cart.reduce(function (sum, item) { return sum + (Number(item.price) || 0) * item.quantity; }, 0);
  document.getElementById('cartTotal').textContent = '$' + money(total);
}

function removeFromCart(productId) {
  var cart = getCart();
  cart = cart.filter(function (item) { return item.id != productId; });
  setCart(cart); updateCartCount(); renderCart();
}
function updateQuantity(productId, change) {
  var cart = getCart();
  var item = cart.find(function (i) { return i.id == productId; });
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) { removeFromCart(productId); return; }
  setCart(cart); updateCartCount(); renderCart();
}
function checkout() {
  var cart = getCart();
  if (cart.length === 0) { alert('Tu carrito está vacío'); return; }
  var message = '¡Hola! Quiero hacer el siguiente pedido:\n\n';
  cart.forEach(function (item) { message += '- ' + item.name + ' x' + item.quantity + ' = $' + money((Number(item.price) || 0) * item.quantity) + '\n'; });
  var total = cart.reduce(function (sum, item) { return sum + (Number(item.price) || 0) * item.quantity; }, 0);
  message += '\nTotal: $' + money(total);
  var wa = (window.CMS_CONFIG && window.CMS_CONFIG.whatsapp ? String(window.CMS_CONFIG.whatsapp).replace(/[^0-9]/g, '') : '5493782437674');
  window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(message), '_blank');
}

function addToWishlist(productId) { showNotification('❤️ Producto agregado a favoritos'); }
function showNotification(message) {
  var notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = 'position:fixed;top:100px;right:20px;background:var(--orange);color:white;padding:15px 25px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:9999;font-weight:600;';
  document.body.appendChild(notification);
  setTimeout(function () { notification.style.opacity = '0'; notification.style.transition = 'opacity 0.3s'; setTimeout(function () { notification.remove(); }, 300); }, 3000);
}

function openIMEIChecker() { var m = document.getElementById('imeiModal'); if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; } }
function closeIMEIChecker() { var m = document.getElementById('imeiModal'); if (m) { m.classList.remove('active'); document.body.style.overflow = ''; } }

function initSmoothScroll() {
  var links = document.querySelectorAll('a[href^="#"]');
  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (target) { e.preventDefault(); var top = target.getBoundingClientRect().top + window.pageYOffset - 150; window.scrollTo({ top: top, behavior: 'smooth' }); }
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  renderFeaturedProducts();
  updateCartCount();
  initSmoothScroll();
  var cartModal = document.getElementById('cartModal');
  if (cartModal) cartModal.addEventListener('click', function (e) { if (e.target === cartModal) toggleCart(); });
  var imeiModal = document.getElementById('imeiModal');
  if (imeiModal) imeiModal.addEventListener('click', function (e) { if (e.target === imeiModal) closeIMEIChecker(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeIMEIChecker(); var m = document.getElementById('cartModal'); if (m && m.classList.contains('active')) toggleCart(); }
  });
  var imeiForm = document.getElementById('imeiForm');
  if (imeiForm) {
    imeiForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var imei = document.getElementById('imeiInput').value.trim();
      if (imei.length < 10) { alert('⚠️ IMEI inválido. Debe tener al menos 10 dígitos'); return; }
      var resultDiv = document.getElementById('imeiResult');
      resultDiv.innerHTML = '<p style="text-align:center;color:#888;">Verificando...</p>';
      resultDiv.style.display = 'block';
      setTimeout(function () {
        resultDiv.innerHTML = '<div style="text-align:center;"><i class="fas fa-check-circle" style="font-size:48px;color:#4CAF50;margin-bottom:15px;"></i><h3 style="color:#4CAF50;margin-bottom:10px;">IMEI Verificado</h3><p><strong>IMEI:</strong> ' + esc(imei) + '</p><p><strong>Estado:</strong> Disponible</p></div>';
      }, 1500);
    });
  }
  console.log('✅ index.js cargado correctamente');
});
