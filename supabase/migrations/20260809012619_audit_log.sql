-- ============================================================
-- ERP — Auditoría de cambios sensibles
-- Trigger genérico que registra INSERT/UPDATE/DELETE (con before/after)
-- sobre las tablas clave. Solo lectura para audit.view.
-- ============================================================
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  user_email text,
  action     text not null,           -- INSERT / UPDATE / DELETE
  entity     text not null,           -- tabla
  entity_id  text,                    -- id de la fila (como texto)
  before     jsonb,
  after      jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_audit_created on public.audit_log(created_at desc);
create index if not exists idx_audit_entity  on public.audit_log(entity);

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare em text;
begin
  select lower(email) into em from auth.users where id = auth.uid();
  insert into public.audit_log(user_id, user_email, action, entity, entity_id, before, after)
  values (
    auth.uid(), em, tg_op, tg_table_name,
    coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id'),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return null; -- AFTER trigger
end $$;

-- adjuntar a las tablas sensibles
do $$
declare t text;
begin
  foreach t in array array['products','profiles','promotions','expenses','suppliers','repairs','role_permissions','site_settings'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
      execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_trigger()', t);
    end if;
  end loop;
end $$;

-- RLS: solo lectura para quien tenga audit.view; nadie escribe directo (el trigger es definer)
alter table public.audit_log enable row level security;
drop policy if exists "audit_read" on public.audit_log;
create policy "audit_read" on public.audit_log for select to authenticated
  using (public.has_perm('audit.view'));
