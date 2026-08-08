# Cambios de seguridad en el backend (Supabase)

Estos cambios **no viven en este repo** (frontend estático en GitHub Pages). Se aplican en
tu proyecto de Supabase. Están ordenados por severidad. Cada bloque incluye el SQL o la
configuración exacta y cómo verificar que quedó bien.

> Proyecto: `cfoajkbzsqyimbfjhfsa` · Ejecutá el SQL en **Supabase → SQL Editor**.

---

## 0. Requisito para el nuevo registro con OTP nativo (Fase 1.A — ya aplicada en el front)

El registro dejó de usar la tabla `otp_codes` + EmailJS. Ahora el código de 6 dígitos lo
genera y valida **Supabase Auth**. Para que llegue el código por email:

**Supabase → Authentication → Providers → Email**
- **Confirm email**: ACTIVADO.

**Supabase → Authentication → Email Templates → "Confirm signup"**
- El cuerpo debe incluir el **código**, no solo el enlace. Agregá:
  ```
  Tu código de verificación es: {{ .Token }}
  ```
  (Podés dejar también `{{ .ConfirmationURL }}` como alternativa por enlace.)

**Verificación:** registrá una cuenta de prueba en `register-client.html`. Debe llegar un
email con un código de 6 dígitos y, al ingresarlo, crearse la cuenta + el perfil.

---

## 1. Eliminar la tabla `otp_codes` (era el hueco crítico)

El navegador leía los códigos con la anon key y los comparaba en el cliente → cualquiera
podía leer el OTP de otro email. Ya no se usa. Confirmá que nada más la referencia y borrala:

```sql
-- 1) Ver si algo la usa todavía (triggers, funciones, políticas)
select *
from information_schema.table_privileges
where table_name = 'otp_codes';

-- 2) Si está limpio, eliminarla
drop table if exists public.otp_codes cascade;
```

**Verificación:** `select * from public.otp_codes;` debe devolver "relation does not exist".

---

## 2. Cerrar escalada de privilegios en `profiles` (Fase 1.B)

Riesgo: si un usuario puede hacer `UPDATE` de su propia fila cambiando `role`, se
auto-asciende a `technician`/`admin`. El fix es **quitar el privilegio de escribir la
columna `role`** al rol `authenticated` (RLS por sí sola no filtra por columna).

```sql
-- Nadie autenticado puede tocar la columna role directamente:
revoke update on public.profiles from authenticated;

-- Solo puede actualizar sus datos NO sensibles (ajustá la lista a tus columnas reales):
grant update (full_name, phone, email, avatar_url) on public.profiles to authenticated;

-- Y que la política RLS lo limite a su propia fila:
-- (si ya tenés una política de update, revisá que tenga este USING/WITH CHECK)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
```

Forzá el rol por defecto en el alta (que el cliente no lo decida):

```sql
create or replace function public.force_default_role()
returns trigger language plpgsql as $$
begin
  -- en el INSERT nunca se acepta un role elevado desde el cliente
  new.role := 'client';
  return new;
end $$;

drop trigger if exists trg_force_default_role on public.profiles;
create trigger trg_force_default_role
  before insert on public.profiles
  for each row execute function public.force_default_role();
```

> El ascenso a `technician`/`admin` se hace desde el panel admin (que ya corre con tu
> sesión de admin) o con SQL manual — nunca desde el registro.

**Verificación:** logueado como cliente de prueba, ejecutá desde el front/DevTools
`await supabase.from('profiles').update({ role: 'admin' }).eq('id', TU_ID)`. Debe fallar
o dejar `role` en `client`.

---

## 3. `my_role()` como fuente de verdad del rol (server-side)

`cs-auth.js` confía primero en `my_role()`. Que lea de `profiles` con `SECURITY DEFINER`:

```sql
create or replace function public.my_role()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'client');
$$;

revoke all on function public.my_role() from public;
grant execute on function public.my_role() to authenticated;
```

**Verificación:** `select public.my_role();` logueado devuelve el rol correcto.

---

## 4. Precios solo para usuarios logueados (Fase 1.C — opcional, si es requisito real)

Hoy `tienda.js` hace `products.select('*')`, así que el precio **viaja al navegador de
todo visitante** aunque se tape con CSS. Si querés ocultarlo de verdad, quitá el privilegio
de leer la columna a `anon` y creá una vista pública sin precio:

```sql
-- El visitante anónimo no puede leer columnas sensibles:
revoke select (price, old_price, cost) on public.products from anon;

-- Vista pública sin precio para el listado de visitantes:
create or replace view public.products_public as
  select id, name, brand, model, image_url, stock, category_id, is_active, is_hidden,
         status, review_status, created_at
  from public.products;

grant select on public.products_public to anon, authenticated;
```

**Cambio en el front (pendiente, avisame para hacerlo):** cuando el rol es `visitor`,
`tienda.js`/`producto.js` deben consultar `products_public` en vez de `products`.

**Verificación:** como visitante, en la pestaña Network no debe aparecer `price` en la
respuesta de productos.

---

## 5. `create-payment` debe recalcular precio y stock (Fase 1.D — crítico)

`checkout.js` manda `price` desde el navegador. La Edge Function **no debe confiar en ese
valor**. Revisá que `create-payment` haga, para cada ítem:

1. Leer `price` y `stock` reales desde la tabla `products` por `id` (con service_role).
2. Rechazar si `stock < quantity` (devolver `{ code: 'NO_STOCK' }`, ya contemplado en el front).
3. Calcular el total con el precio de la DB, **ignorando** el `price` del payload.
4. Exigir sesión (`{ code: 'AUTH_REQUIRED' }` si no hay JWT, ya contemplado en el front).

**Verificación:** desde DevTools, mandá un pedido con `price` manipulado (ej. 1). El pedido
creado y el `init_point` de Mercado Pago deben usar el precio real de la DB.

---

## 6. Repaso de RLS de `orders` y `technician_applications`

```sql
-- orders: cada usuario solo ve/crea lo suyo
alter table public.orders enable row level security;
-- (verificá que exista una policy select/insert con user_id = auth.uid())

-- technician_applications: el usuario inserta la suya; solo admin lee todas
alter table public.technician_applications enable row level security;
```

**Verificación:** con dos usuarios distintos, ninguno debe poder leer los pedidos del otro.

---

## Checklist rápido

- [ ] Confirm email ON + plantilla "Confirm signup" con `{{ .Token }}`
- [ ] `drop table otp_codes`
- [ ] Quitar `update(role)` a authenticated + trigger de rol por defecto
- [ ] `my_role()` SECURITY DEFINER
- [ ] (Opcional) Vista `products_public` sin precio para anon + cambio en el front
- [ ] `create-payment` recalcula precio/stock desde la DB
- [ ] RLS de `orders` y `technician_applications` revisadas
