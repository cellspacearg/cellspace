// ========================================
// CELL SPACE - TIENDA JAVASCRIPT
// ========================================

// Datos de productos
const products = [
  {
    id: 1,
    name: "iPhone 15 Pro Max 256GB - Titanio Azul",
    category: "Celulares",
    brand: "Apple",
    price: 2199999,
    oldPrice: 2499999,
    image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400&h=400&fit=crop",
    rating: 5,
    badge: "NUEVO",
    stock: 15
  },
  {
    id: 2,
    name: "Samsung Galaxy S24 Ultra 512GB",
    category: "Celulares",
    brand: "Samsung",
    price: 1999999,
    oldPrice: null,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop",
    rating: 5,
    badge: "NUEVO",
    stock: 10
  },
  {
    id: 3,
    name: "Xiaomi 14 512GB",
    category: "Celulares",
    brand: "Xiaomi",
    price: 1199999,
    oldPrice: null,
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop",
    rating: 4,
    badge: "NUEVO",
    stock: 20
  },
  {
    id: 4,
    name: "MacBook Air M3 13.6\" 256GB",
    category: "Notebooks",
    brand: "Apple",
    price: 1699999,
    oldPrice: null,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop",
    rating: 5,
    badge: null,
    stock: 8
  },
  {
    id: 5,
    name: "AirPods Pro 2 USB-C",
    category: "Audio",
    brand: "Apple",
    price: 499999,
    oldPrice: 599999,
    image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=400&fit=crop",
    rating: 5,
    badge: "OFERTA",
    stock: 25
  },
  {
    id: 6,
    name: "Apple Watch Series 9",
    category: "Smartwatch",
    brand: "Apple",
    price: 699999,
    oldPrice: null,
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop",
    rating: 5,
    badge: null,
    stock: 12
  },
  {
    id: 7,
    name: "Samsung Galaxy Watch 6 Classic",
    category: "Smartwatch",
    brand: "Samsung",
    price: 599999,
    oldPrice: null,
    image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop",
    rating: 4,
    badge: null,
    stock: 18
  },
  {
    id: 8,
    name: "Cargador MagSafe Apple 15W",
    category: "Accesorios",
    brand: "Apple",
    price: 59999,
    oldPrice: null,
    image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop",
    rating: 4,
    badge: null,
    stock: 50
  },
  {
    id: 9,
    name: "Vidrio Templado Premium",
    category: "Accesorios",
    brand: "Generic",
    price: 9999,
    oldPrice: 14999,
    image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop",
    rating: 4,
    badge: "OFERTA",
    stock: 100
  },
  {
    id: 10,
    name: "Auriculares JBL Tune 720BT",
    category: "Audio",
    brand: "JBL",
    price: 99999,
    oldPrice: null,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
    rating: 4,
    badge: null,
    stock: 30
  },
  {
    id: 11,
    name: "Cable USB-C a Lightning",
    category: "Accesorios",
    brand: "Apple",
    price: 9999,
    oldPrice: null,
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&h=400&fit=crop",
    rating: 4,
    badge: null,
    stock: 75
  },
  {
    id: 12,
    name: "Case iPhone 15 Pro Spigen Ultra Hybrid",
    category: "Accesorios",
    brand: "Spigen",
    price: 19999,
    oldPrice: null,
    image: "https://images.unsplash.com/photo-1603313011101-320f26a4f6f6?w=400&h=400&fit=crop",
    rating: 5,
    badge: null,
    stock: 40
  }
];

// Carrito
let cart = JSON.parse(localStorage.getItem('cellspace_cart') || '[]');

// ========================================
// RENDERIZAR PRODUCTOS
// ========================================

function renderProducts(productsToRender = products) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (productsToRender.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted);">No se encontraron productos</p>';
    return;
  }

  grid.innerHTML = productsToRender.map(product => `
    <div class="product-card">
      ${product.badge ? `<span class="product-badge ${product.badge.toLowerCase()}">${product.badge}</span>` : ''}
      <img src="${product.image}" alt="${product.name}" class="product-image">
      <div class="product-info">
        <h3 class="product-title">${product.name}</h3>
        <div class="product-price">
          <span class="price-current">$${product.price.toLocaleString('es-AR')}</span>
          ${product.oldPrice ? `<span class="price-old">$${product.oldPrice.toLocaleString('es-AR')}</span>` : ''}
        </div>
        <div class="product-rating">
          <span class="stars">${'★'.repeat(product.rating)}${'☆'.repeat(5 - product.rating)}</span>
        </div>
        <div class="product-actions">
          <button class="btn-add-cart" onclick="addToCart(${product.id})">
            <i class="fas fa-shopping-cart"></i>
            Agregar
          </button>
          <button class="btn-wishlist" onclick="addToWishlist(${product.id})">
            <i class="far fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ========================================
// CARRITO
// ========================================

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.id === productId);
  
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
  showNotification('✅ Producto agregado al carrito');
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
    if (modal.classList.contains('active')) {
      renderCart();
    }
  }
}

function renderCart() {
  const container = document.getElementById('cartItems');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted);">Tu carrito está vacío</p>';
    document.getElementById('cartTotal').textContent = '$0';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <h4 class="cart-item-title">${item.name}</h4>
        <p class="cart-item-price">$${item.price.toLocaleString('es-AR')}</p>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button onclick="updateQuantity(${item.id}, -1)" style="padding:5px 10px;background:var(--dark);border:1px solid var(--border);border-radius:5px;color:white;cursor:pointer;">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity(${item.id}, 1)" style="padding:5px 10px;background:var(--dark);border:1px solid var(--border);border-radius:5px;color:white;cursor:pointer;">+</button>
          <button onclick="removeFromCart(${item.id})" style="margin-left:auto;padding:5px 10px;background:var(--danger);border:none;border-radius:5px;color:white;cursor:pointer;">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('cartTotal').textContent = '$' + total.toLocaleString('es-AR');
}

// ========================================
// WISHLIST
// ========================================

function addToWishlist(productId) {
  showNotification('❤️ Producto agregado a favoritos');
}

// ========================================
// NOTIFICACIONES
// ========================================

function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: var(--primary);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 9999;
    font-weight: 600;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ========================================
// FILTROS Y BÚSQUEDA
// ========================================

function filterByCategory(category) {
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
    p.category.toLowerCase().includes(query.toLowerCase()) ||
    p.brand.toLowerCase().includes(query.toLowerCase())
  );
  renderProducts(filtered);
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  updateCartCount();

  // Búsqueda
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchProducts(e.target.value);
    });
  }

  // Categorías
  document.querySelectorAll('.category-list a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.category-list li').forEach(li => li.classList.remove('active'));
      link.parentElement.classList.add('active');
      
      const category = link.textContent.trim();
      if (category === 'Todos los productos') {
        renderProducts(products);
      } else {
        filterByCategory(category);
      }
    });
  });

  // Cerrar carrito al hacer click fuera
  const cartModal = document.getElementById('cartModal');
  if (cartModal) {
    cartModal.addEventListener('click', (e) => {
      if (e.target === cartModal) {
        toggleCart();
      }
    });
  }
});

// Animaciones CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100px); opacity: 0; }
  }
`;
document.head.appendChild(style);
