// VARIABLES
let currentCategory = 'all';
let allProducts = [];

// INICIALIZAR
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  loadAllProducts();
  setupFilters();
});

// PARTÍCULAS
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
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

// CARGAR TODOS LOS PRODUCTOS
async function loadAllProducts() {
  const grid = document.getElementById('productsGrid');
  const countEl = document.getElementById('productsCount');
  
  try {
    const snap = await db.collection('products').where('inStock', '==', true).orderBy('createdAt', 'desc').get();
    
    if (snap.empty) {
      grid.innerHTML = '<div class="empty-state"><p>📦 No hay productos</p></div>';
      countEl.textContent = '0 productos';
      return;
    }
    
    allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProducts(allProducts);
    countEl.textContent = `${allProducts.length} productos encontrados`;
    
  } catch (e) {
    console.error('Error:', e);
    grid.innerHTML = '<div class="empty-state"><p style="color:#ff4444">Error al cargar</p></div>';
  }
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  
  if (products.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No se encontraron productos</p></div>';
    return;
  }
  
  grid.innerHTML = products.map(p => {
    const discount = p.discount || 0;
    const oldPrice = discount ? Math.round(p.price / (1 - discount/100)) : 0;
    const rating = p.rating || 4;
    const reviews = p.reviews || Math.floor(Math.random() * 100) + 20;
    
    return `
      <div class="product-card-premium" data-category="${p.category||'General'}">
        ${discount > 0 ? `<div class="discount-badge">-${discount}%</div>` : ''}
        ${p.isNew ? '<div class="new-badge">NUEVO</div>' : ''}
        
        <div class="product-image-container">
          <img src="${p.imageUrl||'https://via.placeholder.com/300'}" class="product-image" onerror="this.src='https://via.placeholder.com/300?text=Sin+Imagen'">
          <button class="wishlist-btn">♡</button>
        </div>
        
        <div class="product-info-premium">
          <div class="product-category">${p.category||'General'}</div>
          <h3 class="product-title-premium">${p.title}</h3>
          <div class="product-rating">${'★'.repeat(rating)}${'☆'.repeat(5-rating)} <span class="rating-count">(${reviews})</span></div>
          <div class="product-price-premium">
            <span class="current-price">$${p.price.toLocaleString('es-AR')}</span>
            ${oldPrice ? `<span class="old-price">$${oldPrice.toLocaleString('es-AR')}</span>` : ''}
          </div>
          <p class="product-desc-premium">${p.description||''}</p>
          <button class="btn-add-cart-premium" data-id="${p.id}" data-name="${p.title}" data-price="${p.price}" data-image="${p.imageUrl}">🛒 Agregar al carrito</button>
        </div>
      </div>`;
  }).join('');
  
  // Cart listeners
  document.querySelectorAll('.btn-add-cart-premium').forEach(btn => {
    btn.addEventListener('click', function() {
      if(typeof addToCart === 'function') {
        addToCart(this.dataset.id, this.dataset.name, parseFloat(this.dataset.price), this.dataset.image);
        this.innerHTML = '✅ Agregado';
        this.style.background = '#4CAF50';
        setTimeout(() => { this.innerHTML = '🛒 Agregar al carrito'; this.style.background = ''; }, 1500);
      }
    });
  });
}

function setupFilters() {
  // Category
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const cat = this.dataset.category;
      currentCategory = cat;
      
      if (cat === 'all') {
        renderProducts(allProducts);
        document.getElementById('productsCount').textContent = `${allProducts.length} productos`;
      } else {
        const filtered = allProducts.filter(p => p.category === cat);
        renderProducts(filtered);
        document.getElementById('productsCount').textContent = `${filtered.length} productos`;
      }
    });
  });
  
  // Search
  const searchInput = document.getElementById('productSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const term = this.value.toLowerCase();
      const filtered = allProducts.filter(p => 
        p.title.toLowerCase().includes(term) || 
        (p.description && p.description.toLowerCase().includes(term))
      );
      renderProducts(filtered);
      document.getElementById('productsCount').textContent = `${filtered.length} productos`;
    });
  }
}
