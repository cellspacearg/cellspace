// ========================================
// TIENDA · SUPABASE + CMS (12.B) — lista viva + ficha
// + categorías dinámicas por rol + filtros ampliados
// ========================================

let cart = JSON.parse(localStorage.getItem('cellspace_cart') || '[]');
let activeCategory = 'all';
let searchTerm = '';
let sliderCalibrated = false;
let navigating = false;
let allCategoriesCache = [];
let lastProductsList = [];

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function money(n) {
  n = Number(n) || 0;
  return (n % 1 === 0) ? n.toLocaleString('es-AR') : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function isVisible(p) {
  if (p.is_hidden === true) return false;
  if (p.status === 'draft') return false;
  if (p.review_status === 'pending' || p.review_status === 'rejected') return false;
  return true;
}

/* ---------- rol del usuario (usa CSAuth de cs-auth.js) ---------- */
function withRole(cb) {
  if (window.CSAuth) {
    window.CSAuth.onReady(function (state) { cb(state.role === 'visitor' ? 'guest' : state.role); });
  } else {
    cb('guest');
  }
}

/* ---------- interacciones del listado (se inyectan una sola vez) ---------- */
function injectListFx() {
  if (document.getElementById('cs-list-fx')) return;
  var s = document.createElement('style');
  s.id = 'cs-list-fx';
  s.textContent =
    '.product-card{transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s,border-color .28s;position:relative;}' +
    '.product-card:hover{transform:translateY(-6px);box-shadow:0 20px 44px rgba(0,0,0,.55),0 0 0 1px rgba(255,106,0,.4);}' +
    '.product-card:hover .product-image-placeholder img{transform:scale(1.06);}' +
    '.product-image-placeholder img{transition:transform .5s cubic-bezier(.2,.8,.2,1);}' +
    '.product-card.cs-enter{animation:csCardIn .5s cubic-bezier(.2,.8,.2,1) both;}' +
    '@keyframes csCardIn{from{opacity:0;transform:translateY(20px) scale(.98);}to{opacity:1;transform:none;}}' +
    '.product-card.cs-go{animation:csCardGo .26s ease;}' +
    '@keyframes csCardGo{0%{transform:scale(1);}45%{transform:scale(.97);box-shadow:0 0 0 3px rgba(255,106,0,.55),0 18px 40px rgba(0,0,0,.5);}100%{transform:scale(1);}}';
  document.head.appendChild(s);
}
function stagger(grid) {
  if (!grid) return;
  grid.querySelectorAll('.product-card').forEach(function (c, i) {
    c.classList.remove('cs-enter'); void c.offsetWidth;
    c.classList.add('cs-enter'); c.style.animationDelay = Math.min(i, 8) * 45 + 'ms';
  });
}
function attachCardFx(grid) {
  if (!grid || grid.dataset.fx) return;
  grid.dataset.fx = '1';
  grid.addEventListener('click', function (e) {
    if (navigating) return;
    if (e.target.closest('.btn-add-cart') || e.target.closest('.btn-wishlist')) return;
    var card = e.target.closest('.product-card');
    if (!card || !card.dataset.pid) return;
    navigating = true;
    card.classList.add('cs-go');
    var url = 'producto.html?id=' + encodeURIComponent(card.dataset.pid);
    setTimeout(function () { window.location.href = url; }, 220);
  });
}

/* ---------- categorías dinámicas (tabla categories) ---------- */
async function loadCategories() {
  try {
    var r = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (r.error) { console.warn('No se pudieron cargar categorías:', r.error.message); return []; }
    return r.data || [];
  } catch (e) { console.warn('[categories] fallback', e && e.message); return []; }
}

function renderCategorySidebar(categories, role) {
  var list = document.getElementById('categoryList');
  if (!list) return;
  var visible = categories.filter(function (c) {
    return !c.technician_only || role === 'technician' || role === 'admin';
  });
  var items = visible.map(function (c) {
    return '<li><a href="#" onclick="filterByCategory(\'' + esc(c.name) + '\'); return false;">' +
      '<i class="' + esc(c.icon || 'fas fa-th') + '"></i> ' + esc(c.name) + '</a></li>';
  }).join('');
  list.innerHTML =
    '<li class="active"><a href="#" onclick="filterByCategory(\'all\'); return false;"><i class="fas fa-th"></i> Todos los productos</a></li>' +
    items;
}

async function initCategories() {
  allCategoriesCache = await loadCategories();
  withRole(function (role) { renderCategorySidebar(allCategoriesCache, role); });
}

/* ---------- datos ---------- */
async function loadProducts() {
  try {
    var r = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (r.error) { console.error('Error cargando productos:', r.error); return []; }
    return (r.data || []).filter(isVisible);
  } catch (e) { console.warn('[CMS] tienda fallback', e && e.message); return []; }
}

function calibrateSlider(products) {
  if (sliderCalibrated) return; sliderCalibrated = true;
  var ps = document.getElementById('priceSlider'); if (!ps) return;
  var maxP = products.reduce(function (m, p) { return Math.max(m, Number(p.price) || 0); }, 0);
  var top = Math.ceil(maxP / 10000) * 10000 || 100000;
  ps.min = 0; ps.max = top; ps.value = top;
  ps.step = Math.max(1000, Math.round(top / 100 / 1000) * 1000);
  var l = document.getElementById('maxPriceLabel'); if (l) l.textContent = '$' + top.toLocaleString('es-AR');
}

/* ---------- llena los <select> de marca/modelo/memoria a partir de lo que hay cargado ---------- */
/* ---------- reemplaza visualmente los <select> nativos por un desplegable propio ---------- */
function closeAllCustomSelects(except) {
  document.querySelectorAll('.cs-select-wrap.open').forEach(function (w) {
    if (w !== except) w.classList.remove('open');
  });
}
function buildCustomSelect(select) {
  if (select.dataset.enhanced) {
    // ya existe: solo actualizar las opciones del panel
    var panel = select.parentElement.querySelector('.cs-select-panel');
    if (panel) fillCustomPanel(select, panel);
    return;
  }
  select.dataset.enhanced = '1';

  var wrap = document.createElement('div');
  wrap.className = 'cs-select-wrap';
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);

  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cs-select-trigger';
  trigger.textContent = select.options[select.selectedIndex] ? select.options[select.selectedIndex].textContent : '';
  wrap.appendChild(trigger);

  var panel = document.createElement('div');
  panel.className = 'cs-select-panel';
  wrap.appendChild(panel);
  fillCustomPanel(select, panel);

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    var willOpen = !wrap.classList.contains('open');
    closeAllCustomSelects();
    if (willOpen) wrap.classList.add('open');
  });
}
function fillCustomPanel(select, panel) {
  panel.innerHTML = '';
  Array.prototype.forEach.call(select.options, function (opt) {
    var item = document.createElement('div');
    item.className = 'cs-select-option' + (opt.value === select.value ? ' selected' : '');
    item.textContent = opt.textContent;
    item.addEventListener('click', function () {
      select.value = opt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      var wrap = select.closest('.cs-select-wrap');
      wrap.querySelector('.cs-select-trigger').textContent = opt.textContent;
      wrap.querySelectorAll('.cs-select-option').forEach(function (o) { o.classList.remove('selected'); });
      item.classList.add('selected');
      wrap.classList.remove('open');
    });
    panel.appendChild(item);
  });
}
function enhanceCustomSelects() {
  document.querySelectorAll('select.filter-select').forEach(buildCustomSelect);
}
document.addEventListener('click', function () { closeAllCustomSelects(); });

function populateFilterOptions(products) {
  var brandSel = document.getElementById('filterBrand');
  var modelSel = document.getElementById('filterModel');
  var storageSel = document.getElementById('filterStorage');

  if (brandSel && !brandSel.dataset.filled) {
    var brands = Array.from(new Set(products.map(function (p) { return (p.brand || '').trim(); }).filter(Boolean))).sort();
    brandSel.innerHTML = '<option value="">Todas las marcas</option>' + brands.map(function (b) { return '<option value="' + esc(b) + '">' + esc(b) + '</option>'; }).join('');
    brandSel.dataset.filled = '1';
  }
  if (modelSel && !modelSel.dataset.filled) {
    var models = Array.from(new Set(products.map(function (p) { return (p.model || '').trim(); }).filter(Boolean))).sort();
    modelSel.innerHTML = '<option value="">Todos los modelos</option>' + models.map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('');
    modelSel.dataset.filled = '1';
  }
  if (storageSel && !storageSel.dataset.filled) {
    var storages = new Set();
    products.forEach(function (p) { (Array.isArray(p.storage_options) ? p.storage_options : []).forEach(function (s) { if (s) storages.add(s); }); });
    var storageList = Array.from(storages).sort();
    storageSel.innerHTML = '<option value="">Cualquier memoria</option>' + storageList.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');
    storageSel.dataset.filled = '1';
  }
  enhanceCustomSelects();
}

async function renderProducts(productsToRender) {
  var grid = document.getElementById('productsGrid');
  if (!grid) return;
  if (!productsToRender) productsToRender = await loadProducts();
  lastProductsList = productsToRender;
  calibrateSlider(productsToRender);
  populateFilterOptions(productsToRender);

  if (productsToRender.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">No se encontraron productos</p>';
    updateProductsCount(0); return;
  }

  grid.innerHTML = productsToRender.map(function (product) {
    var badgeHtml = product.badge ? '<span class="product-badge">' + esc(product.badge) + '</span>' : '';
    var oldPriceHtml = product.old_price ? '<span class="price-old">$' + money(product.old_price) + '</span>' : '';
    var rating = Number(product.rating) || 0;
    var stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    var cat = esc(product.category || '');

    var imageHtml = product.image_url
      ? '<div class="product-image-placeholder" style="position:relative;overflow:hidden;aspect-ratio:1/1;padding:0;">' +
          '<img src="' + esc(product.image_url) + '" alt="' + esc(product.name) + '" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;">' +
        '</div>'
      : '<div class="product-image-placeholder">' +
          '<i class="fas fa-box-open" style="font-size:48px;color:var(--orange);"></i>' +
          '<span style="font-size:12px;color:#888;">' + cat + '</span>' +
        '</div>';

    var desc = (product.description || '').trim();
    var descHtml = desc ? '<p style="color:#888;font-size:13px;margin-bottom:15px;">' + esc(desc.length > 90 ? desc.substring(0, 90) + '...' : desc) + '</p>' : '';

    return '' +
      '<div class="product-card" data-pid="' + esc(product.id) + '" style="cursor:pointer;">' +
        badgeHtml + imageHtml +
        '<div class="product-info">' +
          '<h3 class="product-title">' + esc(product.name) + '</h3>' +
          '<div class="product-rating"><span class="stars">' + stars + '</span></div>' +
          '<div class="product-price"><span class="price-current">$' + money(product.price) + '</span>' + oldPriceHtml + '</div>' +
          descHtml +
          '<div class="product-actions">' +
            '<button class="btn-add-cart" onclick="addToCart(\'' + esc(product.id) + '\')"><i class="fas fa-shopping-cart"></i> Agregar</button>' +
            '<button class="btn-wishlist" onclick="addToWishlist(\'' + esc(product.id) + '\')"><i class="far fa-heart"></i></button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }).join('');

  updateProductsCount(productsToRender.length);
  stagger(grid);
}

/* ---------- filtros del sidebar ---------- */
function filterByCategory(category) {
  activeCategory = category;
  try {
    document.querySelectorAll('.category-list li').forEach(function (li) { li.classList.remove('active'); });
    var links = Array.prototype.slice.call(document.querySelectorAll('.category-list a'));
    var hit = links.find(function (a) { return (a.getAttribute('onclick') || '').indexOf("'" + category + "'") !== -1; });
    if (hit) hit.parentElement.classList.add('active');
  } catch (e) {}
  applyFilters();
}

function applyFilters() {
  var ps = document.getElementById('priceSlider');
  var maxPrice = ps ? parseFloat(ps.value) : Infinity;
  var brand = (document.getElementById('filterBrand') && document.getElementById('filterBrand').value) || '';
  var model = (document.getElementById('filterModel') && document.getElementById('filterModel').value) || '';
  var storage = (document.getElementById('filterStorage') && document.getElementById('filterStorage').value) || '';
  var onlyInstallments = document.getElementById('filterInstallments') && document.getElementById('filterInstallments').checked;
  var onlyDiscount = document.getElementById('filterDiscount') && document.getElementById('filterDiscount').checked;
  var condition = (document.getElementById('filterCondition') && document.getElementById('filterCondition').value) || '';
  var minBattery = (document.getElementById('filterBattery') && document.getElementById('filterBattery').value) || '';

  loadProducts().then(function (products) {
    var list = products;
    if (activeCategory !== 'all') list = list.filter(function (p) { return (p.category || '').toLowerCase() === activeCategory.toLowerCase(); });
    list = list.filter(function (p) { return (Number(p.price) || 0) <= maxPrice; });
    if (brand) list = list.filter(function (p) { return (p.brand || '') === brand; });
    if (model) list = list.filter(function (p) { return (p.model || '') === model; });
    if (storage) list = list.filter(function (p) { return Array.isArray(p.storage_options) && p.storage_options.indexOf(storage) !== -1; });
    if (onlyInstallments) list = list.filter(function (p) { return !!(p.installments && String(p.installments).trim()); });
    if (onlyDiscount) list = list.filter(function (p) { return p.old_price && Number(p.old_price) > Number(p.price); });
    if (condition) list = list.filter(function (p) { return (p.device_condition || 'nuevo') === condition; });
    if (minBattery) list = list.filter(function (p) { return Number(p.battery_health) >= Number(minBattery); });
    if (searchTerm) {
      var q = searchTerm.toLowerCase();
      list = list.filter(function (p) {
        return (p.name || '').toLowerCase().indexOf(q) !== -1 || (p.description || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    renderProducts(list);
  });
}

function sortProducts() {
  var sort = document.getElementById('sortSelect') && document.getElementById('sortSelect').value;
  var base = lastProductsList.length ? lastProductsList : null;
  (base ? Promise.resolve(base) : loadProducts()).then(function (products) {
    var list = products.slice();
    if (sort === 'price-asc') list.sort(function (a, b) { return (Number(a.price) || 0) - (Number(b.price) || 0); });
    else if (sort === 'price-desc') list.sort(function (a, b) { return (Number(b.price) || 0) - (Number(a.price) || 0); });
    else if (sort === 'rating') list.sort(function (a, b) { return (Number(b.rating) || 0) - (Number(a.rating) || 0); });
    renderProducts(list);
  });
}

/* ---------- carrito ---------- */
function addToCart(productId) {
  loadProducts().then(function (products) {
    var product = products.find(function (p) { return p.id == productId; });
    if (!product) return;
    var ex = cart.find(function (i) { return i.id == productId; });
    if (ex) ex.quantity += 1;
    else cart.push({ id: product.id, name: product.name, price: Number(product.price) || 0, image: product.image_url || null, quantity: 1 });
    saveCart(); updateCartCount(); showNotification('✅ Producto agregado al carrito');
  });
}
function saveCart() { localStorage.setItem('cellspace_cart', JSON.stringify(cart)); }
function updateCartCount() {
  var n = cart.reduce(function (s, i) { return s + i.quantity; }, 0);
  var el = document.getElementById('cartCount');
  if (el) { el.textContent = n; el.style.display = n > 0 ? 'flex' : 'none'; }
}
function toggleCart() {
  var m = document.getElementById('cartModal');
  if (m) { m.classList.toggle('active'); if (m.classList.contains('active')) renderCart(); }
}
function renderCart() {
  var c = document.getElementById('cartItems'); if (!c) return;
  if (!cart.length) { c.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">Tu carrito está vacío</p>'; document.getElementById('cartTotal').textContent = '$0'; return; }
  c.innerHTML = cart.map(function (it) {
    var thumb = it.image ? '<img src="' + esc(it.image) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">' : '<i class="fas fa-box" style="font-size:24px;color:var(--orange);"></i>';
    return '<div class="cart-item"><div style="width:80px;height:80px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;">' + thumb + '</div>' +
      '<div class="cart-item-info"><h4 class="cart-item-title">' + esc(it.name) + '</h4><p class="cart-item-price">$' + money(it.price) + '</p>' +
      '<div style="display:flex;gap:10px;margin-top:10px;align-items:center;">' +
      '<button onclick="updateQuantity(\'' + esc(it.id) + '\', -1)" style="padding:5px 10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:white;cursor:pointer;">-</button>' +
      '<span>' + it.quantity + '</span>' +
      '<button onclick="updateQuantity(\'' + esc(it.id) + '\', 1)" style="padding:5px 10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:white;cursor:pointer;">+</button>' +
      '<button onclick="removeFromCart(\'' + esc(it.id) + '\')" style="margin-left:auto;padding:5px 10px;background:#ff4444;border:none;border-radius:5px;color:white;cursor:pointer;">🗑️</button>' +
      '</div></div></div>';
  }).join('');
  var t = cart.reduce(function (s, i) { return s + (Number(i.price) || 0) * i.quantity; }, 0);
  document.getElementById('cartTotal').textContent = '$' + money(t);
}
function removeFromCart(id) { cart = cart.filter(function (i) { return i.id != id; }); saveCart(); updateCartCount(); renderCart(); }
function updateQuantity(id, d) {
  var it = cart.find(function (i) { return i.id == id; }); if (!it) return;
  it.quantity += d; if (it.quantity <= 0) { removeFromCart(id); return; }
  saveCart(); updateCartCount(); renderCart();
}
function checkout() {
  if (!cart.length) { alert('Tu carrito está vacío'); return; }
  window.location.href = 'checkout.html';
}
function addToWishlist() { showNotification('❤️ Producto agregado a favoritos'); }
function showNotification(message) {
  var n = document.createElement('div'); n.textContent = message;
  n.style.cssText = 'position:fixed;top:100px;right:20px;background:var(--orange);color:white;padding:15px 25px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:9999;font-weight:600;';
  document.body.appendChild(n);
  setTimeout(function () { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s'; setTimeout(function () { n.remove(); }, 300); }, 3000);
}
function updateProductsCount(count) { var el = document.getElementById('productsCount'); if (el) el.textContent = count + ' productos encontrados'; }

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', function () {
  injectListFx();
  initCategories();

  var urlParams = new URLSearchParams(window.location.search);
  var q = urlParams.get('q');
  if (q) {
    searchTerm = q;
    var searchInput = document.getElementById('headerSearchInput');
    if (searchInput) searchInput.value = q;
    applyFilters();
  } else {
    renderProducts();
  }

  updateCartCount();
  attachCardFx(document.getElementById('productsGrid'));

  var ps = document.getElementById('priceSlider');
  if (ps) ps.addEventListener('input', function () { var l = document.getElementById('maxPriceLabel'); if (l) l.textContent = '$' + Number(ps.value).toLocaleString('es-AR'); });

  ['filterBrand', 'filterModel', 'filterStorage', 'filterCondition', 'filterBattery', 'filterInstallments', 'filterDiscount'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', applyFilters);
  });

  var cm = document.getElementById('cartModal');
  if (cm) cm.addEventListener('click', function (e) { if (e.target === cm) toggleCart(); });
});
