import { supabase } from '../config.js?v=cb22';
import { layout, mountLayout, emptyState } from '../core/layout.js?v=cb22';

let allZones = [];
let currentEditId = null;

const TYPES = {
  local:      { label: 'Local',      icon: 'fas fa-store',       color: '#FF6A00' },
  provincial: { label: 'Provincial', icon: 'fas fa-truck-fast',  color: '#2F7BFF' },
  nacional:   { label: 'Nacional',   icon: 'fas fa-truck',       color: '#8b5cf6' },
};

const PROVIDERS = { propio: 'PROPIO', correo: 'CORREO', oca: 'OCA', andreani: 'ANDREANI' };

export async function shippingView() {
  const content = `
    <div class="products-toolbar">
      <p class="field-hint" style="margin:0;">
        Configurá las zonas de envío. El cliente verá las opciones al ingresar su código postal.
      </p>
      <button class="btn-primary" onclick="openZoneModal()">
        <i class="fas fa-plus"></i> Nueva zona
      </button>
    </div>
    <div class="info-banner">
      <i class="fas fa-circle-info"></i>
      Los envíos "a cotizar" se calculan según el CP del cliente al momento del checkout.
    </div>
    <div class="products-count" id="zonesCount">Cargando...</div>
    <div class="admin-products-grid" id="zonesGrid"></div>`;

  const modal = `
  <div class="modal-overlay" id="zoneModal">
    <div class="modal-box">
      <div class="modal-header"><h2 id="zoneModalTitle">Nueva zona</h2><button class="modal-close" onclick="closeZoneModal()"><i class="fas fa-times"></i></button></div>
      <form id="zoneForm" class="modal-body">
        <div class="form-row"><div class="form-group full"><label>Nombre *</label><input type="text" id="z_name" required placeholder="Ej: Envío local (moto)"></div></div>
        <div class="form-row">
          <div class="form-group">
            <label>Tipo *</label>
            <select id="z_type" required>
              <option value="local">Local</option>
              <option value="provincial">Provincial</option>
              <option value="nacional">Nacional</option>
            </select>
          </div>
          <div class="form-group">
            <label>Proveedor</label>
            <select id="z_provider">
              <option value="propio">Propio</option>
              <option value="correo">Correo Argentino</option>
              <option value="oca">OCA</option>
              <option value="andreani">Andreani</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Precio</label>
            <input type="number" id="z_price" step="0.01" value="0">
            <p class="field-hint">0 = gratis · -1 = a cotizar según CP · positivo = precio fijo</p>
          </div>
          <div class="form-group">
            <label>Envío gratis desde</label>
            <input type="number" id="z_free_threshold" placeholder="Ej: 150000">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full"><label>Días estimados</label><input type="text" id="z_days" placeholder="Ej: 3 a 5 días hábiles"></div>
        </div>
        <div class="form-row"><div class="form-group full"><label>Descripción</label><textarea id="z_description" rows="2" placeholder="Ej: Envío a todo el país"></textarea></div></div>
        <div class="form-row">
          <div class="form-group"><label>Orden</label><input type="number" id="z_order" value="0"></div>
        </div>
        <div class="form-row checks">
          <label class="check"><input type="checkbox" id="z_active" checked><span>Activo</span></label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeZoneModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="zoneSaveBtn"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>`;

  return layout({ title: 'Envíos', content }) + modal;
}

export function shippingViewOnMount() {
  mountLayout();
  document.getElementById('zoneForm').addEventListener('submit', saveZone);
  loadZones();
}

async function loadZones() {
  const grid = document.getElementById('zonesGrid');
  grid.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando zonas de envío...</p>';
  try {
    const { data, error } = await supabase.from('shipping_zones').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    allZones = data || [];
    document.getElementById('zonesCount').textContent = allZones.length + ' zona(s)';
    renderZones();
  } catch (e) { console.error(e); grid.innerHTML = '<p class="loading-text" style="color:#ff4444">Error al cargar: '+e.message+'</p>'; }
}

function renderZones() {
  const grid = document.getElementById('zonesGrid');
  if (!allZones.length) {
    grid.innerHTML = emptyState({
      icon: 'fas fa-truck',
      title: 'No hay zonas de envío',
      text: 'Creá la primera.',
      action: { label: 'Nueva zona', icon: 'fas fa-plus', onclick: 'openZoneModal()' },
    });
    return;
  }

  // Agrupar por tipo
  const grouped = {};
  Object.keys(TYPES).forEach(k => grouped[k] = []);
  allZones.forEach(z => {
    const t = z.type || 'local';
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(z);
  });

  grid.innerHTML = Object.entries(grouped)
    .filter(([_, zones]) => zones.length > 0)
    .map(([typeId, zones]) => {
      const t = TYPES[typeId] || { label: typeId, color: '#888', icon: 'fas fa-truck' };
      return `
        <div class="cat-section">
          <div class="cat-section-head" style="--cat-color: ${t.color}">
            <i class="${t.icon}"></i>
            <span>${escapeHtml(t.label)}</span>
            <span class="cat-section-count">${zones.length}</span>
          </div>
          <div class="cat-section-list">
            ${zones.map(z => renderZoneCard(z, t)).join('')}
          </div>
        </div>`;
    }).join('');
}

function priceHtml(z) {
  const price = Number(z.price);
  if (price === 0) return `<div class="ship-price ship-free">Gratis</div>`;
  if (price === -1) return `<div class="ship-price ship-quote">A cotizar según CP</div>`;
  return `<div class="ship-price ship-fixed">$${money(price)}</div>`;
}

function renderZoneCard(z, t) {
  return `
    <div class="admin-product-card" style="--cat-color: ${t.color}">
      <div class="ap-thumb"><i class="${escAttr(t.icon)}" style="font-size:32px;color:${t.color}"></i></div>
      <div class="ap-body">
        <div class="ap-top">
          ${z.provider ? `<span class="ship-provider-badge">${escapeHtml(PROVIDERS[z.provider] || z.provider)}</span>` : ''}
          ${z.is_active ? '<span class="ap-state st-active">Activo</span>' : '<span class="ap-state st-hidden">Inactivo</span>'}
        </div>
        <h4 class="ap-name">${escapeHtml(z.name)}</h4>
        ${z.description ? `<div class="ap-meta">${escapeHtml(z.description)}</div>` : ''}
        ${z.estimated_days ? `<div class="ap-meta"><i class="fas fa-clock"></i> ${escapeHtml(z.estimated_days)}</div>` : ''}
        ${priceHtml(z)}
        ${z.free_threshold ? `<div class="ship-free-from">Gratis desde $${money(z.free_threshold)}</div>` : ''}
      </div>
      <div class="ap-actions">
        <button title="Editar" onclick="editZone('${z.id}')"><i class="fas fa-pen"></i></button>
        <button title="Eliminar" class="del" onclick="deleteZone('${z.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
}

window.openZoneModal = function () {
  currentEditId = null;
  document.getElementById('zoneModalTitle').textContent = 'Nueva zona';
  document.getElementById('zoneForm').reset();
  document.getElementById('zoneModal').classList.add('open');
};

window.editZone = function (id) {
  const z = allZones.find(x => x.id === id); if (!z) return;
  currentEditId = id;
  document.getElementById('zoneModalTitle').textContent = 'Editar zona';
  document.getElementById('z_name').value = z.name || '';
  document.getElementById('z_type').value = z.type || 'local';
  document.getElementById('z_provider').value = z.provider || 'propio';
  document.getElementById('z_price').value = z.price ?? 0;
  document.getElementById('z_free_threshold').value = z.free_threshold ?? '';
  document.getElementById('z_days').value = z.estimated_days || '';
  document.getElementById('z_description').value = z.description || '';
  document.getElementById('z_order').value = z.sort_order ?? 0;
  document.getElementById('z_active').checked = z.is_active !== false;
  document.getElementById('zoneModal').classList.add('open');
};

window.closeZoneModal = function () { document.getElementById('zoneModal').classList.remove('open'); };

window.deleteZone = async function (id) {
  if (!confirm('¿Eliminar esta zona de envío?')) return;
  try {
    const { error } = await supabase.from('shipping_zones').delete().eq('id', id);
    if (error) throw error;
    toast('Zona eliminada', 'ok'); loadZones();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

async function saveZone(e) {
  e.preventDefault();
  const btn = document.getElementById('zoneSaveBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const name = document.getElementById('z_name').value.trim();
    if (!name) throw new Error('El nombre es obligatorio');
    const freeThresholdRaw = document.getElementById('z_free_threshold').value;
    const payload = {
      name,
      type: document.getElementById('z_type').value,
      provider: document.getElementById('z_provider').value,
      price: parseFloat(document.getElementById('z_price').value) || 0,
      free_threshold: freeThresholdRaw === '' ? null : parseFloat(freeThresholdRaw),
      estimated_days: document.getElementById('z_days').value.trim() || null,
      description: document.getElementById('z_description').value.trim() || null,
      sort_order: parseInt(document.getElementById('z_order').value) || 0,
      is_active: document.getElementById('z_active').checked,
    };
    let error;
    if (currentEditId) ({ error } = await supabase.from('shipping_zones').update(payload).eq('id', currentEditId));
    else ({ error } = await supabase.from('shipping_zones').insert(payload));
    if (error) throw error;
    toast(currentEditId ? 'Zona actualizada' : 'Zona creada', 'ok');
    closeZoneModal(); loadZones();
  } catch (err) { toast('Error: ' + err.message, 'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; }
}

function money(n) {
  n = Number(n) || 0;
  return n.toLocaleString('es-AR');
}
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
function toast(msg, type) { const t=document.createElement('div'); t.className='admin-toast '+(type==='err'?'toast-err':'toast-ok'); t.innerHTML='<i class="fas '+(type==='err'?'fa-circle-exclamation':'fa-circle-check')+'"></i> '+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2800); }

/** Calcula el costo de envío final para una zona dado el total del carrito. -1 = a cotizar. */
export function calcularEnvio(zona, totalCarrito) {
  if (zona.price === -1) return -1; // a cotizar
  if (zona.price === 0) return 0;   // gratis
  if (zona.free_threshold && totalCarrito >= zona.free_threshold) return 0;
  return zona.price;
}
