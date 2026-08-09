-- ============================================================
-- ERP — Descuentos por cupón en pedidos
-- Agrega el descuento aplicado al pedido y una función atómica para
-- registrar el uso del cupón (used_count). El cálculo del descuento sigue
-- siendo autoritativo del lado del servidor (validate_coupon en la Edge Function).
-- ============================================================
alter table public.orders add column if not exists discount     numeric(12,2) not null default 0;
alter table public.orders add column if not exists coupon_code  text;

-- Registrar el uso de un cupón de forma atómica (lo llama la Edge Function
-- con la service key). Devuelve el used_count resultante o null si no aplica.
create or replace function public.redeem_coupon(p_code text)
returns integer
language plpgsql security definer set search_path = public as $$
declare new_count integer;
begin
  if p_code is null or trim(p_code) = '' then return null; end if;
  update public.promotions
     set used_count = coalesce(used_count, 0) + 1,
         updated_at = now()
   where lower(code) = lower(trim(p_code))
     and is_active is true
     and (max_uses is null or used_count < max_uses)
  returning used_count into new_count;
  return new_count;
end $$;

revoke all on function public.redeem_coupon(text) from public, anon, authenticated;
