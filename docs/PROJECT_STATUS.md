# CELL SPACE ARGENTINA — CMS + ERP · PROJECT STATUS

> Documento vivo. Leyenda: `[ ]` Pendiente · `[~]` En desarrollo · `[✓]` Verificado · `[!]` Error · `[⚠]` Requiere revisión
> Nunca se marca `[✓]` sin haberlo probado realmente.
> Última actualización: 2026-08-08

---

## 0. Pendientes heredados (de la etapa de seguridad)

- `[ ]` Configurar plantilla **"Confirm signup"** en Supabase con `{{ .Token }}` + Confirm email ON (si no, el registro OTP nativo no manda código).
- `[ ]` Revisar Edge Function **`create-payment`**: que recalcule precio/stock desde la DB.
- `[ ]` Smoke test logueado (cliente/técnico/admin) del sitio público.

---

## 1. Arquitectura ACTUAL (auditada)

- **Web pública:** sitio estático (HTML/CSS/JS vanilla, sin framework ni build) servido por **GitHub Pages** en `cellspacearg.com.ar`. ~20 páginas. Dependencias por CDN con SRI.
- **Panel admin (`/admin`):** SPA propia con **router por hash** y ES modules (`admin/js/main.js` → `admin/js/views/*`). Sin framework. Gate por email admin en cliente.
- **Backend:** **Supabase** (Postgres 17, región sa-east-1). Auth (password + OTP nativo + Google), Postgres con RLS, Storage, Edge Functions (`create-payment`, `imei-check`).
- **CLI Supabase** vinculada localmente → migraciones versionadas en `supabase/migrations/`.

**Patrón de datos:** el frontend usa la anon key; los roles se resuelven server-side con `my_role()` y se protegen con RLS. Fuente de verdad = Supabase.

## 2. Arquitectura PROPUESTA

Mantener el stack (no reescribir a un framework ahora — riesgo alto, sin beneficio inmediato). Evolucionar así:

```
WEB PÚBLICA (estática)  ─┐
PANEL ADMIN (SPA hash)  ─┼─►  SUPABASE (Postgres + RLS + Storage + Edge Functions)
CUENTA CLIENTE/TÉCNICO  ─┘         ▲ fuente única de verdad
```

- **CMS:** extender el panel existente para editar Inicio/Tienda/Servicio/Central/Contacto/Config leyendo y escribiendo tablas reales (`site_settings`, `pages`, `products`, `services`, `posts`, `cs_*`).
- **ERP:** módulos nuevos (reparaciones, inventario, técnicos+crédito, proveedores, pedidos, reportes, auditoría, notificaciones) como tablas + vistas admin + RLS.
- **RBAC:** sistema de roles/permisos **granular en la DB** (no solo ocultar botones).

## 3. Módulos EXISTENTES (en el panel `/admin`)

Vistas presentes y aparentemente conectadas a Supabase (a verificar módulo por módulo):

- `[⚠]` Dashboard (`views/dashboard.js`) — existe; alcance real por verificar.
- `[⚠]` Productos (`views/products.js`, 34KB) — CRUD + upload a bucket `product-images`.
- `[⚠]` Categorías (`views/categories.js`)
- `[⚠]` Servicios (`views/services.js`)
- `[⚠]` Páginas + Builder (`views/pages.js`, `views/builder.js`) — page builder por bloques (`pages.blocks` jsonb).
- `[⚠]` Media (`views/media.js`)
- `[⚠]` Blog (`views/blog.js`, 28KB)
- `[⚠]` Settings (`views/settings.js`) — mapea a `site_settings` (muy completa).
- `[⚠]` Clientes (`views/customers.js`) — lee `profiles`, cambia roles.

## 4. Módulos FALTANTES (ERP)

- `[ ]` **Pedidos** (existe tabla `orders` con 9 filas y datos reales, pero **no hay vista admin**).
- `[ ]` **Reparaciones** (no existe tabla ni vista) — módulo central del ERP.
- `[ ]` **Inventario / movimientos de stock** (products tiene `stock` pero no hay ledger de movimientos).
- `[ ]` **Técnicos** (gestión) + **Crédito de técnicos** (no existe).
- `[ ]` **Proveedores** (no existe).
- `[ ]` **Promociones / cupones** (solo `old_price` en products).
- `[ ]` **Gastos / egresos** (para el dashboard ingresos vs gastos).
- `[ ]` **Reportes** (derivables por vistas/consultas).
- `[~]` **Notificaciones / alertas** (tabla `notifications` + triggers en orders/repairs + admin `#/notifications` + badge).
- `[~]` **Auditoría** (tabla `audit_log` + trigger genérico en 8 tablas sensibles + admin `#/audit` con diff).
- `[ ]` **Roles y permisos granulares** (hoy `profiles.role` texto + `is_admin_email`).
- `[ ]` **Central Space CMS** (tablas `cs_*` existen; falta administración completa desde el panel).

## 5. Tablas EXISTENTES (22, todas con RLS activado)

| Tabla | Filas | Rol |
|---|---|---|
| `products` | 4 | catálogo tienda (39 cols, ricas) |
| `categories` | 12 | categorías tienda (`technician_only`, `sort_order`) |
| `product_reviews` | — | reseñas |
| `orders` | 9 | pedidos (modelo e-commerce completo: items jsonb, billing/shipping, mp_*, order_status, stock_applied) |
| `services` | 1 | servicio técnico |
| `pages` | — | páginas CMS (builder por `blocks` jsonb) |
| `posts` / `post_categories` | 1 | blog |
| `profiles` | 3 | usuarios (id=auth.uid, role, status) |
| `technician_applications` | 0 | solicitudes técnico (con `evidence_urls`, `reviewed_by`) |
| `site_settings` | — | configuración global (logo, favicon, socials, SEO, colores, maintenance…) |
| `cs_brands/categories/devices/guides/files/tools/guide_tools/comments/ratings/tech_profiles` | cs_guides 0 | **Central Space** (guías técnicas, gamificación: rank/level/points/vip_until) |

## 6. Tablas A CREAR (propuesta ERP — sin duplicar lo existente)

- `repairs` (órdenes de reparación) + `repair_status_history` + `repair_media`
- `stock_movements` (ledger de inventario) — referencia `products`
- `technician_credit` (saldo) + `technician_credit_movements` (ledger, con límite)
- `suppliers` + `supplier_purchases`
- `promotions` (cupones/descuentos)
- `expenses` (egresos)
- `notifications` (alertas por usuario/rol)
- `audit_log` (auditoría de cambios sensibles)
- `roles` + `permissions` + `role_permissions` (RBAC granular) — o enum + tabla `permissions`
- (opción) `warehouses`/`locations` para depósitos

## 7. Relaciones (FKs actuales)

`product_reviews.product_id→products` · `posts.category_id→post_categories` · `orders.user_id→auth.users` · `technician_applications.user_id→auth.users` · red Central Space (`cs_guides→cs_brands/cs_devices/cs_categories`, `cs_comments/cs_files/cs_ratings→cs_guides`, `cs_devices→cs_brands`). Nuevas FKs: repairs→profiles(cliente)/profiles(técnico), stock_movements→products, credit_movements→profiles(técnico), etc.

## 8. RLS (estado actual)

- RLS **activo en las 22 tablas**.
- `products`: SELECT público (precio ya protegido a `anon` por grants de columna); write solo `is_admin()`.
- `orders`: cada usuario ve/crea lo suyo; admin ve todo.
- `profiles`: lectura/edición propia; **escalada de rol bloqueada** por trigger `enforce_profile_role_guard`.
- `technician_applications`: inserta el propio; admin lee/actualiza.
- Funciones server-side: `my_role()`, `is_admin()`, `is_admin_email()`, `is_technician()`, `handle_new_user()` (crea profile al registrarse), `apply_order_stock()`, `confirm_manual_payment()`.
- **Falta:** RLS para las tablas ERP nuevas + RBAC granular (permisos por acción, no solo por rol).

## 9. Roles (actual → propuesto)

- **Actual:** `visitor` / `client` / `technician` / `admin` (admin = por email). `cs_tech_profiles` ya tiene `rank/level/vip_until`.
- **Propuesto:** `super_admin`, `administrador`, `colaborador`, `tecnico`, `tecnico_verificado`, `vip_tech`, `cliente`. Requiere decisión de negocio (ver §13).

## 10. Permisos (propuesto)

Tabla `permissions` (ej: `products.edit`, `repairs.change_status`, `users.manage`, `settings.edit`, `credit.adjust`…) + `role_permissions`. Función `has_perm(perm text)` server-side usada en RLS y en el panel. Los técnicos NO pueden tocar usuarios/config/permisos.

## 11. Rutas

- **Público:** `index/tienda/producto/servicios/servicio/central-space/blog/post/checkout/perfil/login/registro/...` (hash-free, páginas).
- **Admin (hash):** `#/dashboard #/products #/categories #/services #/pages #/builder #/media #/blog #/settings #/customers`. **A agregar:** `#/orders #/repairs #/inventory #/technicians #/credit #/suppliers #/promotions #/reports #/audit #/roles #/central`.

## 12. Plan de implementación (fases)

- **Fase A — Cimientos ERP:** buckets de Storage (repairs, documents, cms-media, videos) · vista **Pedidos** en admin (tabla ya existe) · verificar CRUD real de los módulos CMS existentes.
- **Fase B — RBAC:** tablas roles/permissions + `has_perm()` + RLS + gestión desde el panel.
- **Fase C — Reparaciones:** tablas + estados + historial + media + vista admin + cuenta cliente + **seguimiento público por código**.
- **Fase D — Inventario:** `stock_movements` + triggers que ajustan `products.stock` + historial + alertas stock bajo.
- **Fase E — Técnicos + Crédito:** perfiles, asignación de reparaciones, ledger de crédito con límite.
- **Fase F — Comercial:** proveedores, promociones, gastos.
- **Fase G — Analítica:** reportes, notificaciones, auditoría.
- **Transversal — CMS web:** Inicio (hero/banners), Servicio, Central Space, Contacto/Config sobre `site_settings`/`pages`.

Cada fase sigue el loop: analizar → implementar → conectar → probar (CRUD/RLS/errores) → auditar.

## 13. Riesgos y decisiones de negocio (necesito tu definición)

- **Sitio en producción:** cada cambio de RLS impacta en vivo. Trabajaremos con migraciones + verificación, y los cambios que puedan romper el front se aplican tras deploy.
- **Decisiones de negocio necesarias antes de ciertas fases:**
  1. **Jerarquía de roles y qué puede hacer cada uno** (matriz de permisos) — Fase B.
  2. **Modelo de membresía FREE/VIP** de Central Space (qué es gratis, qué es VIP, cómo se otorga).
  3. **Crédito de técnicos:** ¿cómo se asigna el límite? ¿se descuenta con compras/reparaciones?
  4. **Estados de reparación** (confirmar la lista) y qué transiciones puede hacer cada rol.
  5. **Pagos:** ¿qué integraciones activamos (MP/transferencia/efectivo/tarjeta)? Cuál queda `⚠ CONFIGURACIÓN EXTERNA PENDIENTE`.
- **Alcance:** es un ERP completo (semanas de trabajo). Se entrega por fases funcionales y verificadas, no todo de una.

## 14. Dependencias externas

- Supabase (DB/Auth/Storage/Edge Functions) — vinculado ✓
- Mercado Pago (Edge Function `create-payment`) — a auditar
- EmailJS (emails de pedido) · Google OAuth · GitHub Pages (deploy) · FontAwesome/Fonts (CDN, con SRI)

---

## Checklist de módulos (se actualiza a medida que se implementa)

### CMS
- `[✓]` CRUD real confirmado (conectado a Supabase): Productos · Categorías · Servicios · Páginas/Builder · Media · Blog · Settings · Clientes *(verificado a nivel código/consultas; falta smoke test logueado del dueño)*
- `[~]` **Dashboard** — reescrito para usar el layout compartido + **métricas reales** (ingresos, pedidos, productos, sin stock, clientes, técnicos, servicios, publicaciones + últimos pedidos). Data-layer verificada. Falta test logueado.
- `[ ]` Inicio (hero/banners/destacados) · `[~]` **Central Space CMS** (ver abajo) · `[ ]` Contacto/Config web · `[ ]` Menú/Footer/SEO

### Central Space — estado y problemas bien definidos
- `[✓]` Datos existentes: 7 marcas, 17 categorías (con `min_role`). Faltan guías (0), dispositivos (0), tools (0).
- `[~]` **Admin: publicación de guías** — nueva vista `admin/js/views/central.js` (`#/central`): crear/editar/publicar/eliminar guías con **estructura consistente** (título, resumen, marca, categoría, dificultad, método, advertencia, requisitos [lista], **pasos ordenados**, portada [subida a `cms-media`], badge, VIP, estado). Insert de datos verificado; modal + pasos/requisitos dinámicos verificados. Falta test logueado.
- `[~]` **Problema 1 — RESUELTO (a probar logueado): Ficha de guía pública**: `viewGuide()` en `js/central-space.js` renderiza la guía completa estilo screenshot con tu paleta — header + chips (marca/android/dificultad/método/vistas/rating/VIP), tabs (GUÍA/REQUISITOS/HERRAMIENTAS/ARCHIVOS/COMENTARIOS), pasos numerados, y sidebar (herramientas recomendadas, archivos, info del dispositivo, ticket de ayuda, tutoriales relacionados). Funciones definidas y sin error de carga; falta test logueado con una guía publicada.
- `[~]` **Problema 2 — RESUELTO (a probar): Secciones/categorías públicas**: `viewCategory()` lista las guías publicadas de cada categoría (`#/c/{slug}`).
- `[i]` **Disconnect Blog↔Central confirmado**: Blog escribe en `posts`, Central Space en `cs_guides`. Publicar en Blog nunca aparece en Central Space. Para guías técnicas usar `#/central`.
- `[⚠]` **Problema 3 — Visibilidad**: RLS `cs_guides_read` exige `is_technician()`. Con 0 técnicos, las guías publicadas solo las ve el admin. Definir membresía FREE/VIP y `is_technician()` para los nuevos roles.
- `[ ]` Admin de marcas/categorías/dispositivos/tools de Central Space (por ahora se editan por SQL; los dropdowns de guía ya usan marcas/categorías reales).

### Blog
- `[✓]` Diagnóstico: el módulo Blog está **funcional a nivel código/datos/RLS** (payload correcto, `val()`/`set()` null-safe, ids presentes, insert de post verificado, RLS deja publicar al owner). Si al publicar logueado seguís viendo un error, **pasame el mensaje exacto** para reproducirlo.

### ERP
- `[~]` **Pedidos** — vista nueva `admin/js/views/orders.js` (listado + filtros + detalle + cambio de estado + confirmar pago vía RPC `confirm_manual_payment`). Ruta `#/orders` registrada. CRUD de datos verificado (SELECT + UPDATE reales). Falta test logueado.
- `[~]` **RBAC granular** — DB verificada (tablas `permissions`+`role_permissions` con la matriz de 7 roles, `has_perm()`, `is_admin()` extendido). Frontend: `usePermissions.js` + gate del panel por `panel.access` (con ancla del owner). Falta test logueado multi-rol.
- `[~]` **Reparaciones** — tablas `repairs` + `repair_status_history`; código de seguimiento + N° de orden autogenerados; historial de estados automático (trigger); RLS (gestión/técnico/cliente); RPC público `track_repair()` seguro (solo campos no privados). Admin `#/repairs` (alta/edición con todos los campos + cambio de estado + historial). Seguimiento público `reparaciones.html` ya funciona. CRUD de datos verificado. Falta test logueado del admin + "mis reparaciones" en la cuenta del cliente.
- `[~]` **Inventario** — tabla `stock_movements` (ledger) con trigger que ajusta `products.stock` automáticamente (entrada/salida/ajuste/devolución/venta) y guarda qty_before/after + motivo + usuario. RLS (products.manage). Admin `#/inventory`: registrar movimiento, historial, alerta de stock bajo. Trigger verificado (entrada +10 → stock 0→10). Falta test logueado.
- `[~]` **Reportes** — vista `#/reports` con KPIs (ingresos cobrados, pedidos, ticket promedio, reparaciones abiertas), ventas por mes (últimos 6), reparaciones por estado y productos más vendidos. Derivado de datos reales (orders/repairs/products), sin librerías (barras CSS). Falta test logueado.
- `[~]` **Proveedores** — tablas `suppliers` + `supplier_purchases`; admin `#/suppliers` (alta/edición, compras por proveedor con total). RLS products.manage. Falta test logueado.
- `[~]` **Gastos** — tabla `expenses` (categorías: alquiler/servicios/sueldos/insumos/impuestos/marketing/mantenimiento/otro). Admin `#/expenses` (alta/edición, filtros, total del mes y total general). RLS products.manage. Falta test logueado.
- `[✓]` **Promociones** — tabla `promotions` (cupones: % o monto fijo, compra mínima, usos máximos, vigencia). Admin `#/promotions` (CRUD, activar/desactivar). RPC público `validate_coupon(code, subtotal)` verificado. **Checkout integrado:** `checkout.html` tiene campo de cupón + filas subtotal/descuento/total; `checkout.js` valida contra la RPC en vivo (probado: BIENVENIDO10 → $60.000 con 10% = $54.000; y rechazo por compra mínima). El descuento es **autoritativo del servidor**: la Edge Function `create-payment` revalida el cupón con `validate_coupon`, guarda `discount`/`coupon_code`/`total` en el pedido, registra el uso con `redeem_coupon()` y aplica el neto al cobro de Mercado Pago (línea única cuando hay descuento, ítems detallados cuando no). Migración `order_discount` aplicada; función desplegada y verificada (boot + auth gate OK).
- `[~]` **Técnicos + crédito** — tabla `technician_credit_movements` (ledger SIN límite: asignación/uso/devolución/ajuste) con trigger de saldo corrido + función `technician_credit_balance()`. Admin `#/technicians` (lista de técnicos con saldo y reparaciones asignadas; modal de crédito con movimientos + registrar). RLS credit.manage + el técnico ve lo suyo. Ledger verificado (asignar 5000, usar 2000 → 3000).
- `[~]` **Notificaciones** — tabla `notifications` (type/title/body/link/is_read) + triggers `notify_new_order` (AFTER INSERT en orders → `#/orders`) y `notify_new_repair` (AFTER INSERT en repairs → `#/repairs`). Admin `#/notifications`: lista, filtro "sin leer", marcar leída/no leída, marcar todas, eliminar; badge de no leídas en la barra lateral (`refreshNotifBadge`). RLS `is_admin()`. Triggers verificados por CLI. Falta test logueado.
- `[~]` **Auditoría** — tabla `audit_log` (user/action/entity/entity_id/before/after) + trigger genérico `audit_trigger()` (SECURITY DEFINER) enganchado a 8 tablas sensibles (products, profiles, promotions, expenses, suppliers, repairs, role_permissions, site_settings). Admin `#/audit`: lista con filtros por entidad/acción/búsqueda + modal de detalle con diff de campos (antes/después). RLS solo lectura para `audit.view`. Verificado por CLI (UPDATE en products registró before+after). Falta test logueado.

### Storage
- `[✓]` Buckets creados y verificados: `cms-media` (público), `repair-media` (privado), `documents` (privado), además de `product-images` existente. Políticas: lectura pública + escritura admin (cms-media); solo admin (privados).

---

## Registro de avance

**2026-08-08 — Fase A (cimientos):**
- `[✓]` Storage buckets ERP (migración `storage_buckets_erp`, aplicada + verificada).
- `[~]` Módulo **Pedidos** en el admin (data-layer OK; falta test logueado del dueño).
- `[~]` **Dashboard** conectado a datos reales (data-layer OK; falta test logueado).
- `[✓]` Auditoría: los módulos CMS existentes son CRUD real sobre Supabase.
- **Pendiente de prueba (dueño):** entrar al panel con el usuario admin y verificar Pedidos + Dashboard en vivo.

**2026-08-08 — Fase B (RBAC granular):**
- `[✓]` DB: `permissions` + `role_permissions` sembradas con la matriz aprobada de 7 roles.
- `[✓]` `has_perm(key)` probada por rol (colaborador/administrador) simulando sesión; `is_admin()` extendido a super_admin/administrador. Guard anti-escalada reconfirmado.
- `[✓]` RLS: `role_permissions`/`permissions` legibles solo por autenticados (anon = 0 filas); escritura solo super_admin.
- `[~]` Frontend: `admin/js/hooks/usePermissions.js` (`can()`), gate `login()`/`checkSession()` por `panel.access` con ancla del owner (sin lockout). Falta test logueado con un usuario no-owner.
- **Roles válidos:** super_admin, administrador, colaborador, vip_tech, tecnico_verificado, tecnico, cliente.

### Cuenta cliente
- `[~]` Perfil (existe `perfil.html`) · `[ ]` Mis pedidos · `[ ]` Mis reparaciones · `[ ]` Presupuestos/pagos/garantías

**2026-08-08 — Cierre ERP (Notificaciones + Auditoría):**
- `[✓]` DB: migraciones `audit_log` (trigger genérico en 8 tablas + RLS `audit.view`) y `notifications` (triggers en orders/repairs + RLS `is_admin`). Aplicadas y verificadas por CLI.
- `[~]` Admin: vistas `#/audit` (lista + diff antes/después) y `#/notifications` (lista, filtro, marcar leída, badge de no leídas). Ambas ruteadas en `main.js` y en el menú (grupo Sistema). Cache-busting `cb11`. Panel bootea sin errores de consola.
- **Pendiente de prueba (dueño):** entrar logueado y verificar que Auditoría muestre los cambios y que Notificaciones liste los pedidos/reparaciones nuevos.
- Con esto quedan cubiertos los 18 módulos del ERP.

**2026-08-09 — Generador de redes (placas para Instagram/Facebook):**
- `[~]` Admin `#/social`: genera placas de producto con datos reales (nombre, precio, precio anterior, transferencia, cuotas, batería, garantía, condición) en 3 tamaños — Cuadrado 1080×1080, Retrato 1080×1350, Historia 1080×1920 — cada uno con su propia composición (no el mismo diseño estirado). Modo "Placa única" o "Carrusel" (3 slides: portada / detalles / contacto). Sello opcional (ej. OFERTA), WhatsApp y web editables. Motor 100% Canvas (sin librerías), descarga PNG local — no publica solo.
- Verificado visualmente (capturas reales, no solo lectura de código): se detectó y corrigió un choque real entre los chips (usado/batería/garantía) y el precio de transferencia/cuotas en el formato cuadrado cuando el producto trae mucha info; ahora el cuadrado usa una composición compacta dedicada y los chips se ubican dinámicamente después del precio, nunca a una posición fija.
- Ruteado en `main.js` + menú (grupo Contenido). Cache-busting `cb12`. Panel bootea sin errores de consola.
- Fuera de alcance de este build (posible fase futura): auto-publicar en Instagram/Facebook requiere la API de Meta (cuenta Business + revisión de app) — por ahora es descarga manual, tal como pidió el dueño. Texto/copy con IA para la publicación: no incluido (requeriría una API key de IA aparte).

**2026-08-09 — Rediseño tech premium del generador de redes:**
- `[~]` A pedido del dueño ("algo más de diseño, más tecnología"), se reescribió el motor de dibujo con estética tech premium: fondo con grilla de puntos + blobs de glow naranja/cyan + barra de acento en degradé; foto sobre panel "glass" con aro de neón en degradé (naranja→cyan), reflejo elíptico y esquinas tipo HUD (brackets cyan con glow); sello OFERTA con degradé y sombra; precio con degradé naranja + glow; pastilla cyan de "transferencia"; chips glassy con punto naranja brillante; en la slide de detalles, barra visual de salud de batería (degradé cyan→naranja) + filas de ficha técnica con fondo sutil; CTA con botón WhatsApp en degradé + glow y web en pastilla; etiquetas monospace `// TECH STORE` / `// FICHA TÉCNICA`. Cache-busting `cb13`.
- Verificado por captura real (6 variantes): se corrigió un choque de chips→footer en Retrato (chips a 1 fila + foto más chica + cuotas solo en historia/carrusel donde sobra lugar). Panel bootea sin errores.

**2026-08-09 — Config Supabase (email + OAuth):**
- `[✓]` **Emails de auth (OTP login + registro):** resuelto. Causa: el email incorporado de Supabase no entregaba a Gmail (200 OK pero sin delivery). Solución: **SMTP propio con Resend** (dominio `cellspacearg.com.ar` verificado por DKIM/DNS vía Cloudflare; sender `noreply@cellspacearg.com.ar`; host `smtp.resend.com:465`). Verificado: código de login llega al Gmail del dueño. Nota: los emails de *confirmación de pedido* siguen por **EmailJS** (client-side), son un canal aparte.
- `[✓]` **Largo del código OTP:** el código llegaba de 8 dígitos pero la UI (`login.html`/`register-client.html`) tiene 6 casilleros. Corregido bajando **Email OTP Length = 6** en Supabase (Authentication → Providers → Email). Verificado: llega de 6 y encaja con la UI.
- `[ ]` **Diseño branded de los templates** (Confirm signup / Magic Link / Reset Password) — pendiente: reemplazar el HTML genérico por uno con identidad Cell Space (dark + naranja `#FF6A00` + logo). Es solo contenido HTML (lo arma el asistente, el dueño lo pega).
- `[✓]` **Google OAuth:** resuelto. Se creó el cliente OAuth "web" en Google Cloud (redirect `https://cfoajkbzsqyimbfjhfsa.supabase.co/auth/v1/callback`), se habilitó el provider Google en Supabase con Client ID/Secret, y se agregó `https://cellspacearg.com.ar/**` a Redirect URLs. Verificado: `/auth/v1/authorize?provider=google` ahora devuelve `302 → accounts.google.com` con client_id/redirect_uri/scope correctos. Falta solo el test end-to-end del dueño (clic real en "Continuar con Google").
- Pendiente restante: smoke test logueado de todos los módulos.
