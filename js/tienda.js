// ========================================
// CELL SPACE - TIENDA CON QUICK VIEW
// ========================================

// Datos de productos
const products = [
  {
    id: 1,
    name: "Chimera Tool Premium - 5000 Teléfonos",
    category: "Licencias",
    price: 181.00,
    oldPrice: 220.00,
    image: "assets/products/chimera.png",
    description: "Licencia premium de Chimera Tool para reparación y desbloqueo de hasta 5000 teléfonos.",
    stock: 15,
    rating: 5,
    reviews: 128,
    specs: [
      "✓ Servidor automático",
      "✓ Entrega instantánea",
      "✓ 5000 teléfonos/año",
      "✓ Soporte 24/7",
      "✓ Actualizaciones incluidas",
      "✓ Compatible 100%"
    ]
  },
  {
    id: 2,
    name: "Z3X Box - Samsung Edition",
    category: "Hardware",
    price: 145.00,
    oldPrice: null,
    image: "assets/products/z3x.png",
    description: "Z3X Box edición Samsung para reparación de firmware, desbloqueo y mantenimiento.",
    stock: 8,
    rating: 4,
    reviews: 64,
    specs: [
      "✓ Samsung exclusivo",
      "✓ Firmware repair",
      "✓ Desbloqueo FRP",
      "✓ Soporte técnico",
      "✓ Garantía 1 año",
      "✓ Envío gratis"
    ]
  },
  {
    id: 3,
    name: "NCK Dongle - Full Activation",
    category: "Licencias",
    price: 89.00,
    oldPrice: 120.00,
    image: "assets/products/nck.png",
    description: "Activación completa de NCK Dongle para desbloqueo de códigos de red.",
    stock: 25,
    rating: 5,
    reviews: 92,
    specs: [
      "✓ Multi-marca",
      "✓ Activación completa",
      "✓ Código de red",
      "✓ Actualización gratuita",
      "✓ Soporte remoto",
      "✓ Entrega inmediata"
    ]
  },
  {
    id: 4,
    name: "Medusa Pro 2 Box",
    category: "Hardware",
    price: 299.00,
    oldPrice: 350.00,
    image: "assets/products/medusa.png",
    description: "Medusa Pro 2 para reparación avanzada de firmware y recuperación de datos.",
    stock: 3,
    rating: 5,
    reviews: 45,
    specs: [
      "✓ Multi-plataforma",
      "✓ Reparación avanzada",
      "✓ Recovery mode",
      "✓ Flasheo seguro",
      "✓ Base de datos amplia",
      "✓ Manual incluido"
    ]
  },
  {
    id: 5,
    name: "Octoplus Box - LG Edition",
    category: "Licencias",
    price: 75.00,
    oldPrice: null,
    image: "assets/products/octoplus.png",
    description: "Licencia Octoplus para dispositivos LG. Herramientas de flasheo y reparación.",
    stock: 12,
    rating: 4,
    reviews: 38,
    specs: [
      "✓ LG exclusivo",
      "✓ Reparación IMEI",
      "✓ Flasheo completo",
      "✓ Base de datos LG",
      "✓ Soporte incluido",
      "✓ Actualizaciones"
    ]
  },
  {
    id: 6,
    name: "Infinity Box - CM2 Chinese Miracle",
    category: "Hardware",
    price: 195.00,
    oldPrice: 240.00,
    image: "assets/products/infinity.png",
    description: "Infinity Box CM2 para reparación de firmware chino y desbloqueo.",
    stock: 6,
    rating: 4,
    reviews: 56,
    specs: [
      "✓ Marcas chinas",
      "✓ Firmware repair",
      "✓ Desbloqueo avanzado",
      "✓ Multi-protocolo",
      "✓ Soporte técnico",
      "✓ Garantía 6 meses"
    ]
  }
];

// Carrito
let cart = JSON.parse(localStorage.getItem('cellspace_cart') || '[]');

// ========================================
// RENDERIZAR PRODUCTOS
// ========================================

function renderProducts(productsToRender) {
  if (!productsToRender) {
    productsToRender = products;
  }
  
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (productsToRender.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>😔 No se encontraron productos</p>
        <p style="font-size: 14px; margin-top: 10px;">Intentá con otra búsqueda o categoría</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = productsToRender.map(product => `
    <div class="product-card-premium">
      ${product.oldPrice ? `<span class="discount-badge">-${Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%</span>` : ''}
      ${product.stock <= 3 ? `<span class="stock-badge">Últimas unidades</span>` : ''}
      
      <div class="product-image-container">
        <div class="product-image-placeholder">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
          </svg>
          <span class="placeholder-text">${product.category}</span>
        </div>
      </div>
      
      <div class="product-info-premium">
        <div class="product-category">${product.category}</div>
        <h3 class="product-title-premium">${product.name}</h3>
        
        <div class="product-rating">
          ${'★'.repeat(product.rating)}${'☆'.repeat(5 - product.rating)}
          <span class="rating-count">(${product.reviews})</span>
        </div>
        
        <div class="product-price-premium">
          <span class="current-price">$${product.price.toFixed(2)}</span>
          ${product.oldPrice ? `<span class="old-price">$${product.oldPrice.toFixed(2)}</span>` : ''}
        </div>
        
        <p class="product-desc-premium">${product.description.substring(0, 80)}...</p>
        
        <button onclick="addToCart(${product.id})" class="btn-add-cart-premium">
          🛒 Agregar al Carrito
        </button>
        
        <button onclick="openQuickView(${product.id})" class="btn-quick-view">
          👁️ Ver Características
        </button>
      </div>
    </div>
  `).join('');

  updateProductsCount(productsToRender.length);
}

// ========================================
// QUICK VIEW FUNCTIONS
// ========================================

let currentQuickViewProduct = null;

function openQuickView(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  currentQuickViewProduct = product;

  document.getElementById('qvImage').src = product.image;
  document.getElementById('qvImage').alt = product.name;
  document.getElementById('qvCategory').textContent = product.category;
  document.getElementById('qvTitle').textContent = product.name;
  document.getElementById('qvPrice').textContent = '$' + product.price.toFixed(2);
  document.getElementById('qvDescription').textContent = product.description;
  document.getElementById('qvStars').textContent = '★'.repeat(product.rating) + '☆'.repeat(5 - product.rating);
  document.getElementById('qvReviews').textContent = '(' + product.reviews + ' reseñas)';

  if (product.oldPrice) {
    document.getElementById('qvOldPrice').textContent = '$' + product.oldPrice.toFixed(2);
    document.getElementById('qvOldPrice').style.display = 'inline';
    const discount = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
    document.getElementById('qvDiscount').textContent = '-' + discount + '%';
    document.getElementById('qvDiscount').style.display = 'inline';
  } else {
    document.getElementById('qvOldPrice').style.display = 'none';
    document.getElementById('qvDiscount').style.display = 'none';
  }

  const stockBadge = document.getElementById('qvStock');
  if (product.stock > 0) {
    stockBadge.textContent = '✓ En Stock';
    stockBadge.style.background = '#4CAF50';
  } else {
    stockBadge.textContent = '✗ Sin Stock';
    stockBadge.style.background = '#ff4444';
  }

  const specsList = document.getElementById('qvSpecsList');
  specsList.innerHTML = product.specs.map(spec => '<li>' + spec + '</li>').join('');

  document.getElementById('qvQuantity').value = 1;

  document.getElementById('quickViewModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeQuickView() {
  document.getElementById('quickViewModal').classList.remove('active');
  document.body.style.overflow = '';
  currentQuickViewProduct = null;
}

function incrementQty() {
  const input = document.getElementById('qvQuantity');
  if (parseInt(input.value) < 10) {
    input.value = parseInt(input.value) + 1;
  }
}

function decrementQty() {
  const input = document.getElementById('qvQuantity');
  if (parseInt(input.value) > 1) {
    input.value = parseInt(input.value) - 1;
  }
}

function addToCartFromQuickView() {
  if (!currentQuickViewProduct) return;

  const quantity = parseInt(document.getElementById('qvQuantity').value);
  const existingItem = cart.find(item => item.id === currentQuickViewProduct.id);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: currentQuickViewProduct.id,
      name: currentQuickViewProduct.name,
      price: currentQuickViewProduct.price,
      image: currentQuickViewProduct.image,
      quantity: quantity
    });
  }

  saveCart();
  updateCartCount();
  closeQuickView();
  showNotification('✅ Producto agregado al carrito', 'success');
}

// ========================================
// CARRITO FUNCTIONS
// ========================================

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  }

  saveCart();
  updateCartCount();
  showNotification('✅ ' + product.name + ' agregado al carrito', 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartCount();
  renderCart();
}

function updateQuantity(productId, change) {
  const item = cart.find(item => item.id === productId);
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

function saveCart() {
  localStorage.setItem('cellspace_cart', JSON.stringify(cart));
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById('cartCountHeader');
  if (countEl) {
    countEl.textContent = count;
    countEl.style.display = count > 0 ? 'flex' : 'none';
  }
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// ========================================
// CARRITO MODAL
// ========================================

function openCart() {
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCart();
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function renderCart() {
  const container = document.getElementById('cartItems');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--muted);">
        <p style="font-size: 3rem; margin-bottom: 20px;">🛒</p>
        <p style="font-size: 18px; margin-bottom: 10px;">Tu carrito está vacío</p>
        <p style="font-size: 14px;">Agregá productos para comenzar</p>
      </div>
    `;
    document.getElementById('cartTotal').textContent = '$0.00';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='assets/placeholder.png'">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p style="color: var(--orange); font-weight: 700;">$${item.price.toFixed(2)}</p>
        <div class="cart-controls">
          <button onclick="updateQuantity(${item.id}, -1)">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity(${item.id}, 1)">+</button>
          <button class="btn-remove" onclick="removeFromCart(${item.id})">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('cartTotal').textContent = '$' + getCartTotal().toFixed(2);
}

// ========================================
// NOTIFICACIONES
// ========================================

function showNotification(message, type) {
  if (!type) {
    type = 'info';
  }
  
  document.querySelectorAll('.notification').forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.className = 'notification notification-' + type;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : 'var(--orange)'};
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 9999;
    font-weight: 600;
    animation: slideInRight 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ========================================
// FILTROS Y BÚSQUEDA
// ========================================

function filterByCategory(category) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase().includes(category.toLowerCase()) || 
        (category === 'all' && btn.textContent === 'Todos')) {
      btn.classList.add('active');
    }
  });

  if (category === 'all') {
    renderProducts(products);
  } else {
    const filtered = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    renderProducts(filtered);
  }
}

function searchProducts(query) {
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.description.toLowerCase().includes(query.toLowerCase()) ||
    p.category.toLowerCase().includes(query.toLowerCase())
  );
  renderProducts(filtered);
}

function updateProductsCount(count) {
  const el = document.getElementById('productsCount');
  if (el) {
    el.textContent = count + ' productos encontrados';
  }
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  updateCartCount();

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchProducts(e.target.value);
    });
  }

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category') || 'all';
      filterByCategory(category);
    });
  });

  const cartOverlay = document.getElementById('cartOverlay');
  if (cartOverlay) {
    cartOverlay.addEventListener('click', (e) => {
      if (e.target === cartOverlay) {
        closeCart();
      }
    });
  }

  const quickViewModal = document.getElementById('quickViewModal');
  if (quickViewModal) {
    quickViewModal.addEventListener('click', (e) => {
      if (e.target === quickViewModal) {
        closeQuickView();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeQuickView();
      closeCart();
    }
  });
});
