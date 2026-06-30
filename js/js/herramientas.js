// ========================================
// HERRAMIENTAS PROFESIONALES - Solo Técnicos
// ========================================

const tools = [
  {
    id: 1,
    name: "Chimera Tool Premium - 5000 Teléfonos",
    category: "Software",
    price: 181.00,
    priceTechnician: 150.00,
    description: "Licencia premium para reparación y desbloqueo de hasta 5000 teléfonos. Incluye acceso a servidores automáticos con entrega instantánea.",
    badge: "PREMIUM",
    rating: 5
  },
  {
    id: 2,
    name: "Z3X Box - Samsung Edition",
    category: "Hardware",
    price: 145.00,
    priceTechnician: 120.00,
    description: "Z3X Box edición Samsung para reparación de firmware, desbloqueo y mantenimiento de dispositivos Samsung Galaxy.",
    badge: "PROFESIONAL",
    rating: 5
  },
  {
    id: 3,
    name: "NCK Dongle - Full Activation",
    category: "Software",
    price: 89.00,
    priceTechnician: 75.00,
    description: "Activación completa de NCK Dongle para desbloqueo de códigos de red en múltiples marcas y modelos.",
    badge: "POPULAR",
    rating: 4
  },
  {
    id: 4,
    name: "Medusa Pro 2 Box",
    category: "Hardware",
    price: 299.00,
    priceTechnician: 250.00,
    description: "Medusa Pro 2 para reparación avanzada de firmware, recuperación de datos y flasheo de dispositivos móviles.",
    badge: "AVANZADO",
    rating: 5
  },
  {
    id: 5,
    name: "Octoplus Box - LG Edition",
    category: "Software",
    price: 75.00,
    priceTechnician: 60.00,
    description: "Licencia Octoplus para dispositivos LG. Incluye herramientas de flasheo, reparación de IMEI y más.",
    badge: "ECONÓMICO",
    rating: 4
  },
  {
    id: 6,
    name: "Infinity Box - CM2 Chinese Miracle",
    category: "Hardware",
    price: 195.00,
    priceTechnician: 160.00,
    description: "Infinity Box CM2 para reparación de firmware chino, desbloqueo y flasheo de múltiples marcas asiáticas.",
    badge: "ESPECIALIZADO",
    rating: 4
  }
];

async function renderTools() {
  const grid = document.getElementById('toolsGrid');
  if (!grid) return;
  
  const user = firebase.auth().currentUser;
  if (!user) {
    grid.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">🔒 Debés iniciar sesión como técnico para ver las herramientas</p>';
    return;
  }
  
  const userRole = await getUserRole(user);
  
  grid.innerHTML = tools.map(tool => {
    const price = (userRole === 'technician' || userRole === 'admin') 
      ? tool.priceTechnician 
      : tool.price;
    
    const discount = userRole === 'technician' || userRole === 'admin';
    
    const stars = '★'.repeat(tool.rating) + '☆'.repeat(5 - tool.rating);
    
    return `
      <div class="product-card">
        <span class="product-badge">${tool.badge}</span>
        <div class="product-image-placeholder">
          <i class="fas fa-tools" style="font-size:48px;color:var(--orange);"></i>
          <span style="font-size:12px;color:#888;">${tool.category}</span>
        </div>
        <div class="product-info">
          <h3 class="product-title">${tool.name}</h3>
          <div class="product-rating">
            <span class="stars">${stars}</span>
          </div>
          <div class="product-price">
            <span class="price-current">$${price.toFixed(2)}</span>
            ${discount ? '<span class="price-old">$' + tool.price.toFixed(2) + '</span>' : ''}
          </div>
          <p style="color:#888;font-size:13px;margin-bottom:15px;line-height:1.5;">${tool.description}</p>
          <div class="product-actions">
            <button class="btn-add-cart" onclick="addToCart(${tool.id})">
              <i class="fas fa-shopping-cart"></i> Agregar al Carrito
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function addToCart(toolId) {
  const tool = tools.find(t => t.id === toolId);
  if (!tool) return;
  
  let cart = JSON.parse(localStorage.getItem('cellspace_cart') || '[]');
  const existingItem = cart.find(item => item.id === toolId);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: tool.id,
      name: tool.name,
      price: tool.priceTechnician,
      quantity: 1
    });
  }
  
  localStorage.setItem('cellspace_cart', JSON.stringify(cart));
  updateCartCount();
  showNotification('✅ ' + tool.name + ' agregado al carrito');
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cellspace_cart') || '[]');
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById('cartCount');
  if (countEl) {
    countEl.textContent = count;
    countEl.style.display = count > 0 ? 'flex' : 'none';
  }
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

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  renderTools();
  updateCartCount();
});
