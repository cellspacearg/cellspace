// ========================================
// TIENDA CON SUPABASE
// ========================================

let cart = JSON.parse(localStorage.getItem('cellspace_cart') || '[]');

async function loadProducts() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error cargando productos:', error);
    return [];
  }
  
  return products || [];
}

async function renderProducts(productsToRender) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  
  if (!productsToRender) productsToRender = await loadProducts();
  
  if (productsToRender.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">No se encontraron productos</p>';
    return;
  }
  
  const userRole = await getUserRole(firebase?.auth?.currentUser || null);
  
  grid.innerHTML = productsToRender.map(product => {
    const badgeHtml = product.badge ? `<span class="product-badge">${product.badge}</span>` : '';
    const oldPriceHtml = product.old_price ? `<span class="price-old">$${product.old_price.toFixed(2)}</span>` : '';
    const stars = '★'.repeat(product.rating || 0) + '☆'.repeat(5 - (product.rating || 0));
    
    return `
      <div class="product-card">
        ${badgeHtml}
        <div class="product-image-placeholder">
          <i class="fas fa-box-open" style="font-size:48px;color:var(--orange);"></i>
          <span style="font-size:12px;color:#888;">${product.category}</span>
        </div>
        <div class="product-info">
          <h3 class="product-title">${product.name}</h3>
          <div class="product-rating"><span class="stars">${stars}</span></div>
          <div class="product-price">
            <span class="price-current">$${product.price.toFixed(2)}</span>
            ${oldPriceHtml}
          </div>
          <p style="color:#888;font-size:13px;margin-bottom:15px;">${(product.description || '').substring(0, 80)}...</p>
          <div class="product-actions">
            <button class="btn-add-cart" onclick="addToCart(${product.id})">
              <i class="fas fa-shopping-cart"></i> Agregar
            </button>
            <button class="btn-wishlist" onclick="addToWishlist(${product.id})">
              <i class="far fa-heart"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  updateProductsCount(productsToRender.length);
}

function addToCart(productId) {
  loadProducts().then(products => {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id == productId);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      });
    }
    
    saveCart();
    updateCartCount();
    showNotification('✅ Producto agregado al carrito');
  });
}

function saveCart() {
  localStorage.setItem('cellspace_cart', JSON.stringify(cart));
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById('cartCount');
  if (countEl) {
    countEl.textContent = count;
    countEl.style.display = count > 0 ? 'flex' : 'none';
  }
}

function toggleCart() {
  const modal = document.getElementById('cartModal');
  if (modal) {
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) renderCart();
  }
}

function renderCart() {
  const container = document.getElementById('cartItems');
  if (!container) return;
  
  if (cart.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">Tu carrito está vacío</p>';
    document.getElementById('cartTotal').textContent = '$0';
    return;
  }
  
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div style="width:80px;height:80px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <i class="fas fa-box" style="font-size:24px;color:var(--orange);"></i>
      </div>
      <div class="cart-item-info">
        <h4 class="cart-item-title">${item.name}</h4>
        <p class="cart-item-price">$${item.price.toFixed(2)}</p>
        <div style="display:flex;gap:10px;margin-top:10px;align-items:center;">
          <button onclick="updateQuantity(${item.id}, -1)" style="padding:5px 10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:white;cursor:pointer;">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity(${item.id}, 1)" style="padding:5px 10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:white;cursor:pointer;">+</button>
          <button onclick="removeFromCart(${item.id})" style="margin-left:auto;padding:5px 10px;background:#ff4444;border:none;border-radius:5px;color:white;cursor:pointer;">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('cartTotal').textContent = '$' + total.toFixed(2);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id != productId);
  saveCart();
  updateCartCount();
  renderCart();
}

function updateQuantity(productId, change) {
  const item = cart.find(i => i.id == productId);
  if (!item) return;
  
  item.quantity += change;
  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  
  saveCart();
  updateCartCount();
  renderCart();
}

function checkout() {
  if (cart.length === 0) {
    alert('Tu carrito está vacío');
    return;
  }
  
  let message = '¡Hola! Quiero hacer el siguiente pedido:\n\n';
  cart.forEach(item => {
    message += '- ' + item.name + ' x' + item.quantity + ' = $' + (item.price * item.quantity).toFixed(2) + '\n';
  });
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  message += '\nTotal: $' + total.toFixed(2);
  
  window.open('https://wa.me/5493782437674?text=' + encodeURIComponent(message), '_blank');
}

function addToWishlist(productId) {
  showNotification('❤️ Producto agregado a favoritos');
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = 'position:fixed;top:100px;right:20px;background:var(--orange);color:white;padding:15px 25px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:9999;font-weight:600;';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function updateProductsCount(count) {
  const el = document.getElementById('productsCount');
  if (el) el.textContent = count + ' productos encontrados';
}

function filterByCategory(category) {
  loadProducts().then(products => {
    if (category === 'all') {
      renderProducts(products);
    } else {
      const filtered = products.filter(p => p.category?.toLowerCase() === category.toLowerCase());
      renderProducts(filtered);
    }
  });
}

function sortProducts() {
  const sort = document.getElementById('sortSelect')?.value;
  loadProducts().then(products => {
    let sorted = [...products];
    
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    renderProducts(sorted);
  });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  updateCartCount();
  
  const cartModal = document.getElementById('cartModal');
  if (cartModal) {
    cartModal.addEventListener('click', (e) => {
      if (e.target === cartModal) toggleCart();
    });
  }
});
