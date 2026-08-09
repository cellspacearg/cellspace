# CELL SPACE DESIGN STUDIO — Design System & Plan

> Documento base del módulo **Cell Space Design Studio** (motor de diseño y generación de contenido para redes).
> Estado: **PLANIFICACIÓN** — nada de esto está implementado todavía salvo lo indicado en "Lo que ya existe".
> Regla: no se rompe nada de lo existente; todo se conecta al sistema real (Supabase); no se hardcodean las plantillas.
> Creado: 2026-08-09.

---

## 0. Lectura honesta de la escala (leer primero)

Lo pedido = **un Canva/Figma propio de Cell Space**: 31 plantillas estáticas + 31 animadas (30–45s) + editor drag&drop + capas + timeline + presets de color + librerías de productos/licencias/tools + IA diseñadora + reference board + integración CMS + exportación PNG/MP4. **Es un proyecto de meses**, por fases. Para que sea real y no una maqueta, separo por dificultad:

**Alto valor / alcanzable pronto (verde):**
- Motor de plantillas estáticas basado en datos (ya hay una base funcionando).
- Arquitectura escalable en Supabase (agregar plantillas/tools sin tocar código).
- Librería de **tools/licencias** administrable desde el CMS (tarjetas tipo UnlockTool).
- Presets de color + composición por rubro.
- Exportación **PNG/JPG/WEBP** (ya funciona el PNG).
- Adaptación automática de una plantilla a los formatos (1080×1080 / 1080×1350 / 1080×1920 / 1200×628).

**Medio (amarillo) — más trabajo:**
- Editor visual drag&drop con panel de capas y propiedades (es lo más grande; se hace por etapas, primero un editor acotado).
- Reference board (subir referencias y guardarlas: fácil; que la IA las "analice": necesita IA de visión).
- Variantes A–E automáticas.

**Pesado / con costo o dependencia (rojo) — fases avanzadas:**
- **IA diseñadora en vivo** (elige plantilla/copy/colores): requiere una **API key de IA con costo por uso** (Anthropic), vía Edge Function. Sin key, no hay IA en vivo.
- **31 plantillas ANIMADAS con export MP4/WEBM de 30–45s**: técnicamente posible en el navegador (canvas + `MediaRecorder` → WEBM; MP4 real necesita `ffmpeg.wasm`, que es pesado, o render server-side). Videos de 30–45s son archivos grandes y el render tarda. Es la parte más costosa en tiempo y recursos. Se encara al final y probablemente empiece por **WEBM corto** antes que MP4 largo.
- Logos de terceros (UnlockTool, ChimeraTool, etc.): **no se inventan**; los sube el admin como assets autorizados.

> Recomendación: construir el **motor + arquitectura + librerías + editor acotado** primero (uso real en minutos), y dejar **IA en vivo** y **motion/MP4** como fases avanzadas con decisiones de costo.

---

## 1. Lo que YA existe (base sobre la que se construye)

- **Vista `#/social` (Generador de redes)** en el panel admin (`admin/js/views/social.js`): motor 100% Canvas, sin librerías.
  - 3 tamaños: Cuadrado 1080×1080, Retrato 1080×1350, Historia 1080×1920.
  - Modo placa única + carrusel (3 slides).
  - **Rubros** (usados/nuevos/licencias/herramientas/fundas/accesorios/otros) que cambian eyebrow + features con íconos vectoriales.
  - **8 temas de color** de acento configurables + moneda ARS/USD + HOT SALE + sello + WhatsApp/web/Instagram.
  - Layout estilo póster (anillo circular, callouts con líneas, caja de precio, beneficios, footer).
  - Lee **datos reales** de `products` (nombre, marca, precio, transferencia, precio anterior, batería, garantía, condición, specs, imagen).
  - Exporta **PNG** local; librería de íconos lineales (`drawIcon`).
- **Backend Supabase** con RLS, Storage (`cms-media`, `product-images`, etc.), Edge Functions, catálogo `products`, `promotions`, etc.
- **Identidad**: logo `assets/logo.png`, naranja `#FF6A00`, tema oscuro, tipografía Montserrat.

**Conclusión:** ya tenemos el **germen del sistema de plantillas estáticas**. El Design Studio evoluciona esto a una arquitectura escalable + editor + más plantillas + motion.

---

## 2. Identidad Cell Space (base, editable por preset)

- **Neutros:** casi-negro azulado `#0a0e16` / `#05070c`; texto `#ffffff` / `#8b93a7`.
- **Acento primario:** naranja `#FF6A00` (marca). **Secundario:** azul `#2f7bff`.
- **Tipografía:** display bold (Montserrat 800) + cuerpo (Montserrat 500/600) + mono para etiquetas tech (`// ETIQUETA`).
- **Voz:** técnica, premium, confiable. Mayúsculas en títulos, jerarquía clara.

---

## 3. Presets de color (sección 8 del pedido)

`CELL SPACE CLASSIC` · `DARK PREMIUM` · `BLUE TECH` · `ORANGE TECH` · `NEON` · `CYBER` · `GLASS` · `TITANIUM` · `CARBON` · `MINIMAL WHITE` — cada uno define: `background, primary, secondary, accent, text, price, cta, borders, glow, gradient`. El usuario puede **crear su propio preset** (se guarda en `design_presets`). (Hoy hay 8 acentos; se amplían a presets completos.)

---

## 4. Catálogo de 31 plantillas ESTÁTICAS

Cada plantilla = una **composición distinta** (no el mismo diseño recoloreado). Se registran en `templates` (no hardcode). Grupos:

**Producto:** 01 Product Hero · 02 Premium Product · 03 Product Card · 04 Product Grid · 05 New Arrival · 13 Smartphone · 14 Android · 17 Smartwatch (circular) · 18 Notebook/PC (horizontal) · 19 Consolas (gaming).
**Ofertas:** 06 Hot Sale · 07 Flash Sale · 08 Cyber Sale · 09 Black Friday · 10 Liquidación · 11 Price Drop · 12 Comparación.
**Accesorios:** 15 Accesorios · 16 Fundas.
**Servicio:** 20 Servicio Técnico · 21 Antes/Después · 22 Reparación.
**Software/tools:** 23 Licencia · 24 Activación · 25 Tool/Herramienta · 26 Servidor/Créditos · 27 Software.
**Institucional:** 28 Promoción General · 29 Comunicado · 30 Central Space · 31 AI Custom.

Cada plantilla define: `slots` (product, title, price, cta, features, badges…), `layouts` por formato, `defaults`, `rubros compatibles`.

## 5. Catálogo de 31 plantillas ANIMADAS (fase avanzada)

01 Product Reveal · 02 Cinematic · 03 Rotation · 04 Zoom · 05 Price Reveal · 06 Flash · 07 Hot Sale · 08 Cyber · 09 Black Friday · 10 New Arrival · 11 Slide · 12 Carousel · 13 Before/After · 14 Repair Process · 15 Tech Service · 16 Accessory · 17 Case · 18 Smartwatch · 19 Notebook · 20 Console · 21 License Reveal · 22 Activation · 23 Tool · 24 UnlockTool · 25 ChimeraTool · 26 Tech Tools · 27 Server/Credits · 28 Promotion · 29 Central Space · 30 Announcement · 31 AI Motion.
- Duraciones: 15s / 20s / 30s / **45s** (default 30s). Timeline editable con keyframes por capa.
- Efectos elegantes: reveal, zoom, camera push/pull, parallax, floating, light sweep, glow, glass, scanline, kinetic typography, price animation, mask reveal, gradient/background movement, light rays.
- Export: WEBM (MediaRecorder) primero; MP4 (ffmpeg.wasm o server) después.

---

## 6. Arquitectura de datos propuesta (Supabase — a aprobar)

Escalable: agregar plantilla 32/100 o una tool nueva **sin tocar código**.

| Tabla | Para qué |
|---|---|
| `design_template_categories` | agrupadores (producto, oferta, servicio, software, institucional) |
| `design_templates` | plantilla base: nombre, categoría, tipo (static/animated), formatos, rubros compatibles, thumbnail |
| `design_template_elements` | capas/slots de cada plantilla (tipo, posición, tamaño, estilo, binding a datos) |
| `design_template_variants` | variantes A–E de una plantilla |
| `design_template_animations` | timeline por plantilla animada (duración, tracks) |
| `design_animation_tracks` / `_keyframes` | pistas y keyframes por capa |
| `design_presets` | presets de color (incluye los del usuario) |
| `design_tools` | **librería de tools/licencias administrable** (nombre, logo, categoría, versión, tipo licencia, duración, precio, moneda, proveedor, URL, color, plantilla default) |
| `design_references` | reference board (imágenes subidas + notas de análisis) |
| `design_projects` / `design_versions` | proyectos guardados, favoritos, colecciones, historial |
| `brand_assets` | logos, fondos, fuentes, íconos de marca |

- Storage: bucket `design-assets` (logos de tools, fondos, exports).
- RLS: gestión por permiso `design.manage`; lectura de plantillas para el panel.
- **No** se elimina ni pisa nada existente sin confirmación explícita.

---

## 7. Editor visual, capas y motion (secciones 5–6, 23)

- **Editor:** panel izq (plantillas/productos/logos/íconos/fondos/formas/textos/efectos/animaciones), canvas central, panel der (propiedades: posición/tamaño/rotación/opacidad/color/borde/sombra/blur/glow/tipografía/animación/duración).
- **Capas:** BACKGROUND · EFFECTS · PRODUCT · SHADOW · LOGO · BRAND · TITLE · SUBTITLE · PRICE · CTA · ICONS · DECORATION (mover/ocultar/bloquear/duplicar/eliminar/agrupar/renombrar).
- **Motion:** timeline con tramos (0–3 logo, 3–8 producto, 8–13 features, 13–18 precio, 18–24 promo, 24–28 CTA, 28–30 branding), todo editable.
- **Realidad técnica:** el editor completo es lo más grande. Se hará por etapas: v1 = editar textos/colores/posición sobre una plantilla + reemplazar producto/logo; v2 = capas y drag&drop libre; v3 = motion.

---

## 8. IA, referencias, formatos, export, variantes, QA

- **Cell Space AI Designer** (sección 13): identifica categoría → elige plantilla/composición/colores/efectos → genera copy/título/subtítulo/CTA → adapta producto/formato → genera variantes. **Requiere API key de IA (costo)**; se implementa vía Edge Function. Sin key, se ofrece "IA asistida por el asistente en el chat".
- **Reference board** (14): subir imágenes; análisis de composición/colores/jerarquía con IA de visión (requiere key). Guardar referencias: sin key.
- **Formatos** (15): 1080×1080, 1080×1350, 1080×1920 (story/reels/tiktok/wsp), 1200×628 (fb), 1920×1080 (yt) — una plantilla se adapta a varios.
- **Export** (16): PNG/JPG/WEBP (ya PNG); animado WEBM→MP4/GIF (fase motion).
- **Variantes** (17): A–E cambiando composición/colores/fondo/posición/tipografía/CTA/precio, manteniendo identidad.
- **QA** (19): checks de alineación/spacing/contraste/tipografía/legibilidad/marca/visibilidad de producto/precio/CTA antes de finalizar.

---

## 9. Roadmap por fases (a aprobar; sin romper lo existente)

- **F0 — Plan + Design System (este documento).** ← estás acá.
- **F1 — Arquitectura de datos.** Migraciones de las tablas `design_*` + bucket + RLS + seed de categorías/presets. (No aplica hasta aprobar.)
- **F2 — Motor de plantillas escalable.** Refactor de `#/social` para leer plantillas desde `design_templates` (el generador actual pasa a ser el primer set de plantillas). Registro de plantillas por composición.
- **F3 — Set de plantillas estáticas por rubro** (arrancando por las de mayor uso: Product Hero, Hot Sale/Cyber/Black Friday, Smartphone, Accesorio/Funda, Licencia/Tool, Servicio/Reparación, Central Space). Llegar a las 31 por tandas.
- **F4 — Librería de Tools/Licencias** (`design_tools` + CRUD en el admin + tarjeta de licencia estilo UnlockTool). Alta de tools desde el CMS sin código.
- **F5 — Presets de color completos + variantes A–E.**
- **F6 — Editor v1** (editar texto/color/posición + reemplazar producto/logo, con capas básicas).
- **F7 — Reference board** (subida + guardado; análisis IA opcional).
- **F8 — IA Designer** (si hay API key): categoría→plantilla→copy→variantes.
- **F9 — Editor v2** (drag&drop + capas completas).
- **F10 — Motion**: timeline + animaciones + export WEBM → luego MP4/GIF.
- **F11 — Integración CMS** ("Crear diseño" desde producto/tool/servicio) + favoritos/colecciones/versiones.
- **F12 — QA, optimización, docs finales.**

---

## 10. Decisiones que necesito de vos antes de F1

1. **Por dónde arrancamos** (recomiendo F1+F2+F4: arquitectura + motor escalable + librería de tools/licencias — es lo de mayor uso inmediato).
2. **IA en vivo**: ¿conseguís/activás una API key de IA (con costo por uso) para el AI Designer, o por ahora la "IA" la hago yo asistiéndote en el chat (sin costo)?
3. **Motion/MP4**: ¿es prioridad ya, o lo dejamos para una fase avanzada (arrancando por videos cortos WEBM)?
4. **Logos de tools** (UnlockTool, etc.): confirmás que los subís vos como assets autorizados (no los invento).
