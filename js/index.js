// ========================================
// CELL SPACE - INDEX.JS
// Página de Inicio
// ========================================

// Productos destacados (mismos datos que tienda.js)
const featuredProducts = [
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
  }
];

// ========================================
// CARRITO - Usar el global de cart.js
// ========================================

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
// RENDERIZAR PRODUCTOS DESTACADOS
// ========================================

function renderFeaturedProducts() {
  const grid = document.getElementById('featuredProducts');
  if (!grid) return;

  grid.innerHTML = featuredProducts.map(function(product) {
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
        '<i class="fas fa-box-open" style="font-size:48px;color:var(--orange);opacity:0.5;"></i>' +
        '<span style="font-size:12px;color:#888;margin-top:10px;">' + product.category + '</span>' +
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
}

// ========================================
// CARRITO
// ========================================

function addToCart(productId) {
  var product = featuredProducts.find(function(p) { return p.id === productId; });
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
    container.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">Tu carrito está vacío</p>';
    document.getElementById('cartTotal').textContent = '$0';
    return;
  }

  container.innerHTML = cart.map(function(item) {
    return '<div class="cart-item">' +
      '<div style="width:80px;height:80px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;">' +
        '<i class="fas fa-box" style="font-size:24px;color:var(--orange);"></i>' +
      '</div>' +
      '<div class="cart-item-info">' +
        '<h4 class="cart-item-title">' + item.name + '</h4>' +
        '<p class="cart-item-price">$' + item.price.toFixed(2) + '</p>' +
        '<div style="display:flex;gap:10px;margin-top:10px;align-items:center;">' +
          '<button onclick="updateQuantity(' + item.id + ', -1)" style="padding:5px 10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:white;cursor:pointer;">-</button>' +
          '<span>' + item.quantity + '</span>' +
          '<button onclick="updateQuantity(' + item.id + ', 1)" style="padding:5px 10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:white;cursor:pointer;">+</button>' +
          '<button onclick="removeFromCart(' + item.id + ')" style="margin-left:auto;padding:5px 10px;background:#ff4444;border:none;border-radius:5px;color:white;cursor:pointer;">🗑️</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  var total = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
  document.getElementById('cartTotal').textContent = '$' + total.toFixed(2);
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
  notification.style.cssText = 'position:fixed;top:100px;right:20px;background:var(--orange);color:white;padding:15px 25px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:9999;font-weight:600;';
  document.body.appendChild(notification);

  setTimeout(function() {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(function() { notification.remove(); }, 300);
  }, 3000);
}

// ========================================
// CHECK IMEI
// ========================================

function openIMEIChecker() {
  var modal = document.getElementById('imeiModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeIMEIChecker() {
  var modal = document.getElementById('imeiModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ========================================
// SCROLL SUAVE
// ========================================

function initSmoothScroll() {
  var links = document.querySelectorAll('a[href^="#"]');
  links.forEach(function(link) {
    link.addEventListener('click', function(e) {
      var href = link.getAttribute('href');
      if (href === '#') return;
      
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        var offset = 150;
        var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  // Renderizar productos destacados
  renderFeaturedProducts();
  
  // Actualizar contador del carrito
  updateCartCount();
  
  // Inicializar scroll suave
  initSmoothScroll();
  
  // Cerrar carrito al hacer click fuera
  var cartModal = document.getElementById('cartModal');
  if (cartModal) {
    cartModal.addEventListener('click', function(e) {
      if (e.target === cartModal) toggleCart();
    });
  }
  
  // Cerrar modal IMEI al hacer click fuera
  var imeiModal = document.getElementById('imeiModal');
  if (imeiModal) {
    imeiModal.addEventListener('click', function(e) {
      if (e.target === imeiModal) closeIMEIChecker();
    });
  }
  
  // Cerrar modales con ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeIMEIChecker();
      var cartModal = document.getElementById('cartModal');
      if (cartModal && cartModal.classList.contains('active')) {
        toggleCart();
      }
    }
  });
  
  // Formulario IMEI
  var imeiForm = document.getElementById('imeiForm');
  if (imeiForm) {
    imeiForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var imei = document.getElementById('imeiInput').value.trim();
      
      if (imei.length < 10) {
        alert('⚠️ IMEI inválido. Debe tener al menos 10 dígitos');
        return;
      }
      
      var resultDiv = document.getElementById('imeiResult');
      resultDiv.innerHTML = '<p style="text-align:center;color:#888;">Verificando...</p>';
      resultDiv.style.display = 'block';
      
      // Simular verificación
      setTimeout(function() {
        resultDiv.innerHTML = 
          '<div style="text-align:center;">' +
            '<i class="fas fa-check-circle" style="font-size:48px;color:#4CAF50;margin-bottom:15px;"></i>' +
            '<h3 style="color:#4CAF50;margin-bottom:10px;">IMEI Verificado</h3>' +
            '<p><strong>IMEI:</strong> ' + imei + '</p>' +
            '<p><strong>Estado:</strong> Disponible</p>' +
          '</div>';
      }, 1500);
    });
  }
  
  console.log('✅ index.js cargado correctamente');
});
