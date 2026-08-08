-- ============================================================
-- ERP Fase C — Módulo de Reparaciones
-- ------------------------------------------------------------
-- Tablas: repairs + repair_status_history.
-- Código de seguimiento y N° de orden autogenerados (trigger).
-- Historial de estados automático (trigger).
-- RLS: gestión (repairs.manage) todo · técnico ve/edita asignadas ·
--      cliente ve las suyas. El seguimiento PÚBLICO va por RPC track_repair()
--      que devuelve SOLO campos no privados (no expone la fila completa).
-- ============================================================

create table if not exists public.repairs (
  id             uuid primary key default gen_random_uuid(),
  order_number   text unique,
  tracking_code  text unique,
  -- cliente (registrado o walk-in)
  customer_id    uuid references public.profiles(id) on delete set null,
  customer_name  text,
  customer_phone text,
  customer_email text,
  customer_dni   text,
  -- equipo
  device_type    text,
  brand          text,
  model          text,
  imei           text,
  serial         text,
  -- diagnóstico / trabajo
  problem        text,
  diagnosis      text,
  technician_id  uuid references public.profiles(id) on delete set null,
  priority       text default 'normal' check (priority in ('baja','normal','alta','urgente')),
  status         text not null default 'recibido' check (status in (
                   'recibido','diagnostico','presupuesto','esperando_aprobacion','en_reparacion',
                   'esperando_repuesto','pausado','reparado','listo','entregado','cancelado')),
  -- dinero
  budget         numeric(12,2) default 0,   -- presupuesto
  deposit        numeric(12,2) default 0,   -- anticipo
  cost           numeric(12,2) default 0,   -- costo final
  -- fechas
  received_at    timestamptz default now(),
  estimated_at   timestamptz,
  delivered_at   timestamptz,
  -- extras
  warranty       text,
  accessories    text,
  notes          text,
  media          jsonb default '[]'::jsonb,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_repairs_status      on public.repairs(status);
create index if not exists idx_repairs_customer     on public.repairs(customer_id);
create index if not exists idx_repairs_technician    on public.repairs(technician_id);
create index if not exists idx_repairs_tracking      on public.repairs(tracking_code);

create table if not exists public.repair_status_history (
  id          uuid primary key default gen_random_uuid(),
  repair_id   uuid not null references public.repairs(id) on delete cascade,
  from_status text,
  to_status   text not null,
  note        text,
  changed_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);
create index if not exists idx_rsh_repair on public.repair_status_history(repair_id);

-- ---------- código de seguimiento + N° de orden ----------
create sequence if not exists public.repairs_order_seq;

create or replace function public.gen_tracking_code() returns text
language plpgsql as $$
declare code text; taken boolean;
begin
  loop
    code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    select exists(select 1 from public.repairs where tracking_code = code) into taken;
    exit when not taken;
  end loop;
  return code;
end $$;

create or replace function public.repairs_before_insert() returns trigger
language plpgsql as $$
begin
  if new.tracking_code is null then new.tracking_code := public.gen_tracking_code(); end if;
  if new.order_number  is null then new.order_number  := 'REP-' || lpad(nextval('public.repairs_order_seq')::text, 5, '0'); end if;
  return new;
end $$;

drop trigger if exists trg_repairs_before_insert on public.repairs;
create trigger trg_repairs_before_insert before insert on public.repairs
  for each row execute function public.repairs_before_insert();

-- ---------- historial de estados automático ----------
create or replace function public.repairs_log_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.repair_status_history(repair_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.repair_status_history(repair_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return null;
end $$;

drop trigger if exists trg_repairs_log_status on public.repairs;
create trigger trg_repairs_log_status after insert or update on public.repairs
  for each row execute function public.repairs_log_status();

-- ---------- RLS ----------
alter table public.repairs enable row level security;
alter table public.repair_status_history enable row level security;

drop policy if exists "repairs_manage"          on public.repairs;
drop policy if exists "repairs_tech_select"      on public.repairs;
drop policy if exists "repairs_tech_update"      on public.repairs;
drop policy if exists "repairs_customer_select"  on public.repairs;

create policy "repairs_manage" on public.repairs for all to authenticated
  using (public.has_perm('repairs.manage')) with check (public.has_perm('repairs.manage'));

create policy "repairs_tech_select" on public.repairs for select to authenticated
  using (public.has_perm('repairs.assigned') and technician_id = auth.uid());

create policy "repairs_tech_update" on public.repairs for update to authenticated
  using (public.has_perm('repairs.assigned') and technician_id = auth.uid())
  with check (public.has_perm('repairs.assigned') and technician_id = auth.uid());

create policy "repairs_customer_select" on public.repairs for select to authenticated
  using (customer_id = auth.uid());

drop policy if exists "rsh_select" on public.repair_status_history;
create policy "rsh_select" on public.repair_status_history for select to authenticated
  using (exists (select 1 from public.repairs r where r.id = repair_id and (
      public.has_perm('repairs.manage')
      or (public.has_perm('repairs.assigned') and r.technician_id = auth.uid())
      or r.customer_id = auth.uid())));

-- ---------- seguimiento público (RPC, solo campos no privados) ----------
create or replace function public.track_repair(p_code text)
returns table(order_id text, status text, device_brand text, device_model text,
              issue_description text, estimated_cost numeric, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select order_number, status, brand, model, problem, budget, received_at
  from public.repairs
  where upper(tracking_code) = upper(trim(p_code))
     or upper(order_number)  = upper(trim(p_code))
  limit 1;
$$;
revoke all on function public.track_repair(text) from public;
grant execute on function public.track_repair(text) to anon, authenticated;
