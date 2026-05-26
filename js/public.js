// VARIABLES
let currentSlide = 0;
let slideInterval;

// INICIALIZAR
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  loadCarousel();
  loadServices();
  loadFeaturedProducts();
  loadContact();
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

// CARRUSEL
async function loadCarousel() {
  const carousel = document.getElementById('carousel');
  try {
    const snap = await db.collection('hero_slides').where('active', '==', true).orderBy('order', 'asc').get();
    
    if (snap.empty) {
      carousel.innerHTML = `
        <div class="carousel-slide active">
          <img src="https://i.imgur.com/8Km9tLL.jpg">
          <div class="carousel-content">
            <h1>Servicio Técnico Especializado</h1>
            <h2>Celulares • PC • Consolas</h2>
            <a href="https://wa.me/5493782437674" class="btn">Contactar</a>
          </div>
        </div>`;
      return;
    }
    
    let slidesHTML = '';
    snap.forEach((doc, index) => {
      const s = doc.data();
      slidesHTML += `<div class="carousel-slide ${index===0?'active':''}"><img src="${s.imageUrl}"><div class="carousel-content"><h1>${s.title}</h1><h2>${s.subtitle||''}</h2><a href="https://wa.me/5493782437674" class="btn">${s.buttonText||'Contactar'}</a></div></div>`;
    });
    
    carousel.innerHTML = slidesHTML + `<button class="carousel-btn prev" onclick="changeSlide(-1)">❮</button><button class="carousel-btn next" onclick="changeSlide(1)">❯</button>`;
    slideInterval = setInterval(() => changeSlide(1), 5000);
  } catch (e) { console.error(e); }
}

function changeSlide(n) {
  const slides = document.querySelectorAll('.carousel-slide');
  if (!slides.length) return;
  slides[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + n + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
}

// SERVICIOS
async function loadServices() {
  const grid = document.getElementById('servicesGrid');
  try {
    const snap = await db.collection('services').get();
    if (snap.empty) {
      grid.innerHTML = `<div class="service-card"><div class="service-icon">📱</div><h3>Celulares</h3><p>Reparación express</p></div><div class="service-card"><div class="service-icon">💻</div><h3>PC/Laptop</h3><p>Formateo y limpieza</p></div><div class="service-card"><div class="service-icon">🎮</div><h3>Consolas</h3><p>Mantenimiento</p></div>`;
      return;
    }
    grid.innerHTML = snap.docs.map(d => {
      const s = d.data();
      return `<div class="service-card"><div class="service-icon">${s.icon||'🔧'}</div><h3>${s.title}</h3><p>${s.description||''}</p></div>`;
    }).join('');
  } catch (e) { console.error(e); }
}

// PRODUCTOS DESTACADOS (Solo 4-6)
async function loadFeaturedProducts() {
  const grid = document.getElementById('featuredProducts');
  try {
    const snap = await db.collection('products').where('inStock', '==', true).orderBy('createdAt', 'desc').limit(6).get();
    
    if (snap.empty) {
      grid.innerHTML = '<div class="empty-state"><p>No hay productos destacados</p><a href="tienda.html" class="btn" style="margin-top:20px">Ver Tienda</a></div>';
      return;
    }
    
    grid.innerHTML = snap.docs.map(doc => {
      const p = doc.data();
      return `
        <div class="product-card-premium">
          ${p.discount ? `<div class="discount-badge">-${p.discount}%</div>` : ''}
          <div class="product-image-container">
            <img src="${p.imageUrl||'https://via.placeholder.com/300'}" class="product-image">
          </div>
          <div class="product-info-premium">
            <div class="product-category">${p.category||'Producto'}</div>
            <h3 class="product-title-premium">${p.title}</h3>
            <div class="product-price-premium">
              <span class="current-price">$${p.price.toLocaleString('es-AR')}</span>
            </div>
            <button class="btn-add-cart-premium" data-id="${doc.id}" data-name="${p.title}" data-price="${p.price}" data-image="${p.imageUrl}">🛒 Agregar</button>
          </div>
        </div>`;
    }).join('');
    
    // Attach cart listeners
    document.querySelectorAll('.btn-add-cart-premium').forEach(btn => {
      btn.addEventListener('click', function() {
        if(typeof addToCart === 'function') {
          addToCart(this.dataset.id, this.dataset.name, parseFloat(this.dataset.price), this.dataset.image);
          this.innerHTML = '✅ Agregado';
          setTimeout(() => { this.innerHTML = '🛒 Agregar'; }, 1500);
        }
      });
    });
  } catch (e) { console.error(e); }
}

// CONTACTO
async function loadContact() {
  try {
    const doc = await db.collection('site_config').doc('contact').get();
    if (doc.exists) {
      const c = doc.data();
      document.getElementById('footerAddress').textContent = c.address || 'Saladas, Corrientes';
      document.getElementById('footerHours').textContent = c.hours || 'Lun-Sáb 9-20hs';
      document.getElementById('footerPhone').textContent = 'WhatsApp: ' + (c.phone || '3782-437674');
    }
  } catch (e) { console.error(e); }
}

// Smooth scroll para la barra secundaria
document.querySelectorAll('.secondary-menu a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Remover active de todos
    document.querySelectorAll('.secondary-menu a').forEach(l => l.classList.remove('active'));
    // Agregar active al clickeado
    e.target.closest('a').classList.add('active');
    
    const targetId = e.target.getAttribute('href');
    const targetSection = document.querySelector(targetId);
    
    if (targetSection) {
      const offsetTop = targetSection.offsetTop - 120; // Ajustá según la altura de las barras
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  });
});

// Highlight activo al hacer scroll
window.addEventListener('scroll', () => {
  const sections = document.querySelectorAll('section[id]');
  const scrollY = window.pageYOffset;
  
  sections.forEach(section => {
    const sectionHeight = section.offsetHeight;
    const sectionTop = section.offsetTop - 150;
    const sectionId = section.getAttribute('id');
    
    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      document.querySelectorAll('.secondary-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
          link.classList.add('active');
        }
      });
    }
  });
});
