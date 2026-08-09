import { supabase } from '../config.js?v=cb12';
import { layout, mountLayout } from '../core/layout.js?v=cb12';

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

function drawSlide(canvas, p, sizeKey, slide, photo){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const story = sizeKey === 'story';
  const pad = Math.round(W * 0.075);

  // Fondo: degradé oscuro + glow naranja
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#141414'); g.addColorStop(1, '#080808');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.5, H * (story ? 0.34 : 0.4), 0, W * 0.5, H * (story ? 0.34 : 0.4), W * 0.75);
  glow.addColorStop(0, 'rgba(255,106,0,0.16)'); glow.addColorStop(1, 'rgba(255,106,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // Marca (arriba)
  drawHeader(ctx, W, pad, story);

  if (slide === 'cta'){ drawCta(ctx, W, H, pad, p, story); drawFooter(ctx, W, H, pad); return; }
  if (slide === 'specs'){ drawSpecs(ctx, W, H, pad, p, story); drawFooter(ctx, W, H, pad); return; }

  // slide 'full' o 'hero' → foto + nombre + precio
  // El cuadrado (1:1) tiene mucho menos alto disponible que el retrato o la
  // historia, así que en 'full' usa una versión compacta (foto más chica,
  // tipografía más chica, sin línea de cuotas) para que nada se pise.
  const compact = !story && sizeKey === 'square' && slide === 'full';
  const topY = story ? H * 0.16 : H * 0.14;
  const imgH = story ? H * 0.40 : (compact ? H * 0.30 : (slide === 'full' ? H * 0.36 : H * 0.42));
  if (photo){
    drawImageContain(ctx, photo, pad, topY, W - pad * 2, imgH);
  } else {
    ctx.fillStyle = '#1c1c1c'; roundRect(ctx, pad, topY, W - pad * 2, imgH, 24); ctx.fill();
    ctx.fillStyle = '#3a3a3a'; ctx.font = `${Math.round(W*0.05)}px Arial`; ctx.textAlign = 'center';
    ctx.fillText('sin foto', W / 2, topY + imgH / 2);
  }

  // Sello (badge) arriba a la derecha
  const badge = (state.opts.badge || '').trim();
  if (badge) drawBadge(ctx, W - pad, topY - Math.round(W*0.005), badge);

  // Bloque de texto
  let y = topY + imgH + (story ? H * 0.05 : (compact ? W * 0.04 : W * 0.055));
  y = drawTitle(ctx, W, pad, y, p, compact);
  y += story ? H * 0.008 : W * 0.01;
  y = drawPriceBlock(ctx, W, pad, y, p, story, compact);

  if (slide === 'full'){
    // Los chips van justo debajo de donde terminó el precio (nunca a una
    // posición fija) para que no se pisen con "transferencia"/"cuotas"
    // cuando el producto trae mucha info.
    const chipsY = y + Math.round(W * (compact ? 0.055 : 0.075));
    drawChips(ctx, W, pad, chipsY, p, compact);
  }
  drawFooter(ctx, W, H, pad);
}

function drawHeader(ctx, W, pad, story){
  const y = pad * 0.85;
  const size = Math.round(W * 0.075);
  if (logoImg){
    const lh = size, lw = lh * (logoImg.width / logoImg.height);
    ctx.drawImage(logoImg, pad, y, lw, lh);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(W*0.036)}px Montserrat, "Arial Black", Arial`;
    ctx.fillText('CELL SPACE', pad + lw + 18, y + lh * 0.42);
    ctx.fillStyle = '#ff6a00'; ctx.font = `700 ${Math.round(W*0.022)}px Montserrat, Arial`;
    ctx.fillText('ARGENTINA', pad + lw + 18, y + lh * 0.82);
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(W*0.05)}px Montserrat, "Arial Black", Arial`;
    ctx.fillText('CELL SPACE', pad, y + size * 0.6);
  }
}

function drawTitle(ctx, W, pad, y, p, compact){
  const k = compact ? 0.8 : 1;
  ctx.textAlign = 'left';
  if (p.brand){
    ctx.fillStyle = '#ff6a00'; ctx.font = `700 ${Math.round(W*0.03*k)}px Montserrat, Arial`;
    ctx.fillText(p.brand.toUpperCase(), pad, y);
    y += Math.round(W * 0.03 * k);
  }
  ctx.fillStyle = '#ffffff';
  const fs = Math.round(W * 0.072 * k);
  const lines = wrapText(ctx, (p.name || '').toUpperCase(), W - pad * 2, `800 ${fs}px Montserrat, "Arial Black", Arial`, 2);
  ctx.font = `800 ${fs}px Montserrat, "Arial Black", Arial`;
  lines.forEach(l => { y += Math.round(W * 0.078 * k); ctx.fillText(l, pad, y); });
  return y;
}

function drawPriceBlock(ctx, W, pad, y, p, story, compact){
  const k = compact ? 0.8 : 1;
  ctx.textAlign = 'left';
  const price = Number(p.price) || 0;
  const oldp = Number(p.old_price) || 0;
  y += Math.round(W * 0.04 * k);

  if (state.opts.oldPrice && oldp > price && oldp > 0){
    ctx.fillStyle = '#8a8a8a'; ctx.font = `600 ${Math.round(W*0.036*k)}px Montserrat, Arial`;
    const t = money(oldp); ctx.fillText(t, pad, y);
    const tw = ctx.measureText(t).width;
    ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pad, y - Math.round(W*0.011)); ctx.lineTo(pad + tw, y - Math.round(W*0.011)); ctx.stroke();
    y += Math.round(W * 0.028 * k);
  }

  ctx.fillStyle = '#ff6a00';
  ctx.font = `800 ${Math.round(W*0.11*k)}px Montserrat, "Arial Black", Arial`;
  y += Math.round(W * 0.085 * k);
  ctx.fillText(money(price), pad, y);

  if (state.opts.transfer && Number(p.price_transfer) > 0){
    y += Math.round(W * 0.05 * k);
    ctx.fillStyle = '#cfcfcf'; ctx.font = `600 ${Math.round(W*0.033*k)}px Montserrat, Arial`;
    ctx.fillText(`${money(Number(p.price_transfer))} con transferencia`, pad, y);
  }
  if (p.installments && !compact){
    y += Math.round(W * 0.045);
    ctx.fillStyle = '#9a9a9a'; ctx.font = `500 ${Math.round(W*0.03)}px Montserrat, Arial`;
    ctx.fillText(String(p.installments), pad, y);
  }
  return y;
}

function drawChips(ctx, W, pad, y, p, compact){
  const chips = buildChips(p);
  if (!chips.length) return;
  const k = compact ? 0.82 : 1;
  ctx.textAlign = 'left';
  ctx.font = `700 ${Math.round(W*0.028*k)}px Montserrat, Arial`;
  let x = pad;
  const h = Math.round(W * 0.058 * k), padx = Math.round(W * 0.028 * k);
  chips.forEach(txt => {
    const tw = ctx.measureText(txt).width;
    const cw = tw + padx * 2;
    if (x + cw > W - pad){ x = pad; y += h + Math.round(W * 0.02); }
    ctx.fillStyle = 'rgba(255,106,0,0.14)';
    ctx.strokeStyle = 'rgba(255,106,0,0.55)'; ctx.lineWidth = 2;
    roundRect(ctx, x, y, cw, h, h / 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9a4d';
    ctx.fillText(txt, x + padx, y + h * 0.66);
    x += cw + Math.round(W * 0.022);
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

function drawSpecs(ctx, W, H, pad, p, story){
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ff6a00'; ctx.font = `700 ${Math.round(W*0.032)}px Montserrat, Arial`;
  ctx.fillText('DETALLES', pad, H * 0.20);
  ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(W*0.06)}px Montserrat, "Arial Black", Arial`;
  wrapText(ctx, (p.name || '').toUpperCase(), W - pad*2, `800 ${Math.round(W*0.06)}px Montserrat, "Arial Black", Arial`, 2)
    .forEach((l, i) => ctx.fillText(l, pad, H * 0.20 + Math.round(W*0.075) * (i + 1)));

  const rows = [];
  if (p.brand) rows.push(['Marca', p.brand]);
  if (p.device_condition) rows.push(['Condición', cap(p.device_condition)]);
  if (Number(p.battery_health) > 0) rows.push(['Batería', p.battery_health + '%']);
  if (p.warranty) rows.push(['Garantía', p.warranty]);
  const specs = Array.isArray(p.specs) ? p.specs : [];
  specs.slice(0, 5).forEach(s => {
    if (typeof s === 'string') rows.push([s, '']);
    else if (s && s.label) rows.push([s.label, s.value || '']);
  });

  let y = H * (story ? 0.40 : 0.42);
  const rowH = Math.round(W * 0.085);
  ctx.font = `600 ${Math.round(W*0.038)}px Montserrat, Arial`;
  rows.slice(0, story ? 9 : 6).forEach(([k, v]) => {
    ctx.fillStyle = '#8a8a8a'; ctx.textAlign = 'left'; ctx.fillText(k, pad, y);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(String(v), W - pad, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, y + rowH * 0.32); ctx.lineTo(W - pad, y + rowH * 0.32); ctx.stroke();
    y += rowH;
  });
  ctx.textAlign = 'left';
}

function drawCta(ctx, W, H, pad, p, story){
  ctx.textAlign = 'center';
  const cx = W / 2;
  let y = H * (story ? 0.34 : 0.34);
  ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(W*0.085)}px Montserrat, "Arial Black", Arial`;
  ctx.fillText('¿LO QUERÉS?', cx, y);
  y += Math.round(W * 0.075);
  ctx.fillStyle = '#cfcfcf'; ctx.font = `500 ${Math.round(W*0.038)}px Montserrat, Arial`;
  ctx.fillText('Escribinos y te lo reservamos', cx, y);

  // botón WhatsApp
  const wa = (state.opts.whatsapp || '').trim();
  y += Math.round(W * 0.11);
  const bw = W * 0.7, bx = (W - bw) / 2, bh = Math.round(W * 0.11);
  ctx.fillStyle = '#25D366'; roundRect(ctx, bx, y, bw, bh, bh / 2); ctx.fill();
  ctx.fillStyle = '#062b14'; ctx.font = `800 ${Math.round(W*0.04)}px Montserrat, Arial`;
  ctx.fillText('WhatsApp ' + (wa || ''), cx, y + bh * 0.66);

  y += bh + Math.round(W * 0.06);
  ctx.fillStyle = '#ff6a00'; ctx.font = `700 ${Math.round(W*0.042)}px Montserrat, Arial`;
  ctx.fillText(state.opts.web || 'cellspacearg.com.ar', cx, y);
  ctx.textAlign = 'left';
}

function drawBadge(ctx, xRight, yTop, text){
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `800 ${Math.round(ctx.canvas.width*0.036)}px Montserrat, "Arial Black", Arial`;
  const tw = ctx.measureText(text.toUpperCase()).width;
  const w = tw + 44, h = Math.round(ctx.canvas.width * 0.072);
  const x = xRight - w;
  ctx.translate(x + w / 2, yTop + h / 2); ctx.rotate(-0.06);
  ctx.fillStyle = '#ff6a00'; roundRect(ctx, -w/2, -h/2, w, h, 10); ctx.fill();
  ctx.fillStyle = '#0a0a0a'; ctx.fillText(text.toUpperCase(), 0, h * 0.16);
  ctx.restore();
}

function drawFooter(ctx, W, H, pad){
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `600 ${Math.round(W*0.026)}px Montserrat, Arial`;
  ctx.fillText('Cell Space Argentina  ·  ' + (state.opts.web || 'cellspacearg.com.ar'), W / 2, H - pad * 0.7);
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

function drawImageContain(ctx, img, x, y, w, h){
  const ir = img.width / img.height, br = w / h;
  let dw, dh;
  if (ir > br){ dw = w; dh = w / ir; } else { dh = h; dw = h * ir; }
  const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  roundRect(ctx, dx, dy, dw, dh, 22); ctx.clip();
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
