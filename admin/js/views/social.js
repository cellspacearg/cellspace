import { supabase } from '../config.js?v=cb13';
import { layout, mountLayout } from '../core/layout.js?v=cb13';

/* ============================================================
   GENERADOR DE REDES — placas de productos para Instagram/Facebook
   - 3 tamaños (cuadrado 1:1, retrato 4:5, historia 9:16), cada uno
     con su composición.
   - Modo placa única o carrusel de 3 slides (hero / specs / contacto).
   - Todo con datos reales de la tabla products. Descarga PNG local.
   ============================================================ */

const SIZES = {
  square:   { w: 1080, h: 1080, label: 'Cuadrado', sub: '1:1 · Feed' },
  portrait: { w: 1080, h: 1350, label: 'Retrato',  sub: '4:5 · Feed' },
  story:    { w: 1080, h: 1920, label: 'Historia', sub: '9:16 · Historia' },
};

const LOGO_URL = '../assets/logo.png';

let allProducts = [];
const state = {
  productId: null,
  size: 'portrait',
  mode: 'single',            // single | carousel
  opts: {
    transfer: true, battery: true, warranty: true, oldPrice: true,
    badge: '', whatsapp: '', web: 'cellspacearg.com.ar',
  },
};
let logoImg = null;

/* ---------- vista ---------- */

export async function socialView(){
  return layout({
    title: 'Generador de redes',
    content: `
      <div class="sg-wrap">
        <div class="sg-side">
          <div class="sg-card">
            <label class="sg-lbl">Producto</label>
            <input type="text" id="sgSearch" class="sg-input" placeholder="Buscar producto...">
            <select id="sgProduct" class="sg-input sg-select" size="1"></select>
          </div>

          <div class="sg-card">
            <label class="sg-lbl">Tamaño</label>
            <div class="sg-sizes" id="sgSizes"></div>
          </div>

          <div class="sg-card">
            <label class="sg-lbl">Tipo</label>
            <div class="sg-modes">
              <button class="sg-mode on" data-mode="single"><i class="fas fa-image"></i> Placa única</button>
              <button class="sg-mode" data-mode="carousel"><i class="fas fa-layer-group"></i> Carrusel (3)</button>
            </div>
          </div>

          <div class="sg-card">
            <label class="sg-lbl">Qué mostrar</label>
            <div class="sg-checks" id="sgChecks">
              <label><input type="checkbox" data-opt="oldPrice" checked> Precio anterior (oferta)</label>
              <label><input type="checkbox" data-opt="transfer" checked> Precio transferencia</label>
              <label><input type="checkbox" data-opt="battery" checked> Batería</label>
              <label><input type="checkbox" data-opt="warranty" checked> Garantía</label>
            </div>
            <label class="sg-lbl" style="margin-top:12px;">Sello (opcional)</label>
            <input type="text" id="sgBadge" class="sg-input" placeholder="Ej: OFERTA, IMPERDIBLE, USADO..." maxlength="16">
            <label class="sg-lbl" style="margin-top:12px;">WhatsApp</label>
            <input type="text" id="sgWa" class="sg-input" placeholder="Ej: 3782 43-7674">
            <label class="sg-lbl" style="margin-top:12px;">Web</label>
            <input type="text" id="sgWeb" class="sg-input" value="cellspacearg.com.ar">
          </div>

          <button class="btn-primary sg-dl" id="sgDownload"><i class="fas fa-download"></i> <span id="sgDlText">Descargar PNG</span></button>
        </div>

        <div class="sg-preview" id="sgPreview">
          <div class="sg-empty"><i class="fas fa-arrow-left"></i> Elegí un producto para ver la placa</div>
        </div>
      </div>
    `,
  });
}

export function socialViewOnMount(){
  mountLayout();
  injectStyles();
  renderSizeButtons();

  document.getElementById('sgSearch').addEventListener('input', filterProducts);
  document.getElementById('sgProduct').addEventListener('change', e => { state.productId = e.target.value; renderPreview(); });
  document.querySelectorAll('.sg-mode').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.sg-mode').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); state.mode = b.dataset.mode; updateDlText(); renderPreview();
  }));
  document.querySelectorAll('#sgChecks input').forEach(c => c.addEventListener('change', e => {
    state.opts[e.target.dataset.opt] = e.target.checked; renderPreview();
  }));
  document.getElementById('sgBadge').addEventListener('input', e => { state.opts.badge = e.target.value; renderPreview(); });
  document.getElementById('sgWa').addEventListener('input', e => { state.opts.whatsapp = e.target.value; renderPreview(); });
  document.getElementById('sgWeb').addEventListener('input', e => { state.opts.web = e.target.value; renderPreview(); });
  document.getElementById('sgDownload').addEventListener('click', downloadAll);

  loadLogo();
  loadProducts();
}

function renderSizeButtons(){
  const cont = document.getElementById('sgSizes');
  cont.innerHTML = Object.entries(SIZES).map(([k, s]) =>
    `<button class="sg-size ${k === state.size ? 'on' : ''}" data-size="${k}">
      <span class="sg-size-name">${s.label}</span><span class="sg-size-sub">${s.sub}</span>
    </button>`).join('');
  cont.querySelectorAll('.sg-size').forEach(b => b.addEventListener('click', () => {
    cont.querySelectorAll('.sg-size').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); state.size = b.dataset.size; renderPreview();
  }));
}

async function loadLogo(){
  logoImg = await loadImage(LOGO_URL).catch(() => null);
}

async function loadProducts(){
  const sel = document.getElementById('sgProduct');
  try {
    const { data, error } = await supabase.from('products')
      .select('id, name, brand, price, price_transfer, old_price, warranty, device_condition, condition_badge, battery_health, installments, image_url, specs')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allProducts = data || [];
    renderProductOptions(allProducts);
  } catch (e) {
    sel.innerHTML = `<option>Error: ${e.message}</option>`;
  }
}

function renderProductOptions(list){
  const sel = document.getElementById('sgProduct');
  if (!list.length){ sel.innerHTML = '<option value="">Sin productos</option>'; return; }
  sel.innerHTML = '<option value="">— Elegí un producto —</option>' +
    list.map(p => `<option value="${p.id}">${esc(p.name || 'Sin nombre')}${p.brand ? ' · ' + esc(p.brand) : ''}</option>`).join('');
}

function filterProducts(e){
  const q = (e.target.value || '').toLowerCase().trim();
  renderProductOptions(!q ? allProducts : allProducts.filter(p =>
    (p.name || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)));
}

function updateDlText(){
  document.getElementById('sgDlText').textContent = state.mode === 'carousel' ? 'Descargar las 3' : 'Descargar PNG';
}

/* ---------- preview ---------- */

async function renderPreview(){
  const cont = document.getElementById('sgPreview');
  const product = allProducts.find(p => p.id === state.productId);
  if (!product){ cont.innerHTML = '<div class="sg-empty"><i class="fas fa-arrow-left"></i> Elegí un producto para ver la placa</div>'; return; }

  const slides = state.mode === 'carousel' ? ['hero', 'specs', 'cta'] : ['full'];
  cont.innerHTML = '<div class="sg-loading"><i class="fas fa-spinner fa-spin"></i> Armando placa...</div>';

  const photo = await loadImage(product.image_url).catch(() => null);
  const frag = document.createElement('div');
  frag.className = 'sg-canvases';

  for (let i = 0; i < slides.length; i++){
    const canvas = document.createElement('canvas');
    const s = SIZES[state.size];
    canvas.width = s.w; canvas.height = s.h;
    canvas.className = 'sg-canvas';
    canvas.dataset.slide = String(i + 1);
    drawSlide(canvas, product, state.size, slides[i], photo);
    const box = document.createElement('div');
    box.className = 'sg-canvas-box';
    box.appendChild(canvas);
    if (state.mode === 'carousel'){
      const tag = document.createElement('span'); tag.className = 'sg-slide-tag';
      tag.textContent = `Slide ${i + 1} · ${({hero:'Portada',specs:'Detalles',cta:'Contacto'})[slides[i]]}`;
      box.appendChild(tag);
    }
    frag.appendChild(box);
  }
  cont.innerHTML = '';
  cont.appendChild(frag);
}

/* ---------- descarga ---------- */

async function downloadAll(){
  const canvases = document.querySelectorAll('#sgPreview canvas');
  if (!canvases.length) return;
  const product = allProducts.find(p => p.id === state.productId);
  const base = slug(product ? product.name : 'placa') + '-' + state.size;
  for (let i = 0; i < canvases.length; i++){
    const suffix = canvases.length > 1 ? '-' + (i + 1) : '';
    await downloadCanvas(canvases[i], base + suffix + '.png');
    await new Promise(r => setTimeout(r, 250)); // el navegador necesita aire entre descargas
  }
}

function downloadCanvas(canvas, filename){
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
}

/* ============================================================
   MOTOR DE DIBUJO
   ============================================================ */

// Paleta tech
const C = {
  bg0: '#0b0d13', bg1: '#05060a',
  orange: '#ff6a00', orange2: '#ff9d2e',
  cyan: '#19e3ff', cyan2: '#00b3d6',
  ink: '#ffffff', muted: '#8b93a7', faint: '#5a6072',
  glass: 'rgba(255,255,255,0.045)', glassLine: 'rgba(255,255,255,0.14)',
};

function drawSlide(canvas, p, sizeKey, slide, photo){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const story = sizeKey === 'story';
  const pad = Math.round(W * 0.075);

  drawTechBackground(ctx, W, H, story);
  drawHeader(ctx, W, pad, story);

  if (slide === 'cta'){ drawCta(ctx, W, H, pad, p, story); drawFooter(ctx, W, H, pad); return; }
  if (slide === 'specs'){ drawSpecs(ctx, W, H, pad, p, story); drawFooter(ctx, W, H, pad); return; }

  // slide 'full' o 'hero' → foto + nombre + precio
  const compact = !story && sizeKey === 'square' && slide === 'full';
  const roomy = story || slide === 'hero';
  const topY = story ? H * 0.155 : H * 0.135;
  const imgH = story ? H * 0.40 : (compact ? H * 0.30 : (slide === 'full' ? H * 0.33 : H * 0.44));

  drawProductStage(ctx, pad, topY, W - pad * 2, imgH, photo);

  const badge = (state.opts.badge || '').trim();
  if (badge) drawBadge(ctx, W - pad + Math.round(W*0.01), topY + Math.round(W*0.02), badge);

  let y = topY + imgH + (story ? H * 0.055 : (compact ? W * 0.05 : W * 0.055));
  y = drawTitle(ctx, W, pad, y, p, compact);
  y += story ? H * 0.006 : W * 0.008;
  y = drawPriceBlock(ctx, W, pad, y, p, roomy, compact);

  if (slide === 'full'){
    const chipsY = y + Math.round(W * (compact ? 0.05 : 0.07));
    drawChips(ctx, W, pad, chipsY, p, compact);
  }
  drawFooter(ctx, W, H, pad);
}

/* ---------- fondo tech ---------- */
function drawTechBackground(ctx, W, H, story){
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
  g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // grilla de puntos sutil
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  const step = Math.round(W * 0.05), r = Math.max(1, W * 0.0016);
  for (let x = step; x < W; x += step)
    for (let yy = step; yy < H; yy += step){ ctx.beginPath(); ctx.arc(x, yy, r, 0, Math.PI*2); ctx.fill(); }
  ctx.restore();

  // blob naranja (arriba) y cyan (abajo) para profundidad
  radialBlob(ctx, W * 0.72, H * (story ? 0.22 : 0.26), W * 0.85, 'rgba(255,106,0,0.20)');
  radialBlob(ctx, W * 0.16, H * (story ? 0.82 : 0.9), W * 0.7, 'rgba(25,227,255,0.10)');

  // barra de acento diagonal arriba
  ctx.save();
  ctx.globalAlpha = 0.5;
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(255,106,0,0)'); lg.addColorStop(0.5, 'rgba(255,106,0,0.5)'); lg.addColorStop(1, 'rgba(25,227,255,0.4)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, Math.max(3, H*0.004));
  ctx.restore();
}
function radialBlob(ctx, cx, cy, rad, color){
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, color); g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/* ---------- header ---------- */
function drawHeader(ctx, W, pad, story){
  const y = pad * 0.8;
  const size = Math.round(W * 0.072);
  let rightOfLogo = pad;
  if (logoImg){
    const lh = size, lw = lh * (logoImg.width / logoImg.height);
    ctx.save(); ctx.shadowColor = 'rgba(255,106,0,0.5)'; ctx.shadowBlur = 22;
    ctx.drawImage(logoImg, pad, y, lw, lh); ctx.restore();
    rightOfLogo = pad + lw + 18;
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.036)}px Montserrat, "Arial Black", Arial`;
    ctx.fillText('CELL SPACE', rightOfLogo, y + lh * 0.42);
    ctx.fillStyle = C.orange; ctx.font = `700 ${Math.round(W*0.021)}px Montserrat, Arial`;
    ctx.fillText('ARGENTINA', rightOfLogo, y + lh * 0.82);
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.05)}px Montserrat, "Arial Black", Arial`;
    ctx.fillText('CELL SPACE', pad, y + size * 0.6);
  }
  // etiqueta tech a la derecha
  ctx.textAlign = 'right';
  ctx.fillStyle = C.cyan; ctx.font = `700 ${Math.round(W*0.02)}px "Courier New", monospace`;
  ctx.fillText('// TECH STORE', W - pad, y + size * 0.5);
  ctx.textAlign = 'left';
}

/* ---------- foto sobre panel glass + aro neón + HUD ---------- */
function drawProductStage(ctx, x, y, w, h, photo){
  const W = ctx.canvas.width;
  // panel glass
  ctx.save();
  ctx.fillStyle = C.glass;
  roundRect(ctx, x, y, w, h, Math.round(W*0.03)); ctx.fill();
  // aro neón (borde con degradé)
  const ring = ctx.createLinearGradient(x, y, x + w, y + h);
  ring.addColorStop(0, 'rgba(255,106,0,0.9)'); ring.addColorStop(0.5, 'rgba(255,157,46,0.35)'); ring.addColorStop(1, 'rgba(25,227,255,0.8)');
  ctx.lineWidth = Math.max(2, W*0.004); ctx.strokeStyle = ring;
  ctx.shadowColor = 'rgba(255,106,0,0.35)'; ctx.shadowBlur = 30;
  roundRect(ctx, x, y, w, h, Math.round(W*0.03)); ctx.stroke();
  ctx.restore();

  // reflejo elíptico bajo el producto
  ctx.save();
  const gy = y + h - h*0.06;
  const rg = ctx.createRadialGradient(x + w/2, gy, 0, x + w/2, gy, w*0.4);
  rg.addColorStop(0, 'rgba(255,106,0,0.28)'); rg.addColorStop(1, 'rgba(255,106,0,0)');
  ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(x + w/2, gy, w*0.34, h*0.05, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // foto (contain con margen interno)
  const m = Math.round(w * 0.07);
  if (photo){
    drawImageContain(ctx, photo, x + m, y + m, w - m*2, h - m*2, true);
  } else {
    ctx.fillStyle = C.faint; ctx.font = `${Math.round(W*0.045)}px Montserrat, Arial`; ctx.textAlign = 'center';
    ctx.fillText('sin foto', x + w/2, y + h/2); ctx.textAlign = 'left';
  }

  drawHudBrackets(ctx, x, y, w, h);
}
function drawHudBrackets(ctx, x, y, w, h){
  const W = ctx.canvas.width;
  const s = Math.round(W * 0.035), lw = Math.max(2, W*0.005), off = Math.round(W*0.018);
  ctx.save(); ctx.strokeStyle = C.cyan; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(25,227,255,0.6)'; ctx.shadowBlur = 12;
  const corners = [
    [x - off, y - off, 1, 1], [x + w + off, y - off, -1, 1],
    [x - off, y + h + off, 1, -1], [x + w + off, y + h + off, -1, -1],
  ];
  corners.forEach(([cx, cy, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + s*sx, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + s*sy);
    ctx.stroke();
  });
  ctx.restore();
}

/* ---------- título ---------- */
function drawTitle(ctx, W, pad, y, p, compact){
  const k = compact ? 0.82 : 1;
  ctx.textAlign = 'left';
  if (p.brand){
    // eyebrow con tick cyan
    ctx.fillStyle = C.cyan; ctx.fillRect(pad, y - Math.round(W*0.022*k), Math.round(W*0.012), Math.round(W*0.028*k));
    ctx.fillStyle = C.orange; ctx.font = `700 ${Math.round(W*0.03*k)}px Montserrat, Arial`;
    ctx.fillText(p.brand.toUpperCase(), pad + Math.round(W*0.024), y);
    y += Math.round(W * 0.032 * k);
  }
  ctx.fillStyle = C.ink;
  const fs = Math.round(W * 0.074 * k);
  const font = `800 ${fs}px Montserrat, "Arial Black", Arial`;
  const lines = wrapText(ctx, (p.name || '').toUpperCase(), W - pad * 2, font, 2);
  ctx.font = font;
  lines.forEach(l => { y += Math.round(W * 0.08 * k); ctx.fillText(l, pad, y); });
  return y;
}

/* ---------- precio (tag con degradé) ---------- */
function drawPriceBlock(ctx, W, pad, y, p, roomy, compact){
  const k = compact ? 0.82 : 1;
  ctx.textAlign = 'left';
  const price = Number(p.price) || 0;
  const oldp = Number(p.old_price) || 0;
  y += Math.round(W * 0.045 * k);

  if (state.opts.oldPrice && oldp > price && oldp > 0){
    ctx.fillStyle = C.faint; ctx.font = `600 ${Math.round(W*0.036*k)}px Montserrat, Arial`;
    const t = money(oldp); ctx.fillText(t, pad, y);
    const tw = ctx.measureText(t).width;
    ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pad, y - Math.round(W*0.011)); ctx.lineTo(pad + tw, y - Math.round(W*0.011)); ctx.stroke();
    y += Math.round(W * 0.03 * k);
  }

  // el precio grande con degradé naranja + glow
  const fs = Math.round(W * 0.115 * k);
  ctx.font = `800 ${fs}px Montserrat, "Arial Black", Arial`;
  const t = money(price), tw = ctx.measureText(t).width;
  y += Math.round(W * 0.09 * k);
  const grad = ctx.createLinearGradient(pad, y - fs, pad + tw, y);
  grad.addColorStop(0, C.orange2); grad.addColorStop(1, C.orange);
  ctx.save();
  ctx.shadowColor = 'rgba(255,106,0,0.45)'; ctx.shadowBlur = 26;
  ctx.fillStyle = grad; ctx.fillText(t, pad, y);
  ctx.restore();

  if (state.opts.transfer && Number(p.price_transfer) > 0){
    y += Math.round(W * 0.052 * k);
    // pastilla "transferencia"
    ctx.font = `700 ${Math.round(W*0.03*k)}px Montserrat, Arial`;
    const label = `${money(Number(p.price_transfer))} transferencia`;
    const lw2 = ctx.measureText(label).width, ph = Math.round(W*0.05*k), px = Math.round(W*0.022*k);
    ctx.fillStyle = 'rgba(25,227,255,0.12)'; ctx.strokeStyle = 'rgba(25,227,255,0.5)'; ctx.lineWidth = 2;
    roundRect(ctx, pad, y - ph*0.72, lw2 + px*2, ph, ph/2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.cyan; ctx.fillText(label, pad + px, y - ph*0.06);
  }
  if (p.installments && roomy){
    y += Math.round(W * 0.05);
    ctx.fillStyle = C.muted; ctx.font = `500 ${Math.round(W*0.03)}px Montserrat, Arial`;
    ctx.fillText(String(p.installments), pad, y);
  }
  return y;
}

/* ---------- chips glass ---------- */
function drawChips(ctx, W, pad, y, p, compact){
  const chips = buildChips(p);
  if (!chips.length) return;
  const k = compact ? 0.8 : 1;
  ctx.textAlign = 'left';
  ctx.font = `700 ${Math.round(W*0.024*k)}px Montserrat, Arial`;
  let x = pad;
  const h = Math.round(W * 0.054 * k), padx = Math.round(W * 0.022 * k), dot = Math.round(W*0.007), gapLbl = Math.round(W*0.008);
  chips.forEach(txt => {
    const tw = ctx.measureText(txt).width;
    const cw = tw + padx * 2 + dot * 2 + gapLbl;
    if (x + cw > W - pad){ x = pad; y += h + Math.round(W * 0.018); }
    ctx.fillStyle = C.glass; ctx.strokeStyle = C.glassLine; ctx.lineWidth = 2;
    roundRect(ctx, x, y, cw, h, h / 2); ctx.fill(); ctx.stroke();
    // punto naranja con glow
    ctx.save(); ctx.shadowColor = 'rgba(255,106,0,0.8)'; ctx.shadowBlur = 10;
    ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(x + padx + dot, y + h/2, dot, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#e8ebf2'; ctx.fillText(txt, x + padx + dot*2 + gapLbl, y + h * 0.64);
    x += cw + Math.round(W * 0.018);
  });
}

function buildChips(p){
  const chips = [];
  if (p.device_condition) chips.push(p.device_condition.toUpperCase());
  if (state.opts.battery && Number(p.battery_health) > 0) chips.push('BATERÍA ' + p.battery_health + '%');
  if (state.opts.warranty && p.warranty) chips.push('GARANTÍA ' + String(p.warranty).toUpperCase());
  if (p.condition_badge) chips.push(String(p.condition_badge).toUpperCase());
  return chips;
}

/* ---------- slide DETALLES (tech spec sheet) ---------- */
function drawSpecs(ctx, W, H, pad, p, story){
  ctx.textAlign = 'left';
  ctx.fillStyle = C.cyan; ctx.font = `700 ${Math.round(W*0.024)}px "Courier New", monospace`;
  ctx.fillText('// FICHA TÉCNICA', pad, H * 0.185);
  ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.062)}px Montserrat, "Arial Black", Arial`;
  const nameLines = wrapText(ctx, (p.name || '').toUpperCase(), W - pad*2, `800 ${Math.round(W*0.062)}px Montserrat, "Arial Black", Arial`, 2);
  let ny = H * 0.185;
  nameLines.forEach(l => { ny += Math.round(W*0.072); ctx.fillText(l, pad, ny); });

  // barra de batería visual (si hay)
  let y = story ? H * 0.36 : H * 0.40;
  if (Number(p.battery_health) > 0){
    const bh = Number(p.battery_health);
    ctx.fillStyle = C.muted; ctx.font = `600 ${Math.round(W*0.032)}px Montserrat, Arial`;
    ctx.fillText('SALUD DE BATERÍA', pad, y);
    ctx.textAlign = 'right'; ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.038)}px Montserrat, Arial`;
    ctx.fillText(bh + '%', W - pad, y); ctx.textAlign = 'left';
    y += Math.round(W*0.022);
    const barW = W - pad*2, barH = Math.round(W*0.028);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(ctx, pad, y, barW, barH, barH/2); ctx.fill();
    const fillW = Math.max(barH, barW * Math.min(1, bh/100));
    const bg = ctx.createLinearGradient(pad, 0, pad + fillW, 0);
    bg.addColorStop(0, C.cyan); bg.addColorStop(1, C.orange);
    ctx.save(); ctx.shadowColor = 'rgba(255,106,0,0.5)'; ctx.shadowBlur = 14;
    ctx.fillStyle = bg; roundRect(ctx, pad, y, fillW, barH, barH/2); ctx.fill(); ctx.restore();
    y += Math.round(W*0.075);
  }

  const rows = [];
  if (p.brand) rows.push(['Marca', p.brand]);
  if (p.device_condition) rows.push(['Condición', cap(p.device_condition)]);
  if (p.warranty) rows.push(['Garantía', p.warranty]);
  const specs = Array.isArray(p.specs) ? p.specs : [];
  specs.slice(0, 6).forEach(s => {
    if (typeof s === 'string') rows.push([s, '']);
    else if (s && s.label) rows.push([s.label, s.value || '']);
  });

  const rowH = Math.round(W * 0.088);
  ctx.font = `600 ${Math.round(W*0.037)}px Montserrat, Arial`;
  rows.slice(0, story ? 8 : 5).forEach(([k, v]) => {
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; roundRect(ctx, pad, y - rowH*0.6, W - pad*2, rowH*0.82, 10); ctx.fill();
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.font = `600 ${Math.round(W*0.033)}px Montserrat, Arial`;
    ctx.fillText(String(k).toUpperCase(), pad + Math.round(W*0.025), y);
    ctx.fillStyle = C.ink; ctx.textAlign = 'right'; ctx.font = `700 ${Math.round(W*0.037)}px Montserrat, Arial`;
    ctx.fillText(String(v), W - pad - Math.round(W*0.025), y);
    y += rowH;
  });
  ctx.textAlign = 'left';
}

/* ---------- slide CTA ---------- */
function drawCta(ctx, W, H, pad, p, story){
  ctx.textAlign = 'center';
  const cx = W / 2;
  let y = H * (story ? 0.32 : 0.32);

  ctx.fillStyle = C.cyan; ctx.font = `700 ${Math.round(W*0.026)}px "Courier New", monospace`;
  ctx.fillText('// CONSULTÁ AHORA', cx, y);
  y += Math.round(W * 0.085);
  ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.095)}px Montserrat, "Arial Black", Arial`;
  ctx.fillText('¿LO QUERÉS?', cx, y);
  y += Math.round(W * 0.07);
  ctx.fillStyle = C.muted; ctx.font = `500 ${Math.round(W*0.037)}px Montserrat, Arial`;
  ctx.fillText('Escribinos y te lo reservamos hoy', cx, y);

  // botón WhatsApp con degradé + glow
  const wa = (state.opts.whatsapp || '').trim();
  y += Math.round(W * 0.11);
  const bw = W * 0.74, bx = (W - bw) / 2, bh = Math.round(W * 0.115);
  const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  bg.addColorStop(0, '#25D366'); bg.addColorStop(1, '#128C7E');
  ctx.save(); ctx.shadowColor = 'rgba(37,211,102,0.5)'; ctx.shadowBlur = 28;
  ctx.fillStyle = bg; roundRect(ctx, bx, y, bw, bh, bh / 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#ffffff'; ctx.font = `800 ${Math.round(W*0.042)}px Montserrat, Arial`;
  ctx.fillText('WhatsApp ' + (wa || ''), cx, y + bh * 0.64);

  // web en pastilla
  y += bh + Math.round(W * 0.07);
  ctx.font = `700 ${Math.round(W*0.04)}px Montserrat, Arial`;
  const web = state.opts.web || 'cellspacearg.com.ar';
  const lw2 = ctx.measureText(web).width, ph = Math.round(W*0.07), px = Math.round(W*0.04);
  ctx.strokeStyle = C.glassLine; ctx.lineWidth = 2; ctx.fillStyle = C.glass;
  roundRect(ctx, cx - lw2/2 - px, y - ph*0.68, lw2 + px*2, ph, ph/2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.orange; ctx.fillText(web, cx, y - ph*0.05);
  ctx.textAlign = 'left';
}

/* ---------- sello ---------- */
function drawBadge(ctx, xRight, yTop, text){
  const W = ctx.canvas.width;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `800 ${Math.round(W*0.038)}px Montserrat, "Arial Black", Arial`;
  const tw = ctx.measureText(text.toUpperCase()).width;
  const w = tw + Math.round(W*0.05), h = Math.round(W * 0.078);
  const x = xRight - w;
  ctx.translate(x + w / 2, yTop + h / 2); ctx.rotate(-0.07);
  const g = ctx.createLinearGradient(-w/2, 0, w/2, 0);
  g.addColorStop(0, '#ff3d00'); g.addColorStop(1, C.orange2);
  ctx.shadowColor = 'rgba(255,61,0,0.55)'; ctx.shadowBlur = 22;
  ctx.fillStyle = g; roundRect(ctx, -w/2, -h/2, w, h, 12); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1a0a00'; ctx.fillText(text.toUpperCase(), 0, h * 0.16);
  ctx.restore();
}

function drawFooter(ctx, W, H, pad){
  const y = H - pad * 0.72;
  // divisor con degradé
  const lg = ctx.createLinearGradient(pad, 0, W - pad, 0);
  lg.addColorStop(0, 'rgba(255,106,0,0)'); lg.addColorStop(0.5, 'rgba(255,106,0,0.45)'); lg.addColorStop(1, 'rgba(25,227,255,0)');
  ctx.fillStyle = lg; ctx.fillRect(pad, y - Math.round(W*0.045), W - pad*2, 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted; ctx.font = `600 ${Math.round(W*0.026)}px Montserrat, Arial`;
  ctx.fillText('CELL SPACE ARGENTINA   ·   ' + (state.opts.web || 'cellspacearg.com.ar'), W / 2, y);
  ctx.textAlign = 'left';
}

/* ---------- helpers de canvas ---------- */

function roundRect(ctx, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawImageContain(ctx, img, x, y, w, h, softShadow){
  const ir = img.width / img.height, br = w / h;
  let dw, dh;
  if (ir > br){ dw = w; dh = w / ir; } else { dh = h; dw = h * ir; }
  const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  ctx.save();
  if (softShadow){ ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 20; }
  else { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16; }
  roundRect(ctx, dx, dy, dw, dh, Math.round(ctx.canvas.width*0.02)); ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function wrapText(ctx, text, maxW, font, maxLines){
  ctx.font = font;
  const words = String(text).split(/\s+/);
  const lines = []; let cur = '';
  for (const w of words){
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur){ lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines){
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s+\S*$/, '') + '…';
    return kept;
  }
  return lines;
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('sin src'));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('no carga'));
    img.src = src;
  });
}

/* ---------- utils ---------- */

function money(n){ n = Number(n) || 0; return '$' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 }); }
function cap(s){ s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function slug(s){ return String(s || 'placa').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'placa'; }

/* ---------- estilos ---------- */

function injectStyles(){
  if (document.getElementById('sg-style')) return;
  const s = document.createElement('style'); s.id = 'sg-style';
  s.textContent = `
  .sg-wrap{display:grid;grid-template-columns:340px 1fr;gap:22px;align-items:start;}
  @media (max-width:900px){.sg-wrap{grid-template-columns:1fr;}}
  .sg-side{display:flex;flex-direction:column;gap:14px;}
  .sg-card{background:#151515;border:1px solid #262626;border-radius:14px;padding:16px;}
  .sg-lbl{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#888;font-weight:700;margin:0 0 8px;}
  .sg-input{width:100%;padding:11px 12px;background:#0f0f0f;border:1px solid #2c2c2c;border-radius:10px;color:#fff;font-size:14px;margin-bottom:8px;}
  .sg-input:focus{outline:none;border-color:#ff6a00;}
  .sg-select{cursor:pointer;}
  .sg-sizes{display:flex;flex-direction:column;gap:8px;}
  .sg-size{display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:#0f0f0f;border:1px solid #2c2c2c;border-radius:10px;padding:10px 12px;cursor:pointer;color:#ddd;}
  .sg-size.on{border-color:#ff6a00;background:rgba(255,106,0,0.08);}
  .sg-size-name{font-weight:700;font-size:14px;}
  .sg-size-sub{font-size:11px;color:#888;}
  .sg-modes{display:flex;gap:8px;}
  .sg-mode{flex:1;background:#0f0f0f;border:1px solid #2c2c2c;border-radius:10px;padding:10px;color:#ddd;font-size:12.5px;font-weight:600;cursor:pointer;}
  .sg-mode.on{border-color:#ff6a00;color:#ff9a4d;background:rgba(255,106,0,0.08);}
  .sg-checks{display:flex;flex-direction:column;gap:8px;}
  .sg-checks label{display:flex;align-items:center;gap:9px;font-size:13.5px;color:#ddd;cursor:pointer;}
  .sg-checks input{accent-color:#ff6a00;width:16px;height:16px;}
  .sg-dl{margin-top:4px;}
  .sg-preview{background:#0d0d0d;border:1px solid #222;border-radius:16px;min-height:420px;padding:24px;display:flex;align-items:center;justify-content:center;}
  .sg-empty,.sg-loading{color:#666;font-size:15px;display:flex;align-items:center;gap:10px;}
  .sg-canvases{display:flex;flex-wrap:wrap;gap:20px;justify-content:center;align-items:flex-start;width:100%;}
  .sg-canvas-box{display:flex;flex-direction:column;align-items:center;gap:8px;}
  .sg-canvas{width:auto;max-width:320px;max-height:70vh;height:auto;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.5);}
  .sg-slide-tag{font-size:12px;color:#999;font-weight:600;}
  `;
  document.head.appendChild(s);
}
