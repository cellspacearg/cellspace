// ========================================
// CELL SPACE - TIENDA
// Carga de productos con manejo de errores
// ========================================

console.log('🛒 Cargando tienda...');

let allProducts = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ DOM cargado - Iniciando tienda');
  createParticles();
  await loadProducts();
  setupFilters();
  setupSearch();
});

function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (8 + Math.random() * 15) + 's';
    p.style.animationDelay = Math.random() * 10 + 's';
    p.style.width = p.style.height = (1 + Math.random() * 3) + 'px';
    p.style.opacity = 0.1 + Math.random() * 0.4;
    container.appendChild(p);
  }
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  const countEl = document.getElementById('productsCount');
  
  console.log('📦 Intentando cargar productos...');
  
  try {
    // Verificar que Firebase esté disponible
    if (typeof db === 'undefined') {
      throw new Error('Firebase no está inicializado');
    }
    
    grid.innerHTML = '<div class="loading-premium"><div class="spinner"></div><p>Cargando productos...</p></div>';
    
    // Consultar productos
    const snapshot = await db.collection('products')
      .orderBy('createdAt', 'desc')
      .get();
    
    console.log('📦 Productos encontrados:', snapshot.size);
    
    if (snapshot.empty) {
      grid.innerHTML = '<p class="empty-state">No hay productos disponibles aún</p>';
      if (countEl) countEl.textContent = '0 productos';
      return;
    }
    
    allProducts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('✅ Productos cargados:', allProducts);
    displayProducts(allProducts);
    
    if (countEl) {
      countEl.textContent = `${allProducts.length} producto${allProducts.length !== 1 ? 's' : ''} encontrado${allProducts.length !== 1 ? 's' : ''}`;
    }
    
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
    grid.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:#ff4444;">
        <p style="font-size:1.2rem;margin-bottom:10px;">Error al cargar productos</p>
        <p style="font-size:0.9rem;color:var(--muted);">${error.message}</p>
        <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:var(--orange);color:white;border:none;border-radius:8px;cursor:pointer;">🔄 Recargar</button>
      </div>
    `;
  }
}

function displayProducts(products) {
  const grid = document.getElementById('productsGrid');
  
  if (!products || products.length === 0) {
    grid.innerHTML = '<p class="empty-state">No se encontraron productos</p>';
    return;
  }
  
  grid.innerHTML = products.map(product => {
    const price = Number(product.price) || 0;
    const imageUrl = product.imageUrl || 'https://via.placeholder.com/400x300?text=Sin+imagen';
    const title = product.title || 'Sin título';
    const category = product.category || 'General';
    const inStock = product.inStock !== false;
    
    return `
      <div class="product-card-premium" data-category="${category}" data-id="${product.id}">
        <div class="product-image-container">
          <img src="${imageUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/400x300?text=Error+imagen'">
          ${!inStock ? '<div class="out-of-stock-badge">Agotado</div>' : ''}
          <div class="product-overlay">
            <button onclick="addToCart('${product.id}')" class="btn-add-cart" ${!inStock ? 'disabled' : ''}>
              ${inStock ? '🛒 Agregar' : '⚠️ Sin stock'}
            </button>
          </div>
        </div>
        <div class="product-info-premium">
          <div class="product-category">${category}</div>
          <h3 class="product-title">${title}</h3>
          ${product.description ? `<p class="product-description">${product.description.substring(0, 80)}${product.description.length > 80 ? '...' : ''}</p>` : ''}
          <div class="product-footer">
            <div class="product-price">$${price.toLocaleString('es-AR')}</div>
            <button onclick="viewProduct('${product.id}')" class="btn-details">Ver más</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.dataset.category;
      currentCategory = category;
      
      if (category === 'all') {
        displayProducts(allProducts);
      } else {
        const filtered = allProducts.filter(p => p.category === category);
        displayProducts(filtered);
      }
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById('productSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const term = this.value.toLowerCase().trim();
      
      if (!term) {
        displayProducts(allProducts);
        return;
      }
      
      const filtered = allProducts.filter(p => 
        p.title?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      );
      
      displayProducts(filtered);
      
      const countEl = document.getElementById('productsCount');
      if (countEl) {
        countEl.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`;
      }
    });
  }
}

window.addToCart = function(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) {
    alert('❌ Producto no encontrado');
    return;
  }
  
  if (!product.inStock) {
    alert('⚠️ Producto sin stock');
    return;
  }
  
  // Crear evento de carrito
  const event = new CustomEvent('addToCart', {
    detail: {
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.imageUrl
    }
  });
  
  document.dispatchEvent(event);
  alert(`✅ ${product.title} agregado al carrito`);
};

window.viewProduct = function(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  
  alert(`📦 ${product.title}\n💰 $${Number(product.price).toLocaleString('es-AR')}\n\nPróximamente: vista detallada del producto`);
};

console.log('✅ shop.js cargado correctamente');
