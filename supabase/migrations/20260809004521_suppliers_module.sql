-- ============================================================
-- ERP — Proveedores y compras a proveedores
-- RLS: gestión con permiso products.manage (admin/colaborador).
-- ============================================================
create table if not exists public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text,
  phone         text,
  email         text,
  address       text,
  cuit          text,
  notes         text,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.supplier_purchases (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid not null references public.suppliers(id) on delete cascade,
  invoice_number text,
  description    text,
  amount         numeric(12,2) not null default 0,
  purchased_at   timestamptz default now(),
  notes          text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz default now()
);
create index if not exists idx_supplier_purchases_supplier on public.supplier_purchases(supplier_id);

alter table public.suppliers          enable row level security;
alter table public.supplier_purchases enable row level security;

drop policy if exists "suppliers_manage" on public.suppliers;
create policy "suppliers_manage" on public.suppliers for all to authenticated
  using (public.has_perm('products.manage')) with check (public.has_perm('products.manage'));

drop policy if exists "supplier_purchases_manage" on public.supplier_purchases;
create policy "supplier_purchases_manage" on public.supplier_purchases for all to authenticated
  using (public.has_perm('products.manage')) with check (public.has_perm('products.manage'));
