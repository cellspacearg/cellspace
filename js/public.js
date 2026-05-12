let currentSlide = 0;
let slideInterval;

// CARRUSEL
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

// CARGAR PRODUCTOS
db.collection('products').where('inStock','==',true).orderBy('createdAt','desc').limit(6).onSnapshot(snap=>{
  const grid = document.getElementById('productsGrid');
  if(snap.empty){
    grid.innerHTML = '<p style="text-align:center;color:var(--muted);grid-column:1/-1;">No hay productos disponibles</p>';
    return;
  }
  grid.innerHTML = snap.docs.map(doc=>{
    const p = doc.data();
    const price = p.price ? `$${p.price.toLocaleString('es-AR')}` : '';
    const waMsg = `Hola! Me interesa: ${encodeURIComponent(p.title)}${price?' - Precio: '+encodeURIComponent(price):''}`;
    const waLink = `https://wa.me/5493782437674?text=${waMsg}`;
    return `
      <div class="product-card">
        <img src="${p.imageUrl||'https://via.placeholder.com/400x300?text=Cell+Space'}" class="product-img" alt="${p.title}">
        <div class="product-body">
          <span class="product-cat">${p.category}</span>
          <h3 class="product-title">${p.title}</h3>
          ${price?`<p class="product-price">${price}</p>`:''}
          <p class="product-desc">${p.description||''}</p>
          <div class="product-actions">
            <a href="${waLink}" target="_blank" class="btn">💬 Consultar</a>
          </div>
        </div>
      </div>`;
  }).join('');
});

// Iniciar carrusel
document.addEventListener('DOMContentLoaded', ()=>{
  slideInterval = setInterval(() => changeSlide(1), 5000);
});