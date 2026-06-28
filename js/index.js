// ========================================
// CELL SPACE - INDEX.JS
// Carrusel y funcionalidades del home
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ index.js cargado');
  initCarousel();
  initSmoothScroll();
});

// Datos del carrusel
const slides = [
  {
    title: 'REPARACIONES PROFESIONALES',
    subtitle: 'Técnicos certificados, garantía y precio justo',
    image: 'assets/carousel/slide1.jpg',
    cta: 'Ver Servicios',
    link: '#servicios'
  },
  {
    title: 'LICENCIAS PREMIUM',
    subtitle: 'Chimera, Z3X, NCK y más. Entrega inmediata',
    image: 'assets/carousel/slide2.jpg',
    cta: 'Ir a la Tienda',
    link: 'tienda.html'
  },
  {
    title: 'SOPORTE TÉCNICO 24/7',
    subtitle: 'Escribinos por WhatsApp para asistencia rápida',
    image: 'assets/carousel/slide3.jpg',
    cta: 'Contactar',
    link: '#contacto'
  }
];

let currentSlide = 0;
let carouselInterval;

function initCarousel() {
  const carousel = document.getElementById('carousel');
  if (!carousel) {
    console.error('❌ No se encontró el carousel');
    return;
  }
  
  console.log('✅ Inicializando carrusel');
  renderSlide(0);
  
  // Auto-play
  startCarousel();
}

function startCarousel() {
  carouselInterval = setInterval(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    renderSlide(currentSlide);
  }, 5000);
}

function renderSlide(index) {
  const carousel = document.getElementById('carousel');
  if (!carousel) return;
  
  const slide = slides[index];
  
  carousel.innerHTML = `
    <div class="carousel-slide active">
      <div class="carousel-slide::before"></div>
      <div class="carousel-content">
        <h1>${slide.title}</h1>
        <h2>${slide.subtitle}</h2>
        <a href="${slide.link}" class="btn">${slide.cta}</a>
      </div>
    </div>
    <div class="carousel-dots">
      ${slides.map((_, i) => `<span class="dot ${i === index ? 'active' : ''}" onclick="goToSlide(${i})"></span>`).join('')}
    </div>
    <button class="carousel-btn prev" onclick="changeSlide(-1)">❮</button>
    <button class="carousel-btn next" onclick="changeSlide(1)">❯</button>
  `;
}

window.goToSlide = function(index) {
  currentSlide = index;
  renderSlide(currentSlide);
  // Reiniciar autoplay
  clearInterval(carouselInterval);
  startCarousel();
}

window.changeSlide = function(dir) {
  currentSlide = (currentSlide + dir + slides.length) % slides.length;
  renderSlide(currentSlide);
  // Reiniciar autoplay
  clearInterval(carouselInterval);
  startCarousel();
}

// Smooth scroll para links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      
      const target = document.querySelector(href);
      if (target) {
        const offset = 150; // Altura de navbar + top bar
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}
