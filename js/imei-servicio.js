// ========================================
// CHEQUEO DE IMEI - servicios.html (panel lateral)
// ========================================

const EDGE_FUNCTION_URL = 'https://cfoajkbzsqyimbfjhfsa.supabase.co/functions/v1/imei-check';

function populateImeiSelect() {
  const select = document.getElementById('imeiServiceSelect');
  if (!select || !window.IMEI_CATALOG) return;

  const categories = {};
  window.IMEI_CATALOG.forEach(s => {
    if (!categories[s.category]) categories[s.category] = [];
    categories[s.category].push(s);
  });

  select.innerHTML = Object.keys(categories).map(cat => {
    const options = categories[cat].map(s =>
      `<option value="${s.slug}" data-price="${s.price}">${s.name} — $${s.price.toFixed(2)}</option>`
    ).join('');
    return `<optgroup label="${cat}">${options}</optgroup>`;
  }).join('');

  updateSelectedPrice();
}

function updateSelectedPrice() {
  const select = document.getElementById('imeiServiceSelect');
  const priceEl = document.getElementById('imeiSelectedPrice');
  if (!select || !priceEl) return;
  const opt = select.options[select.selectedIndex];
  priceEl.textContent = opt ? `$${parseFloat(opt.dataset.price).toFixed(2)}` : '--';
}

async function loadUserBalance() {
  const balanceEl = document.getElementById('imeiUserBalance');
  if (!balanceEl) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { balanceEl.textContent = 'Iniciá sesión'; return; }

  const { data, error } = await supabase.from('profiles').select('balance').eq('id', session.user.id).maybeSingle();
  balanceEl.textContent = (!error && data) ? `$${Number(data.balance).toFixed(2)}` : '$0.00';
}

async function runImeiCheck() {
  const btn = document.getElementById('imeiCheckBtn');
  const resultBox = document.getElementById('imeiCheckResult');
  const imei = document.getElementById('imeiInputCheck').value.trim();
  const service = document.getElementById('imeiServiceSelect').value;

  if (!imei || imei.replace(/[^0-9A-Za-z]/g, '').length < 10) {
    alert('⚠️ Ingresá un IMEI válido');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    alert('⚠️ Necesitás iniciar sesión para consultar un IMEI');
    window.location.href = 'login.html';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Consultando...';
  resultBox.style.display = 'none';

  try {
    const resp = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ imei, service }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      resultBox.innerHTML = `<div class="imei-result-error">❌ ${data.error || 'No se pudo completar la consulta'}</div>`;
      resultBox.style.display = 'block';
      return;
    }

    const rows = Object.entries(data.result || {})
      .filter(([k]) => k !== 'raw')
      .map(([k, v]) => `<div class="imei-result-row"><span>${k}</span><strong>${v}</strong></div>`)
      .join('') || `<div class="imei-result-row">${data.result?.raw || 'Sin datos'}</div>`;

    resultBox.innerHTML = `
      <div class="imei-result-header">✅ ${data.service} — se descontaron $${Number(data.price_charged).toFixed(2)}</div>
      ${rows}
    `;
    resultBox.style.display = 'block';
    loadUserBalance();
  } catch (err) {
    resultBox.innerHTML = `<div class="imei-result-error">❌ Error de conexión, intentá de nuevo</div>`;
    resultBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-search"></i> Consultar (<span id="imeiSelectedPrice"></span>)';
    updateSelectedPrice();
  }
}

// ---- Abrir / cerrar el panel lateral ----
function openImeiPanel() {
  document.getElementById('imeiCheckSection')?.classList.add('open');
  document.getElementById('imeiPanelOverlay')?.classList.add('open');
}
function closeImeiPanel() {
  document.getElementById('imeiCheckSection')?.classList.remove('open');
  document.getElementById('imeiPanelOverlay')?.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  populateImeiSelect();
  loadUserBalance();
  document.getElementById('imeiServiceSelect')?.addEventListener('change', updateSelectedPrice);
  document.getElementById('imeiCheckBtn')?.addEventListener('click', runImeiCheck);

  document.getElementById('imeiPanelTrigger')?.addEventListener('click', openImeiPanel);
  document.getElementById('imeiPanelClose')?.addEventListener('click', closeImeiPanel);
  document.getElementById('imeiPanelOverlay')?.addEventListener('click', closeImeiPanel);
});
