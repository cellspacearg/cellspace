-- ============================================================
-- Seguridad: neutralizar y eliminar la tabla otp_codes
-- ------------------------------------------------------------
-- La política "otp_public_access" (ALL / public / using true) dejaba
-- la tabla totalmente abierta: cualquiera con la anon key podía leer,
-- insertar, modificar o borrar los códigos OTP de cualquier email.
--
-- El registro ya no usa esta tabla (migró al OTP nativo de Supabase Auth,
-- ver js/register-native.js). Quitamos primero la política (deja RLS ON
-- sin políticas = acceso denegado) y luego eliminamos la tabla.
-- Borrado confirmado por el dueño del proyecto.
-- ============================================================

drop policy if exists "otp_public_access" on public.otp_codes;

drop table if exists public.otp_codes;
