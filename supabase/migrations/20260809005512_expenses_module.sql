-- ============================================================
-- ERP — Gastos / egresos del negocio
-- RLS: gestión con permiso products.manage (admin/colaborador).
-- ============================================================
create table if not exists public.expenses (
  id             uuid primary key default gen_random_uuid(),
  category       text not null default 'otro'
                   check (category in ('alquiler','servicios','sueldos','insumos','impuestos','marketing','mantenimiento','otro')),
  description    text,
  amount         numeric(12,2) not null default 0,
  payment_method text,
  paid_at        timestamptz default now(),
  supplier_id    uuid references public.suppliers(id) on delete set null,
  notes          text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz default now()
);
create index if not exists idx_expenses_paid on public.expenses(paid_at desc);
create index if not exists idx_expenses_cat  on public.expenses(category);

alter table public.expenses enable row level security;
drop policy if exists "expenses_manage" on public.expenses;
create policy "expenses_manage" on public.expenses for all to authenticated
  using (public.has_perm('products.manage')) with check (public.has_perm('products.manage'));
