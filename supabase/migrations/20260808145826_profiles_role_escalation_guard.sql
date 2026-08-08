-- ============================================================
-- Seguridad: impedir la auto-escalada de rol en profiles
-- ------------------------------------------------------------
-- Las políticas de UPDATE de profiles (au_self_update, profiles_update_self)
-- permiten al usuario editar su propia fila SIN restringir la columna `role`,
-- así que un cliente podía ejecutar `update profiles set role='technician'`
-- y auto-ascenderse (ganando Central Space, herramientas, marketplace, etc.).
--
-- Fix: un trigger BEFORE UPDATE que, si quien edita NO es admin, revierte
-- cualquier cambio de `role` y `status` a su valor anterior. Los cambios de
-- rol que hace el admin desde el panel siguen funcionando (corren con is_admin()).
-- No afecta la edición normal de perfil (nombre, teléfono, etc.).
-- ============================================================

create or replace function public.enforce_profile_role_guard()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    new.role   := old.role;    -- el usuario no puede cambiar su propio rol
    new.status := old.status;  -- ni su estado (activo/suspendido)
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_profile_role_guard on public.profiles;

create trigger trg_enforce_profile_role_guard
  before update on public.profiles
  for each row
  execute function public.enforce_profile_role_guard();
