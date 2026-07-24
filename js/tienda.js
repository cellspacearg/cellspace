// ========================================
// TIENDA CON SUPABASE  +  INTEGRACIÓN CMS (12.B)
// ========================================

let cart = JSON.parse(localStorage.getItem('cellspace_cart') || '[]');

/* [12.B] helper: escapa texto para meterlo en HTML/atributos sin romper nada */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
/* [12.B] helper: precio a 2 decimales SIN crash si viene string/null */
function money(n) { return Number(n || 0).toFixed(2); }

async function loadProducts() {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .or('is_hidden.is.null,is_hidden.eq.false') /* [12.B] respeta "oculto" sin excluir filas viejas con null */
      .order('created_at', { ascending: false });

    if (error) { console.error('Error cargando productos:', error); return []; }
    return products || [];
  } catch (e) {
    console.warn('[CMS] tienda: fallback por error de carga', e && e.message);
    return [];
  }
}

async function renderProducts(productsToRender) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (!productsToRender) productsToRender = await loadProducts();

  if (productsToRender.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">No se encontraron productos</p>';
    updateProductsCount(0);
    return;
  }

  /* [12.B] ELIMINADO: getUserRole(firebase...) → firebase ya no existe y userRole no se usaba. */

  grid.innerHTML = productsToRender.map(function (product) {
    const badgeHtml = product.badge ? '<span class="product-badge">' + esc(product.badge) + '</span>' : '';
    const oldPriceHtml = product.old_price ? '<span class="price-old">$' + money(product.old_price) + '</span>' : '';
    const rating = Number(product.rating) || 0;
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const cat = esc(product.category || '');

    /* [12.B] imagen real si existe, placeholder si no (mismo contenedor, no rompe CSS) */
    const imageHtml = product.image_url
      ? '<div class="product-image-placeholder" style="position:relative;overflow:hidden;padding:0;">' +
          '<img src="' + esc(product.image_url) + '" alt="' + esc(product.name) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">' +
        '</div>'
      : '<div class="product-image-placeholder">' +
          '<i class="fas fa-box-open" style="font-size:48px;color:var(--orange);"></i>' +
          '<span style="font-size:12px;color:#888;">' + cat + '</span>' +
        '</div>';

    return '' +
      '<div class="product-card">' +
        badgeHtml +
        imageHtml +
        '<div class="product-info">' +
          '<h3 class="product-title">' + esc(product.name) + '</h3>' +
          '<div class="product-rating"><span class="stars">' + stars + '</span></div>' +
          '<div class="product-price">' +
            '<span class="price-current">$' + money(product.price) + '</span>' +
            oldPriceHtml +
          '</div>' +
          '<p style="color:#888;font-size:13px;margin-bottom:15px;">' + esc((product.description || '').substring(0, 80)) + '...</p>' +
          '<div class="product-actions">' +
            /* [12.B] id entre comillas (UUID) */
            '<button class="btn-add-cart" onclick="addToCart(\'' + esc(product.id) + '\')">' +
              '<i class="fas fa-shopping-cart"></i> Agregar' +
            '</button>' +
            '<button class="btn-wishlist" onclick="addToWishlist(\'' + esc(product.id) + '\')">' +
              '<i class="far fa-heart"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }).join('');

  updateProductsCount(productsToRender.length);
}

function addToCart(productId) {
  loadProducts().then(function (products) {
    const product = products.find(function (p) { return p.id == productId; }); /* == por coerción (UUID o número) */
    if (!product) return;

    const existingItem = cart.find(function (item) { return item.id == productId; });
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image_url || null, /* [12.B] guardo imagen para el carrito */
        quantity: 1
      });
    }
    saveCart();
    updateCartCount();
    showNotification('✅ Producto agregado al carrito');
  });
}

function saveCart() { localStorage.setItem('cellspace_cart', JSON.stringify(cart)); }

function updateCartCount() {
  const count = cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
  const countEl = document.getElementById('cartCount');
  if (countEl) { countEl.textContent = count; countEl.style.display = count > 0 ? 'flex' : 'none'; }
}

function toggleCart() {
  const modal = document.getElementById('cartModal');
  if (modal) { modal.classList.toggle('active'); if (modal.classList.contains('active')) renderCart(); }
}

function renderCart() {
  const container = document.getElementById('cartItems');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">Tu carrito está vacío</p>';
    document.getElementById('cartTotal').textContent = '$0';
    return;
  }

  container.innerHTML = cart.map(function (item) {
    /* [12.B] imagen en el carrito si existe */
    const thumb = item.image
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

  const total = cart.reduce(function (sum, item) { return sum + (Number(item.price) || 0) * item.quantity; }, 0);
  document.getElementById('cartTotal').textContent = '$' + money(total);
}

function removeFromCart(productId) {
  cart = cart.filter(function (item) { return item.id != productId; });
  saveCart(); updateCartCount(); renderCart();
}

function updateQuantity(productId, change) {
  const item = cart.find(function (i) { return i.id == productId; });
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) { removeFromCart(productId); return; }
  saveCart(); updateCartCount(); renderCart();
}

function checkout() {
  if (cart.length === 0) { alert('Tu carrito está vacío'); return; }
  let message = '¡Hola! Quiero hacer el siguiente pedido:\n\n';
  cart.forEach(function (item) {
    message += '- ' + item.name + ' x' + item.quantity + ' = $' + money((Number(item.price) || 0) * item.quantity) + '\n';
  });
  const total = cart.reduce(function (sum, item) { return sum + (Number(item.price) || 0) * item.quantity; }, 0);
  message += '\nTotal: $' + money(total);
  /* [12.B] WhatsApp desde la config del CMS si está disponible, sino el fijo de siempre */
  const wa = (window.CMS_CONFIG && window.CMS_CONFIG.whatsapp ? String(window.CMS_CONFIG.whatsapp).replace(/[^0-9]/g, '') : '5493782437674');
  window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(message), '_blank');
}

function addToWishlist(productId) { showNotification('❤️ Producto agregado a favoritos'); }

function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = 'position:fixed;top:100px;right:20px;background:var(--orange);color:white;padding:15px 25px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:9999;font-weight:600;';
  document.body.appendChild(notification);
  setTimeout(function () {
    notification.style.opacity = '0'; notification.style.transition = 'opacity 0.3s';
    setTimeout(function () { notification.remove(); }, 300);
  }, 3000);
}

function updateProductsCount(count) {
  const el = document.getElementById('productsCount');
  if (el) el.textContent = count + ' productos encontrados';
}

function filterByCategory(category) {
  loadProducts().then(function (products) {
    if (category === 'all') renderProducts(products);
    else renderProducts(products.filter(function (p) { return (p.category || '').toLowerCase() === category.toLowerCase(); }));
  });
}

function sortProducts() {
  const sort = document.getElementById('sortSelect') && document.getElementById('sortSelect').value;
  loadProducts().then(function (products) {
    let sorted = products.slice();
    if (sort === 'price-asc') sorted.sort(function (a, b) { return (Number(a.price) || 0) - (Number(b.price) || 0); });
    else if (sort === 'price-desc') sorted.sort(function (a, b) { return (Number(b.price) || 0) - (Number(a.price) || 0); });
    else if (sort === 'rating') sorted.sort(function (a, b) { return (Number(b.rating) || 0) - (Number(a.rating) || 0); });
    renderProducts(sorted);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  renderProducts();
  updateCartCount();
  const cartModal = document.getElementById('cartModal');
  if (cartModal) cartModal.addEventListener('click', function (e) { if (e.target === cartModal) toggleCart(); });
});
