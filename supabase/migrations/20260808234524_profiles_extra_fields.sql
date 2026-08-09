-- ============================================================
-- Perfil de usuario: columnas que faltaban en profiles
-- (perfil.js las usa; antes apuntaba a una tabla 'users' inexistente).
-- El guard de rol (enforce_profile_role_guard) sigue protegiendo role/status.
-- ============================================================
alter table public.profiles
  add column if not exists username    text,
  add column if not exists telegram    text,
  add column if not exists whatsapp     text,
  add column if not exists location     text,
  add column if not exists avatar_url    text,
  add column if not exists bio           text,
  add column if not exists experience    text;

-- username único (case-insensitive) cuando está presente
create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(username)) where username is not null and username <> '';
