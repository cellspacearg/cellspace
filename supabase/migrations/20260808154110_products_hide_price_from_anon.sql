-- ============================================================
-- Precios ocultos a visitantes — Parte B (⚠️ APLICAR RECIÉN DESPUÉS
-- DE DESPLEGAR EL FRONTEND ACTUALIZADO)
-- ------------------------------------------------------------
-- Quita el privilegio de leer las columnas de precio al rol `anon`
-- (visitantes sin sesión). A partir de acá, un visitante NO puede leer
-- price / old_price / price_no_tax / price_transfer ni siquiera consultando
-- la tabla products directamente con la anon key: debe usar la vista
-- products_public (sin precio), que es lo que hace el front actualizado.
--
-- ⚠️ IMPORTANTE: si se aplica esto ANTES de desplegar el front nuevo, el sitio
-- viejo (que hace products.select('*') como anon) se rompe para visitantes,
-- porque `select *` incluiría columnas sin permiso. Aplicar SOLO cuando el
-- frontend con window.productsSource() (js/config.js) ya esté en producción.
--
-- Los usuarios logueados (rol authenticated) conservan el acceso al precio.
-- ============================================================

revoke select (price, old_price, price_no_tax, price_transfer)
  on public.products
  from anon;
