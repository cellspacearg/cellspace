// ============================================================
// CALCULADORA 3D — costo real de impresiones y precio sugerido de venta.
// Formulas (verificadas contra el ejemplo de referencia del usuario):
//   precio_material   = (gramos_filamento/1000) * filament_price_kg
//   horas_totales     = horas_impresion + minutos_adicionales/60
//   precio_luz        = horas_totales * (printer_watts/1000) * kwh_price
//   desgaste_maquina  = (horas_totales / machine_lifetime_hours) * spare_parts_cost
//   margen_error      = error_margin_pct/100 * (precio_material + precio_luz + desgaste_maquina)
//   costo_sin_insumos = precio_material + precio_luz + desgaste_maquina + margen_error
//   insumos_margen    = insumos_extra * 1.3   (recargo fijo del 30% sobre insumos ya comprados)
//   total_a_cobrar    = costo_sin_insumos * multiplicador + insumos_margen
//   costo_unidad_vendida (tramos de Envios Flex de MercadoLibre, segun total_a_cobrar):
//     < 15000 -> 1330 | 15000-23999 -> 2740 | 24000-32999 -> 3320 | >=33000 -> 0
//   precio_mercadolibre = (total_a_cobrar + costo_unidad_vendida) / (1 - cargo_vender% - cargo_cuotas%)
// ============================================================
import { supabase } from '../config.js?v=cb22';
import { layout, mountLayout, emptyState } from '../core/layout.js?v=cb22';

// Modelo (marca, potencia en W). "Otro / Personalizado" deja el campo de consumo editable a mano.
const PRINTER_MODELS = [
  { label: 'Otro / Personalizado', watts: null },
  { label: 'Bambu Lab A1', watts: 95 },
  { label: 'Bambu Lab A1 Mini', watts: 45 },
  { label: 'Bambu Lab P1P', watts: 80 },
  { label: 'Bambu Lab P1S', watts: 100 },
  { label: 'Bambu Lab X1 Carbon', watts: 120 },
  { label: 'Bambu Lab P2S', watts: 130 },
  { label: 'Bambu Lab H2S', watts: 210 },
  { label: 'Bambu Lab H2D', watts: 210 },
  { label: 'Bambu Lab H2C', watts: 210 },
  { label: 'Prusa MK3S+', watts: 80 },
  { label: 'Prusa MK4', watts: 100 },
  { label: 'Creality Ender 3 V2', watts: 110 },
  { label: 'Creality Ender 3 S1', watts: 120 },
  { label: 'Creality K1', watts: 100 },
  { label: 'Creality K1C', watts: 100 },
  { label: 'Creality K1 Max', watts: 200 },
  { label: 'Creality K2', watts: 150 },
  { label: 'Creality K2 Pro', watts: 180 },
  { label: 'Creality K2 Plus', watts: 220 },
  { label: 'Anycubic Kobra 2', watts: 75 },
  { label: 'Anycubic Vyper', watts: 80 },
  { label: 'SnapMaker U1', watts: 130 },
  { label: 'Elegoo Saturn 3 (resina)', watts: 75 },
  { label: 'Elegoo Saturn 4 (resina)', watts: 75 },
  { label: 'Voron 2.4 (350mm DIY)', watts: 225 },
];

const MULTIPLIERS = [2, 2.5, 3, 3.5, 4, 5];
const INSUMOS_MARGEN_PCT = 30; // recargo fijo sobre insumos extra (ya comprados por el usuario)

let profiles = [];
let currentProfileId = null;
let activeMultiplier = 3;

export async function calc3dView() {
  const content = `
    <div class="calc3d-grid">
      <div class="calc3d-col-main">
        <div class="calc3d-card">
          <div class="calc3d-card-head">
            <h3>Perfil</h3>
            <button type="button" class="btn-secondary" onclick="window.__calc3dNewProfile()"><i class="fas fa-plus"></i> Nuevo</button>
          </div>
          <div class="form-row">
            <div class="form-group full">
              <label>Perfil guardado</label>
              <select id="c3d_profileSelect"><option value="">-- Nuevo perfil --</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full"><label>Nombre del perfil</label><input type="text" id="c3d_profileName" placeholder="Ej: Impresora principal"></div>
          </div>
          <button type="button" class="btn-primary calc3d-fullwidth" onclick="window.__calc3dSaveProfile()"><i class="fas fa-save"></i> Guardar perfil</button>
        </div>

        <div class="calc3d-card">
          <h3>Gastos fijos</h3>
          <div class="form-row">
            <div class="form-group"><label>Precio del filamento (AR$/kg)</label><input type="number" id="c3d_filamentPrice" step="1" value="0"></div>
            <div class="form-group"><label>Precio del kWh (AR$)</label><input type="number" id="c3d_kwhPrice" step="1" value="0"></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Modelo de impresora</label>
              <span class="field-hint">Elegí tu modelo y autocompletamos el consumo (W). Si no está en la lista, dejá "Otro / Personalizado".</span>
              <select id="c3d_printerModel"></select>
            </div>
            <div class="form-group">
              <label>Consumo de la impresora (W)</label>
              <span class="field-hint">Consumo promedio durante un print (no peak). Si no lo sabés, ~100W es un buen valor default.</span>
              <input type="number" id="c3d_printerWatts" step="1" value="100">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Vida útil de la máquina (horas)</label><input type="number" id="c3d_lifetimeHours" step="1" value="4320"></div>
            <div class="form-group"><label>Costo de repuestos (AR$)</label><input type="number" id="c3d_sparePartsCost" step="1" value="0"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Margen de error (%)</label><input type="number" id="c3d_errorMargin" step="0.1" value="5"></div>
          </div>
        </div>

        <div class="calc3d-card">
          <h3>Pieza</h3>
          <div class="form-row">
            <div class="form-group"><label>Horas de impresión</label><input type="number" id="c3d_printHours" step="0.1" value="0"></div>
            <div class="form-group"><label>Minutos adicionales</label><input type="number" id="c3d_printMinutes" step="1" placeholder="0"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Gramos de filamento</label><input type="number" id="c3d_grams" step="1" placeholder="0"></div>
            <div class="form-group"><label>Insumos extra (AR$)</label><input type="number" id="c3d_extraSupplies" step="1" placeholder="0"></div>
          </div>
        </div>

        <div class="calc3d-card">
          <h3>MercadoLibre <span class="field-hint">(opcional, para el precio de referencia)</span></h3>
          <div class="form-row">
            <div class="form-group">
              <label>Cargo por vender (%)</label>
              <span class="field-hint">Entre 11,62% y 17,75% según la categoría en la que publiqués.</span>
              <input type="number" id="c3d_mlFeePct" step="0.01" value="15">
            </div>
            <div class="form-group">
              <label class="check" style="margin-top:26px;"><input type="checkbox" id="c3d_mlFlex" checked><span>Incluir costo por unidad vendida (Envíos Flex)</span></label>
            </div>
          </div>
          <div class="form-row checks">
            <label class="check"><input type="checkbox" id="c3d_mlCuotas"><span>Ofrezco cuotas</span></label>
            <div class="form-group" id="c3d_mlCuotasPctWrap" style="display:none;"><label>Cargo por cuotas (%)</label><input type="number" id="c3d_mlCuotasPct" step="0.1" value="5"></div>
          </div>
          <p class="field-hint">El costo por unidad vendida de Envíos Flex es fijo según el precio final: hasta $14.999 → $1.330 · $15.000–$23.999 → $2.740 · $24.000–$32.999 → $3.320 · desde $33.000 no aplica. Si publicás por Full/correo el costo varía según peso y medidas — ajustá el % a mano si hace falta.</p>
        </div>
      </div>

      <div class="calc3d-col-side">
        <div class="calc3d-card">
          <h3>Margen de ganancia</h3>
          <label class="field-hint">Multiplicador</label>
          <div class="calc3d-mult-row" id="c3d_multButtons">
            ${MULTIPLIERS.map(m => `<button type="button" class="calc3d-mult-btn" data-mult="${m}">×${m}</button>`).join('')}
          </div>
          <label style="margin-top:12px;display:block;">Personalizado</label>
          <span class="field-hint">Si necesitás otro valor, ingresalo acá (ej: 2.8).</span>
          <input type="number" id="c3d_multCustom" step="0.1" placeholder="3">
          <div class="calc3d-refs">
            <div class="calc3d-refs-title"><i class="fas fa-chevron-up"></i> Referencias</div>
            <ul>
              <li>×2.0 → Alto volumen / descuento</li>
              <li>×2.5 → Volumen medio</li>
              <li>×3.0 → Mayorista</li>
              <li>×3.5 → Intermedio</li>
              <li>×4.0 → Minorista</li>
              <li>×5.0 → Llaveros / piezas chicas</li>
            </ul>
          </div>
        </div>

        <div class="calc3d-card calc3d-results">
          <h3><i class="fas fa-calculator"></i> Resultados</h3>
          <div class="calc3d-res-row"><span>Precio material</span><strong id="c3d_r_material">AR$ 0,00</strong></div>
          <div class="calc3d-res-row"><span>Precio luz</span><strong id="c3d_r_luz">AR$ 0,00</strong></div>
          <div class="calc3d-res-row"><span>Desgaste máquina</span><strong id="c3d_r_desgaste">AR$ 0,00</strong></div>
          <div class="calc3d-res-row"><span>Margen de error</span><strong id="c3d_r_error">AR$ 0,00</strong></div>
          <div class="calc3d-res-divider"></div>
          <div class="calc3d-res-row calc3d-res-bold"><span>Costo total (sin insumos)</span><strong id="c3d_r_costoTotal">AR$ 0,00</strong></div>
          <div class="calc3d-res-row calc3d-res-bold"><span>Insumos (+${INSUMOS_MARGEN_PCT}%)</span><strong id="c3d_r_insumos">AR$ 0,00</strong></div>
          <div class="calc3d-res-total">
            <span>TOTAL A COBRAR</span>
            <strong id="c3d_r_total">AR$ 0,00</strong>
          </div>
          <div class="calc3d-res-ml">
            <span>PRECIO MERCADOLIBRE</span>
            <strong id="c3d_r_ml">AR$ 0,00</strong>
          </div>
          <button type="button" class="btn-primary calc3d-fullwidth" id="c3d_saveProductBtn" onclick="window.__calc3dSaveAsProduct()"><i class="fas fa-box"></i> Guardar como producto</button>
        </div>
      </div>
    </div>`;

  return layout({ title: 'Calculadora 3D', content });
}

export function calc3dViewOnMount() {
  mountLayout();
  populatePrinterSelect();
  wireInputs();
  loadProfiles();
  recalculate();
}

function populatePrinterSelect() {
  const sel = document.getElementById('c3d_printerModel');
  sel.innerHTML = PRINTER_MODELS.map(p => `<option value="${escAttr(p.label)}" data-watts="${p.watts ?? ''}">${escapeHtml(p.label)}</option>`).join('');
  sel.addEventListener('change', () => {
    const opt = sel.options[sel.selectedIndex];
    const watts = opt.dataset.watts;
    if (watts) document.getElementById('c3d_printerWatts').value = watts;
    recalculate();
  });
}

function wireInputs() {
  document.querySelectorAll('.calc3d-card input').forEach(inp => inp.addEventListener('input', recalculate));

  document.querySelectorAll('.calc3d-mult-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeMultiplier = Number(btn.dataset.mult);
      document.getElementById('c3d_multCustom').value = '';
      markActiveMultiplier();
      recalculate();
    });
  });
  document.getElementById('c3d_multCustom').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    if (v > 0) { activeMultiplier = v; markActiveMultiplier(); recalculate(); }
  });

  document.getElementById('c3d_mlCuotas').addEventListener('change', (e) => {
    document.getElementById('c3d_mlCuotasPctWrap').style.display = e.target.checked ? '' : 'none';
    recalculate();
  });

  document.getElementById('c3d_profileSelect').addEventListener('change', (e) => applyProfile(e.target.value));

  markActiveMultiplier();
}

function markActiveMultiplier() {
  document.querySelectorAll('.calc3d-mult-btn').forEach(b => b.classList.toggle('on', Number(b.dataset.mult) === activeMultiplier));
}

function num(id) { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? 0 : v; }

function costoUnidadVendida(totalACobrar) {
  if (totalACobrar >= 33000) return 0;
  if (totalACobrar >= 24000) return 3320;
  if (totalACobrar >= 15000) return 2740;
  return 1330;
}

function recalculate() {
  const filamentPriceKg = num('c3d_filamentPrice');
  const kwhPrice = num('c3d_kwhPrice');
  const printerWatts = num('c3d_printerWatts');
  const lifetimeHours = num('c3d_lifetimeHours') || 1;
  const sparePartsCost = num('c3d_sparePartsCost');
  const errorPct = num('c3d_errorMargin');
  const printHours = num('c3d_printHours');
  const printMinutes = num('c3d_printMinutes');
  const grams = num('c3d_grams');
  const extraSupplies = num('c3d_extraSupplies');
  const mlFeePct = num('c3d_mlFeePct');
  const mlCuotasChecked = document.getElementById('c3d_mlCuotas').checked;
  const mlCuotasPct = mlCuotasChecked ? num('c3d_mlCuotasPct') : 0;
  const mlFlexChecked = document.getElementById('c3d_mlFlex').checked;

  const horasTotales = printHours + (printMinutes / 60);
  const precioMaterial = (grams / 1000) * filamentPriceKg;
  const precioLuz = horasTotales * (printerWatts / 1000) * kwhPrice;
  const desgasteMaquina = (horasTotales / lifetimeHours) * sparePartsCost;
  const margenError = (errorPct / 100) * (precioMaterial + precioLuz + desgasteMaquina);
  const costoSinInsumos = precioMaterial + precioLuz + desgasteMaquina + margenError;
  const insumosMargen = extraSupplies * (1 + INSUMOS_MARGEN_PCT / 100);
  const totalACobrar = costoSinInsumos * activeMultiplier + insumosMargen;

  const costoUnidad = mlFlexChecked ? costoUnidadVendida(totalACobrar) : 0;
  const feeFraction = (mlFeePct / 100) + (mlCuotasPct / 100);
  const precioML = feeFraction < 1 ? (totalACobrar + costoUnidad) / (1 - feeFraction) : totalACobrar;

  document.getElementById('c3d_r_material').textContent = money(precioMaterial);
  document.getElementById('c3d_r_luz').textContent = money(precioLuz);
  document.getElementById('c3d_r_desgaste').textContent = money(desgasteMaquina);
  document.getElementById('c3d_r_error').textContent = money(margenError);
  document.getElementById('c3d_r_costoTotal').textContent = money(costoSinInsumos);
  document.getElementById('c3d_r_insumos').textContent = money(insumosMargen);
  document.getElementById('c3d_r_total').textContent = money(totalACobrar);
  document.getElementById('c3d_r_ml').textContent = money(precioML);

  window.__calc3dLastResult = { totalACobrar, precioML };
}

/* ---------- perfiles ---------- */
async function loadProfiles() {
  try {
    const { data, error } = await supabase.from('calc3d_profiles').select('*').order('name', { ascending: true });
    if (error) throw error;
    profiles = data || [];
    renderProfileSelect();
  } catch (e) { console.error(e); profiles = []; }
}

function renderProfileSelect() {
  const sel = document.getElementById('c3d_profileSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Nuevo perfil --</option>' +
    profiles.map(p => `<option value="${p.id}" ${p.id === currentProfileId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
}

function applyProfile(id) {
  currentProfileId = id || null;
  if (!id) { window.__calc3dNewProfile(); return; }
  const p = profiles.find(x => x.id === id);
  if (!p) return;
  document.getElementById('c3d_profileName').value = p.name || '';
  document.getElementById('c3d_filamentPrice').value = p.filament_price_kg ?? 0;
  document.getElementById('c3d_kwhPrice').value = p.kwh_price ?? 0;
  document.getElementById('c3d_printerModel').value = p.printer_model || 'Otro / Personalizado';
  document.getElementById('c3d_printerWatts').value = p.printer_watts ?? 0;
  document.getElementById('c3d_lifetimeHours').value = p.machine_lifetime_hours ?? 4320;
  document.getElementById('c3d_sparePartsCost').value = p.spare_parts_cost ?? 0;
  document.getElementById('c3d_errorMargin').value = p.error_margin_pct ?? 5;
  document.getElementById('c3d_mlFeePct').value = p.ml_fee_pct ?? 15;
  document.getElementById('c3d_mlCuotasPct').value = p.ml_installments_pct ?? 0;
  activeMultiplier = Number(p.margin_multiplier) || 3;
  document.getElementById('c3d_multCustom').value = MULTIPLIERS.includes(activeMultiplier) ? '' : activeMultiplier;
  markActiveMultiplier();
  recalculate();
}

window.__calc3dNewProfile = function () {
  currentProfileId = null;
  document.getElementById('c3d_profileSelect').value = '';
  document.getElementById('c3d_profileName').value = '';
  document.getElementById('c3d_filamentPrice').value = 0;
  document.getElementById('c3d_kwhPrice').value = 0;
  document.getElementById('c3d_printerModel').value = 'Otro / Personalizado';
  document.getElementById('c3d_printerWatts').value = 100;
  document.getElementById('c3d_lifetimeHours').value = 4320;
  document.getElementById('c3d_sparePartsCost').value = 0;
  document.getElementById('c3d_errorMargin').value = 5;
  document.getElementById('c3d_mlFeePct').value = 15;
  activeMultiplier = 3;
  document.getElementById('c3d_multCustom').value = '';
  markActiveMultiplier();
  recalculate();
};

window.__calc3dSaveProfile = async function () {
  const name = document.getElementById('c3d_profileName').value.trim();
  if (!name) { toast('Ponele un nombre al perfil', 'err'); return; }
  const payload = {
    name,
    filament_price_kg: num('c3d_filamentPrice'),
    kwh_price: num('c3d_kwhPrice'),
    printer_model: document.getElementById('c3d_printerModel').value,
    printer_watts: num('c3d_printerWatts'),
    machine_lifetime_hours: num('c3d_lifetimeHours'),
    spare_parts_cost: num('c3d_sparePartsCost'),
    error_margin_pct: num('c3d_errorMargin'),
    margin_multiplier: activeMultiplier,
    ml_fee_pct: num('c3d_mlFeePct'),
    ml_installments_pct: num('c3d_mlCuotasPct'),
    updated_at: new Date().toISOString(),
  };
  try {
    let error, data;
    if (currentProfileId) ({ error } = await supabase.from('calc3d_profiles').update(payload).eq('id', currentProfileId));
    else ({ data, error } = await supabase.from('calc3d_profiles').insert(payload).select().single());
    if (error) throw error;
    if (data) currentProfileId = data.id;
    toast('Perfil guardado', 'ok');
    await loadProfiles();
    renderProfileSelect();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
};

/* ---------- guardar como producto ---------- */
window.__calc3dSaveAsProduct = async function () {
  const name = prompt('Nombre del producto:');
  if (!name || !name.trim()) return;
  const res = window.__calc3dLastResult || { totalACobrar: 0 };
  const btn = document.getElementById('c3d_saveProductBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const payload = {
      name: name.trim(),
      category: 'Impresión 3D',
      price: Math.round(res.totalACobrar * 100) / 100,
      stock: 1,
      status: 'draft',
      is_active: false,
      is_hidden: false,
      device_condition: 'nuevo',
      review_status: 'approved',
      description: 'Producto creado desde la Calculadora 3D. Precio calculado automáticamente — revisá foto y descripción antes de publicar.',
    };
    const { error } = await supabase.from('products').insert(payload);
    if (error) throw error;
    toast('Producto creado como borrador — completalo en Productos', 'ok');
  } catch (e) { toast('Error: ' + e.message, 'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-box"></i> Guardar como producto'; }
};

/* ---------- helpers ---------- */
function money(n) { n = Number(n) || 0; return 'AR$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
function toast(msg, type) { const t = document.createElement('div'); t.className = 'admin-toast ' + (type === 'err' ? 'toast-err' : 'toast-ok'); t.innerHTML = '<i class="fas ' + (type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check') + '"></i> ' + msg; document.body.appendChild(t); setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3200); }
