-- ============================================================
-- ERP — Notificaciones internas (alertas del panel)
-- Se generan por triggers en eventos clave (nuevo pedido, nueva reparación).
-- Lectura/gestión: admin (is_admin()).
-- ============================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'general',   -- order / repair / stock / general
  title      text not null,
  body       text,
  link       text,                               -- ruta hash del panel, ej '#/orders'
  is_read     boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notif_created on public.notifications(created_at desc);
create index if not exists idx_notif_unread  on public.notifications(is_read) where is_read = false;

-- nuevo pedido
create or replace function public.notify_new_order() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(type, title, body, link)
  values ('order', 'Nuevo pedido ' || coalesce(new.order_number,''),
          coalesce(new.buyer_name,'Cliente') || ' · $' || coalesce(new.total,0)::text, '#/orders');
  return new;
end $$;
drop trigger if exists trg_notify_new_order on public.orders;
create trigger trg_notify_new_order after insert on public.orders
  for each row execute function public.notify_new_order();

-- nueva reparación
create or replace function public.notify_new_repair() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(type, title, body, link)
  values ('repair', 'Nueva reparación ' || coalesce(new.order_number,''),
          coalesce(new.brand,'') || ' ' || coalesce(new.model,'') || ' · ' || coalesce(new.customer_name,''), '#/repairs');
  return new;
end $$;
drop trigger if exists trg_notify_new_repair on public.repairs;
create trigger trg_notify_new_repair after insert on public.repairs
  for each row execute function public.notify_new_repair();

-- RLS: admin gestiona
alter table public.notifications enable row level security;
drop policy if exists "notifications_admin" on public.notifications;
create policy "notifications_admin" on public.notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
