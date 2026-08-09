-- ============================================================
-- ERP Fase D — Inventario (ledger de movimientos de stock)
-- ------------------------------------------------------------
-- Cada movimiento ajusta products.stock automáticamente (trigger) y guarda
-- qty_before/qty_after + motivo + usuario. Tipos:
--   entrada    (+cantidad)   ajuste (setea el stock EXACTO a 'quantity')
--   salida     (-cantidad)   devolucion (+cantidad)   venta (-cantidad)
-- Las VENTAS por pedido ya las maneja apply_order_stock(); acá se registran
-- los movimientos MANUALES del admin (y opcionalmente ventas/devoluciones).
-- ============================================================

create table if not exists public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  type        text not null check (type in ('entrada','salida','ajuste','devolucion','venta')),
  quantity    integer not null check (quantity >= 0),
  qty_before  integer,
  qty_after   integer,
  reason      text,
  user_id     uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);
create index if not exists idx_stock_mov_product on public.stock_movements(product_id);
create index if not exists idx_stock_mov_created on public.stock_movements(created_at desc);

-- ---------- aplica el movimiento al stock del producto ----------
create or replace function public.apply_stock_movement() returns trigger
language plpgsql security definer set search_path = public as $$
declare cur integer;
begin
  select coalesce(stock, 0) into cur from public.products where id = new.product_id for update;
  if cur is null then raise exception 'Producto inexistente'; end if;

  new.qty_before := cur;
  if new.type in ('entrada','devolucion') then
    new.qty_after := cur + new.quantity;
  elsif new.type in ('salida','venta') then
    new.qty_after := greatest(cur - new.quantity, 0);
  elsif new.type = 'ajuste' then
    new.qty_after := new.quantity;   -- ajuste = stock absoluto
  else
    new.qty_after := cur;
  end if;

  update public.products set stock = new.qty_after, updated_at = now() where id = new.product_id;
  if new.user_id is null then new.user_id := auth.uid(); end if;
  return new;
end $$;

drop trigger if exists trg_apply_stock_movement on public.stock_movements;
create trigger trg_apply_stock_movement before insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- ---------- RLS ----------
alter table public.stock_movements enable row level security;

drop policy if exists "stock_mov_manage" on public.stock_movements;
create policy "stock_mov_manage" on public.stock_movements for all to authenticated
  using (public.has_perm('products.manage'))
  with check (public.has_perm('products.manage'));
