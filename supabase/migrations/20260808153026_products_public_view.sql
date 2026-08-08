-- ============================================================
-- Precios ocultos a visitantes — Parte A (aditiva, no rompe nada)
-- ------------------------------------------------------------
-- Vista pública de products SIN las columnas de precio
-- (price, old_price, price_no_tax, price_transfer), pensada para el rol
-- anon (visitantes sin sesión). Los usuarios logueados siguen leyendo la
-- tabla products completa.
--
-- Esta parte es SEGURA de aplicar en cualquier momento: solo agrega una vista.
-- El revoke que oculta el precio de verdad va en la Parte B, que debe
-- aplicarse RECIÉN cuando el frontend actualizado ya esté desplegado
-- (si no, el sitio viejo que hace products.select('*') como anon se rompería).
-- ============================================================

create or replace view public.products_public as
  select
    id, name, sku, category, brand, model, stock, status, is_active, is_featured,
    is_hidden, badge, description, image_url, images, rating, reviews, created_at,
    updated_at, condition, condition_note, state_variants, storage_options,
    color_options, specs, installments, shipping_note, warranty, device_condition,
    review_status, imei_verified, battery_health, component_ratings, condition_badge,
    sold_count
  from public.products;

grant select on public.products_public to anon, authenticated;
