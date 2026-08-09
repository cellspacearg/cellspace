-- ============================================================
-- ERP — Crédito de técnicos (ledger, SIN límite por decisión del dueño)
-- Cada movimiento guarda el saldo resultante (balance_after) por técnico.
-- Tipos: asignacion (+), devolucion (+), uso (-), ajuste (setea saldo absoluto).
-- ============================================================
create table if not exists public.technician_credit_movements (
  id             uuid primary key default gen_random_uuid(),
  technician_id  uuid not null references public.profiles(id) on delete cascade,
  type           text not null check (type in ('asignacion','uso','devolucion','ajuste')),
  amount         numeric(12,2) not null default 0 check (amount >= 0),
  balance_after  numeric(12,2),
  reason         text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz default now()
);
create index if not exists idx_tcm_tech on public.technician_credit_movements(technician_id, created_at desc);

-- calcula el saldo resultante a partir del último movimiento del técnico
create or replace function public.apply_credit_movement() returns trigger
language plpgsql security definer set search_path = public as $$
declare prev numeric := 0;
begin
  select coalesce(balance_after, 0) into prev
  from public.technician_credit_movements
  where technician_id = new.technician_id
  order by created_at desc, id desc limit 1;

  if new.type in ('asignacion','devolucion') then new.balance_after := prev + new.amount;
  elsif new.type = 'uso'                       then new.balance_after := prev - new.amount;  -- puede quedar negativo: sin límite
  elsif new.type = 'ajuste'                    then new.balance_after := new.amount;         -- saldo absoluto
  else new.balance_after := prev;
  end if;

  if new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end $$;

drop trigger if exists trg_apply_credit_movement on public.technician_credit_movements;
create trigger trg_apply_credit_movement before insert on public.technician_credit_movements
  for each row execute function public.apply_credit_movement();

-- saldo actual de un técnico
create or replace function public.technician_credit_balance(p_tech uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select balance_after from public.technician_credit_movements
                   where technician_id = p_tech order by created_at desc, id desc limit 1), 0);
$$;
grant execute on function public.technician_credit_balance(uuid) to authenticated;

-- ---------- RLS ----------
alter table public.technician_credit_movements enable row level security;

drop policy if exists "tcm_manage" on public.technician_credit_movements;
create policy "tcm_manage" on public.technician_credit_movements for all to authenticated
  using (public.has_perm('credit.manage')) with check (public.has_perm('credit.manage'));

-- el técnico ve sus propios movimientos
drop policy if exists "tcm_own_select" on public.technician_credit_movements;
create policy "tcm_own_select" on public.technician_credit_movements for select to authenticated
  using (technician_id = auth.uid());
