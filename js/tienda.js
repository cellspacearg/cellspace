// ========================================
// CELL SPACE - TIENDA JAVASCRIPT
// ========================================

// Datos de productos (sin imágenes externas, usamos placeholder)
const products = [
  {
    id: 1,
    name: "Chimera Tool Premium - 5000 Teléfonos",
    category: "Licencias",
    brand: "Chimera",
    price: 181.00,
    oldPrice: 220.00,
    image: "assets/products/chimera.png",
    rating: 5,
    badge: "OFERTA",
    stock: 15
  },
  {
    id: 2,
    name: "Z3X Box - Samsung Edition",
    category: "Hardware",
    brand: "Z3X",
    price: 145.00,
    oldPrice: null,
    image: "assets/products/z3x.png",
    rating: 4,
    badge: null,
    stock: 8
  },
  {
    id: 3,
    name: "NCK Dongle - Full Activation",
    category: "Licencias",
    brand: "NCK",
    price: 89.00,
    oldPrice: 120.00,
    image: "assets/products/nck.png",
    rating: 5,
    badge: "OFERTA",
    stock: 25
  },
  {
    id: 4,
    name: "Medusa Pro 2 Box",
    category: "Hardware",
    brand: "Medusa",
    price: 299.00,
    oldPrice: 350.00,
    image: "assets/products/medusa.png",
    rating: 5,
    badge: "Últimas unidades",
    stock: 3
  },
  {
    id: 5,
    name: "Octoplus Box - LG Edition",
    category: "Licencias",
    brand: "Octoplus",
    price: 75.00,
    oldPrice: null,
    image: "assets/products/octoplus.png",
    rating: 4,
    badge: null,
    stock: 12
  },
  {
    id: 6,
    name: "Infinity Box - CM2 Chinese Miracle",
    category: "Hardware",
    brand: "Infinity",
    price: 195.00,
    oldPrice: 240.00,
    image: "assets/products/infinity.png",
    rating: 4,
    badge: "OFERTA",
    stock: 6
  }
];

// ========================================
// USAR EL CARRITO GLOBAL (de cart.js)
// ========================================
// No declaramos 'cart' aquí para evitar conflicto
// Usamos window.cart si existe, sino creamos uno local

function getCart() {
  if (typeof window.cart !== 'undefined') {
    return window.cart;
  }
  return JSON.parse(localStorage.getItem('cellspace_cart') || '[]');
}

function setCart(newCart) {
  if (typeof window.cart !== 'undefined') {
    window.cart = newCart;
  }
  localStorage.setItem('cellspace_cart', JSON.stringify(newCart));
}

// ========================================
// RENDERIZAR PRODUCTOS
// ========================================

function renderProducts(productsToRender) {
  if (!productsToRender) productsToRender = products;
  
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (productsToRender.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted);">No se encontraron productos</p>';
    return;
  }

  grid.innerHTML = productsToRender.map(function(product) {
    var badgeHtml = '';
    if (product.badge) {
      var badgeClass = 'product-badge';
      if (product.badge === 'NUEVO') badgeClass += ' new';
      if (product.badge === 'OFERTA') badgeClass += ' sale';
      badgeHtml = '<span class="' + badgeClass + '">' + product.badge + '</span>';
    }

    var oldPriceHtml = '';
    if (product.oldPrice) {
      oldPriceHtml = '<span class="price-old">$' + product.oldPrice.toFixed(2) + '</span>';
    }

    var stars = '';
    for (var i = 0; i < product.rating; i++) stars += '★';
    for (var i = product.rating; i < 5; i++) stars += '☆';

    return '<div class="product-card">' +
      badgeHtml +
      '<div class="product-image-placeholder">' +
        '<i class="fas fa-box-open" style="font-size:48px;color:var(--primary);opacity:0.5;"></i>' +
        '<span style="font-size:12px;color:var(--text-muted);margin-top:10px;">' + product.category + '</span>' +
      '</div>' +
      '<div class="product-info">' +
        '<h3 class="product-title">' + product.name + '</h3>' +
        '<div class="product-price">' +
          '<span class="price-current">$' + product.price.toFixed(2) + '</span>' +
          oldPriceHtml +
        '</div>' +
        '<div class="product-rating"><span class="stars">' + stars + '</span></div>' +
        '<div class="product-actions">' +
          '<button class="btn-add-cart" onclick="addToCart(' + product.id + ')">' +
            '<i class="fas fa-shopping-cart"></i> Agregar' +
          '</button>' +
          '<button class="btn-wishlist" onclick="addToWishlist(' + product.id + ')">' +
            '<i class="far fa-heart"></i>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  // Actualizar contador
  var countEl = document.getElementById('productsCount');
  if (countEl) {
    countEl.textContent = 'Mostrando ' + productsToRender.length + ' productos';
  }
}

// ========================================
// CARRITO
// ========================================

function addToCart(productId) {
  var product = products.find(function(p) { return p.id === productId; });
  if (!product) return;

  var cart = getCart();
  var existingItem = cart.find(function(item) { return item.id === productId; });
  
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

  setCart(cart);
  updateCartCount();
  showNotification('✅ Producto agregado al carrito');
}

function removeFromCart(productId) {
  var cart = getCart();
  cart = cart.filter(function(item) { return item.id !== productId; });
  setCart(cart);
  updateCartCount();
  renderCart();
}

function updateQuantity(productId, change) {
  var cart = getCart();
  var item = cart.find(function(i) { return i.id === productId; });
  if (!item) return;

  item.quantity += change;
  
  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  setCart(cart);
  updateCartCount();
  renderCart();
}

function updateCartCount() {
  var cart = getCart();
  var count = cart.reduce(function(sum, item) { return sum + item.quantity; }, 0);
  var countEl = document.getElementById('cartCount');
  if (countEl) {
    countEl.textContent = count;
    countEl.style.display = count > 0 ? 'flex' : 'none';
  }
}

function toggleCart() {
  var modal = document.getElementById('cartModal');
  if (modal) {
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) {
      renderCart();
    }
  }
}

function renderCart() {
  var container = document.getElementById('cartItems');
  if (!container) return;

  var cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted);">Tu carrito está vacío</p>';
    document.getElementById('cartTotal').textContent = '$0';
    return;
  }

  container.innerHTML = cart.map(function(item) {
    return '<div class="cart-item">' +
      '<div style="width:80px;height:80px;background:var(--dark);border-radius:8px;display:flex;align-items:center;justify-content:center;">' +
        '<i class="fas fa-box" style="font-size:24px;color:var(--primary);"></i>' +
      '</div>' +
      '<div class="cart-item-info">' +
        '<h4 class="cart-item-title">' + item.name + '</h4>' +
        '<p class="cart-item-price">$' + item.price.toFixed(2) + '</p>' +
        '<div style="display:flex;gap:10px;margin-top:10px;align-items:center;">' +
          '<button onclick="updateQuantity(' + item.id + ', -1)" style="padding:5px 10px;background:var(--dark);border:1px solid var(--border);border-radius:5px;color:white;cursor:pointer;">-</button>' +
          '<span>' + item.quantity + '</span>' +
          '<button onclick="updateQuantity(' + item.id + ', 1)" style="padding:5px 10px;background:var(--dark);border:1px solid var(--border);border-radius:5px;color:white;cursor:pointer;">+</button>' +
          '<button onclick="removeFromCart(' + item.id + ')" style="margin-left:auto;padding:5px 10px;background:var(--danger);border:none;border-radius:5px;color:white;cursor:pointer;">🗑️</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  var total = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
  document.getElementById('cartTotal').textContent = '$' + total.toFixed(2);
}

function checkout() {
  var cart = getCart();
  if (cart.length === 0) {
    alert('Tu carrito está vacío');
    return;
  }
  
  var message = '¡Hola! Quiero hacer el siguiente pedido:\n\n';
  cart.forEach(function(item) {
    message += '- ' + item.name + ' x' + item.quantity + ' = $' + (item.price * item.quantity).toFixed(2) + '\n';
  });
  var total = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
  message += '\nTotal: $' + total.toFixed(2);
  
  window.open('https://wa.me/5493782437674?text=' + encodeURIComponent(message), '_blank');
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
  var notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = 'position:fixed;top:100px;right:20px;background:var(--primary);color:white;padding:15px 25px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:9999;font-weight:600;';
  document.body.appendChild(notification);

  setTimeout(function() {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(function() { notification.remove(); }, 300);
  }, 3000);
}

// ========================================
// FILTROS
// ========================================

function filterByCategory(category) {
  // Actualizar active en sidebar
  var links = document.querySelectorAll('.category-list a');
  links.forEach(function(link) {
    link.parentElement.classList.remove('active');
  });
  event.target.closest('li').classList.add('active');

  if (category === 'all' || category === 'Todos los productos') {
    renderProducts(products);
  } else {
    var filtered = products.filter(function(p) {
      return p.category.toLowerCase() === category.toLowerCase() || 
             p.name.toLowerCase().includes(category.toLowerCase());
    });
    renderProducts(filtered);
  }
}

function applyFilters() {
  var brand = document.getElementById('brandSelect').value;
  var category = document.getElementById('categorySelect').value;
  var maxPrice = parseInt(document.getElementById('priceSlider').value);
  var availability = document.getElementById('availabilitySelect').value;

  var filtered = products.filter(function(p) {
    var matchBrand = brand === 'all' || p.brand === brand;
    var matchCategory = category === 'all' || p.category === category;
    var matchPrice = p.price <= maxPrice;
    var matchStock = availability === 'all' || 
                     (availability === 'in-stock' && p.stock > 0) ||
                     (availability === 'preorder' && p.stock === 0);
    return matchBrand && matchCategory && matchPrice && matchStock;
  });

  renderProducts(filtered);
}

function sortProducts() {
  var sort = document.getElementById('sortSelect').value;
  var sorted = products.slice();

  if (sort === 'price-asc') {
    sorted.sort(function(a, b) { return a.price - b.price; });
  } else if (sort === 'price-desc') {
    sorted.sort(function(a, b) { return b.price - a.price; });
  } else if (sort === 'rating') {
    sorted.sort(function(a, b) { return b.rating - a.rating; });
  }

  renderProducts(sorted);
}

function performSearch() {
  var query = document.getElementById('headerSearchInput').value.toLowerCase();
  var filtered = products.filter(function(p) {
    return p.name.toLowerCase().includes(query) ||
           p.category.toLowerCase().includes(query) ||
           p.brand.toLowerCase().includes(query);
  });
  renderProducts(filtered);
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  renderProducts();
  updateCartCount();

  // Búsqueda con Enter
  var searchInput = document.getElementById('headerSearchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') performSearch();
    });
  }

  // Slider de precio
  var priceSlider = document.getElementById('priceSlider');
  if (priceSlider) {
    priceSlider.addEventListener('input', function() {
      document.getElementById('maxPriceLabel').textContent = '$' + parseInt(this.value).toLocaleString('es-AR');
    });
  }

  // Cerrar carrito al hacer click fuera
  var cartModal = document.getElementById('cartModal');
  if (cartModal) {
    cartModal.addEventListener('click', function(e) {
      if (e.target === cartModal) toggleCart();
    });
  }
});
