let currentSlide = 0;
let slideInterval;
let totalSlides = 0;

// ========== CARRUSEL DINÁMICO ==========
async function loadCarousel(){
  const carousel = document.getElementById('carousel');
  
  try{
    const snap = await db.collection('hero_slides').where('active','==',true).orderBy('order','asc').get();
    
    if(snap.empty){
      // Slides por defecto si no hay nada
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
        <div class="carousel-slide">
          <img src="https://images.unsplash.com/photo-1588515635100-2a14d6954e0b?w=1920" alt="Productos">
          <div class="carousel-content">
            <h1>Productos de Calidad</h1>
            <h2>Accesorios y repuestos originales</h2>
            <a href="#productos" class="btn">Ver Tienda</a>
          </div>
        </div>
        <button class="carousel-btn prev" onclick="changeSlide(-1)">❮</button>
        <button class="carousel-btn next" onclick="changeSlide(1)">❯</button>
        <div class="carousel-dots">
          <span class="dot active" onclick="goToSlide(0)"></span>
          <span class="dot" onclick="goToSlide(1)"></span>
          <span class="dot" onclick="goToSlide(2)"></span>
        </div>`;
      totalSlides = 3;
      startCarousel();
      return;
    }
    
    totalSlides = snap.size;
    let slidesHTML = '';
    let dotsHTML = '';
    
    snap.forEach((doc, index)=>{
      const s = doc.data();
      slidesHTML += `
        <div class="carousel-slide ${index===0?'active':''}">
          <img src="${s.imageUrl||'https://via.placeholder.com/1920x600?text=Cell+Space'}" alt="${s.title}">
          <div class="carousel-content">
            <h1>${s.title}</h1>
            <h2>${s.subtitle||''}</h2>
            <a href="https://wa.me/5493782437674?text=${encodeURIComponent(s.buttonText||'Consultar')}" class="btn">${s.buttonText||'Contactar'}</a>
          </div>
        </div>`;
      
      dotsHTML += `<span class="dot ${index===0?'active':''}" onclick="goToSlide(${index})"></span>`;
    });
    
    carousel.innerHTML = `
      ${slidesHTML}
      <button class="carousel-btn prev" onclick="changeSlide(-1)">❮</button>
      <button class="carousel-btn next" onclick="changeSlide(1)">❯</button>
      <div class="carousel-dots">${dotsHTML}</div>
    `;
    
    startCarousel();
  }catch(e){
    console.error('Error cargando carousel:', e);
    carousel.innerHTML = '<p style="color:white;text-align:center;">Error al cargar</p>';
  }
}

function startCarousel(){
  slideInterval = setInterval(() => changeSlide(1), 5000);
}

function showSlide(n){
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.dot');
  
  if(n >= slides.length) currentSlide = 0;
  if(n < 0) currentSlide = slides.length - 1;
  
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}

function changeSlide(n){
  currentSlide += n;
  showSlide(currentSlide);
  resetInterval();
}

function goToSlide(n){
  currentSlide = n;
  showSlide(currentSlide);
  resetInterval();
}

function resetInterval(){
  clearInterval(slideInterval);
  slideInterval = setInterval(() => changeSlide(1), 5000);
}

// ========== SERVICIOS DINÁMICOS ==========
async function loadServices(){
  const grid = document.getElementById('servicesGrid');
  
  try{
    const snap = await db.collection('services').get();
    
    if(snap.empty){
      // Servicios por defecto
      grid.innerHTML = `
        <div class="service-card">
          <div class="service-icon">📱</div>
          <h3>Celulares</h3>
          <p>Pantallas, baterías, placas y más</p>
        </div>
        <div class="service-card">
          <div class="service-icon">💻</div>
          <h3>PC / Laptop</h3>
          <p>Formateo, limpieza, reparación</p>
        </div>
        <div class="service-card">
          <div class="service-icon">🎮</div>
          <h3>Consolas</h3>
          <p>Reparación de HDMI, mantenimiento</p>
        </div>
        <div class="service-card">
          <div class="service-icon">🤖</div>
          <h3>Software GSM</h3>
          <p>Desbloqueo, FRP, flasheo</p>
        </div>`;
      return;
    }
    
    grid.innerHTML = snap.docs.map(d=>{
      const s = d.data();
      return `
        <div class="service-card">
          <div class="service-icon">${s.icon||'🔧'}</div>
          <h3>${s.title}</h3>
          <p>${s.description||''}</p>
        </div>`;
    }).join('');
  }catch(e){
    console.error('Error cargando servicios:', e);
    grid.innerHTML = '<p style="text-align:center;color:var(--muted);grid-column:1/-1;">Error al cargar</p>';
  }
}

// ========== PRODUCTOS DINÁMICOS ==========
async function loadProducts(){
  const grid = document.getElementById('productsGrid');
  
  try{
    const snap = await db.collection('products').where('inStock','==',true).orderBy('createdAt','desc').limit(6).get();
    
    if(snap.empty){
      grid.innerHTML = '<p style="text-align:center;color:var(--muted);grid-column:1/-1;">No hay productos disponibles</p>';
      return;
    }
    
    grid.innerHTML = snap.docs.map(doc=>{
      const p = doc.data();
      const price = p.price ? `$${p.price.toLocaleString('es-AR')}` : 'Consultar';
      const waMsg = `Hola! Me interesa: ${encodeURIComponent(p.title)}${p.price?' - Precio: '+encodeURIComponent(price):''}`;
      const waLink = `https://wa.me/5493782437674?text=${waMsg}`;
      
      return `
        <div class="product-card">
          <img src="${p.imageUrl||'https://via.placeholder.com/400x300?text=Cell+Space'}" class="product-img" alt="${p.title}">
          <div class="product-body">
            <span class="product-cat">${p.category||'Producto'}</span>
            <h3 class="product-title">${p.title}</h3>
            <p class="product-price">${price}</p>
            <p class="product-desc">${p.description||''}</p>
            <div class="product-actions">
              <a href="${waLink}" target="_blank" class="btn">💬 Consultar</a>
            </div>
          </div>
        </div>`;
    }).join('');
  }catch(e){
    console.error('Error cargando productos:', e);
    grid.innerHTML = '<p style="text-align:center;color:var(--muted);grid-column:1/-1;">Error al cargar</p>';
  }
}

// ========== FOOTER/CONTACTO DINÁMICO ==========
async function loadContactInfo(){
  try{
    const doc = await db.collection('site_config').doc('contact').get();
    
    if(doc.exists){
      const c = doc.data();
      document.getElementById('footerAddress').textContent = c.address || 'Saladas, Corrientes';
      document.getElementById('footerHours').textContent = c.hours || 'Lunes a Sábados 9:00 - 20:00';
      document.getElementById('footerPhone').textContent = 'WhatsApp: ' + (c.phone || '3782-437674');
      
      if(c.phone){
        const phoneNum = c.phone.replace(/[^0-9]/g, '');
        const waLink = `https://wa.me/549${phoneNum}`;
        document.getElementById('footerWaLink').href = waLink;
      }
    } else {
      // Valores por defecto
      document.getElementById('footerAddress').textContent = 'Saladas, Corrientes';
      document.getElementById('footerHours').textContent = 'Lunes a Sábados 9:00 - 20:00';
      document.getElementById('footerPhone').textContent = 'WhatsApp: 3782-437674';
    }
  }catch(e){
    console.error('Error cargando contacto:', e);
  }
}

// ========== INICIALIZAR ==========
document.addEventListener('DOMContentLoaded', ()=>{
  createParticles();
  loadCarousel();
  loadServices();
  loadProducts();
  loadContactInfo();
});

// ========== PARTÍCULAS ==========
function createParticles(){
  const container = document.getElementById('particles');
  if(!container) return;
  
  for(let i=0;i<30;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random()*100+'%';
    p.style.animationDuration = (8+Math.random()*15)+'s';
    p.style.animationDelay = Math.random()*10+'s';
    p.style.width = p.style.height = (1+Math.random()*3)+'px';
    p.style.opacity = 0.1+Math.random()*0.4;
    container.appendChild(p);
  }
}
