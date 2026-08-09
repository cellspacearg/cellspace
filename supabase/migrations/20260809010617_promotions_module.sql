-- ============================================================
-- ERP — Promociones / cupones de descuento
-- Admin gestiona (products.manage). Un RPC público valida un cupón en el
-- checkout devolviendo solo si es válido y el descuento (sin exponer la tabla).
-- ============================================================
create table if not exists public.promotions (
  id             uuid primary key default gen_random_uuid(),
  code           text unique,                         -- cupón (opcional)
  title          text not null,
  description    text,
  discount_type  text not null default 'percent' check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null default 0,
  min_purchase   numeric(12,2) default 0,
  max_uses       integer,                             -- null = ilimitado
  used_count     integer not null default 0,
  starts_at      timestamptz,
  ends_at        timestamptz,
  is_active      boolean default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create unique index if not exists idx_promotions_code_lower on public.promotions (lower(code)) where code is not null and code <> '';

alter table public.promotions enable row level security;
drop policy if exists "promotions_manage" on public.promotions;
create policy "promotions_manage" on public.promotions for all to authenticated
  using (public.has_perm('products.manage')) with check (public.has_perm('products.manage'));

-- ---------- validación pública de cupón (checkout) ----------
create or replace function public.validate_coupon(p_code text, p_subtotal numeric default 0)
returns table(valid boolean, title text, discount_type text, discount_value numeric, discount_amount numeric, message text)
language plpgsql stable security definer set search_path = public as $$
declare r public.promotions%rowtype; d numeric := 0; now_ts timestamptz := now();
begin
  select * into r from public.promotions where lower(code) = lower(trim(p_code)) limit 1;
  if r.id is null then return query select false, null::text, null::text, null::numeric, 0::numeric, 'Cupón inexistente'; return; end if;
  if r.is_active is not true then return query select false, r.title, r.discount_type, r.discount_value, 0::numeric, 'Cupón inactivo'; return; end if;
  if r.starts_at is not null and now_ts < r.starts_at then return query select false, r.title, r.discount_type, r.discount_value, 0::numeric, 'Cupón aún no vigente'; return; end if;
  if r.ends_at is not null and now_ts > r.ends_at then return query select false, r.title, r.discount_type, r.discount_value, 0::numeric, 'Cupón vencido'; return; end if;
  if r.max_uses is not null and r.used_count >= r.max_uses then return query select false, r.title, r.discount_type, r.discount_value, 0::numeric, 'Cupón agotado'; return; end if;
  if coalesce(p_subtotal,0) < coalesce(r.min_purchase,0) then return query select false, r.title, r.discount_type, r.discount_value, 0::numeric, 'Compra mínima $' || r.min_purchase::text; return; end if;

  if r.discount_type = 'percent' then d := round(coalesce(p_subtotal,0) * r.discount_value / 100, 2);
  else d := least(r.discount_value, coalesce(p_subtotal,0)); end if;

  return query select true, r.title, r.discount_type, r.discount_value, d, 'OK';
end $$;
revoke all on function public.validate_coupon(text, numeric) from public;
grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;
