import { supabase } from '../config.js?v=cb14';
import { layout, mountLayout } from '../core/layout.js?v=cb14';

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
  category: 'usados',
  opts: {
    transfer: true, battery: true, warranty: true, oldPrice: true,
    hotSale: false, currency: 'ARS', theme: 'naranja',
    badge: '', whatsapp: '', web: 'cellspacearg.com.ar', instagram: 'cellspacearg',
  },
};

// Rubros: cada uno ajusta el eyebrow y la lista de 3 features (ícono + 2 líneas).
// Placeholders: {bat}=batería, {war}=garantía. Se resuelven con datos reales.
const CATEGORIES = {
  usados:      { label: 'Equipos usados',  eyebrow: 'EQUIPO USADO',  battery: true,
                 features: [['battery','{bat}% BATERÍA','SALUD'], ['shield','GARANTÍA','{war}'], ['seal','EQUIPO','ORIGINAL']] },
  nuevos:      { label: 'Equipos nuevos',  eyebrow: 'EQUIPO NUEVO',  battery: false,
                 features: [['box','SELLADO','A ESTRENAR'], ['shield','GARANTÍA','{war}'], ['seal','EQUIPO','ORIGINAL']] },
  licencias:   { label: 'Licencias',       eyebrow: 'LICENCIA',      battery: false,
                 features: [['key','LICENCIA','ORIGINAL'], ['bolt','ACTIVACIÓN','INMEDIATA'], ['shield','GARANTÍA','{war}']] },
  herramientas:{ label: 'Herramientas',    eyebrow: 'HERRAMIENTA',   battery: false,
                 features: [['wrench','USO','PROFESIONAL'], ['seal','CALIDAD','PREMIUM'], ['shield','GARANTÍA','{war}']] },
  fundas:      { label: 'Fundas',          eyebrow: 'FUNDA',         battery: false,
                 features: [['case','MATERIAL','PREMIUM'], ['seal','CALCE','PERFECTO'], ['shield','GARANTÍA','{war}']] },
  accesorios:  { label: 'Accesorios',      eyebrow: 'ACCESORIO',     battery: false,
                 features: [['seal','PRODUCTO','ORIGINAL'], ['bolt','CALIDAD','PREMIUM'], ['shield','GARANTÍA','{war}']] },
  otros:       { label: 'Otros',           eyebrow: '',              battery: false,
                 features: [['seal','PRODUCTO','ORIGINAL'], ['shield','GARANTÍA','{war}'], ['bolt','CALIDAD','PREMIUM']] },
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
            <label class="sg-lbl" style="margin-top:12px;">Rubro</label>
            <select id="sgCategory" class="sg-input sg-select">
              ${Object.entries(CATEGORIES).map(([k, c]) => `<option value="${k}" ${k === state.category ? 'selected' : ''}>${c.label}</option>`).join('')}
            </select>
          </div>

          <div class="sg-card">
            <label class="sg-lbl">Color de acento</label>
            <div class="sg-themes" id="sgThemes"></div>
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
              <label><input type="checkbox" data-opt="hotSale"> Cinta “HOT SALE”</label>
              <label><input type="checkbox" data-opt="oldPrice" checked> Precio anterior (oferta)</label>
              <label><input type="checkbox" data-opt="transfer" checked> Precio transferencia</label>
              <label><input type="checkbox" data-opt="battery" checked> Batería</label>
              <label><input type="checkbox" data-opt="warranty" checked> Garantía</label>
            </div>
            <label class="sg-lbl" style="margin-top:12px;">Moneda</label>
            <div class="sg-modes">
              <button class="sg-mode on" data-cur="ARS">$ Pesos</button>
              <button class="sg-mode" data-cur="USD">USD Dólares</button>
            </div>
            <label class="sg-lbl" style="margin-top:12px;">Sello (opcional)</label>
            <input type="text" id="sgBadge" class="sg-input" placeholder="Ej: OFERTA, IMPERDIBLE..." maxlength="16">
            <label class="sg-lbl" style="margin-top:12px;">WhatsApp</label>
            <input type="text" id="sgWa" class="sg-input" placeholder="Ej: 3782 43-7674">
            <label class="sg-lbl" style="margin-top:12px;">Web</label>
            <input type="text" id="sgWeb" class="sg-input" value="cellspacearg.com.ar">
            <label class="sg-lbl" style="margin-top:12px;">Instagram</label>
            <input type="text" id="sgIg" class="sg-input" value="cellspacearg">
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
  renderThemeButtons();

  document.getElementById('sgSearch').addEventListener('input', filterProducts);
  document.getElementById('sgProduct').addEventListener('change', e => { state.productId = e.target.value; renderPreview(); });
  document.getElementById('sgCategory').addEventListener('change', e => { state.category = e.target.value; renderPreview(); });
  document.querySelectorAll('.sg-mode[data-mode]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.sg-mode[data-mode]').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); state.mode = b.dataset.mode; updateDlText(); renderPreview();
  }));
  document.querySelectorAll('.sg-mode[data-cur]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.sg-mode[data-cur]').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); state.opts.currency = b.dataset.cur; renderPreview();
  }));
  document.querySelectorAll('#sgChecks input').forEach(c => c.addEventListener('change', e => {
    state.opts[e.target.dataset.opt] = e.target.checked; renderPreview();
  }));
  document.getElementById('sgBadge').addEventListener('input', e => { state.opts.badge = e.target.value; renderPreview(); });
  document.getElementById('sgWa').addEventListener('input', e => { state.opts.whatsapp = e.target.value; renderPreview(); });
  document.getElementById('sgWeb').addEventListener('input', e => { state.opts.web = e.target.value; renderPreview(); });
  document.getElementById('sgIg').addEventListener('input', e => { state.opts.instagram = e.target.value; renderPreview(); });
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

function renderThemeButtons(){
  const cont = document.getElementById('sgThemes');
  cont.innerHTML = Object.entries(THEMES).map(([k, t]) =>
    `<button class="sg-theme ${k === state.opts.theme ? 'on' : ''}" data-theme="${k}" title="${k}" style="background:${t.a};"></button>`).join('');
  cont.querySelectorAll('.sg-theme').forEach(b => b.addEventListener('click', () => {
    cont.querySelectorAll('.sg-theme').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); state.opts.theme = b.dataset.theme; renderPreview();
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

// Temas de color (el acento se puede cambiar; hacen de "sugerencias" de IA)
const THEMES = {
  naranja: { a:'#ff6a00', a2:'#ff9d2e', b:'#2f7bff' },
  azul:    { a:'#2f7bff', a2:'#6aa3ff', b:'#19e3ff' },
  cyan:    { a:'#19e3ff', a2:'#7af0ff', b:'#2f7bff' },
  verde:   { a:'#10c46a', a2:'#5fe6a0', b:'#19e3ff' },
  violeta: { a:'#8b5cf6', a2:'#b794ff', b:'#22d3ee' },
  rosa:    { a:'#ff3b7b', a2:'#ff85ac', b:'#8b5cf6' },
  rojo:    { a:'#ff3b3b', a2:'#ff8080', b:'#ff9d2e' },
  dorado:  { a:'#e8b23a', a2:'#ffd777', b:'#ff8a3d' },
};
let C = paletteFor('naranja');
function paletteFor(name){
  const t = THEMES[name] || THEMES.naranja;
  return { bg0:'#0a0e16', bg1:'#05070c', a:t.a, a2:t.a2, b:t.b,
    ink:'#ffffff', muted:'#8b93a7', faint:'#59617a',
    glass:'rgba(255,255,255,0.05)', glassLine:'rgba(255,255,255,0.13)' };
}
function hexToRgb(h){ h=String(h).replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); return [n>>16&255, (n>>8)&255, n&255]; }
function rgba(hex, a){ const [r,g,b]=hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

function drawSlide(canvas, p, sizeKey, slide, photo){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = Math.round(W * 0.07);
  C = paletteFor(state.opts.theme);

  drawTechBackground(ctx, W, H, sizeKey);
  drawHeader(ctx, W, pad, slide === 'full' || slide === 'hero');

  if (slide === 'cta'){ drawCta(ctx, W, H, pad, p); drawFooter(ctx, W, H, pad); return; }
  if (slide === 'specs'){ drawSpecs(ctx, W, H, pad, p, sizeKey === 'story'); drawFooter(ctx, W, H, pad); return; }

  drawPoster(ctx, W, H, pad, p, sizeKey, photo);
  drawFooter(ctx, W, H, pad);
}

/* ---------- POSTER (estilo referencia) ---------- */
function drawPoster(ctx, W, H, pad, p, sizeKey, photo){
  const story = sizeKey === 'story', square = sizeKey === 'square';
  const cat = CATEGORIES[state.category] || CATEGORIES.otros;

  const topY = story ? H * 0.145 : (square ? H * 0.10 : H * 0.11);
  const zoneH = story ? H * 0.40 : (square ? H * 0.34 : H * 0.36);

  drawHeroZone(ctx, W, pad, topY, zoneH, p, cat, photo, { square, story });

  // título
  let y = topY + zoneH + (story ? H * 0.05 : (square ? H * 0.03 : H * 0.038));
  y = drawTitle(ctx, W, pad, y, p, square);

  // caja de precio
  y += square ? H * 0.01 : H * 0.014;
  y = drawPriceBox(ctx, W, pad, y, p, square);

  // beneficios abajo (no en cuadrado)
  if (!square){
    y += story ? H * 0.05 : H * 0.04;
    drawBottomFeatures(ctx, W, pad, y);
  }
}

function drawHeroZone(ctx, W, pad, top, h, p, cat, photo, o){
  const cx = o.square ? W * 0.40 : W * 0.42;
  const cy = top + h * 0.5;
  const rad = h * (o.square ? 0.46 : 0.48);

  // anillo circular con glow (referencia)
  drawProductRing(ctx, cx, cy, rad);
  // reflejo debajo
  ctx.save();
  const rg = ctx.createRadialGradient(cx, cy + rad*0.7, 0, cx, cy + rad*0.7, rad);
  rg.addColorStop(0, rgba(C.a, 0.22)); rg.addColorStop(1, rgba(C.a, 0));
  ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(cx, cy + rad*0.72, rad*0.9, rad*0.16, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // foto centrada dentro del anillo
  const boxW = rad * 1.7, boxH = rad * 1.7;
  if (photo) drawImageContain(ctx, photo, cx - boxW/2, cy - boxH/2, boxW, boxH, true);
  else { ctx.fillStyle = C.faint; ctx.font = `${Math.round(W*0.04)}px Montserrat, Arial`; ctx.textAlign='center'; ctx.fillText('sin foto', cx, cy); ctx.textAlign='left'; }

  // sello HOT SALE ya está en header; sello opcional arriba-derecha del anillo
  const badge = (state.opts.badge || '').trim();
  if (badge) drawBadge(ctx, cx + rad*1.0, top + h*0.02, badge);

  // callouts a la izquierda (con líneas) — solo si hay specs y no es cuadrado
  const specs = Array.isArray(p.specs) ? p.specs.filter(s => (typeof s==='string'? s : s && s.label)) : [];
  if (!o.square && specs.length){
    drawCallouts(ctx, W, pad, cx, cy, rad, specs.slice(0, 2));
  }

  // lista de features a la derecha (íconos)
  const feats = resolveFeatures(p, cat);
  const listX = o.square ? W * 0.66 : W * 0.68;
  drawFeatureList(ctx, W, listX, cy, h, feats, o.square);

  // puntitos de carrusel (decorativo)
  drawDots(ctx, cx, cy + rad*0.98, W);
}

function drawProductRing(ctx, cx, cy, r){
  ctx.save();
  ctx.lineCap = 'round';
  // arco base tenue
  ctx.lineWidth = Math.max(3, r*0.05);
  ctx.strokeStyle = rgba('#ffffff', 0.06);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
  // arco superior naranja (glow)
  ctx.shadowColor = rgba(C.a, 0.7); ctx.shadowBlur = 40;
  ctx.strokeStyle = C.a; ctx.lineWidth = Math.max(4, r*0.06);
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI*1.15, Math.PI*1.95); ctx.stroke();
  // arco inferior azul (glow)
  ctx.shadowColor = rgba(C.b, 0.7);
  ctx.strokeStyle = C.b;
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI*0.15, Math.PI*0.85); ctx.stroke();
  ctx.restore();
}

function drawCallouts(ctx, W, pad, cx, cy, rad, specs){
  // ángulos sobre el lado izquierdo del anillo (arriba y abajo)
  const angs = [Math.PI * 1.20, Math.PI * 0.80];
  const textRight = pad + Math.round(W * 0.18);
  ctx.save();
  specs.forEach((s, i) => {
    const label = typeof s === 'string' ? s : (s.label || '');
    const value = typeof s === 'string' ? '' : (s.value || '');
    const ang = angs[i];
    const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
    // línea horizontal-ish desde el texto al punto del anillo (misma altura → no cruza)
    ctx.strokeStyle = rgba(C.b, 0.7); ctx.lineWidth = Math.max(1.5, W * 0.002);
    ctx.beginPath(); ctx.moveTo(textRight, py); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = C.b; ctx.beginPath(); ctx.arc(px, py, Math.max(3, W * 0.005), 0, Math.PI * 2); ctx.fill();
    // texto alineado a la altura del punto
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W * 0.028)}px Montserrat, Arial`;
    ctx.fillText(String(label).toUpperCase(), pad, value ? py - Math.round(W * 0.006) : py + Math.round(W * 0.01));
    if (value){ ctx.fillStyle = C.muted; ctx.font = `600 ${Math.round(W * 0.025)}px Montserrat, Arial`; ctx.fillText(String(value), pad, py + Math.round(W * 0.028)); }
  });
  ctx.restore();
}

function drawFeatureList(ctx, W, x, cy, zoneH, feats, square){
  const n = feats.length;
  const gap = zoneH / (n + 0.6);
  let y = cy - (gap * (n - 1)) / 2;
  const isz = Math.round(W * (square ? 0.05 : 0.055));
  feats.forEach(([icon, l1, l2]) => {
    // ícono en pastilla glass
    const bx = x, by = y;
    ctx.fillStyle = C.glass; ctx.strokeStyle = C.glassLine; ctx.lineWidth = 2;
    const bs = isz * 1.6;
    roundRect(ctx, bx - bs/2, by - bs/2, bs, bs, bs*0.28); ctx.fill(); ctx.stroke();
    drawIcon(ctx, icon, bx, by, isz, C.a);
    // texto a la derecha del ícono
    ctx.textAlign = 'left';
    const tx = bx + bs/2 + Math.round(W*0.02);
    ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.03)}px Montserrat, Arial`;
    ctx.fillText(l1, tx, by - (l2 ? W*0.008 : -W*0.01));
    if (l2){ ctx.fillStyle = C.muted; ctx.font = `600 ${Math.round(W*0.026)}px Montserrat, Arial`; ctx.fillText(l2, tx, by + W*0.028); }
    y += gap;
  });
}

function resolveFeatures(p, cat){
  const bat = Number(p.battery_health) > 0 ? String(p.battery_health) : '100';
  const war = (p.warranty && String(p.warranty).trim()) ? String(p.warranty).toUpperCase() : '30 DÍAS';
  return cat.features.map(([icon, l1, l2]) => [
    icon,
    l1.replace('{bat}', bat).replace('{war}', war),
    l2.replace('{bat}', bat).replace('{war}', war),
  ]);
}

function drawDots(ctx, cx, y, W){
  const r = Math.max(3, W*0.006), gap = r*3.2, n = 4;
  const startX = cx - ((n-1)*gap)/2;
  for (let i=0;i<n;i++){ ctx.beginPath(); ctx.arc(startX + i*gap, y, r, 0, Math.PI*2); ctx.fillStyle = i===0 ? C.a : rgba('#ffffff',0.25); ctx.fill(); }
}

/* ---------- fondo ---------- */
function drawTechBackground(ctx, W, H, sizeKey){
  const g = ctx.createLinearGradient(0, 0, W*0.3, H);
  g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  const step = Math.round(W*0.05), r = Math.max(1, W*0.0015);
  for (let x=step;x<W;x+=step) for (let yy=step;yy<H;yy+=step){ ctx.beginPath(); ctx.arc(x,yy,r,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
  radialBlob(ctx, W*0.72, H*0.24, W*0.85, rgba(C.a, 0.16));
  radialBlob(ctx, W*0.18, H*0.86, W*0.75, rgba(C.b, 0.12));
  ctx.save(); ctx.globalAlpha = 0.5;
  const lg = ctx.createLinearGradient(0,0,W,0);
  lg.addColorStop(0, rgba(C.a,0)); lg.addColorStop(0.5, rgba(C.a,0.5)); lg.addColorStop(1, rgba(C.b,0.4));
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, Math.max(3, H*0.004)); ctx.restore();
}
function radialBlob(ctx, cx, cy, rad, color){
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, color); g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/* ---------- header ---------- */
function drawHeader(ctx, W, pad, poster){
  const y = pad * 0.75;
  const size = Math.round(W * 0.072);
  if (logoImg){
    const lh = size, lw = lh * (logoImg.width / logoImg.height);
    ctx.save(); ctx.shadowColor = rgba(C.a,0.5); ctx.shadowBlur = 20; ctx.drawImage(logoImg, pad, y, lw, lh); ctx.restore();
    const rx = pad + lw + 16;
    ctx.textAlign = 'left'; ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.036)}px Montserrat, "Arial Black", Arial`;
    ctx.fillText('CELL SPACE', rx, y + lh*0.42);
    ctx.fillStyle = C.a; ctx.font = `700 ${Math.round(W*0.021)}px Montserrat, Arial`;
    ctx.fillText('ARGENTINA', rx, y + lh*0.82);
  } else {
    ctx.textAlign = 'left'; ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.05)}px Montserrat, "Arial Black", Arial`;
    ctx.fillText('CELL SPACE', pad, y + size*0.6);
  }
  // HOT SALE (solo en placa/portada) o rubro a la derecha
  const cat = CATEGORIES[state.category] || CATEGORIES.otros;
  ctx.textAlign = 'right';
  if (state.opts.hotSale && poster){
    ctx.font = `800 ${Math.round(W*0.036)}px Montserrat, "Arial Black", Arial`;
    const tW = ctx.measureText('HOT SALE').width;
    ctx.save(); ctx.shadowColor = rgba(C.a,0.6); ctx.shadowBlur = 14;
    drawIcon(ctx, 'bolt', W - pad - tW - Math.round(W*0.03), y + size*0.24, Math.round(W*0.038), C.a); ctx.restore();
    ctx.fillStyle = C.a; ctx.fillText('HOT SALE', W - pad, y + size*0.32);
    ctx.fillStyle = C.muted; ctx.font = `600 ${Math.round(W*0.022)}px Montserrat, Arial`;
    ctx.fillText('POR TIEMPO LIMITADO', W - pad, y + size*0.72);
  } else if (cat.eyebrow){
    ctx.fillStyle = C.b; ctx.font = `700 ${Math.round(W*0.024)}px "Courier New", monospace`;
    ctx.fillText('// ' + cat.eyebrow, W - pad, y + size*0.5);
  }
  ctx.textAlign = 'left';
}

/* ---------- título ---------- */
function drawTitle(ctx, W, pad, y, p, square){
  const k = square ? 0.85 : 1;
  ctx.textAlign = 'left';
  if (p.brand){
    ctx.fillStyle = C.b; ctx.fillRect(pad, y - Math.round(W*0.022*k), Math.round(W*0.011), Math.round(W*0.028*k));
    ctx.fillStyle = C.a; ctx.font = `700 ${Math.round(W*0.03*k)}px Montserrat, Arial`;
    ctx.fillText(String(p.brand).toUpperCase(), pad + Math.round(W*0.024), y);
    y += Math.round(W*0.032*k);
  }
  ctx.fillStyle = C.ink;
  const fs = Math.round(W*0.078*k), font = `800 ${fs}px Montserrat, "Arial Black", Arial`;
  const lines = wrapText(ctx, (p.name||'').toUpperCase(), W - pad*2, font, 2);
  ctx.font = font;
  lines.forEach(l => { y += Math.round(W*0.084*k); ctx.fillText(l, pad, y); });
  return y;
}

/* ---------- caja de precio (referencia: USD 11 | PRECIO ESPECIAL) ---------- */
function drawPriceBox(ctx, W, pad, y, p, square){
  const k = square ? 0.86 : 1;
  const price = Number(p.price) || 0;
  const oldp = Number(p.old_price) || 0;
  const boxH = Math.round(W * 0.135 * k);
  const boxW = W - pad*2;
  const bx = pad;

  // precio anterior ARRIBA de la caja (avanza y para no pisar el título)
  if (state.opts.oldPrice && oldp > price && oldp > 0){
    y += Math.round(W * 0.032 * k);
    ctx.textAlign = 'left'; ctx.fillStyle = C.faint; ctx.font = `600 ${Math.round(W*0.032*k)}px Montserrat, Arial`;
    const t = money(oldp); ctx.fillText(t, bx, y);
    const tw = ctx.measureText(t).width; ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx, y - Math.round(W*0.01)); ctx.lineTo(bx + tw, y - Math.round(W*0.01)); ctx.stroke();
    y += Math.round(W * 0.02 * k);
  }
  const by = y;

  // caja con borde de acento
  ctx.strokeStyle = C.a; ctx.lineWidth = Math.max(2, W*0.004);
  ctx.fillStyle = rgba('#ffffff', 0.03);
  roundRect(ctx, bx, by, boxW, boxH, Math.round(W*0.028)); ctx.fill();
  ctx.save(); ctx.shadowColor = rgba(C.a,0.35); ctx.shadowBlur = 24;
  roundRect(ctx, bx, by, boxW, boxH, Math.round(W*0.028)); ctx.stroke(); ctx.restore();

  // divisor vertical
  const divX = bx + boxW * 0.62;
  ctx.strokeStyle = rgba('#ffffff',0.14); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(divX, by + boxH*0.22); ctx.lineTo(divX, by + boxH*0.78); ctx.stroke();

  // precio (moneda chica + número grande)
  const cur = state.opts.currency === 'USD' ? 'USD' : '$';
  const num = (price).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = C.a; ctx.font = `800 ${Math.round(W*0.05*k)}px Montserrat, "Arial Black", Arial`;
  const curW = ctx.measureText(cur).width;
  ctx.fillText(cur, bx + Math.round(W*0.04), by + boxH*0.52);
  ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.088*k)}px Montserrat, "Arial Black", Arial`;
  ctx.save(); ctx.shadowColor = rgba(C.a,0.3); ctx.shadowBlur = 18;
  ctx.fillText(num, bx + Math.round(W*0.04) + curW + Math.round(W*0.02), by + boxH*0.5); ctx.restore();

  // etiqueta derecha
  ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.036*k)}px Montserrat, Arial`;
  ctx.fillText('PRECIO', divX + Math.round(W*0.03), by + boxH*0.38);
  ctx.fillStyle = C.a; ctx.fillText('ESPECIAL', divX + Math.round(W*0.03), by + boxH*0.66);
  ctx.textBaseline = 'alphabetic';

  y = by + boxH;
  // transferencia debajo (si hay)
  if (state.opts.transfer && Number(p.price_transfer) > 0){
    y += Math.round(W*0.05);
    ctx.textAlign = 'left'; ctx.font = `700 ${Math.round(W*0.028*k)}px Montserrat, Arial`;
    const label = `${money(Number(p.price_transfer))} con transferencia`;
    const lw2 = ctx.measureText(label).width, ph = Math.round(W*0.05), px = Math.round(W*0.022);
    ctx.fillStyle = rgba(C.b,0.12); ctx.strokeStyle = rgba(C.b,0.5); ctx.lineWidth = 2;
    roundRect(ctx, pad, y - ph*0.72, lw2 + px*2, ph, ph/2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.b; ctx.fillText(label, pad + px, y - ph*0.06);
  }
  return y;
}

/* ---------- beneficios abajo (entrega / envíos / cuotas) ---------- */
function drawBottomFeatures(ctx, W, pad, y){
  const items = [ ['truck','ENTREGA','EN EL DÍA'], ['pin','ENVÍOS A','TODO EL PAÍS'], ['card','PAGÁ EN','CUOTAS'] ];
  const colW = (W - pad*2) / 3;
  const isz = Math.round(W*0.045);
  ctx.textAlign = 'left';
  items.forEach(([icon,l1,l2], i) => {
    const x = pad + colW*i;
    drawIcon(ctx, icon, x + isz*0.7, y, isz, C.ink);
    const tx = x + isz*1.5;
    ctx.fillStyle = C.ink; ctx.font = `700 ${Math.round(W*0.026)}px Montserrat, Arial`;
    ctx.fillText(l1, tx, y - W*0.006);
    ctx.fillStyle = C.muted; ctx.font = `500 ${Math.round(W*0.024)}px Montserrat, Arial`;
    ctx.fillText(l2, tx, y + W*0.026);
  });
}

/* ---------- slide DETALLES ---------- */
function drawSpecs(ctx, W, H, pad, p, story){
  ctx.textAlign = 'left';
  ctx.fillStyle = C.b; ctx.font = `700 ${Math.round(W*0.024)}px "Courier New", monospace`;
  ctx.fillText('// FICHA TÉCNICA', pad, H*0.185);
  ctx.fillStyle = C.ink; const nf = `800 ${Math.round(W*0.062)}px Montserrat, "Arial Black", Arial`;
  let ny = H*0.185; wrapText(ctx, (p.name||'').toUpperCase(), W-pad*2, nf, 2).forEach(l => { ctx.font=nf; ny += Math.round(W*0.072); ctx.fillText(l, pad, ny); });

  let y = story ? H*0.36 : H*0.40;
  if (Number(p.battery_health) > 0){
    const bh = Number(p.battery_health);
    ctx.fillStyle = C.muted; ctx.font = `600 ${Math.round(W*0.032)}px Montserrat, Arial`; ctx.fillText('SALUD DE BATERÍA', pad, y);
    ctx.textAlign='right'; ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.038)}px Montserrat, Arial`; ctx.fillText(bh+'%', W-pad, y); ctx.textAlign='left';
    y += Math.round(W*0.022);
    const barW = W-pad*2, barH = Math.round(W*0.028);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(ctx, pad, y, barW, barH, barH/2); ctx.fill();
    const fillW = Math.max(barH, barW*Math.min(1,bh/100));
    const bg = ctx.createLinearGradient(pad,0,pad+fillW,0); bg.addColorStop(0,C.b); bg.addColorStop(1,C.a);
    ctx.save(); ctx.shadowColor = rgba(C.a,0.5); ctx.shadowBlur = 14; ctx.fillStyle = bg; roundRect(ctx, pad, y, fillW, barH, barH/2); ctx.fill(); ctx.restore();
    y += Math.round(W*0.075);
  }
  const rows = [];
  if (p.brand) rows.push(['Marca', p.brand]);
  if (p.device_condition) rows.push(['Condición', cap(p.device_condition)]);
  if (p.warranty) rows.push(['Garantía', p.warranty]);
  (Array.isArray(p.specs)?p.specs:[]).slice(0,6).forEach(s => { if (typeof s==='string') rows.push([s,'']); else if (s&&s.label) rows.push([s.label, s.value||'']); });
  const rowH = Math.round(W*0.088);
  rows.slice(0, story?8:5).forEach(([k,v]) => {
    ctx.fillStyle='rgba(255,255,255,0.03)'; roundRect(ctx, pad, y-rowH*0.6, W-pad*2, rowH*0.82, 10); ctx.fill();
    ctx.fillStyle=C.muted; ctx.textAlign='left'; ctx.font=`600 ${Math.round(W*0.033)}px Montserrat, Arial`; ctx.fillText(String(k).toUpperCase(), pad+Math.round(W*0.025), y);
    ctx.fillStyle=C.ink; ctx.textAlign='right'; ctx.font=`700 ${Math.round(W*0.037)}px Montserrat, Arial`; ctx.fillText(String(v), W-pad-Math.round(W*0.025), y);
    y += rowH;
  });
  ctx.textAlign='left';
}

/* ---------- slide CTA ---------- */
function drawCta(ctx, W, H, pad, p){
  ctx.textAlign='center'; const cx = W/2; let y = H*0.32;
  ctx.fillStyle=C.b; ctx.font=`700 ${Math.round(W*0.026)}px "Courier New", monospace`; ctx.fillText('// CONSULTÁ AHORA', cx, y);
  y += Math.round(W*0.085); ctx.fillStyle=C.ink; ctx.font=`800 ${Math.round(W*0.095)}px Montserrat, "Arial Black", Arial`; ctx.fillText('¿LO QUERÉS?', cx, y);
  y += Math.round(W*0.07); ctx.fillStyle=C.muted; ctx.font=`500 ${Math.round(W*0.037)}px Montserrat, Arial`; ctx.fillText('Escribinos y te lo reservamos hoy', cx, y);
  const wa = (state.opts.whatsapp||'').trim();
  y += Math.round(W*0.11);
  const bw = W*0.76, bx = (W-bw)/2, bh = Math.round(W*0.115);
  const bg = ctx.createLinearGradient(bx,0,bx+bw,0); bg.addColorStop(0,'#25D366'); bg.addColorStop(1,'#128C7E');
  ctx.save(); ctx.shadowColor='rgba(37,211,102,0.5)'; ctx.shadowBlur=28; ctx.fillStyle=bg; roundRect(ctx,bx,y,bw,bh,bh/2); ctx.fill(); ctx.restore();
  drawIcon(ctx,'whatsapp', bx + Math.round(W*0.09), y+bh/2, Math.round(W*0.05), '#ffffff');
  ctx.fillStyle='#ffffff'; ctx.font=`800 ${Math.round(W*0.042)}px Montserrat, Arial`; ctx.textAlign='center'; ctx.fillText('WhatsApp ' + (wa||''), cx + Math.round(W*0.03), y+bh*0.64);
  y += bh + Math.round(W*0.07);
  ctx.font=`700 ${Math.round(W*0.04)}px Montserrat, Arial`;
  const web = state.opts.web || 'cellspacearg.com.ar';
  const lw2 = ctx.measureText(web).width, ph = Math.round(W*0.07), px = Math.round(W*0.04);
  ctx.strokeStyle=C.glassLine; ctx.lineWidth=2; ctx.fillStyle=C.glass; roundRect(ctx, cx-lw2/2-px, y-ph*0.68, lw2+px*2, ph, ph/2); ctx.fill(); ctx.stroke();
  ctx.fillStyle=C.a; ctx.fillText(web, cx, y-ph*0.05);
  ctx.textAlign='left';
}

/* ---------- sello ---------- */
function drawBadge(ctx, xRight, yTop, text){
  const W = ctx.canvas.width;
  ctx.save(); ctx.textAlign='center';
  ctx.font=`800 ${Math.round(W*0.036)}px Montserrat, "Arial Black", Arial`;
  const tw = ctx.measureText(text.toUpperCase()).width;
  const w = tw + Math.round(W*0.05), h = Math.round(W*0.076);
  const x = xRight - w;
  ctx.translate(x + w/2, yTop + h/2); ctx.rotate(-0.07);
  const g = ctx.createLinearGradient(-w/2,0,w/2,0); g.addColorStop(0, C.a); g.addColorStop(1, C.a2);
  ctx.shadowColor = rgba(C.a,0.55); ctx.shadowBlur = 20;
  ctx.fillStyle = g; roundRect(ctx, -w/2, -h/2, w, h, 12); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#150800'; ctx.fillText(text.toUpperCase(), 0, h*0.16);
  ctx.restore();
}

function drawFooter(ctx, W, H, pad){
  const y = H - pad*0.7;
  const lg = ctx.createLinearGradient(pad,0,W-pad,0);
  lg.addColorStop(0, rgba(C.a,0)); lg.addColorStop(0.5, rgba(C.a,0.45)); lg.addColorStop(1, rgba(C.b,0));
  ctx.fillStyle = lg; ctx.fillRect(pad, y - Math.round(W*0.05), W-pad*2, 2);
  const isz = Math.round(W*0.03);
  ctx.textAlign='left';
  // web (globo) a la izquierda
  drawIcon(ctx, 'globe', pad + isz*0.6, y - W*0.008, isz, C.a);
  ctx.fillStyle = C.ink; ctx.font = `600 ${Math.round(W*0.028)}px Montserrat, Arial`;
  ctx.fillText(state.opts.web || 'cellspacearg.com.ar', pad + isz*1.5, y);
  // instagram a la derecha
  const ig = state.opts.instagram || 'cellspacearg';
  ctx.textAlign='right';
  ctx.fillText('@' + ig, W - pad, y);
  const igW = ctx.measureText('@' + ig).width;
  drawIcon(ctx, 'instagram', W - pad - igW - isz*0.9, y - W*0.008, isz, C.a);
  ctx.textAlign='left';
}

/* ---------- librería de íconos lineales ---------- */
function drawIcon(ctx, name, cx, cy, s, color){
  ctx.save(); ctx.translate(cx, cy);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, s*0.1); ctx.lineJoin='round'; ctx.lineCap='round';
  const u = s/2;
  const R = (x,y,w,h,r)=>{ roundRect(ctx, x, y, w, h, r); };
  switch(name){
    case 'battery':
      R(-u, -u*0.62, u*1.65, u*1.24, u*0.18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(u*0.72,-u*0.28); ctx.lineTo(u*0.72,u*0.28); ctx.lineWidth=Math.max(3,s*0.16); ctx.stroke();
      ctx.fillRect(-u*0.7,-u*0.34,u*0.9,u*0.68); break;
    case 'shield':
      ctx.beginPath(); ctx.moveTo(0,-u); ctx.lineTo(u*0.8,-u*0.6); ctx.lineTo(u*0.8,u*0.15);
      ctx.quadraticCurveTo(u*0.8,u*0.8,0,u); ctx.quadraticCurveTo(-u*0.8,u*0.8,-u*0.8,u*0.15);
      ctx.lineTo(-u*0.8,-u*0.6); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u*0.32,0); ctx.lineTo(-u*0.08,u*0.3); ctx.lineTo(u*0.4,-u*0.35); ctx.stroke(); break;
    case 'seal':
      ctx.beginPath(); ctx.arc(0,0,u*0.9,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u*0.4,0); ctx.lineTo(-u*0.1,u*0.35); ctx.lineTo(u*0.45,-u*0.35); ctx.stroke(); break;
    case 'box':
      ctx.beginPath(); ctx.moveTo(0,-u); ctx.lineTo(u*0.9,-u*0.5); ctx.lineTo(u*0.9,u*0.5); ctx.lineTo(0,u); ctx.lineTo(-u*0.9,u*0.5); ctx.lineTo(-u*0.9,-u*0.5); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u*0.9,-u*0.5); ctx.lineTo(0,0); ctx.lineTo(u*0.9,-u*0.5); ctx.moveTo(0,0); ctx.lineTo(0,u); ctx.stroke(); break;
    case 'key':
      ctx.beginPath(); ctx.arc(-u*0.4,-u*0.4,u*0.45,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u*0.1,-u*0.1); ctx.lineTo(u*0.75,u*0.75); ctx.moveTo(u*0.45,u*0.45); ctx.lineTo(u*0.7,u*0.2); ctx.moveTo(u*0.62,u*0.62); ctx.lineTo(u*0.85,u*0.4); ctx.stroke(); break;
    case 'bolt':
      ctx.beginPath(); ctx.moveTo(u*0.15,-u); ctx.lineTo(-u*0.55,u*0.15); ctx.lineTo(-u*0.05,u*0.15); ctx.lineTo(-u*0.15,u); ctx.lineTo(u*0.6,-u*0.2); ctx.lineTo(u*0.05,-u*0.2); ctx.closePath(); ctx.fill(); break;
    case 'wrench':
      ctx.beginPath(); ctx.arc(-u*0.35,-u*0.35,u*0.4,Math.PI*0.7,Math.PI*2.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u*0.15,-u*0.05); ctx.lineTo(u*0.7,u*0.8); ctx.lineWidth=Math.max(3,s*0.18); ctx.stroke(); break;
    case 'case':
      R(-u*0.6,-u,u*1.2,u*2,u*0.35); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,u*0.55,u*0.16,0,Math.PI*2); ctx.stroke(); break;
    case 'truck':
      R(-u,-u*0.4,u*1.2,u*0.9,u*0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(u*0.2,-u*0.15); ctx.lineTo(u*0.7,-u*0.15); ctx.lineTo(u*0.95,u*0.2); ctx.lineTo(u*0.95,u*0.5); ctx.lineTo(u*0.2,u*0.5); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-u*0.5,u*0.55,u*0.22,0,Math.PI*2); ctx.moveTo(u*0.75,u*0.77); ctx.arc(u*0.55,u*0.55,u*0.22,0,Math.PI*2); ctx.stroke(); break;
    case 'pin':
      ctx.beginPath(); ctx.moveTo(0,u); ctx.quadraticCurveTo(-u*0.85,-u*0.1,-u*0.55,-u*0.55); ctx.arc(0,-u*0.45,u*0.55,Math.PI*0.85,Math.PI*0.15,true); ctx.quadraticCurveTo(u*0.85,-u*0.1,0,u); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,-u*0.4,u*0.22,0,Math.PI*2); ctx.stroke(); break;
    case 'card':
      R(-u,-u*0.65,u*2,u*1.3,u*0.16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u,-u*0.2); ctx.lineTo(u,-u*0.2); ctx.moveTo(-u*0.7,u*0.35); ctx.lineTo(-u*0.1,u*0.35); ctx.stroke(); break;
    case 'globe':
      ctx.beginPath(); ctx.arc(0,0,u*0.9,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0,0,u*0.4,u*0.9,0,0,Math.PI*2); ctx.moveTo(-u*0.9,0); ctx.lineTo(u*0.9,0); ctx.stroke(); break;
    case 'instagram':
      R(-u*0.85,-u*0.85,u*1.7,u*1.7,u*0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,0,u*0.42,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(u*0.5,-u*0.5,u*0.1,0,Math.PI*2); ctx.fill(); break;
    case 'whatsapp':
      ctx.beginPath(); ctx.arc(0,0,u*0.85,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u*0.3,-u*0.25); ctx.quadraticCurveTo(-u*0.1,u*0.45,u*0.4,u*0.35); ctx.lineTo(u*0.15,u*0.1); ctx.stroke(); break;
    default:
      ctx.beginPath(); ctx.arc(0,0,u*0.7,0,Math.PI*2); ctx.stroke();
  }
  ctx.restore();
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

function money(n){ n = Number(n) || 0; const v = n.toLocaleString('es-AR', { maximumFractionDigits: 0 }); return state.opts.currency === 'USD' ? 'USD ' + v : '$' + v; }
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
  .sg-themes{display:flex;gap:9px;flex-wrap:wrap;}
  .sg-theme{width:30px;height:30px;border-radius:8px;border:2px solid transparent;cursor:pointer;padding:0;transition:transform .1s;}
  .sg-theme:hover{transform:scale(1.1);}
  .sg-theme.on{border-color:#fff;box-shadow:0 0 0 2px #000, 0 0 10px rgba(255,255,255,.4);}
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
