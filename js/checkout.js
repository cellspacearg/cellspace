// ========================================
// CHECKOUT — resumen + creación de pedido (MP / transferencia / Binance)
// ========================================

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function money(n) {
  n = Number(n) || 0;
  return (n % 1 === 0) ? n.toLocaleString('es-AR') : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCart() { return JSON.parse(localStorage.getItem('cellspace_cart') || '[]'); }
function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

function renderOrderSummary() {
  var cart = getCart();
  var content = document.getElementById('checkoutContent');
  var emptyMsg = document.getElementById('emptyCartMsg');

  if (!cart.length) {
    content.style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }

  var list = document.getElementById('orderItemsList');
  list.innerHTML = cart.map(function (it) {
    var thumb = it.image ? '<img src="' + esc(it.image) + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">' : '<i class="fas fa-box" style="color:var(--orange);"></i>';
    return '<div style="display:flex;gap:12px;align-items:center;">' +
      '<div style="width:56px;height:56px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">' + thumb + '</div>' +
      '<div style="flex:1;"><div style="color:white;font-size:14px;font-weight:600;">' + esc(it.name) + '</div>' +
      '<div style="color:#888;font-size:12px;">x' + it.quantity + '</div></div>' +
      '<div style="color:white;font-weight:700;">$' + money((Number(it.price) || 0) * it.quantity) + '</div>' +
      '</div>';
  }).join('');

  var total = cart.reduce(function (s, i) { return s + (Number(i.price) || 0) * i.quantity; }, 0);
  document.getElementById('orderTotal').textContent = '$' + money(total);
}

function setupShipToggle() {
  var chk = document.getElementById('shipDifferent');
  var block = document.getElementById('shippingBlock');
  if (!chk) return;
  chk.addEventListener('change', function () {
    block.style.display = chk.checked ? 'block' : 'none';
    ['shipStreet', 'shipNumber', 'shipPostal', 'shipProvince', 'shipCity'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.required = chk.checked;
    });
  });
}

async function submitCheckout(e) {
  e.preventDefault();
  var cart = getCart();
  if (!cart.length) return;

  var btn = document.getElementById('checkoutSubmitBtn');
  var btnText = document.getElementById('checkoutBtnText');
  var btnLoader = document.getElementById('checkoutBtnLoader');
  btn.disabled = true; btnText.style.display = 'none'; btnLoader.style.display = 'inline-block';

  var payMethod = document.querySelector('input[name="payMethod"]:checked').value;
  var shipDifferent = document.getElementById('shipDifferent').checked;

  var payload = {
    items: cart.map(function (i) { return { id: i.id, name: i.name, price: i.price, quantity: i.quantity }; }),
    buyer: {
      firstName: val('firstName'),
      lastName: val('lastName'),
      name: val('firstName') + ' ' + val('lastName'),
      company: val('company'),
      email: val('buyerEmail'),
      phone: val('buyerPhone'),
      documentType: val('documentType'),
      documentNumber: val('documentNumber'),
      taxCondition: val('taxCondition'),
    },
    billing: {
      street: val('billStreet'),
      number: val('billNumber'),
      floor: val('billFloor'),
      apartment: val('billApartment'),
      postalCode: val('billPostal'),
      province: val('billProvince'),
      city: val('billCity'),
    },
    shipToDifferentAddress: shipDifferent,
    shipping: shipDifferent ? {
      street: val('shipStreet'),
      number: val('shipNumber'),
      floor: val('shipFloor'),
      apartment: val('shipApartment'),
      postalCode: val('shipPostal'),
      province: val('shipProvince'),
      city: val('shipCity'),
    } : {
      street: val('billStreet'),
      number: val('billNumber'),
      floor: val('billFloor'),
      apartment: val('billApartment'),
      postalCode: val('billPostal'),
      province: val('billProvince'),
      city: val('billCity'),
    },
    orderNotes: val('orderNotes'),
    paymentMethod: payMethod,
  };

  try {
    var { data, error } = await supabase.functions.invoke('create-payment', { body: payload });
    if (error) throw error;
    if (data.error) throw new Error(data.error);

    if (payMethod === 'mercadopago') {
      window.location.href = data.init_point;
    } else {
      localStorage.removeItem('cellspace_cart');
      var methodLabel = payMethod === 'binance' ? 'Binance (USDT)' : 'Transferencia bancaria';
      var total = payload.items.reduce(function (s, i) { return s + (Number(i.price) || 0) * i.quantity; }, 0);
      var msg = '¡Hola! Hice el pedido *' + data.order_number + '*' +
        '\nMétodo: ' + methodLabel +
        '\nTotal: $' + money(total) +
        '\n\nTe mando el comprobante para confirmar.';
      var wa = (window.CMS_CONFIG && window.CMS_CONFIG.whatsapp ? String(window.CMS_CONFIG.whatsapp).replace(/[^0-9]/g, '') : '5493782437674');
      window.location.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg);
    }
  } catch (err) {
    console.error(err);
    alert('❌ No se pudo procesar el pedido: ' + (err.message || 'Error desconocido'));
    btn.disabled = false; btnText.style.display = 'inline-block'; btnLoader.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  renderOrderSummary();
  setupShipToggle();
  var form = document.getElementById('checkoutForm');
  if (form) form.addEventListener('submit', submitCheckout);
});
