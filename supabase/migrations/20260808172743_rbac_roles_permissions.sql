-- ============================================================
-- RBAC granular (Fase B)
-- ------------------------------------------------------------
-- Aditivo y sin romper lo existente:
--  · El owner sigue siendo admin por email (is_admin_email) → nunca hay lockout.
--  · Se agregan permisos granulares (tablas permissions + role_permissions).
--  · has_perm(key) sirve para el panel y para RLS de los módulos ERP nuevos.
--  · is_admin() se extiende para incluir los roles 'super_admin' y 'administrador'
--    (hoy nadie los tiene, así que NO cambia el comportamiento actual).
--  · NO se toca my_role() ni is_technician() en esta migración (menor riesgo).
--
-- Roles válidos (fine-grained): super_admin, administrador, colaborador,
--   vip_tech, tecnico_verificado, tecnico, cliente
--   (compatibles con los valores actuales 'client'/'technician'/'admin').
-- ============================================================

-- ---------- catálogo de permisos ----------
create table if not exists public.permissions (
  key    text primary key,
  label  text not null,
  module text not null
);

insert into public.permissions (key, label, module) values
  ('panel.access',      'Entrar al panel',                     'Sistema'),
  ('users.manage',      'Gestionar usuarios, roles y permisos','Usuarios'),
  ('users.view',        'Ver usuarios',                        'Usuarios'),
  ('cms.edit',          'Editar configuración / CMS',          'CMS'),
  ('cms.content',       'Editar contenido',                    'CMS'),
  ('products.manage',   'Gestionar productos, precios y stock','Tienda'),
  ('orders.manage',     'Gestionar pedidos y ventas',          'Pedidos'),
  ('orders.view',       'Ver pedidos',                         'Pedidos'),
  ('repairs.manage',    'Gestionar todas las reparaciones',    'Reparaciones'),
  ('repairs.assigned',  'Ver/actualizar reparaciones asignadas','Reparaciones'),
  ('credit.manage',     'Gestionar crédito de técnicos',       'Crédito'),
  ('credit.view',       'Ver crédito de técnicos',             'Crédito'),
  ('credit.use',        'Usar crédito disponible',             'Crédito'),
  ('central.read',      'Leer Central Space',                  'Central Space'),
  ('central.read_vip',  'Leer Central Space VIP',              'Central Space'),
  ('reports.view',      'Ver reportes',                        'Reportes'),
  ('audit.view',        'Ver auditoría',                       'Auditoría')
on conflict (key) do nothing;

-- ---------- asignación de permisos por rol ----------
create table if not exists public.role_permissions (
  role           text not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role, permission_key)
);

-- super_admin: todos los permisos
insert into public.role_permissions (role, permission_key)
  select 'super_admin', key from public.permissions
on conflict do nothing;

-- administrador
insert into public.role_permissions (role, permission_key) values
  ('administrador','panel.access'),('administrador','users.view'),
  ('administrador','cms.edit'),('administrador','cms.content'),
  ('administrador','products.manage'),('administrador','orders.manage'),
  ('administrador','orders.view'),('administrador','repairs.manage'),
  ('administrador','credit.manage'),('administrador','credit.view'),
  ('administrador','central.read'),('administrador','central.read_vip'),
  ('administrador','reports.view'),('administrador','audit.view')
on conflict do nothing;

-- colaborador
insert into public.role_permissions (role, permission_key) values
  ('colaborador','panel.access'),('colaborador','cms.content'),
  ('colaborador','products.manage'),('colaborador','orders.view'),
  ('colaborador','repairs.manage'),('colaborador','credit.view'),
  ('colaborador','central.read'),('colaborador','reports.view')
on conflict do nothing;

-- vip_tech
insert into public.role_permissions (role, permission_key) values
  ('vip_tech','repairs.assigned'),('vip_tech','credit.use'),
  ('vip_tech','central.read'),('vip_tech','central.read_vip')
on conflict do nothing;

-- tecnico_verificado
insert into public.role_permissions (role, permission_key) values
  ('tecnico_verificado','repairs.assigned'),('tecnico_verificado','credit.use'),
  ('tecnico_verificado','central.read')
on conflict do nothing;

-- tecnico
insert into public.role_permissions (role, permission_key) values
  ('tecnico','repairs.assigned'),('tecnico','credit.use'),
  ('tecnico','central.read')
on conflict do nothing;

-- (cliente: sin permisos administrativos; su acceso a "lo suyo" lo maneja RLS)

-- ---------- función de chequeo de permisos ----------
create or replace function public.has_perm(p_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  em text;
  r  text;
begin
  if auth.uid() is null then return false; end if;
  select lower(coalesce(email,'')) into em from auth.users where id = auth.uid();
  if public.is_admin_email(em) then return true; end if;      -- owner = super_admin
  select role into r from public.profiles where id = auth.uid();
  if r = 'super_admin' then return true; end if;
  return exists (select 1 from public.role_permissions where role = r and permission_key = p_key);
end;
$$;

revoke all on function public.has_perm(text) from public;
grant execute on function public.has_perm(text) to authenticated, anon;

-- ---------- extender is_admin() para incluir roles admin ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(public.is_admin_email((select lower(u.email::text) from auth.users u where u.id = auth.uid())), false)
      or coalesce((select role in ('super_admin','administrador') from public.profiles where id = auth.uid()), false);
$$;

-- ---------- RLS de las tablas RBAC ----------
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;

-- lectura para cualquier logueado (el panel necesita leer sus permisos)
drop policy if exists "permissions_read" on public.permissions;
create policy "permissions_read" on public.permissions
  for select to authenticated using (true);

drop policy if exists "role_permissions_read" on public.role_permissions;
create policy "role_permissions_read" on public.role_permissions
  for select to authenticated using (true);

-- escritura solo super_admin (gestiona permisos críticos)
drop policy if exists "role_permissions_write" on public.role_permissions;
create policy "role_permissions_write" on public.role_permissions
  for all to authenticated
  using (public.has_perm('users.manage'))
  with check (public.has_perm('users.manage'));

drop policy if exists "permissions_write" on public.permissions;
create policy "permissions_write" on public.permissions
  for all to authenticated
  using (public.has_perm('users.manage'))
  with check (public.has_perm('users.manage'));
