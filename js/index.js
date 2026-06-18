// ========================================
// CELL SPACE - INDEX.JS (CLIENTE)
// Funcionalidades del home: carrusel, scroll, carga de datos
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ index.js cargado');
  
  // Inicializar componentes
  initCarousel();
  initSmoothScroll();
  loadServices();
  loadFeaturedProducts();
});

// ========================================
// CARRUSEL / HERO
// ========================================

const carouselSlides = [
  {
    image: 'assets/carousel/slide1.jpg',
    title: 'Reparaciones Profesionales',
    subtitle: 'Técnicos certificados, garantía y precio justo',
    cta: 'Ver Servicios',
    link: '#servicios'
  },
  {
    image: 'assets/carousel/slide2.jpg',
    title: 'Licencias Premium',
    subtitle: 'Chimera, Z3X, NCK y más. Entrega inmediata',
    cta: 'Ir a la Tienda',
    link: 'tienda.html'
  },
  {
    image: 'assets/carousel/slide3.jpg',
    title: 'Soporte Técnico 24/7',
    subtitle: 'Escribinos por WhatsApp para asistencia rápida',
    cta: 'Contactar',
    link: '#contacto'
  }
];

function initCarousel() {
  const carousel = document.getElementById('carousel');
  if (!carousel) return;

  let currentSlide = 0;

  const renderSlide = (index) => {
    const slide = carouselSlides[index];
    carousel.innerHTML = `
      <div class="carousel-slide active" style="background-image: url('${slide.image}');">
        <div class="carousel-slide::before"></div>
        <div class="carousel-content">
          <h1>${slide.title}</h1>
          <h2>${slide.subtitle}</h2>
          <a href="${slide.link}" class="btn">${slide.cta}</a>
        </div>
      </div>
      <div class="carousel-dots">
        ${carouselSlides.map((_, i) => 
          `<span class="dot ${i === index ? 'active' : ''}" onclick="goToSlide(${i})"></span>`
        ).join('')}
      </div>
      <button class="carousel-btn prev" onclick="changeSlide(-1)">❮</button>
      <button class="carousel-btn next" onclick="changeSlide(1)">❯</button>
    `;
  };

  window.goToSlide = (index) => {
    currentSlide = index;
    renderSlide(currentSlide);
  };

  window.changeSlide = (direction) => {
    currentSlide = (currentSlide + direction + carouselSlides.length) % carouselSlides.length;
    renderSlide(currentSlide);
  };

  // Auto-play
  setInterval(() => changeSlide(1), 5000);
  
  // Render inicial
  renderSlide(0);
}

// ========================================
// SCROLL SUAVE PARA BARRA SECUNDARIA
// ========================================

function initSmoothScroll() {
  document.querySelectorAll('.secondary-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Actualizar activo
      document.querySelectorAll('.secondary-menu a').forEach(a => a.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      const targetId = e.currentTarget.getAttribute('href');
      
      if (targetId.startsWith('#')) {
        const target = document.querySelector(targetId);
        if (target) {
          const offset = 120; // Altura de navbar + secondary-nav
          const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
          
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });

  // Highlight al hacer scroll
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.pageYOffset;
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 150;
      const sectionId = section.getAttribute('id');
      
      if (scrollY >= sectionTop) {
        document.querySelectorAll('.secondary-menu a').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  });
}

// ========================================
// CARGAR SERVICIOS DESDE FIRESTORE
// ========================================

async function loadServices() {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;

  try {
    const snapshot = await db.collection('services').orderBy('order', 'asc').get();
    
    if (snapshot.empty) {
      // Datos de fallback
      grid.innerHTML = `
        <div class="service-card">
          <div class="service-icon">🔧</div>
          <h3>Reparación de Hardware</h3>
          <p>Cambio de pantallas, baterías, conectores y más.</p>
        </div>
        <div class="service-card">
          <div class="service-icon">💻</div>
          <h3>Software y Desbloqueo</h3>
          <p>Flasheo, eliminación de FRP, códigos de red.</p>
        </div>
        <div class="service-card">
          <div class="service-icon">🔬</div>
          <h3>Microsoldadura</h3>
          <p>Reparación de placas a nivel componente.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = snapshot.docs.map(doc => {
      const s = doc.data();
      return `
        <div class="service-card">
          <div class="service-icon">${s.icon || '🔧'}</div>
          <h3>${s.name}</h3>
          <p>${s.description}</p>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error cargando servicios:', error);
    grid.innerHTML = '<p style="color:var(--muted);text-align:center;">Error al cargar servicios</p>';
  }
}

// ========================================
// CARGAR PRODUCTOS DESTACADOS
// ========================================

async function loadFeaturedProducts() {
  const grid = document.getElementById('featuredProducts');
  if (!grid) return;

  try {
    const snapshot = await db.collection('products')
      .orderBy('featured', 'desc')
      .limit(4)
      .get();
    
    if (snapshot.empty) {
      // Fallback products
      grid.innerHTML = `
        <div class="product-card-premium">
          <div class="product-image-container">
            <img src="assets/products/chimera.png" alt="Chimera" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23333%22 width=%22200%22 height=%22200%22/%3E%3Ctext fill=%22%23888%22 x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2214%22>No Image</text%3E%3C/svg%3E'">
          </div>
          <div class="product-info-premium">
            <div class="product-category">Licencias</div>
            <h3 class="product-title-premium">Chimera Tool Premium</h3>
            <div class="product-price-premium">
              <span class="current-price">$181.00</span>
            </div>
            <button class="btn-add-cart-premium" onclick="addToCart(1)">🛒 Agregar</button>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = snapshot.docs.map(doc => {
      const p = doc.data();
      const id = doc.id;
      return `
        <div class="product-card-premium">
          ${p.oldPrice ? `<span class="discount-badge">-${Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)}%</span>` : ''}
          <div class="product-image-container">
            <img src="${p.image}" alt="${p.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23333%22 width=%22200%22 height=%22200%22/%3E%3Ctext fill=%22%23888%22 x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2214%22>No Image</text%3E%3C/svg%3E'">
          </div>
          <div class="product-info-premium">
            <div class="product-category">${p.category}</div>
            <h3 class="product-title-premium">${p.name}</h3>
            <div class="product-price-premium">
              <span class="current-price">$${p.price.toFixed(2)}</span>
              ${p.oldPrice ? `<span class="old-price">$${p.oldPrice.toFixed(2)}</span>` : ''}
            </div>
            <button class="btn-add-cart-premium" onclick="addToCart('${id}')">🛒 Agregar</button>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error cargando productos:', error);
    grid.innerHTML = '<p style="color:var(--muted);text-align:center;">Error al cargar productos</p>';
  }
}
