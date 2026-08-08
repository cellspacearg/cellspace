-- ============================================================
-- Precios ocultos a visitantes — Corrección de la Parte B
-- ------------------------------------------------------------
-- El `revoke select (price...) from anon` de la migración anterior NO tuvo
-- efecto: en PostgreSQL, si el rol tiene SELECT a nivel TABLA, un revoke por
-- columna no lo anula. Hay que quitar el SELECT de tabla y volver a otorgar
-- SELECT solo sobre las columnas SIN precio.
--
-- Resultado: anon (visitantes) puede leer todo salvo price / old_price /
-- price_no_tax / price_transfer. El frontend ya usa la vista products_public
-- para visitantes, así que esto no rompe nada. Los usuarios logueados
-- (authenticated) conservan el acceso completo, incluido el precio.
-- ============================================================

revoke select on public.products from anon;

grant select (
  id, name, sku, category, brand, model, stock, status, is_active, is_featured,
  is_hidden, badge, description, image_url, images, rating, reviews, created_at,
  updated_at, condition, condition_note, state_variants, storage_options,
  color_options, specs, installments, shipping_note, warranty, device_condition,
  review_status, imei_verified, battery_health, component_ratings, condition_badge,
  sold_count
) on public.products to anon;
