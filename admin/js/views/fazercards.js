// ============================================================
// FAZERCARDS — PARTE 2 (FASE 2)
// Tipo de cambio, margenes por categoria, promociones y catalogo
// sincronizado desde FazerCards (gift cards / top-ups / game keys).
// ============================================================
import { supabase } from '../config.js?v=cb22';
import { layout, mountLayout, emptyState } from '../core/layout.js?v=cb22';

let settings = null;
let promotions = [];
let products = [];
let currentPromoEditId = null;
let currentProductEditId = null;
let activeCategoryFilter = 'all';
let activeRegionFilter = 'all';
let searchTerm = '';

const CATEGORY_LABELS = { giftcard: 'Gift Cards', topup: 'Recargas', gamekey: 'Game Keys' };
const DEFAULT_CATEGORY_MARGIN_KEYS = ['Free Fire', 'PUBG Mobile', 'Mobile Legends', 'Steam', 'PSN', 'Xbox', 'Gift Cards', 'Game Keys'];

export async function fazercardsView() {
  const content = `
    <div class="fc-section" id="fcExchangeSection">${loadingBox()}</div>
    <div class="fc-section" id="fcMarginsSection">${loadingBox()}</div>
    <div class="fc-section" id="fcPromosSection">${loadingBox()}</div>
    <div class="fc-section" id="fcCatalogSection">${loadingBox()}</div>
  `;

  const promoModal = `
  <div class="modal-overlay" id="promoModal">
    <div class="modal-box">
      <div class="modal-header"><h2 id="promoModalTitle">Nueva promoción</h2><button class="modal-close" onclick="closePromoModal()"><i class="fas fa-times"></i></button></div>
      <form id="promoForm" class="modal-body">
        <div class="form-row"><div class="form-group full"><label>Nombre *</label><input type="text" id="pr_name" required placeholder="Ej: Personaje nuevo FF"></div></div>
        <div class="form-row"><div class="form-group full"><label>Descripción</label><textarea id="pr_description" rows="2"></textarea></div></div>
        <div class="form-row">
          <div class="form-group"><label>Alcance *</label>
            <select id="pr_scope" onchange="window.__toggleScopeFields()">
              <option value="all">Todo el catálogo</option>
              <option value="category">Una categoría</option>
              <option value="product">Un producto</option>
            </select>
          </div>
          <div class="form-group"><label>Descuento (%) *</label><input type="number" id="pr_discount" step="0.1" required placeholder="Ej: -10"></div>
        </div>
        <div class="form-row" id="pr_categoryRow" style="display:none;">
          <div class="form-group full"><label>Categoría</label><input type="text" id="pr_category" placeholder="Ej: Free Fire"></div>
        </div>
        <div class="form-row" id="pr_productRow" style="display:none;">
          <div class="form-group full"><label>Producto</label><select id="pr_product_id"></select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Desde</label><input type="datetime-local" id="pr_starts_at"></div>
          <div class="form-group"><label>Hasta</label><input type="datetime-local" id="pr_ends_at"></div>
        </div>
        <div class="form-row checks"><label class="check"><input type="checkbox" id="pr_active" checked><span>Activa</span></label></div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closePromoModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="promoSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>`;

  const productModal = `
  <div class="modal-overlay" id="fcProductModal">
    <div class="modal-box">
      <div class="modal-header"><h2>Ajustar producto</h2><button class="modal-close" onclick="closeFcProductModal()"><i class="fas fa-times"></i></button></div>
      <form id="fcProductForm" class="modal-body">
        <div class="form-row"><div class="form-group full"><label id="fcp_name" style="font-weight:700;color:#fff;"></label></div></div>
        <div class="form-row">
          <div class="form-group"><label>Margen propio (%)</label><input type="number" id="fcp_margin" step="0.1" placeholder="Vacío = usar margen de categoría"></div>
          <div class="form-group"><label>Descuento promo (%)</label><input type="number" id="fcp_promo" step="0.1" value="0"></div>
        </div>
        <div class="form-row checks">
          <label class="check"><input type="checkbox" id="fcp_active"><span>Activado (visible en la web)</span></label>
          <label class="check"><input type="checkbox" id="fcp_featured"><span>Destacado</span></label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeFcProductModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="fcProductSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>`;

  return layout({ title: 'FazerCards', content }) + promoModal + productModal;
}

export function fazercardsViewOnMount() {
  mountLayout();
  document.getElementById('promoForm').addEventListener('submit', savePromo);
  document.getElementById('fcProductForm').addEventListener('submit', saveProductAdjustment);
  window.__toggleScopeFields();
  loadAll();
}

function loadingBox() { return '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>'; }

async function loadAll() {
  await loadSettings();
  renderExchangeSection();
  renderMarginsSection();
  await Promise.all([loadPromotions(), loadProducts()]);
  renderPromosSection();
  renderCatalogSection();
}

/* ---------- settings ---------- */
async function loadSettings() {
  try {
    const { data, error } = await supabase.from('fazercards_settings').select('*').eq('id', 'default').maybeSingle();
    if (error) throw error;
    settings = data || { exchange_rate: 1000, default_margin: 25, category_margins: {}, exchange_rate_source: 'auto' };
  } catch (e) {
    console.error(e);
    toast('Error al cargar configuración: ' + e.message, 'err');
    settings = { exchange_rate: 1000, default_margin: 25, category_margins: {}, exchange_rate_source: 'auto' };
  }
}

function relativeTime(iso) {
  if (!iso) return 'nunca';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} minuto${mins === 1 ? '' : 's'}`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs} hora${hrs === 1 ? '' : 's'}`;
  const days = Math.round(hrs / 24);
  return `hace ${days} día${days === 1 ? '' : 's'}`;
}

function renderExchangeSection() {
  const box = document.getElementById('fcExchangeSection');
  const isAuto = settings.exchange_rate_source !== 'manual';
  box.innerHTML = `
    <div class="cat-section-head" style="--cat-color:#10c46a;"><i class="fas fa-money-bill-transfer"></i><span>Tipo de cambio (USD → ARS)</span></div>
    <div class="fc-card">
      <div class="form-row checks">
        <label class="check"><input type="radio" name="fc_rate_mode" value="manual" ${!isAuto ? 'checked' : ''} onchange="window.__setRateMode('manual')"><span>Manual</span></label>
        <label class="check"><input type="radio" name="fc_rate_mode" value="auto" ${isAuto ? 'checked' : ''} onchange="window.__setRateMode('auto')"><span>Automático (USDT · DolarApi)</span></label>
      </div>
      <p style="color:#ccc;font-size:14px;margin:8px 0;">Cotización actual: <strong style="color:var(--admin-orange);">$${money(settings.exchange_rate)} ARS/USDT</strong></p>
      <p style="color:#888;font-size:12px;margin:0 0 14px;">Última actualización: ${relativeTime(settings.exchange_rate_updated_at)} · Última sincronización de catálogo: ${relativeTime(settings.last_sync_at)}</p>
      <div class="form-row" style="align-items:flex-end;">
        <div class="form-group"><label>Forzar valor manual</label><input type="number" id="fc_manualRate" step="0.01" placeholder="Ej: 1050"></div>
        <button type="button" class="btn-secondary" onclick="window.__saveManualRate()"><i class="fas fa-pen"></i> Guardar valor manual</button>
        <button type="button" class="btn-primary" id="fcUpdateRateBtn" onclick="window.__updateExchangeRate()"><i class="fas fa-rotate"></i> Actualizar ahora</button>
      </div>
    </div>`;
}

window.__setRateMode = async function (mode) {
  try {
    const { error } = await supabase.from('fazercards_settings').update({ exchange_rate_source: mode, updated_at: new Date().toISOString() }).eq('id', 'default');
    if (error) throw error;
    settings.exchange_rate_source = mode;
    toast('Modo actualizado: ' + (mode === 'manual' ? 'Manual' : 'Automático'), 'ok');
    renderExchangeSection();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.__saveManualRate = async function () {
  const val = parseFloat(document.getElementById('fc_manualRate').value);
  if (!val || val <= 0) { toast('Ingresá un valor válido', 'err'); return; }
  try {
    const { error } = await supabase.from('fazercards_settings').update({
      exchange_rate: val, exchange_rate_source: 'manual', exchange_rate_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', 'default');
    if (error) throw error;
    toast('Valor manual guardado, recalculando precios...', 'ok');
    await recalcPrices();
    await loadAll();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.__updateExchangeRate = async function () {
  const btn = document.getElementById('fcUpdateRateBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
  try {
    const { data, error } = await supabase.functions.invoke('fazercards-update-exchange-rate');
    if (error) throw error;
    if (data && data.skipped) toast(data.reason || 'No se actualizó (modo manual)', 'ok');
    else toast('Tipo de cambio actualizado: $' + money(data.exchange_rate), 'ok');
    await loadAll();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-rotate"></i> Actualizar ahora'; }
};

async function recalcPrices() {
  try {
    const { error } = await supabase.functions.invoke('fazercards-recalculate-prices');
    if (error) throw error;
  } catch (e) { console.error('recalc error', e); }
}

/* ---------- márgenes ---------- */
function renderMarginsSection() {
  const box = document.getElementById('fcMarginsSection');
  const cm = settings.category_margins || {};
  const keys = Array.from(new Set([...DEFAULT_CATEGORY_MARGIN_KEYS, ...Object.keys(cm)]));

  box.innerHTML = `
    <div class="cat-section-head" style="--cat-color:#2F7BFF;"><i class="fas fa-chart-simple"></i><span>Márgenes por categoría</span></div>
    <div class="fc-card">
      <div class="form-row">
        <div class="form-group"><label>Margen por defecto (%)</label><input type="number" id="fc_defaultMargin" step="0.1" value="${escAttr(settings.default_margin ?? 25)}"></div>
      </div>
      <div class="fc-margins-grid" id="fcMarginsGrid">
        ${keys.map(k => `
          <div class="form-group">
            <label>${escapeHtml(k)}</label>
            <input type="number" step="0.1" data-margin-key="${escAttr(k)}" value="${cm[k] != null ? escAttr(cm[k]) : ''}" placeholder="Usar defecto">
          </div>`).join('')}
      </div>
      <div class="form-row" style="margin-top:10px;">
        <div class="form-group full"><label>Agregar categoría</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="fc_newCategoryName" placeholder="Ej: Xbox Live Gold">
            <button type="button" class="btn-secondary" onclick="window.__addMarginCategory()"><i class="fas fa-plus"></i></button>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="border:none;padding-top:14px;">
        <button type="button" class="btn-primary" onclick="window.__saveMargins()"><i class="fas fa-save"></i> Guardar cambios</button>
      </div>
    </div>`;
}

window.__addMarginCategory = function () {
  const input = document.getElementById('fc_newCategoryName');
  const name = input.value.trim();
  if (!name) return;
  if (!settings.category_margins) settings.category_margins = {};
  if (!(name in settings.category_margins)) settings.category_margins[name] = null;
  input.value = '';
  renderMarginsSection();
};

window.__saveMargins = async function () {
  const defaultMargin = parseFloat(document.getElementById('fc_defaultMargin').value) || 0;
  const categoryMargins = {};
  document.querySelectorAll('#fcMarginsGrid input[data-margin-key]').forEach(inp => {
    const key = inp.dataset.marginKey;
    const v = inp.value.trim();
    if (v !== '') categoryMargins[key] = parseFloat(v);
  });
  try {
    const { error } = await supabase.from('fazercards_settings').update({
      default_margin: defaultMargin, category_margins: categoryMargins, updated_at: new Date().toISOString(),
    }).eq('id', 'default');
    if (error) throw error;
    settings.default_margin = defaultMargin;
    settings.category_margins = categoryMargins;
    toast('Márgenes guardados, recalculando precios...', 'ok');
    await recalcPrices();
    await loadProducts();
    renderCatalogSection();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

/* ---------- promociones ---------- */
async function loadPromotions() {
  try {
    const { data, error } = await supabase.from('fazercards_promotions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    promotions = data || [];
  } catch (e) { console.error(e); promotions = []; }
}

function renderPromosSection() {
  const box = document.getElementById('fcPromosSection');
  box.innerHTML = `
    <div class="cat-section-head" style="--cat-color:#8b5cf6;"><i class="fas fa-tags"></i><span>Promociones activas</span>
      <button class="btn-primary" style="margin-left:auto;" onclick="openPromoModal()"><i class="fas fa-plus"></i> Nueva promoción</button>
    </div>
    <div class="fc-card">
      ${promotions.length ? `<div class="admin-products-grid">${promotions.map(renderPromoCard).join('')}</div>` : emptyState({ icon: 'fas fa-tags', title: 'Sin promociones', text: 'Creá la primera promoción para el catálogo gaming.' })}
    </div>`;
}

function scopeLabel(p) {
  if (p.scope === 'all') return 'Todo el catálogo';
  if (p.scope === 'category') return 'Categoría: ' + (p.category || '—');
  const prod = products.find(x => x.id === p.product_id);
  return 'Producto: ' + (prod ? prod.name : p.product_id || '—');
}

function renderPromoCard(p) {
  const vigenciaFrom = p.starts_at ? new Date(p.starts_at).toLocaleString('es-AR') : '—';
  const vigenciaTo = p.ends_at ? new Date(p.ends_at).toLocaleString('es-AR') : 'sin fin';
  return `
    <div class="admin-product-card" style="--cat-color:#8b5cf6">
      <div class="ap-thumb"><i class="fas fa-tags" style="font-size:28px;color:#8b5cf6;"></i></div>
      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-cat">${escapeHtml(scopeLabel(p))}</span>
          ${p.is_active ? '<span class="ap-state st-active">Activa</span>' : '<span class="ap-state st-hidden">Inactiva</span>'}
        </div>
        <h4 class="ap-name">${escapeHtml(p.name)}</h4>
        <div class="ap-meta">Descuento: ${p.discount_percent}% · ${escapeHtml(vigenciaFrom)} → ${escapeHtml(vigenciaTo)}</div>
      </div>
      <div class="ap-actions">
        <button title="Editar" onclick="editPromo('${p.id}')"><i class="fas fa-pen"></i></button>
        <button title="${p.is_active ? 'Desactivar' : 'Activar'}" onclick="togglePromo('${p.id}')"><i class="fas ${p.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
        <button title="Eliminar" class="del" onclick="deletePromo('${p.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
}

window.__toggleScopeFields = function () {
  const scope = document.getElementById('pr_scope').value;
  document.getElementById('pr_categoryRow').style.display = scope === 'category' ? '' : 'none';
  document.getElementById('pr_productRow').style.display = scope === 'product' ? '' : 'none';
  if (scope === 'product') {
    const sel = document.getElementById('pr_product_id');
    sel.innerHTML = products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  }
};

window.openPromoModal = function () {
  currentPromoEditId = null;
  document.getElementById('promoModalTitle').textContent = 'Nueva promoción';
  document.getElementById('promoForm').reset();
  document.getElementById('pr_active').checked = true;
  window.__toggleScopeFields();
  document.getElementById('promoModal').classList.add('open');
};

window.editPromo = function (id) {
  const p = promotions.find(x => x.id === id); if (!p) return;
  currentPromoEditId = id;
  document.getElementById('promoModalTitle').textContent = 'Editar promoción';
  document.getElementById('pr_name').value = p.name || '';
  document.getElementById('pr_description').value = p.description || '';
  document.getElementById('pr_scope').value = p.scope || 'all';
  document.getElementById('pr_discount').value = p.discount_percent ?? '';
  document.getElementById('pr_category').value = p.category || '';
  document.getElementById('pr_starts_at').value = p.starts_at ? toLocalInput(p.starts_at) : '';
  document.getElementById('pr_ends_at').value = p.ends_at ? toLocalInput(p.ends_at) : '';
  document.getElementById('pr_active').checked = p.is_active !== false;
  window.__toggleScopeFields();
  if (p.scope === 'product') document.getElementById('pr_product_id').value = p.product_id || '';
  document.getElementById('promoModal').classList.add('open');
};

function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

window.closePromoModal = function () { document.getElementById('promoModal').classList.remove('open'); };

window.togglePromo = async function (id) {
  const p = promotions.find(x => x.id === id); if (!p) return;
  try {
    const { error } = await supabase.from('fazercards_promotions').update({ is_active: !p.is_active }).eq('id', id);
    if (error) throw error;
    await loadPromotions(); renderPromosSection();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.deletePromo = async function (id) {
  if (!confirm('¿Eliminar esta promoción?')) return;
  try {
    const { error } = await supabase.from('fazercards_promotions').delete().eq('id', id);
    if (error) throw error;
    toast('Promoción eliminada', 'ok');
    await loadPromotions(); renderPromosSection();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

async function savePromo(e) {
  e.preventDefault();
  const btn = document.getElementById('promoSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const name = document.getElementById('pr_name').value.trim();
    if (!name) throw new Error('El nombre es obligatorio');
    const scope = document.getElementById('pr_scope').value;
    const payload = {
      name,
      description: document.getElementById('pr_description').value.trim() || null,
      scope,
      category: scope === 'category' ? (document.getElementById('pr_category').value.trim() || null) : null,
      product_id: scope === 'product' ? (document.getElementById('pr_product_id').value || null) : null,
      discount_percent: parseFloat(document.getElementById('pr_discount').value) || 0,
      starts_at: document.getElementById('pr_starts_at').value ? new Date(document.getElementById('pr_starts_at').value).toISOString() : new Date().toISOString(),
      ends_at: document.getElementById('pr_ends_at').value ? new Date(document.getElementById('pr_ends_at').value).toISOString() : null,
      is_active: document.getElementById('pr_active').checked,
    };
    let error;
    if (currentPromoEditId) ({ error } = await supabase.from('fazercards_promotions').update(payload).eq('id', currentPromoEditId));
    else ({ error } = await supabase.from('fazercards_promotions').insert(payload));
    if (error) throw error;

    // Las promociones por categoria/producto tocan promo_discount de fazercards_products via recalculo manual simple:
    await applyPromoToProducts(payload);

    toast(currentPromoEditId ? 'Promoción actualizada' : 'Promoción creada', 'ok');
    closePromoModal();
    await loadPromotions(); await loadProducts();
    renderPromosSection(); renderCatalogSection();
  } catch (err) { toast('Error: ' + err.message, 'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; }
}

// Aplica el descuento de una promo activa y vigente a promo_discount de los productos alcanzados,
// y recalcula. Es una aplicacion simple (ultima promo guardada gana); no acumula multiples promos superpuestas.
async function applyPromoToProducts(promo) {
  if (!promo.is_active) return;
  try {
    let query = supabase.from('fazercards_products').update({ promo_discount: promo.discount_percent, updated_at: new Date().toISOString() });
    if (promo.scope === 'product' && promo.product_id) query = query.eq('id', promo.product_id);
    else if (promo.scope === 'category' && promo.category) query = query.or(`category.eq.${promo.category},subcategory.eq.${promo.category}`);
    else if (promo.scope !== 'all') return;
    await query;
    await recalcPrices();
  } catch (e) { console.error('No se pudo aplicar la promo a los productos', e); }
}

/* ---------- catálogo ---------- */
async function loadProducts() {
  try {
    const { data, error } = await supabase.from('fazercards_products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    products = data || [];
  } catch (e) { console.error(e); products = []; }
}

function effectiveMargin(p) {
  if (p.custom_margin != null) return Number(p.custom_margin);
  const cm = settings.category_margins || {};
  if (cm[p.category] != null) return Number(cm[p.category]);
  if (p.subcategory && cm[p.subcategory] != null) return Number(cm[p.subcategory]);
  return Number(settings.default_margin) || 0;
}

const COMPATIBLE_REGIONS = ['AR', 'LATAM', 'GLOBAL'];
function isCompatibleRegion(region) { return COMPATIBLE_REGIONS.includes(String(region || '').toUpperCase()); }

function filteredProducts() {
  return products.filter(p => {
    if (activeCategoryFilter !== 'all' && p.category !== activeCategoryFilter) return false;
    const region = String(p.fazercards_region || p.region || 'GLOBAL').toUpperCase();
    if (activeRegionFilter === 'compatible' && !isCompatibleRegion(region)) return false;
    else if (activeRegionFilter === 'other' && isCompatibleRegion(region)) return false;
    else if (!['all', 'compatible', 'other'].includes(activeRegionFilter) && region !== activeRegionFilter) return false;
    if (searchTerm && !(`${p.name} ${p.subcategory || ''}`.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
    return true;
  });
}

// El shell (buscador + pills + select de region) se arma UNA sola vez; escribir en el
// buscador solo vuelve a pintar #fcCatalogGrid. Si se reconstruye el <input> en cada
// tecla, el cursor salta al principio y el texto queda desordenado.
function renderCatalogSection() {
  const box = document.getElementById('fcCatalogSection');
  box.innerHTML = `
    <div class="cat-section-head" style="--cat-color:var(--admin-orange);"><i class="fas fa-box-open"></i><span>Catálogo FazerCards</span>
      <button class="btn-primary" style="margin-left:auto;" id="fcSyncBtn" onclick="window.__syncCatalog()"><i class="fas fa-rotate"></i> Sincronizar catálogo</button>
    </div>
    <div class="fc-card">
      <div class="products-toolbar">
        <div class="toolbar-filters">
          <div class="search-box"><i class="fas fa-search"></i><input type="text" id="fcSearch" placeholder="Buscar producto..." value="${escAttr(searchTerm)}"></div>
          <button type="button" class="section-pill ${activeCategoryFilter === 'all' ? 'on' : ''}" data-cat="all">Todos</button>
          <button type="button" class="section-pill ${activeCategoryFilter === 'giftcard' ? 'on' : ''}" data-cat="giftcard">Gift Cards</button>
          <button type="button" class="section-pill ${activeCategoryFilter === 'topup' ? 'on' : ''}" data-cat="topup">Recargas</button>
          <button type="button" class="section-pill ${activeCategoryFilter === 'gamekey' ? 'on' : ''}" data-cat="gamekey">Game Keys</button>
          <select id="fcRegionFilter" class="filter-select">
            <option value="all" ${activeRegionFilter === 'all' ? 'selected' : ''}>Todos</option>
            <option value="compatible" ${activeRegionFilter === 'compatible' ? 'selected' : ''}>Compatibles con Argentina</option>
            <option value="LATAM" ${activeRegionFilter === 'LATAM' ? 'selected' : ''}>Solo LATAM</option>
            <option value="GLOBAL" ${activeRegionFilter === 'GLOBAL' ? 'selected' : ''}>Solo Global</option>
            <option value="AR" ${activeRegionFilter === 'AR' ? 'selected' : ''}>Solo Argentina</option>
            <option value="other" ${activeRegionFilter === 'other' ? 'selected' : ''}>Otras regiones (CEI, MENA, RU, etc.)</option>
          </select>
        </div>
      </div>
      <div class="products-count" id="fcCatalogCount"></div>
      <div class="admin-products-grid" id="fcCatalogGrid"></div>
    </div>`;

  document.getElementById('fcSearch').addEventListener('input', (e) => { searchTerm = e.target.value; renderCatalogGrid(); });
  document.getElementById('fcRegionFilter').addEventListener('change', (e) => { activeRegionFilter = e.target.value; renderCatalogGrid(); });
  document.querySelectorAll('#fcCatalogSection .section-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategoryFilter = btn.dataset.cat;
      document.querySelectorAll('#fcCatalogSection .section-pill').forEach(b => b.classList.toggle('on', b === btn));
      renderCatalogGrid();
    });
  });

  renderCatalogGrid();
}

function renderCatalogGrid() {
  const grid = document.getElementById('fcCatalogGrid');
  const list = filteredProducts();
  document.getElementById('fcCatalogCount').textContent = list.length + ' producto(s)';
  grid.innerHTML = list.length ? list.map(renderProductCard).join('') : emptyState({ icon: 'fas fa-box-open', title: 'Sin productos', text: 'Corré "Sincronizar catálogo" para traer productos de FazerCards.' });
}

function renderProductCard(p) {
  const margin = effectiveMargin(p);
  const marginSource = p.custom_margin != null ? 'propio' : ((settings.category_margins || {})[p.subcategory] != null || (settings.category_margins || {})[p.category] != null ? 'categoría' : 'defecto');
  const priceArs = Number(p.price_ars) || 0;
  const costArs = Number(p.price_usd) * Number(settings.exchange_rate || 0);
  const profit = priceArs - costArs;
  const region = String(p.fazercards_region || p.region || 'GLOBAL').toUpperCase();
  const compatible = isCompatibleRegion(region);
  const regionBadge = `<span class="fc-region-badge ${compatible ? 'compat' : 'other'}"><i class="fas ${compatible ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> ${escapeHtml(region)}</span>`;

  return `
    <div class="admin-product-card" style="--cat-color:#8b5cf6">
      <div class="ap-thumb">${p.image_url ? `<img src="${escAttr(p.image_url)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-gamepad" style="font-size:28px;color:#8b5cf6;"></i>'}</div>
      <div class="ap-body">
        <div class="ap-top">
          <span class="ap-cat">${escapeHtml(CATEGORY_LABELS[p.category] || p.category)}${p.subcategory ? ' · ' + escapeHtml(p.subcategory) : ''}</span>
          ${p.is_active ? '<span class="ap-state st-active">Activado</span>' : '<span class="ap-state st-hidden">Desactivado</span>'}
        </div>
        <div class="ap-top" style="margin-top:-6px;">${regionBadge}</div>
        <h4 class="ap-name">${escapeHtml(p.name)}</h4>
        <div class="ap-meta" style="color:#777;font-size:11px;">Costo mayorista (referencia interna): USD ${money(p.price_usd)} · Margen (${marginSource}): +${margin}%${p.promo_discount ? ' · Promo: ' + p.promo_discount + '%' : ''}</div>
        <div class="ap-meta" style="color:var(--admin-orange);font-weight:800;font-size:18px;">$${money(priceArs)} ARS</div>
        <div class="ap-meta" style="color:#10c46a;">Ganancia estimada: $${money(profit)} ARS</div>
      </div>
      <div class="ap-actions">
        <button title="${p.is_active ? 'Desactivar' : 'Activar'}" onclick="window.__toggleProductActive('${p.id}')"><i class="fas ${p.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
        <button title="Destacar" onclick="window.__toggleProductFeatured('${p.id}')"><i class="fas fa-star" style="color:${p.is_featured ? '#FFD700' : '#555'}"></i></button>
        <button title="Editar" onclick="openFcProductModal('${p.id}')"><i class="fas fa-pen"></i></button>
      </div>
    </div>`;
}

window.__syncCatalog = async function () {
  const btn = document.getElementById('fcSyncBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
  try {
    const { data, error } = await supabase.functions.invoke('fazercards-sync');
    if (error) throw error;
    toast(`Sincronizado: ${data.totals.upserted} producto(s) (AR + LATAM + Global). Precios recalculados: ${data.recalculated ?? '—'}`, 'ok');
    if (data.totals.errors) toast(`${data.totals.errors} categoría(s) tuvieron error al sincronizar — revisá la consola`, 'err');
    console.log('fazercards-sync resultado completo:', data);
    await loadAll();
  } catch (e) { toast('Error al sincronizar: ' + e.message, 'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-rotate"></i> Sincronizar catálogo'; }
};

window.__toggleProductActive = async function (id) {
  const p = products.find(x => x.id === id); if (!p) return;
  try {
    const { error } = await supabase.from('fazercards_products').update({ is_active: !p.is_active, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    await loadProducts(); renderCatalogSection();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.__toggleProductFeatured = async function (id) {
  const p = products.find(x => x.id === id); if (!p) return;
  try {
    const { error } = await supabase.from('fazercards_products').update({ is_featured: !p.is_featured, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    await loadProducts(); renderCatalogSection();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

window.openFcProductModal = function (id) {
  const p = products.find(x => x.id === id); if (!p) return;
  currentProductEditId = id;
  document.getElementById('fcp_name').textContent = p.name;
  document.getElementById('fcp_margin').value = p.custom_margin ?? '';
  document.getElementById('fcp_promo').value = p.promo_discount ?? 0;
  document.getElementById('fcp_active').checked = !!p.is_active;
  document.getElementById('fcp_featured').checked = !!p.is_featured;
  document.getElementById('fcProductModal').classList.add('open');
};

window.closeFcProductModal = function () { document.getElementById('fcProductModal').classList.remove('open'); };

async function saveProductAdjustment(e) {
  e.preventDefault();
  const btn = document.getElementById('fcProductSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const marginVal = document.getElementById('fcp_margin').value.trim();
    const payload = {
      custom_margin: marginVal === '' ? null : parseFloat(marginVal),
      promo_discount: parseFloat(document.getElementById('fcp_promo').value) || 0,
      is_active: document.getElementById('fcp_active').checked,
      is_featured: document.getElementById('fcp_featured').checked,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('fazercards_products').update(payload).eq('id', currentProductEditId);
    if (error) throw error;
    toast('Producto actualizado, recalculando precio...', 'ok');
    await recalcPrices();
    closeFcProductModal();
    await loadProducts();
    renderCatalogSection();
  } catch (err) { toast('Error: ' + err.message, 'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; }
}

/* ---------- helpers ---------- */
function money(n) { n = Number(n) || 0; return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
function toast(msg, type) { const t = document.createElement('div'); t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok'); t.innerHTML = '<i class="fas ' + (type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check') + '"></i> ' + msg; document.body.appendChild(t); setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3200); }
