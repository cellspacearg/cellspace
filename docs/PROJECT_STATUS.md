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
- `[ ]` **Notificaciones / alertas** (no existe).
- `[ ]` **Auditoría** (no existe).
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
- `[ ]` Inicio (hero/banners/destacados) · `[ ]` Central Space CMS · `[ ]` Contacto/Config web · `[ ]` Menú/Footer/SEO

### ERP
- `[~]` **Pedidos** — vista nueva `admin/js/views/orders.js` (listado + filtros + detalle + cambio de estado + confirmar pago vía RPC `confirm_manual_payment`). Ruta `#/orders` registrada. CRUD de datos verificado (SELECT + UPDATE reales). Falta test logueado.
- `[ ]` Reparaciones (+seguimiento público) · `[ ]` Inventario · `[ ]` Técnicos · `[ ]` Crédito técnicos · `[ ]` Proveedores · `[ ]` Promociones · `[ ]` Gastos · `[ ]` Reportes · `[ ]` Notificaciones · `[ ]` Auditoría · `[ ]` RBAC granular

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

### Cuenta cliente
- `[~]` Perfil (existe `perfil.html`) · `[ ]` Mis pedidos · `[ ]` Mis reparaciones · `[ ]` Presupuestos/pagos/garantías
