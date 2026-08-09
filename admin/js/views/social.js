import { supabase } from '../config.js?v=cb22';
import { layout, mountLayout } from '../core/layout.js?v=cb22';

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
  template: 'product-hero',
  opts: {
    transfer: true, battery: true, warranty: true, oldPrice: true,
    hotSale: false, currency: 'ARS', theme: 'naranja',
    badge: '', whatsapp: '', web: 'cellspacearg.com.ar', instagram: 'cellspacearg',
    // overrides editables (vacío = usa el dato del producto)
    brandOv: '', titleOv: '', taglineOv: '', priceOv: '', discountPct: '', transferOv: '', ctaOv: '',
    feat1: '', feat2: '', feat3: '',
  },
};
// Elementos (stickers) que el usuario coloca libremente sobre la placa
let stickers = [];      // { icon?|img?, x, y, scale, baseSize, color }
let selSticker = null;
let stickerCanvas = null;
const TECH_STICKERS = ['chip','cpu','wifi','signal','bolt','hexagon','gear','circuit','orb','star'];

/* ============================================================
   CATÁLOGO DE PLANTILLAS ESTÁTICAS (31)
   Cada una define una COMPOSICIÓN (archetipo) distinta + parámetros.
   Los archetipos son composiciones realmente diferentes (no recolores).
   ============================================================ */
const TEMPLATES = [
  // Producto
  { id:'product-hero',  name:'Product Hero',      group:'Producto', arc:'hero',      p:{ callouts:true, bottom:true } },
  { id:'premium',       name:'Premium Product',   group:'Producto', arc:'spotlight', p:{ tag:'PREMIUM' } },
  { id:'product-card',  name:'Product Card',      group:'Producto', arc:'minimal',   p:{} },
  { id:'product-specs', name:'Product Grid',      group:'Producto', arc:'spec',      p:{} },
  { id:'new-arrival',   name:'New Arrival',       group:'Producto', arc:'hero',      p:{ tag:'NUEVO INGRESO', callouts:false, bottom:true } },
  { id:'frame',         name:'Marco Neón',        group:'Producto', arc:'frame',     p:{} },
  { id:'grad-card',     name:'Card Gradiente',    group:'Producto', arc:'gradcard',  p:{} },
  { id:'big-price',     name:'Precio Gigante',    group:'Ofertas',  arc:'bigprice',  p:{} },
  { id:'smartphone',    name:'Smartphone',        group:'Producto', arc:'hero',      p:{ callouts:true, bottom:false } },
  { id:'android',       name:'Android',           group:'Producto', arc:'minimal',   p:{ tag:'ANDROID' } },
  { id:'accesorios',    name:'Accesorios',        group:'Producto', arc:'minimal',   p:{ tag:'ACCESORIO' } },
  { id:'fundas',        name:'Fundas',            group:'Producto', arc:'minimal',   p:{ tag:'FUNDA' } },
  { id:'cargadores',    name:'Cargadores',        group:'Producto', arc:'minimal',   p:{ tag:'CARGADOR' } },
  { id:'cables',        name:'Cables',            group:'Producto', arc:'minimal',   p:{ tag:'CABLE' } },
  { id:'smartwatch',    name:'Smartwatch',        group:'Producto', arc:'spotlight', p:{ tag:'SMARTWATCH', circle:true } },
  { id:'notebook',      name:'Notebook / PC',     group:'Producto', arc:'spec',      p:{ wide:true } },
  { id:'consolas',      name:'Consolas',          group:'Producto', arc:'spotlight', p:{ tag:'GAMING' } },
  // Ofertas
  { id:'hot-sale',      name:'Hot Sale',          group:'Ofertas',  arc:'sale',      p:{ sale:'HOT SALE',     bg:'rays' } },
  { id:'flash-sale',    name:'Flash Sale',        group:'Ofertas',  arc:'sale',      p:{ sale:'FLASH SALE',   bg:'diag' } },
  { id:'cyber',         name:'Cyber Sale',        group:'Ofertas',  arc:'sale',      p:{ sale:'CYBER MONDAY', bg:'cyber' } },
  { id:'black-friday',  name:'Black Friday',      group:'Ofertas',  arc:'sale',      p:{ sale:'BLACK FRIDAY', bg:'dark', mono:true } },
  { id:'liquidacion',   name:'Liquidación',       group:'Ofertas',  arc:'sale',      p:{ sale:'LIQUIDACIÓN',  bg:'rays' } },
  { id:'price-drop',    name:'Price Drop',        group:'Ofertas',  arc:'sale',      p:{ sale:'BAJÓ DE PRECIO', bg:'diag' } },
  { id:'promo',         name:'Promoción',         group:'Ofertas',  arc:'sale',      p:{ sale:'PROMO',        bg:'diag' } },
  { id:'comparacion',   name:'Comparación',       group:'Ofertas',  arc:'spec',      p:{ compare:true } },
  // Servicio
  { id:'servicio',      name:'Servicio Técnico',  group:'Servicio', arc:'service',   p:{ icon:'wrench', title:'SERVICIO TÉCNICO' } },
  { id:'reparacion',    name:'Reparación',        group:'Servicio', arc:'service',   p:{ icon:'shield', title:'REPARACIÓN EXPRESS' } },
  { id:'antes-despues', name:'Antes / Después',   group:'Servicio', arc:'service',   p:{ icon:'seal', title:'ANTES / DESPUÉS' } },
  // Software / Tools
  { id:'licencia',      name:'Licencia',          group:'Software', arc:'card',      p:{ kind:'LICENCIA' } },
  { id:'activacion',    name:'Activación',        group:'Software', arc:'card',      p:{ kind:'ACTIVACIÓN' } },
  { id:'tool',          name:'Tool / Herramienta',group:'Software', arc:'card',      p:{ kind:'HERRAMIENTA' } },
  { id:'servidor',      name:'Servidor / Créditos',group:'Software',arc:'card',      p:{ kind:'CRÉDITOS' } },
  { id:'software',      name:'Software',          group:'Software', arc:'card',      p:{ kind:'SOFTWARE' } },
  // Institucional
  { id:'comunicado',    name:'Comunicado',        group:'Institucional', arc:'editorial', p:{ eyebrow:'COMUNICADO' } },
  { id:'central-space', name:'Central Space',     group:'Institucional', arc:'editorial', p:{ eyebrow:'CENTRAL SPACE' } },
  { id:'promo-web',     name:'Promo Web',         group:'Institucional', arc:'web',       p:{} },
  { id:'ai-custom',     name:'AI Custom',         group:'Institucional', arc:'editorial', p:{ eyebrow:'CELL SPACE' } },
];
function currentTpl(){ return TEMPLATES.find(t => t.id === state.template) || TEMPLATES[0]; }

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
            <label class="sg-lbl">Plantilla (${TEMPLATES.length})</label>
            <select id="sgTemplate" class="sg-input sg-select">
              ${[...new Set(TEMPLATES.map(t => t.group))].map(g =>
                `<optgroup label="${g}">${TEMPLATES.filter(t => t.group === g).map(t => `<option value="${t.id}" ${t.id === state.template ? 'selected' : ''}>${t.name}</option>`).join('')}</optgroup>`).join('')}
            </select>
          </div>

          <div class="sg-card">
            <label class="sg-lbl">Textos (dejar vacío = automático)</label>
            <input type="text" id="sgBrandOv" class="sg-input" placeholder="Marca (ej: APPLE)">
            <input type="text" id="sgTitleOv" class="sg-input" placeholder="Título (ej: IPHONE 11)">
            <input type="text" id="sgTaglineOv" class="sg-input" placeholder="Bajada / subtítulo">
            <div style="display:flex;gap:8px;">
              <input type="text" id="sgPriceOv" class="sg-input" placeholder="Precio (ej: 380000)" style="flex:2;">
              <input type="text" id="sgDiscount" class="sg-input" placeholder="% desc" style="flex:1;">
            </div>
            <input type="text" id="sgTransferOv" class="sg-input" placeholder="Precio transferencia (ej: 342000)">
            <input type="text" id="sgCtaOv" class="sg-input" placeholder="CTA (ej: COMPRAR AHORA)">
            <label class="sg-lbl" style="margin-top:10px;">Características (reemplazan las del rubro)</label>
            <input type="text" id="sgFeat1" class="sg-input" placeholder="Feature 1 (ej: BATERÍA 100%)">
            <input type="text" id="sgFeat2" class="sg-input" placeholder="Feature 2 (ej: GARANTÍA 6 MESES)">
            <input type="text" id="sgFeat3" class="sg-input" placeholder="Feature 3 (ej: EQUIPO ORIGINAL)">
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
              <button class="sg-mode on" data-mode="single"><i class="fas fa-image"></i> Placa</button>
              <button class="sg-mode" data-mode="carousel"><i class="fas fa-layer-group"></i> Carrusel</button>
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

          <div class="sg-card">
            <label class="sg-lbl">Elementos (arrastralos en la vista)</label>
            <div class="sg-icons" id="sgTechIcons"></div>
            <input type="file" id="sgStickerImg" accept="image/png,image/*" class="sg-input" style="padding:8px;margin-top:8px;">
            <span style="font-size:11.5px;color:#777;">Subí un PNG (mejor con fondo transparente, ej: un 3D de Freepik).</span>
            <div id="sgStickerCtl" style="display:none;margin-top:10px;">
              <label class="sg-lbl">Tamaño del elemento</label>
              <input type="range" id="sgStickerSize" min="30" max="260" value="100" style="width:100%;">
              <button type="button" class="btn-secondary" id="sgStickerDel" style="width:100%;padding:8px;font-size:13px;margin-top:6px;color:#ff6b6b;"><i class="fas fa-trash"></i> Quitar elemento</button>
            </div>
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
  document.getElementById('sgTemplate').addEventListener('change', e => { state.template = e.target.value; renderPreview(); });
  const ov = (id, key) => document.getElementById(id).addEventListener('input', e => { state.opts[key] = e.target.value; renderPreview(); });
  ov('sgBrandOv','brandOv'); ov('sgTitleOv', 'titleOv'); ov('sgTaglineOv', 'taglineOv'); ov('sgPriceOv', 'priceOv'); ov('sgDiscount', 'discountPct');
  ov('sgTransferOv','transferOv'); ov('sgCtaOv', 'ctaOv'); ov('sgFeat1','feat1'); ov('sgFeat2','feat2'); ov('sgFeat3','feat3');
  document.querySelectorAll('.sg-mode[data-mode]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.sg-mode[data-mode]').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); state.mode = b.dataset.mode;
    updateDlText(); renderPreview();
  }));
  // Elementos / stickers
  const iconsBox = document.getElementById('sgTechIcons');
  iconsBox.innerHTML = TECH_STICKERS.map(n => `<button class="sg-ic" data-ic="${n}" title="${n}"></button>`).join('') ;
  iconsBox.querySelectorAll('.sg-ic').forEach(b => {
    const c = document.createElement('canvas'); c.width = c.height = 40; drawIcon(c.getContext('2d'), b.dataset.ic, 20, 20, 22, '#ff9d2e'); b.style.backgroundImage = `url(${c.toDataURL()})`;
    b.addEventListener('click', () => addSticker({ icon: b.dataset.ic }));
  });
  document.getElementById('sgStickerImg').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image(); img.onload = () => addSticker({ img }); img.src = URL.createObjectURL(f);
  });
  document.getElementById('sgStickerSize').addEventListener('input', e => {
    if (selSticker){ selSticker.scale = Number(e.target.value) / 100; if (stickerCanvas) redrawStickers(stickerCanvas); }
  });
  document.getElementById('sgStickerDel').addEventListener('click', () => {
    if (selSticker){ stickers = stickers.filter(s => s !== selSticker); selSticker = null; updateStickerUI(); if (stickerCanvas) redrawStickers(stickerCanvas); }
  });

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
  const el = document.getElementById('sgDlText');
  el.textContent = state.mode === 'carousel' ? 'Descargar las 3' : 'Descargar PNG';
}

/* ---------- preview ---------- */

async function renderPreview(){
  const cont = document.getElementById('sgPreview');
  const isWeb = currentTpl().arc === 'web';
  const product = allProducts.find(p => p.id === state.productId) || (isWeb ? { name: 'CELL SPACE' } : null);
  if (!product){ cont.innerHTML = '<div class="sg-empty"><i class="fas fa-arrow-left"></i> Elegí un producto para ver la placa</div>'; return; }

  cont.innerHTML = '<div class="sg-loading"><i class="fas fa-spinner fa-spin"></i> Armando placa...</div>';
  const photo = await loadImage(product.image_url).catch(() => null);
  const ep = effProduct(product);

  const slides = state.mode === 'carousel' ? ['hero', 'specs', 'cta'] : ['full'];
  const frag = document.createElement('div');
  frag.className = 'sg-canvases';

  for (let i = 0; i < slides.length; i++){
    const canvas = document.createElement('canvas');
    const s = SIZES[state.size];
    canvas.width = s.w; canvas.height = s.h;
    canvas.className = 'sg-canvas';
    canvas.dataset.slide = String(i + 1);
    drawSlide(canvas, ep, state.size, slides[i], photo);
    if (state.mode === 'single' && slides[i] === 'full'){
      const base = document.createElement('canvas'); base.width = canvas.width; base.height = canvas.height;
      base.getContext('2d').drawImage(canvas, 0, 0); canvas.__base = base;
      stickerCanvas = canvas; drawStickers(canvas.getContext('2d'), canvas.width, canvas.height); wireStickerDrag(canvas);
    }
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

/* ---------- elementos / stickers ---------- */
function addSticker(def){
  const W = stickerCanvas ? stickerCanvas.width : 1080;
  const s = Object.assign({ x: W / 2, y: (stickerCanvas ? stickerCanvas.height : 1350) * 0.4, scale: 1, baseSize: W * 0.2, color: C.a }, def);
  stickers.push(s); selSticker = s;
  updateStickerUI();
  if (stickerCanvas) redrawStickers(stickerCanvas);
}
function stickerSize(s, W){ return (s.baseSize || W * 0.2) * s.scale; }
function drawStickers(ctx, W, H){
  stickers.forEach(s => {
    const size = stickerSize(s, W);
    if (s.img){
      const r = s.img.width / s.img.height; const w = size, h = size / r;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = size * 0.12; ctx.drawImage(s.img, s.x - w / 2, s.y - h / 2, w, h); ctx.restore();
      s._w = w; s._h = h;
    } else if (s.icon){
      ctx.save(); ctx.shadowColor = rgba(s.color || C.a, 0.6); ctx.shadowBlur = size * 0.15; drawIcon(ctx, s.icon, s.x, s.y, size, s.color || C.a); ctx.restore();
      s._w = size; s._h = size;
    }
    if (s === selSticker){ ctx.save(); ctx.strokeStyle = C.a; ctx.lineWidth = 3; ctx.setLineDash([12, 9]);
      ctx.strokeRect(s.x - (s._w || size) / 2 - 6, s.y - (s._h || size) / 2 - 6, (s._w || size) + 12, (s._h || size) + 12); ctx.restore(); }
  });
}
function redrawStickers(canvas){
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (canvas.__base) ctx.drawImage(canvas.__base, 0, 0);
  drawStickers(ctx, canvas.width, canvas.height);
}
function wireStickerDrag(canvas){
  const toC = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }; };
  let dragging = null, off = { x: 0, y: 0 };
  canvas.style.cursor = stickers.length ? 'grab' : 'default';
  canvas.onpointerdown = e => {
    const p = toC(e); dragging = null;
    for (let i = stickers.length - 1; i >= 0; i--){ const s = stickers[i]; const w = s._w || stickerSize(s, canvas.width), h = s._h || stickerSize(s, canvas.width);
      if (Math.abs(p.x - s.x) < w / 2 + 10 && Math.abs(p.y - s.y) < h / 2 + 10){ dragging = s; selSticker = s; off = { x: p.x - s.x, y: p.y - s.y }; break; } }
    if (!dragging && selSticker){ selSticker = null; }
    canvas.style.cursor = dragging ? 'grabbing' : 'grab';
    updateStickerUI(); redrawStickers(canvas);
  };
  canvas.onpointermove = e => { if (!dragging) return; const p = toC(e); dragging.x = p.x - off.x; dragging.y = p.y - off.y; redrawStickers(canvas); };
  canvas.onpointerup = canvas.onpointerleave = () => { dragging = null; canvas.style.cursor = stickers.length ? 'grab' : 'default'; };
}
function updateStickerUI(){
  const ctl = document.getElementById('sgStickerCtl'); if (!ctl) return;
  if (selSticker){ ctl.style.display = 'block'; document.getElementById('sgStickerSize').value = Math.round(selSticker.scale * 100); }
  else ctl.style.display = 'none';
}

/* ---------- descarga ---------- */

async function downloadAll(){
  const product = allProducts.find(p => p.id === state.productId) || (currentTpl().arc === 'web' ? { name: 'cell-space-web' } : null);
  if (!product) return;

  const canvases = document.querySelectorAll('#sgPreview canvas');
  if (!canvases.length) return;
  const base = slug(product.name) + '-' + state.size;
  const keepSel = selSticker; selSticker = null;              // no exportar el marco de selección
  for (let i = 0; i < canvases.length; i++){
    if (canvases[i].__base) redrawStickers(canvases[i]);
    const suffix = canvases.length > 1 ? '-' + (i + 1) : '';
    await downloadCanvas(canvases[i], base + suffix + '.png');
    await new Promise(r => setTimeout(r, 250));
  }
  selSticker = keepSel; if (stickerCanvas && stickerCanvas.__base) redrawStickers(stickerCanvas);
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
  turquesa:{ a:'#14b8a6', a2:'#5eead4', b:'#2f7bff' },
  lima:    { a:'#84cc16', a2:'#bef264', b:'#14b8a6' },
  esmeralda:{ a:'#059669', a2:'#34d399', b:'#0ea5e9' },
  indigo:  { a:'#6366f1', a2:'#a5b4fc', b:'#22d3ee' },
  fucsia:  { a:'#d946ef', a2:'#f0abfc', b:'#38bdf8' },
  coral:   { a:'#fb7185', a2:'#fda4af', b:'#8b5cf6' },
  ambar:   { a:'#f59e0b', a2:'#fcd34d', b:'#ff6a00' },
  teal:    { a:'#0d9488', a2:'#2dd4bf', b:'#3b82f6' },
  celeste: { a:'#38bdf8', a2:'#7dd3fc', b:'#818cf8' },
  lavanda: { a:'#a78bfa', a2:'#c4b5fd', b:'#22d3ee' },
  magenta: { a:'#ec4899', a2:'#f9a8d4', b:'#8b5cf6' },
  bordo:   { a:'#9f1239', a2:'#e11d48', b:'#f59e0b' },
  oliva:   { a:'#65a30d', a2:'#a3e635', b:'#14b8a6' },
  cobre:   { a:'#c2410c', a2:'#fb923c', b:'#f59e0b' },
  grafito: { a:'#64748b', a2:'#cbd5e1', b:'#38bdf8' },
  menta:   { a:'#2dd4bf', a2:'#99f6e4', b:'#60a5fa' },
  durazno: { a:'#fb923c', a2:'#fdba74', b:'#f472b6' },
  rubi:    { a:'#e11d48', a2:'#fb7185', b:'#ff9d2e' },
  zafiro:  { a:'#1d4ed8', a2:'#60a5fa', b:'#22d3ee' },
  purpura: { a:'#7c3aed', a2:'#a78bfa', b:'#ec4899' },
  acero:   { a:'#0ea5e9', a2:'#7dd3fc', b:'#34d399' },
  carmin:  { a:'#be123c', a2:'#f43f5e', b:'#fb923c' },
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

const ARCHETYPES = {
  hero: drawPoster, sale: drawArcSale, minimal: drawArcMinimal, spec: drawArcSpec,
  card: drawArcCard, service: drawArcService, editorial: drawArcEditorial, spotlight: drawArcSpotlight,
  web: drawArcWeb, frame: drawArcFrame, bigprice: drawArcBigPrice, gradcard: drawArcGradientCard,
};

function drawSlide(canvas, p, sizeKey, slide, photo){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = Math.round(W * 0.07);
  C = paletteFor(state.opts.theme);

  // Placa única → plantilla elegida (cada archetipo dibuja su placa completa)
  if (slide === 'full'){
    const tpl = currentTpl();
    (ARCHETYPES[tpl.arc] || drawPoster)(ctx, W, H, pad, p, sizeKey, photo, tpl.p || {});
    return;
  }
  // Carrusel: portada / detalles / contacto
  drawTechBackground(ctx, W, H, sizeKey);
  drawHeader(ctx, W, pad, slide === 'hero');
  if (slide === 'cta'){ drawCta(ctx, W, H, pad, p); drawFooter(ctx, W, H, pad); return; }
  if (slide === 'specs'){ drawSpecs(ctx, W, H, pad, p, sizeKey === 'story'); drawFooter(ctx, W, H, pad); return; }
  drawHeroContent(ctx, W, H, pad, p, sizeKey, photo, { callouts:true, bottom:true });
  drawFooter(ctx, W, H, pad);
}

// aplica overrides editables sobre el producto
function effProduct(p){
  const o = state.opts, e = Object.assign({}, p);
  if (o.brandOv && o.brandOv.trim()) e.brand = o.brandOv.trim();
  if (o.titleOv && o.titleOv.trim()) e.name = o.titleOv.trim();
  if (o.taglineOv && o.taglineOv.trim()) e.tagline = o.taglineOv.trim();
  if (o.priceOv && String(o.priceOv).trim()){ const n = Number(String(o.priceOv).replace(/[^\d]/g, '')); if (n) e.price = n; }
  if (o.transferOv && String(o.transferOv).trim()){ const n = Number(String(o.transferOv).replace(/[^\d]/g, '')); if (n) e.price_transfer = n; }
  if (o.discountPct && String(o.discountPct).trim()){
    const pct = parseFloat(String(o.discountPct).replace(/[^\d.]/g, ''));
    if (pct > 0 && pct < 100) e.old_price = Math.round((Number(e.price) || 0) / (1 - pct/100));
  }
  if (o.ctaOv && o.ctaOv.trim()) e.cta = o.ctaOv.trim();
  return e;
}

/* ---------- ARCHETIPO: HERO (estilo referencia) ---------- */
function drawPoster(ctx, W, H, pad, p, sizeKey, photo, tp){
  drawTechBackground(ctx, W, H, sizeKey);
  drawHeader(ctx, W, pad, true);
  drawHeroContent(ctx, W, H, pad, p, sizeKey, photo, tp || {});
  drawFooter(ctx, W, H, pad);
}
function drawHeroContent(ctx, W, H, pad, p, sizeKey, photo, tp){
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
  const o = state.opts;
  const ovs = [o.feat1, o.feat2, o.feat3].map(s => (s || '').trim()).filter(Boolean);
  if (ovs.length){
    const icons = cat.features.map(f => f[0]);
    return ovs.map((txt, i) => {
      const parts = txt.split(/\s+/); let l1 = txt, l2 = '';
      if (parts.length > 2){ const half = Math.ceil(parts.length / 2); l1 = parts.slice(0, half).join(' '); l2 = parts.slice(half).join(' '); }
      return [icons[i] || 'seal', l1.toUpperCase(), l2.toUpperCase()];
    });
  }
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
function drawTechBackground(ctx, W, H, sizeKey, bg){
  // base
  const g = ctx.createLinearGradient(0, 0, W*0.3, H);
  g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  if (bg === 'dark'){ // negro casi puro (Black Friday)
    ctx.fillStyle = '#050506'; ctx.fillRect(0,0,W,H);
    radialBlob(ctx, W*0.5, H*0.35, W*0.8, rgba(C.a, 0.12));
    return;
  }
  if (bg === 'rays'){ // rayos de luz desde arriba
    radialBlob(ctx, W*0.5, -H*0.05, W*1.0, rgba(C.a, 0.20));
    ctx.save(); ctx.globalAlpha = 0.5;
    for (let i=0;i<7;i++){ const a = -Math.PI/2 + (i-3)*0.22; ctx.strokeStyle = rgba(i%2? C.b : C.a, 0.10); ctx.lineWidth = W*0.02;
      ctx.beginPath(); ctx.moveTo(W*0.5, -H*0.02); ctx.lineTo(W*0.5 + Math.cos(a)*H, H*0.02 + Math.sin(a)*H*1.4); ctx.stroke(); }
    ctx.restore();
    radialBlob(ctx, W*0.5, H*0.5, W*0.6, rgba(C.b, 0.08));
    return;
  }
  if (bg === 'diag'){ // franja diagonal de color
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H*0.35); ctx.lineTo(W, H); ctx.closePath();
    const dg = ctx.createLinearGradient(0,H,W,H*0.35); dg.addColorStop(0, rgba(C.a,0.9)); dg.addColorStop(1, rgba(C.a2,0.7));
    ctx.fillStyle = dg; ctx.fill(); ctx.restore();
    radialBlob(ctx, W*0.75, H*0.2, W*0.7, rgba(C.b, 0.14));
    return;
  }
  if (bg === 'cyber'){ // grilla neón densa
    ctx.save(); ctx.strokeStyle = rgba(C.b, 0.10); ctx.lineWidth = 1; const gs = Math.round(W*0.06);
    for (let x=0;x<=W;x+=gs){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let yy=0;yy<=H;yy+=gs){ ctx.beginPath(); ctx.moveTo(0,yy); ctx.lineTo(W,yy); ctx.stroke(); }
    ctx.restore();
    radialBlob(ctx, W*0.5, H*0.3, W*0.85, rgba(C.a, 0.16));
    radialBlob(ctx, W*0.5, H*0.9, W*0.7, rgba(C.b, 0.14));
    return;
  }
  // default: puntos + blobs + barra de acento
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

/* ============================================================
   ARCHETIPOS ADICIONALES (composiciones distintas)
   ============================================================ */

// starburst (sello dentado) para ofertas
function drawStarburst(ctx, cx, cy, r, spikes, color){
  ctx.save(); ctx.beginPath();
  for (let i=0;i<spikes*2;i++){ const rr = i%2 ? r : r*0.82; const a = (Math.PI/spikes)*i - Math.PI/2;
    const x = cx + Math.cos(a)*rr, y = cy + Math.sin(a)*rr; i? ctx.lineTo(x,y) : ctx.moveTo(x,y); }
  ctx.closePath(); ctx.fillStyle = color; ctx.shadowColor = rgba(color,0.6); ctx.shadowBlur = 20; ctx.fill(); ctx.restore();
}

// texto de precio grande (moneda + número) centrado en x, devuelve alto usado
function priceText(ctx, x, y, price, big, align){
  const cur = state.opts.currency === 'USD' ? 'USD' : '$';
  const num = (Number(price)||0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  const W = ctx.canvas.width;
  ctx.font = `800 ${Math.round(big*0.5)}px Montserrat, "Arial Black", Arial`; const cw = ctx.measureText(cur).width;
  ctx.font = `800 ${big}px Montserrat, "Arial Black", Arial`; const nw = ctx.measureText(num).width;
  let startX = x; if (align === 'center') startX = x - (cw + W*0.015 + nw)/2; if (align === 'right') startX = x - (cw + W*0.015 + nw);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.a; ctx.font = `800 ${Math.round(big*0.5)}px Montserrat, "Arial Black", Arial`; ctx.fillText(cur, startX, y);
  ctx.fillStyle = C.ink; ctx.font = `800 ${big}px Montserrat, "Arial Black", Arial`;
  ctx.save(); ctx.shadowColor = rgba(C.a,0.3); ctx.shadowBlur = 16; ctx.fillText(num, startX + cw + W*0.015, y); ctx.restore();
}

// ARCHETIPO: SALE (ofertas) — headline + producto der + burst % + barra de precio
function drawArcSale(ctx, W, H, pad, p, sizeKey, photo, tp){
  const story = sizeKey === 'story';
  drawTechBackground(ctx, W, H, sizeKey, tp.bg || 'rays');
  drawHeader(ctx, W, pad, false);

  // headline de oferta (arriba-izquierda, ancho limitado para no pisar el producto)
  ctx.textAlign = 'left';
  ctx.fillStyle = C.ink;
  const hf = `800 ${Math.round(W*0.09)}px Montserrat, "Arial Black", Arial`;
  const words = wrapText(ctx, String(tp.sale || 'OFERTA').toUpperCase(), W*0.62, hf, 2);
  let ly = story ? H*0.15 : H*0.155;
  words.forEach(w => { ctx.font = hf; ly += Math.round(W*0.092); ctx.fillText(w, pad, ly); });

  // producto: mitad derecha, centrado verticalmente en la zona media
  const cxp = W*0.66, cyp = story ? H*0.45 : H*0.44, ph = story ? H*0.34 : H*0.32;
  radialBlob(ctx, cxp, cyp + ph*0.3, ph*0.7, rgba(C.a, 0.2));
  if (photo) drawImageContain(ctx, photo, cxp - ph*0.55, cyp - ph*0.5, ph*1.1, ph, true);

  // burst de descuento arriba-derecha, sobre el producto
  const oldp = Number(p.old_price)||0, price = Number(p.price)||0;
  const pct = state.opts.discountPct ? parseInt(state.opts.discountPct) : (oldp > price && oldp>0 ? Math.round((1 - price/oldp)*100) : 0);
  const bx = W*0.84, by = story ? H*0.30 : H*0.28, br = W*0.105;
  drawStarburst(ctx, bx, by, br, 12, C.a);
  ctx.fillStyle = '#150800'; ctx.textAlign = 'center';
  if (pct > 0){ ctx.font = `800 ${Math.round(W*0.026)}px Montserrat, Arial`; ctx.fillText('FLAT!', bx, by - W*0.012);
    ctx.font = `800 ${Math.round(W*0.058)}px Montserrat, "Arial Black", Arial`; ctx.fillText(pct + '%', bx, by + W*0.032); }
  else { ctx.font = `800 ${Math.round(W*0.03)}px Montserrat, "Arial Black", Arial`; ctx.fillText('OFERTA', bx, by + W*0.01); }

  // nombre + precio anterior (arriba de la barra)
  const barY = story ? H*0.74 : H*0.75, barH = Math.round(W*0.145);
  ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = `700 ${Math.round(W*0.03)}px Montserrat, Arial`;
  ctx.fillText((p.brand?p.brand.toUpperCase()+' · ':'') + (p.name||'').toUpperCase(), pad, barY - Math.round(W*0.055));
  if (state.opts.oldPrice && oldp > price && oldp>0){ ctx.fillStyle = C.faint; ctx.font = `600 ${Math.round(W*0.03)}px Montserrat, Arial`;
    const t = money(oldp); ctx.fillText(t, pad, barY - Math.round(W*0.018)); const tw = ctx.measureText(t).width;
    ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pad, barY - Math.round(W*0.026)); ctx.lineTo(pad+tw, barY - Math.round(W*0.026)); ctx.stroke(); }

  // barra de precio
  ctx.save(); ctx.shadowColor = rgba(C.a, 0.4); ctx.shadowBlur = 22;
  ctx.fillStyle = C.a; roundRect(ctx, pad, barY, W - pad*2, barH, Math.round(W*0.02)); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#150800'; ctx.textBaseline = 'middle'; ctx.font = `800 ${Math.round(W*0.078)}px Montserrat, "Arial Black", Arial`;
  const cur = state.opts.currency==='USD'?'USD ':'$'; ctx.fillText(cur + price.toLocaleString('es-AR'), pad + W*0.04, barY + barH*0.54);
  ctx.textBaseline = 'alphabetic';
  drawFooter(ctx, W, H, pad);
}

// ARCHETIPO: MINIMAL — producto centrado, mucho aire, precio en tag chico
function drawArcMinimal(ctx, W, H, pad, p, sizeKey, photo, tp){
  const story = sizeKey === 'story';
  drawTechBackground(ctx, W, H, sizeKey, 'default');
  drawHeader(ctx, W, pad, false);
  if (tp.tag){ ctx.textAlign='center'; ctx.fillStyle=C.b; ctx.font=`700 ${Math.round(W*0.024)}px "Courier New", monospace`; ctx.fillText('// '+tp.tag, W/2, story?H*0.16:H*0.17); }
  const cy = story ? H*0.42 : H*0.44, ph = story ? H*0.34 : H*0.40;
  if (photo) drawImageContain(ctx, photo, W/2 - ph*0.55, cy - ph*0.5, ph*1.1, ph, true);
  radialBlob(ctx, W/2, cy + ph*0.35, ph*0.7, rgba(C.a,0.16));
  let y = cy + ph*0.6;
  ctx.textAlign='center';
  if (p.brand){ ctx.fillStyle=C.a; ctx.font=`700 ${Math.round(W*0.03)}px Montserrat, Arial`; y += Math.round(W*0.03); ctx.fillText(p.brand.toUpperCase(), W/2, y); }
  ctx.fillStyle=C.ink; const nf=`800 ${Math.round(W*0.075)}px Montserrat, "Arial Black", Arial`;
  wrapText(ctx,(p.name||'').toUpperCase(),W-pad*2,nf,2).forEach(l=>{ ctx.font=nf; y+=Math.round(W*0.08); ctx.fillText(l,W/2,y); });
  if (p.tagline){ ctx.fillStyle=C.muted; ctx.font=`500 ${Math.round(W*0.032)}px Montserrat, Arial`; y+=Math.round(W*0.05); ctx.fillText(p.tagline, W/2, y); }
  // precio tag
  y += Math.round(W*0.09);
  ctx.font=`800 ${Math.round(W*0.06)}px Montserrat, "Arial Black", Arial`;
  const t = money(p.price); const tw = ctx.measureText(t).width, ph2=Math.round(W*0.1), px=Math.round(W*0.05);
  ctx.strokeStyle=C.a; ctx.lineWidth=Math.max(2,W*0.004); ctx.fillStyle=rgba(C.a,0.08);
  roundRect(ctx, W/2-tw/2-px, y-ph2*0.66, tw+px*2, ph2, ph2/2); ctx.fill(); ctx.stroke();
  ctx.fillStyle=C.ink; ctx.textBaseline='middle'; ctx.fillText(t, W/2, y-ph2*0.12); ctx.textBaseline='alphabetic';
  drawFooter(ctx, W, H, pad);
}

// ARCHETIPO: SPEC — producto + ficha técnica en columnas
function drawArcSpec(ctx, W, H, pad, p, sizeKey, photo, tp){
  const story = sizeKey === 'story';
  drawTechBackground(ctx, W, H, sizeKey, 'default');
  drawHeader(ctx, W, pad, false);
  // producto arriba
  const ph = story ? H*0.26 : H*0.22, cy = story ? H*0.28 : H*0.24;
  if (photo) drawImageContain(ctx, photo, W/2 - ph*0.55, cy - ph*0.5, ph*1.1, ph, true);
  radialBlob(ctx, W/2, cy, ph*0.8, rgba(C.a,0.14));
  // nombre
  let y = cy + ph*0.62;
  ctx.textAlign='center'; ctx.fillStyle=C.a; ctx.font=`700 ${Math.round(W*0.028)}px Montserrat, Arial`; ctx.fillText((p.brand||'').toUpperCase(), W/2, y);
  ctx.fillStyle=C.ink; const nf=`800 ${Math.round(W*0.058)}px Montserrat, "Arial Black", Arial`; y+=Math.round(W*0.058); ctx.font=nf; ctx.fillText((p.name||'').toUpperCase(), W/2, y);
  // filas de specs
  const rows=[]; if(Number(p.battery_health)>0) rows.push(['Batería', p.battery_health+'%']);
  if(p.device_condition) rows.push(['Condición', cap(p.device_condition)]);
  if(p.warranty) rows.push(['Garantía', p.warranty]);
  (Array.isArray(p.specs)?p.specs:[]).slice(0,4).forEach(s=>{ if(s&&s.label) rows.push([s.label,s.value||'']); else if(typeof s==='string') rows.push([s,'']); });
  y += Math.round(W*0.045); const rowH = Math.round(W*0.078);
  rows.slice(0, story?7:4).forEach(([k,v])=>{
    ctx.fillStyle='rgba(255,255,255,0.03)'; roundRect(ctx, pad, y-rowH*0.6, W-pad*2, rowH*0.82, 10); ctx.fill();
    ctx.textAlign='left'; ctx.fillStyle=C.muted; ctx.font=`600 ${Math.round(W*0.031)}px Montserrat, Arial`; ctx.fillText(String(k).toUpperCase(), pad+W*0.025, y);
    ctx.textAlign='right'; ctx.fillStyle=C.ink; ctx.font=`700 ${Math.round(W*0.035)}px Montserrat, Arial`; ctx.fillText(String(v), W-pad-W*0.025, y);
    y+=rowH;
  });
  // precio en barra (no caja, para no desbordar)
  y += Math.round(W*0.04);
  const oldp=Number(p.old_price)||0, price=Number(p.price)||0;
  ctx.textAlign='center';
  if(state.opts.oldPrice && oldp>price && oldp>0){ ctx.fillStyle=C.faint; ctx.font=`600 ${Math.round(W*0.03)}px Montserrat, Arial`; const t=money(oldp); ctx.fillText(t, W/2, y); const tw=ctx.measureText(t).width; ctx.strokeStyle='#ff5555'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(W/2-tw/2, y-W*0.01); ctx.lineTo(W/2+tw/2, y-W*0.01); ctx.stroke(); y+=Math.round(W*0.055); }
  priceText(ctx, W/2, y, price, Math.round(W*0.08), 'center');
  drawFooter(ctx, W, H, pad);
}

// ARCHETIPO: CARD — tarjeta de licencia/tool (logo + nombre + duración + precio)
function drawArcCard(ctx, W, H, pad, p, sizeKey, photo, tp){
  drawTechBackground(ctx, W, H, sizeKey, 'default');
  // circuito decorativo
  ctx.save(); ctx.strokeStyle = rgba(C.a, 0.18); ctx.lineWidth = 2;
  for (let i=0;i<5;i++){ const yy = H*(0.12+i*0.18); ctx.beginPath(); ctx.moveTo(W*0.7, yy); ctx.lineTo(W*0.85, yy); ctx.lineTo(W*0.9, yy+H*0.04); ctx.lineTo(W, yy+H*0.04); ctx.stroke();
    ctx.beginPath(); ctx.arc(W*0.7, yy, 4, 0, Math.PI*2); ctx.fillStyle=C.a; ctx.fill(); }
  ctx.restore();
  drawHeader(ctx, W, pad, false);
  // logo grande + marca
  const cy = H*0.4;
  if (logoImg){ const ls=W*0.26, lw=ls*(logoImg.width/logoImg.height); ctx.save(); ctx.shadowColor=rgba(C.a,0.4); ctx.shadowBlur=24; ctx.drawImage(logoImg, W/2-lw/2, cy-ls/2, lw, ls); ctx.restore(); }
  let y = cy + W*0.18;
  ctx.textAlign='center'; ctx.fillStyle=C.b; ctx.font=`700 ${Math.round(W*0.028)}px "Courier New", monospace`; ctx.fillText('// '+(tp.kind||'LICENCIA'), W/2, y);
  y += Math.round(W*0.075); ctx.fillStyle=C.ink; ctx.font=`800 ${Math.round(W*0.072)}px Montserrat, "Arial Black", Arial`; ctx.fillText((p.name||'TOOL').toUpperCase(), W/2, y);
  // duración (de specs o tagline) + precio
  const dur = p.tagline || (Array.isArray(p.specs)&&p.specs[0]&&p.specs[0].value) || 'ACTIVACIÓN';
  y += Math.round(W*0.06); ctx.fillStyle=C.muted; ctx.font=`600 ${Math.round(W*0.036)}px Montserrat, Arial`; ctx.fillText(String(dur).toUpperCase(), W/2, y);
  y += Math.round(W*0.11); priceText(ctx, W/2, y, p.price, Math.round(W*0.1), 'center');
  // CTA pill
  y += Math.round(W*0.08); const cta = p.cta || 'COMPRAR AHORA';
  ctx.textAlign='center'; ctx.font=`800 ${Math.round(W*0.036)}px Montserrat, Arial`; const cw=ctx.measureText(cta).width, ch=Math.round(W*0.1), cpx=Math.round(W*0.05);
  const g=ctx.createLinearGradient(W/2-cw/2,0,W/2+cw/2,0); g.addColorStop(0,C.a); g.addColorStop(1,C.a2);
  ctx.save(); ctx.shadowColor=rgba(C.a,0.5); ctx.shadowBlur=22; ctx.fillStyle=g; roundRect(ctx, W/2-cw/2-cpx, y-ch*0.66, cw+cpx*2, ch, ch/2); ctx.fill(); ctx.restore();
  ctx.fillStyle='#150800'; ctx.textBaseline='middle'; ctx.fillText(cta, W/2, y-ch*0.12); ctx.textBaseline='alphabetic';
  drawFooter(ctx, W, H, pad);
}

// ARCHETIPO: SERVICE — ícono + título de servicio + producto + CTA
function drawArcService(ctx, W, H, pad, p, sizeKey, photo, tp){
  drawTechBackground(ctx, W, H, sizeKey, 'default');
  drawHeader(ctx, W, pad, false);
  const cy = H*0.3;
  // ícono grande en círculo
  ctx.save(); ctx.fillStyle=rgba(C.a,0.12); ctx.strokeStyle=C.a; ctx.lineWidth=Math.max(2,W*0.004);
  ctx.beginPath(); ctx.arc(W/2, cy, W*0.11, 0, Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
  drawIcon(ctx, tp.icon||'wrench', W/2, cy, W*0.1, C.a);
  let y = cy + W*0.18;
  ctx.textAlign='center'; ctx.fillStyle=C.ink; const nf=`800 ${Math.round(W*0.072)}px Montserrat, "Arial Black", Arial`;
  wrapText(ctx,(tp.title||'SERVICIO TÉCNICO'),W-pad*2,nf,2).forEach(l=>{ ctx.font=nf; y+=Math.round(W*0.078); ctx.fillText(l,W/2,y); });
  y += Math.round(W*0.04); ctx.fillStyle=C.muted; ctx.font=`600 ${Math.round(W*0.034)}px Montserrat, Arial`;
  ctx.fillText((p.name||'').toUpperCase(), W/2, y);
  // 3 features de servicio
  const feats = [['bolt','RÁPIDO'],['shield','CON GARANTÍA'],['seal','REPUESTOS ORIGINALES']];
  y += Math.round(W*0.06);
  feats.forEach(([ic,l])=>{ y+=Math.round(W*0.072); drawIcon(ctx, ic, W/2 - W*0.22, y - W*0.01, W*0.035, C.a);
    ctx.textAlign='left'; ctx.fillStyle=C.ink; ctx.font=`700 ${Math.round(W*0.034)}px Montserrat, Arial`; ctx.fillText(l, W/2 - W*0.16, y); });
  // precio si hay (con aire para no pisar la última feature)
  if (Number(p.price)>0){ y += Math.round(W*0.1); priceText(ctx, W/2, y, p.price, Math.round(W*0.085), 'center'); }
  drawFooter(ctx, W, H, pad);
}

// ARCHETIPO: EDITORIAL — título grande arriba, producto abajo, franja precio/CTA
function drawArcEditorial(ctx, W, H, pad, p, sizeKey, photo, tp){
  const story = sizeKey==='story';
  drawTechBackground(ctx, W, H, sizeKey, 'default');
  drawHeader(ctx, W, pad, false);
  ctx.textAlign='left';
  let y = H*0.18;
  ctx.fillStyle=C.a; ctx.font=`700 ${Math.round(W*0.026)}px "Courier New", monospace`; ctx.fillText('// '+(tp.eyebrow||'CELL SPACE'), pad, y);
  ctx.fillStyle=C.ink; const nf=`800 ${Math.round(W*0.09)}px Montserrat, "Arial Black", Arial`;
  wrapText(ctx,(p.name||'').toUpperCase(),W-pad*2,nf,3).forEach(l=>{ ctx.font=nf; y+=Math.round(W*0.095); ctx.fillText(l,pad,y); });
  if (p.tagline){ ctx.fillStyle=C.muted; ctx.font=`500 ${Math.round(W*0.034)}px Montserrat, Arial`; y+=Math.round(W*0.055); ctx.fillText(p.tagline, pad, y); }
  // producto abajo derecha
  const ph = story ? H*0.30 : H*0.30, cxp=W*0.7, cyp=story?H*0.66:H*0.66;
  if (photo) drawImageContain(ctx, photo, cxp-ph*0.55, cyp-ph*0.5, ph*1.1, ph, true);
  // franja precio/CTA abajo izquierda
  if (Number(p.price)>0){ priceText(ctx, pad, story?H*0.72:H*0.74, p.price, Math.round(W*0.08), 'left'); }
  const cta = p.cta || 'CONSULTAR';
  ctx.font=`800 ${Math.round(W*0.032)}px Montserrat, Arial`; const cw=ctx.measureText(cta).width, ch=Math.round(W*0.085), cpx=Math.round(W*0.04);
  const cbY = story?H*0.78:H*0.80;
  ctx.fillStyle=C.a; roundRect(ctx, pad, cbY, cw+cpx*2, ch, ch/2); ctx.fill();
  ctx.fillStyle='#150800'; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(cta, pad+cpx, cbY+ch/2); ctx.textBaseline='alphabetic';
  drawFooter(ctx, W, H, pad);
}

function drawHudBrackets(ctx, x, y, w, h){
  const W = ctx.canvas.width, s = Math.round(W*0.035), lw = Math.max(2, W*0.005), off = Math.round(W*0.015);
  ctx.save(); ctx.strokeStyle = C.b; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.shadowColor = rgba(C.b, 0.6); ctx.shadowBlur = 12;
  [[x-off,y-off,1,1],[x+w+off,y-off,-1,1],[x-off,y+h+off,1,-1],[x+w+off,y+h+off,-1,-1]].forEach(([cx,cy,sx,sy])=>{
    ctx.beginPath(); ctx.moveTo(cx+s*sx,cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+s*sy); ctx.stroke();
  });
  ctx.restore();
}

// ARCHETIPO: FRAME — producto en marco neón rectangular + título + precio
function drawArcFrame(ctx, W, H, pad, p, sizeKey, photo, tp){
  const story = sizeKey === 'story', square = sizeKey === 'square';
  drawTechBackground(ctx, W, H, sizeKey, 'default');
  drawHeader(ctx, W, pad, false);
  const fx = pad, fw = W - pad*2, fy = story ? H*0.16 : H*0.135, fh = story ? H*0.42 : (square ? H*0.34 : H*0.38);
  ctx.fillStyle = rgba('#ffffff', 0.03); roundRect(ctx, fx, fy, fw, fh, W*0.045); ctx.fill();
  ctx.save(); const g = ctx.createLinearGradient(fx, fy, fx+fw, fy+fh); g.addColorStop(0, C.a); g.addColorStop(1, C.b);
  ctx.strokeStyle = g; ctx.lineWidth = Math.max(4, W*0.008); ctx.shadowColor = rgba(C.a, 0.5); ctx.shadowBlur = 30;
  roundRect(ctx, fx, fy, fw, fh, W*0.045); ctx.stroke(); ctx.restore();
  const m = W*0.06; if (photo) drawImageContain(ctx, photo, fx+m, fy+m, fw-m*2, fh-m*2, true);
  drawHudBrackets(ctx, fx, fy, fw, fh);
  const badge = (state.opts.badge||'').trim(); if (badge) drawBadge(ctx, fx+fw+W*0.01, fy+W*0.02, badge);
  let y = fy + fh + (story ? H*0.06 : H*0.045);
  y = drawTitle(ctx, W, pad, y, p, square);
  y += square ? H*0.01 : H*0.016; y = drawPriceBox(ctx, W, pad, y, p, square);
  if (!square){ y += story ? H*0.05 : H*0.04; drawBottomFeatures(ctx, W, pad, y); }
  drawFooter(ctx, W, H, pad);
}

// ARCHETIPO: BIGPRICE — el precio es el héroe (gigante), producto arriba
function drawArcBigPrice(ctx, W, H, pad, p, sizeKey, photo, tp){
  const story = sizeKey === 'story';
  drawTechBackground(ctx, W, H, sizeKey, 'default');
  drawHeader(ctx, W, pad, false);
  const ph = story ? H*0.32 : H*0.32, cy = story ? H*0.32 : H*0.30;
  radialBlob(ctx, W/2, cy+ph*0.3, ph*0.7, rgba(C.a, 0.2));
  if (photo) drawImageContain(ctx, photo, W/2-ph*0.55, cy-ph*0.5, ph*1.1, ph, true);
  let y = cy + ph*0.6; ctx.textAlign = 'center';
  ctx.fillStyle = C.a; ctx.font = `700 ${Math.round(W*0.028)}px Montserrat, Arial`; ctx.fillText((p.brand||'').toUpperCase(), W/2, y);
  ctx.fillStyle = C.ink; const nf = `800 ${Math.round(W*0.05)}px Montserrat, "Arial Black", Arial`; y += Math.round(W*0.05); ctx.font = nf; ctx.fillText((p.name||'').toUpperCase(), W/2, y);
  const oldp = Number(p.old_price)||0, price = Number(p.price)||0;
  if (state.opts.oldPrice && oldp > price && oldp>0){ y += Math.round(W*0.055); ctx.fillStyle = C.faint; ctx.font = `600 ${Math.round(W*0.036)}px Montserrat, Arial`;
    const tt = money(oldp); ctx.fillText(tt, W/2, y); const tw = ctx.measureText(tt).width; ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W/2-tw/2, y-W*0.012); ctx.lineTo(W/2+tw/2, y-W*0.012); ctx.stroke(); }
  y += Math.round(W*0.15); priceText(ctx, W/2, y, price, Math.round(W*0.155), 'center');
  if (state.opts.transfer && Number(p.price_transfer) > 0){ y += Math.round(W*0.05); ctx.fillStyle = C.b; ctx.font = `700 ${Math.round(W*0.03)}px Montserrat, Arial`; ctx.textAlign='center'; ctx.fillText(money(Number(p.price_transfer)) + ' con transferencia', W/2, y); }
  const cta = p.cta || 'CONSULTAR AHORA'; y += Math.round(W*0.09);
  ctx.font = `800 ${Math.round(W*0.036)}px Montserrat, Arial`; const cw = ctx.measureText(cta).width, ch = Math.round(W*0.1), cpx = Math.round(W*0.05);
  const gg = ctx.createLinearGradient(W/2-cw/2,0,W/2+cw/2,0); gg.addColorStop(0,C.a); gg.addColorStop(1,C.a2);
  ctx.save(); ctx.shadowColor = rgba(C.a,0.5); ctx.shadowBlur = 22; ctx.fillStyle = gg; roundRect(ctx, W/2-cw/2-cpx, y-ch*0.66, cw+cpx*2, ch, ch/2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#150800'; ctx.textBaseline='middle'; ctx.textAlign='center'; ctx.fillText(cta, W/2, y-ch*0.12); ctx.textBaseline='alphabetic';
  drawFooter(ctx, W, H, pad);
}

// ARCHETIPO: GRADCARD — producto sobre card con gradiente de acento
function drawArcGradientCard(ctx, W, H, pad, p, sizeKey, photo, tp){
  const story = sizeKey === 'story', square = sizeKey === 'square';
  drawTechBackground(ctx, W, H, sizeKey, 'default');
  drawHeader(ctx, W, pad, false);
  const cx0 = pad, cy0 = story ? H*0.15 : H*0.135, cw = W-pad*2, ch = story ? H*0.48 : (square ? H*0.42 : H*0.46);
  ctx.save(); const g = ctx.createLinearGradient(cx0, cy0, cx0+cw, cy0+ch); g.addColorStop(0, rgba(C.a, 0.95)); g.addColorStop(1, rgba(C.a2, 0.7));
  ctx.shadowColor = rgba(C.a, 0.4); ctx.shadowBlur = 30; ctx.fillStyle = g; roundRect(ctx, cx0, cy0, cw, ch, W*0.05); ctx.fill(); ctx.restore();
  // brillo diagonal en el card
  ctx.save(); roundRect(ctx, cx0, cy0, cw, ch, W*0.05); ctx.clip();
  const sh = ctx.createLinearGradient(cx0, cy0, cx0+cw*0.6, cy0+ch); sh.addColorStop(0, 'rgba(255,255,255,0.16)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(cx0, cy0, cw, ch); ctx.restore();
  const badge = (state.opts.badge||'').trim(); if (badge) drawBadge(ctx, cx0+cw+W*0.01, cy0+W*0.02, badge);
  const ph = ch*0.66, cyp = cy0+ch*0.42; if (photo) drawImageContain(ctx, photo, W/2-ph*0.55, cyp-ph*0.5, ph*1.1, ph, true);
  // nombre dentro del card (abajo)
  ctx.textAlign = 'left'; ctx.fillStyle = '#1a0a00';
  ctx.font = `700 ${Math.round(W*0.028)}px Montserrat, Arial`; if (p.brand) ctx.fillText(p.brand.toUpperCase(), cx0+W*0.05, cy0+ch-W*0.09);
  ctx.font = `800 ${Math.round(W*0.052)}px Montserrat, "Arial Black", Arial`; ctx.fillText((p.name||'').toUpperCase(), cx0+W*0.05, cy0+ch-W*0.04);
  // precio + CTA debajo del card
  let y = cy0 + ch + (story ? H*0.06 : H*0.05);
  const oldp = Number(p.old_price)||0, price = Number(p.price)||0;
  if (state.opts.oldPrice && oldp > price && oldp>0){ ctx.fillStyle = C.faint; ctx.font = `600 ${Math.round(W*0.032)}px Montserrat, Arial`; const tt = money(oldp); ctx.fillText(tt, pad, y-W*0.005); const tw = ctx.measureText(tt).width; ctx.strokeStyle='#ff5555'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(pad, y-W*0.015); ctx.lineTo(pad+tw, y-W*0.015); ctx.stroke(); y += W*0.03; }
  priceText(ctx, pad, y + W*0.06, price, Math.round(W*0.09), 'left');
  const cta = p.cta || 'COMPRAR'; ctx.textAlign='right'; ctx.font = `800 ${Math.round(W*0.034)}px Montserrat, Arial`;
  const cw2 = ctx.measureText(cta).width, ch2 = Math.round(W*0.09), cpx = Math.round(W*0.045), cbx = W-pad;
  ctx.fillStyle = C.a; roundRect(ctx, cbx-cw2-cpx*2, y+W*0.06-ch2*0.66, cw2+cpx*2, ch2, ch2/2); ctx.fill();
  ctx.fillStyle = '#150800'; ctx.textBaseline='middle'; ctx.textAlign='center'; ctx.fillText(cta, cbx-cw2/2-cpx, y+W*0.06-ch2*0.12); ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  drawFooter(ctx, W, H, pad);
}

// ARCHETIPO: WEB — promo del sitio (logo + web + beneficios), sin producto
function drawArcWeb(ctx, W, H, pad, p, sizeKey, photo, tp){
  const story = sizeKey === 'story';
  drawTechBackground(ctx, W, H, sizeKey, 'cyber');
  ctx.textAlign = 'center';
  ctx.fillStyle = C.b; ctx.font = `700 ${Math.round(W*0.026)}px "Courier New", monospace`;
  ctx.fillText('// TIENDA ONLINE', W/2, story ? H*0.14 : H*0.13);
  // logo grande
  const cy = story ? H*0.32 : H*0.30;
  if (logoImg){ const ls = W*0.34, lw = ls*(logoImg.width/logoImg.height); ctx.save(); ctx.shadowColor = rgba(C.a,0.5); ctx.shadowBlur = 30; ctx.drawImage(logoImg, W/2-lw/2, cy-ls/2, lw, ls); ctx.restore(); }
  let y = cy + W*0.26;
  ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(W*0.075)}px Montserrat, "Arial Black", Arial`; ctx.fillText('CELL SPACE', W/2, y);
  y += Math.round(W*0.05); ctx.fillStyle = C.a; ctx.font = `700 ${Math.round(W*0.035)}px Montserrat, Arial`; ctx.fillText('ARGENTINA', W/2, y);
  y += Math.round(W*0.06); ctx.fillStyle = C.muted; ctx.font = `600 ${Math.round(W*0.034)}px Montserrat, Arial`;
  ctx.fillText(p.tagline || 'TU TIENDA DE TECNOLOGÍA', W/2, y);
  // beneficios
  const feats = [['truck','ENVÍOS A TODO EL PAÍS'],['card','HASTA 12 CUOTAS'],['shield','GARANTÍA Y SOPORTE']];
  y += Math.round(W*0.06);
  feats.forEach(([ic,l])=>{ y += Math.round(W*0.07); drawIcon(ctx, ic, W/2 - W*0.24, y - W*0.012, W*0.035, C.a);
    ctx.textAlign='left'; ctx.fillStyle=C.ink; ctx.font=`700 ${Math.round(W*0.034)}px Montserrat, Arial`; ctx.fillText(l, W/2 - W*0.18, y); ctx.textAlign='center'; });
  // web en botón
  y += Math.round(W*0.1); const web = state.opts.web || 'cellspacearg.com.ar';
  ctx.font = `800 ${Math.round(W*0.048)}px Montserrat, Arial`; const tw = ctx.measureText(web).width, bh = Math.round(W*0.11), bpx = Math.round(W*0.06);
  const g = ctx.createLinearGradient(W/2-tw/2,0,W/2+tw/2,0); g.addColorStop(0,C.a); g.addColorStop(1,C.a2);
  ctx.save(); ctx.shadowColor = rgba(C.a,0.5); ctx.shadowBlur = 24; ctx.fillStyle = g; roundRect(ctx, W/2-tw/2-bpx, y-bh*0.66, tw+bpx*2, bh, bh/2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#150800'; ctx.textBaseline='middle'; ctx.fillText(web, W/2, y-bh*0.14); ctx.textBaseline='alphabetic';
  drawFooter(ctx, W, H, pad);
}

// ARCHETIPO: SPOTLIGHT — producto bajo cono de luz, precio abajo
function drawArcSpotlight(ctx, W, H, pad, p, sizeKey, photo, tp){
  const story = sizeKey==='story';
  drawTechBackground(ctx, W, H, sizeKey, 'dark');
  drawHeader(ctx, W, pad, false);
  // cono de luz desde arriba
  ctx.save(); const cg = ctx.createLinearGradient(0, H*0.1, 0, H*0.6);
  cg.addColorStop(0, rgba(C.a,0.18)); cg.addColorStop(1, rgba(C.a,0));
  ctx.fillStyle=cg; ctx.beginPath(); ctx.moveTo(W*0.42,H*0.08); ctx.lineTo(W*0.58,H*0.08); ctx.lineTo(W*0.78,H*0.6); ctx.lineTo(W*0.22,H*0.6); ctx.closePath(); ctx.fill(); ctx.restore();
  if (tp.tag){ ctx.textAlign='center'; ctx.fillStyle=C.a; ctx.font=`800 ${Math.round(W*0.028)}px Montserrat, Arial`; ctx.fillText(tp.tag, W/2, H*0.16); }
  // producto
  const ph = story ? H*0.36 : H*0.40, cy=story?H*0.42:H*0.42;
  radialBlob(ctx, W/2, cy+ph*0.35, ph*0.7, rgba(C.a,0.2));
  if (tp.circle){ ctx.save(); ctx.strokeStyle=rgba(C.a,0.5); ctx.lineWidth=Math.max(3,W*0.006); ctx.beginPath(); ctx.arc(W/2, cy, ph*0.5, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
  if (photo) drawImageContain(ctx, photo, W/2-ph*0.55, cy-ph*0.5, ph*1.1, ph, true);
  let y = cy + ph*0.62;
  ctx.textAlign='center'; ctx.fillStyle=C.a; ctx.font=`700 ${Math.round(W*0.03)}px Montserrat, Arial`; ctx.fillText((p.brand||'').toUpperCase(), W/2, y);
  ctx.fillStyle=C.ink; const nf=`800 ${Math.round(W*0.078)}px Montserrat, "Arial Black", Arial`; y+=Math.round(W*0.078); ctx.font=nf; ctx.fillText((p.name||'').toUpperCase(), W/2, y);
  y += Math.round(W*0.09); priceText(ctx, W/2, y, p.price, Math.round(W*0.1), 'center');
  drawFooter(ctx, W, H, pad);
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
    case 'chip':
      R(-u*0.7,-u*0.7,u*1.4,u*1.4,u*0.15); ctx.stroke();
      R(-u*0.35,-u*0.35,u*0.7,u*0.7,u*0.08); ctx.stroke();
      for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(i*u*0.4,-u*0.7); ctx.lineTo(i*u*0.4,-u); ctx.moveTo(i*u*0.4,u*0.7); ctx.lineTo(i*u*0.4,u); ctx.moveTo(-u*0.7,i*u*0.4); ctx.lineTo(-u,i*u*0.4); ctx.moveTo(u*0.7,i*u*0.4); ctx.lineTo(u,i*u*0.4); ctx.stroke(); }
      break;
    case 'cpu':
      R(-u*0.75,-u*0.75,u*1.5,u*1.5,u*0.12); ctx.stroke();
      ctx.font=`800 ${Math.round(s*0.35)}px Montserrat, Arial`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('AI',0,0); ctx.textBaseline='alphabetic'; break;
    case 'wifi':
      for(let i=1;i<=3;i++){ ctx.beginPath(); ctx.arc(0,u*0.55,u*0.32*i,Math.PI*1.25,Math.PI*1.75); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0,u*0.55,u*0.06,0,Math.PI*2); ctx.fill(); break;
    case 'signal':
      for(let i=0;i<4;i++){ const h2=u*(0.4+i*0.35); R(-u*0.8+i*u*0.5, u*0.7-h2, u*0.28, h2, u*0.04); ctx.fill(); } break;
    case 'hexagon':
      ctx.beginPath(); for(let i=0;i<6;i++){ const a=Math.PI/3*i-Math.PI/6; const x=Math.cos(a)*u*0.9,y=Math.sin(a)*u*0.9; i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); ctx.stroke(); break;
    case 'gear':
      ctx.beginPath(); for(let i=0;i<16;i++){ const rr=i%2?u*0.9:u*0.65; const a=Math.PI/8*i; const x=Math.cos(a)*rr,y=Math.sin(a)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(0,0,u*0.32,0,Math.PI*2); ctx.stroke(); break;
    case 'circuit':
      ctx.beginPath(); ctx.moveTo(-u,0); ctx.lineTo(-u*0.3,0); ctx.lineTo(0,-u*0.5); ctx.lineTo(u*0.5,-u*0.5); ctx.moveTo(-u*0.3,0); ctx.lineTo(u,0); ctx.stroke();
      [[-u,0],[u*0.5,-u*0.5],[u,0]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,u*0.12,0,Math.PI*2);ctx.fill();}); break;
    case 'orb':
      ctx.save(); const og=ctx.createRadialGradient(-u*0.2,-u*0.2,0,0,0,u); og.addColorStop(0,color); og.addColorStop(1,rgba(color,0.1)); ctx.fillStyle=og; ctx.beginPath(); ctx.arc(0,0,u*0.9,0,Math.PI*2); ctx.fill(); ctx.restore(); break;
    case 'star':
      ctx.beginPath(); for(let i=0;i<8;i++){ const rr=i%2?u:u*0.4; const a=Math.PI/4*i-Math.PI/2; const x=Math.cos(a)*rr,y=Math.sin(a)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); ctx.fill(); break;
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
  .sg-icons{display:flex;gap:8px;flex-wrap:wrap;}
  .sg-ic{width:40px;height:40px;border-radius:9px;border:1px solid #2c2c2c;background:#0f0f0f center/26px no-repeat;cursor:pointer;padding:0;}
  .sg-ic:hover{border-color:#ff6a00;transform:scale(1.08);}
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
