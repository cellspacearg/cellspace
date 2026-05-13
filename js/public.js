// VARIABLES GLOBALES
let currentSlide = 0;
let slideInterval;
let currentCategory = 'all';
let allProducts = [];

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  loadCarousel();
  loadServices();
  loadProducts();
  loadContact();
});

// ========== PARTÍCULAS ==========
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

// ========== CARRUSEL DINÁMICO ==========
async function loadCarousel() {
  const carousel = document.getElementById('carousel');
  try {
    const snap = await db.collection('hero_slides').where('active', '==', true).orderBy('order', 'asc').get();
    
    if (snap.empty) {
      carousel.innerHTML = `
        <div class="carousel-slide active">
          <img src="https://i.imgur.com/8Km9tLL.jpg" alt="Servicio">
          <div class="carousel-content">
            <h1>Servicio Técnico Especializado</h1>
            <h2>Celulares • PC • Consolas</h2>
            <a href="https://wa.me/5493782437674" class="btn">Contactar por WhatsApp</a>
          </div>
        </div>
        <div class="carousel-slide">
          <img src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=1920" alt="Reparación">
          <div class="carousel-content">
            <h1>Reparación Express</h1>
            <h2>Servicio en el día</h2>
            <a href="https://wa.me/5493782437674" class="btn">Agendar Turno</a>
          </div>
        </div>
        <button class="carousel-btn prev" onclick="changeSlide(-1)">❮</button>
        <button class="carousel-btn next" onclick="changeSlide(1)">❯</button>
        <div class="carousel-dots">
          <span class="dot active" onclick="goToSlide(0)"></span>
          <span class="dot" onclick="goToSlide(1)"></span>
        </div>`;
      startCarousel();
      return;
    }
    
    let slidesHTML = '';
    let dotsHTML = '';
    
    snap.forEach((doc, index) => {
      const s = doc.data();
      slidesHTML += `
        <div class="carousel-slide ${index === 0 ? 'active' : ''}">
          <img src="${s.imageUrl || 'https://via.placeholder.com/1920x600'}" alt="${s.title}">
          <div class="carousel-content">
            <h1>${s.title}</h1>
            <h2>${s.subtitle || ''}</h2>
            <a href="https://wa.me/5493782437674?text=${encodeURIComponent(s.buttonText || 'Consultar')}" class="btn">${s.buttonText || 'Contactar'}</a>
          </div>
        </div>`;
      dotsHTML += `<span class="dot ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></span>`;
    });
    
    carousel.innerHTML = `
      ${slidesHTML}
      <button class="carousel-btn prev" onclick="changeSlide(-1)">❮</button>
      <button class="carousel-btn next" onclick="changeSlide(1)">❯</button>
      <div class="carousel-dots">${dotsHTML}</div>`;
    
    startCarousel();
  } catch (e) {
    console.error('Error cargando carousel:', e);
    carousel.innerHTML = '<p style="color:white;text-align:center">Error</p>';
  }
}

function startCarousel() {
  slideInterval = setInterval(() => changeSlide(1), 5000);
}

function showSlide(n) {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.dot');
  if (!slides.length) return;
  
  if (n >= slides.length) currentSlide = 0;
  if (n < 0) currentSlide = slides.length - 1;
  
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}

function changeSlide(n) {
  currentSlide += n;
  showSlide(currentSlide);
  resetInterval();
}

function goToSlide(n) {
  currentSlide = n;
  showSlide(currentSlide);
  resetInterval();
}

function resetInterval() {
  clearInterval(slideInterval);
  slideInterval = setInterval(() => changeSlide(1), 5000);
}

// ========== SERVICIOS ==========
async function loadServices() {
  const grid = document.getElementById('servicesGrid');
  try {
    const snap = await db.collection('services').get();
    if (snap.empty) {
      grid.innerHTML = `
        <div class="service-card"><div class="service-icon">📱</div><h3>Celulares</h3><p>Pantallas, baterías, placas</p></div>
        <div class="service-card"><div class="service-icon">💻</div><h3>PC/Laptop</h3><p>Formateo, limpieza</p></div>
        <div class="service-card"><div class="service-icon">🎮</div><h3>Consolas</h3><p>HDMI, mantenimiento</p></div>
        <div class="service-card"><div class="service-icon">🤖</div><h3>Software</h3><p>Desbloqueo, FRP</p></div>`;
      return;
    }
    grid.innerHTML = snap.docs.map(d => {
      const s = d.data();
      return `<div class="service-card"><div class="service-icon">${s.icon || '🔧'}</div><h3>${s.title}</h3><p>${s.description || ''}</p></div>`;
    }).join('');
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--muted)">Error</p>';
  }
}

// ========== TIENDA PREMIUM ==========
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  const countEl = document.getElementById('productsCount');
  
  try {
    const snap = await db.collection('products').where('inStock', '==', true).orderBy('createdAt', 'desc').get();
    
    if (snap.empty) {
      grid.innerHTML = '<div class="empty-state"><p>📦 No hay productos disponibles</p></div>';
      countEl.textContent = '0 productos';
      return;
    }
    
    allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProducts(allProducts);
    countEl.textContent = `${allProducts.length} productos encontrados`;
    setupFilters();
    
  } catch (e) {
    console.error('Error cargando productos:', e);
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
    const oldPrice = discount ? Math.round(p.price / (1 - discount / 100)) : 0;
    const rating = p.rating || Math.floor(Math.random() * 2) + 4; // 4 o 5 estrellas por defecto
    const reviews = p.reviews || Math.floor(Math.random() * 100) + 20;
    
    return `
      <div class="product-card-premium" data-category="${p.category || 'General'}">
        ${discount > 0 ? `<div class="discount-badge">-${discount}%</div>` : ''}
        ${p.isNew ? '<div class="new-badge">NUEVO</div>' : ''}
        
        <div class="product-image-container">
          <img src="${p.imageUrl || 'https://via.placeholder.com/300x300?text=Producto'}" 
               alt="${p.title}" 
               class="product-image"
               onerror="this.src='https://via.placeholder.com/300x300?text=Sin+Imagen'">
          <button class="wishlist-btn">♡</button>
        </div>
        
        <div class="product-info-premium">
          <div class="product-category">${p.category || 'General'}</div>
          <h3 class="product-title-premium">${p.title}</h3>
          
          <div class="product-rating">
            ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
            <span class="rating-count">(${reviews})</span>
          </div>
          
          <div class="product-price-premium">
            <span class="current-price">$${p.price.toLocaleString('es-AR')}</span>
            ${oldPrice ? `<span class="old-price">$${oldPrice.toLocaleString('es-AR')}</span>` : ''}
          </div>
          
          <p class="product-desc-premium">${p.description || ''}</p>
          
          <button class="btn-add-cart-premium" 
                  data-id="${p.id}" 
                  data-name="${p.title}" 
                  data-price="${p.price}" 
                  data-image="${p.imageUrl}">
            🛒 Agregar al carrito
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Re-attach cart listeners
  document.querySelectorAll('.btn-add-cart-premium').forEach(btn => {
    btn.addEventListener('click', function() {
      if(typeof addToCart === 'function') {
        addToCart(this.dataset.id, this.dataset.name, parseFloat(this.dataset.price), this.dataset.image);
        this.innerHTML = '✅ Agregado';
        this.style.background = '#4CAF50';
        setTimeout(() => {
          this.innerHTML = '🛒 Agregar al carrito';
          this.style.background = '';
        }, 1500);
      }
    });
  });
}

function setupFilters() {
  // Category Filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.dataset.category;
      currentCategory = category;
      
      if (category === 'all') {
        renderProducts(allProducts);
        document.getElementById('productsCount').textContent = `${allProducts.length} productos encontrados`;
      } else {
        const filtered = allProducts.filter(p => p.category === category);
        renderProducts(filtered);
        document.getElementById('productsCount').textContent = `${filtered.length} productos encontrados`;
      }
    });
  });
  
  // Search Filter
  const searchInput = document.getElementById('productSearch');
  if(searchInput) {
    searchInput.addEventListener('input', function() {
      const term = this.value.toLowerCase();
      const filtered = allProducts.filter(p => 
        p.title.toLowerCase().includes(term) || 
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term))
      );
      renderProducts(filtered);
      document.getElementById('productsCount').textContent = `${filtered.length} productos encontrados`;
    });
  }
}

// ========== CONTACTO ==========
async function loadContact() {
  try {
    const doc = await db.collection('site_config').doc('contact').get();
    if (doc.exists) {
      const c = doc.data();
      document.getElementById('footerAddress').textContent = c.address || 'Saladas, Corrientes';
      document.getElementById('footerHours').textContent = c.hours || 'Lun-Sáb 9-20hs';
      document.getElementById('footerPhone').textContent = 'WhatsApp: ' + (c.phone || '3782-437674');
    }
  } catch (e) { console.error('Error cargando contacto:', e); }
}
