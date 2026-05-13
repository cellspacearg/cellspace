let cart = JSON.parse(localStorage.getItem('cellspace_cart')) || [];

function initCart() {
  updateCartCount();
  renderCartModal();
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-add-cart');
    if(btn) {
      addToCart(btn.dataset.id, btn.dataset.name, parseFloat(btn.dataset.price), btn.dataset.image);
      btn.textContent = '✅ Agregado';
      btn.style.background = '#4CAF50';
      setTimeout(() => { btn.textContent = '🛒 Agregar'; btn.style.background = ''; }, 1500);
    }
  });
}

function addToCart(id, name, price, image) {
  const existing = cart.find(item => item.id === id);
  existing ? existing.qty++ : cart.push({ id, name, price, image, qty: 1 });
  saveCart(); updateCartCount(); renderCartModal();
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart(); updateCartCount(); renderCartModal();
}

function changeQty(id, change) {
  const item = cart.find(item => item.id === id);
  if(item) {
    item.qty += change;
    if(item.qty <= 0) removeFromCart(id);
    else { saveCart(); updateCartCount(); renderCartModal(); }
  }
}

function saveCart() { localStorage.setItem('cellspace_cart', JSON.stringify(cart)); }

function updateCartCount() {
  const count = cart.reduce((acc, item) => acc + item.qty, 0);
  const badge = document.getElementById('cartCount');
  if(badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
}

function getTotal() { return cart.reduce((acc, item) => acc + (item.price * item.qty), 0); }

function renderCartModal() {
  const container = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if(!container) return;
  if(cart.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;">Tu carrito está vacío 🛒</p>';
    totalEl.textContent = '$0'; return;
  }
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image || 'https://via.placeholder.com/60'}" class="cart-item-img">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p style="color:var(--orange);font-weight:700;">$${(item.price * item.qty).toLocaleString('es-AR')}</p>
        <div class="cart-controls">
          <button onclick="changeQty('${item.id}', -1)">-</button>
          <span>${item.qty}</span>
          <button onclick="changeQty('${item.id}', 1)">+</button>
          <button class="btn-remove" onclick="removeFromCart('${item.id}')">🗑️</button>
        </div>
      </div>
    </div>`).join('');
  totalEl.textContent = '$' + getTotal().toLocaleString('es-AR');
}

function checkoutWhatsApp() {
  if(cart.length === 0) return alert('El carrito está vacío');
  let msg = `👋 *HOLA! QUIERO REALIZAR EL SIGUIENTE PEDIDO:*%0A%0A`;
  cart.forEach(item => { msg += `▪️ ${item.name} (x${item.qty}) - $${(item.price * item.qty).toLocaleString('es-AR')}%0A`; });
  msg += `%0A💰 *TOTAL: $${getTotal().toLocaleString('es-AR')}*%0A📦 *Envío:* A coordinar%0A💳 *Pago:* A coordinar`;
  window.open(`https://wa.me/5493782437674?text=${msg}`, '_blank');
}

function toggleCart() { document.getElementById('cartOverlay').classList.toggle('open'); }

document.addEventListener('DOMContentLoaded', initCart);