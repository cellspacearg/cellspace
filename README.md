# Cell Space Argentina

Sitio de e-commerce y servicios técnicos (reparación de celulares/PC, microsoldadura,
desbloqueo, venta de herramientas y licencias). Frontend estático servido por **GitHub
Pages** (`cellspacearg.com.ar`) con backend en **Supabase**.

## Arquitectura

- **Sitio público** — páginas HTML estáticas en la raíz + JS en `js/` y estilos en `css/`.
  Sin bundler ni paso de build; las dependencias se cargan por CDN (Supabase, FontAwesome,
  Google Fonts, EmailJS).
- **Panel admin** (`admin/`) — SPA con router por hash y ES modules
  (`admin/js/main.js` → `admin/js/views/*`). Acceso restringido al email admin.
- **Backend** — Supabase: Auth (email/password + OTP nativo + Google), base de datos con
  RLS y Edge Functions (`create-payment`, `imei-check`). El código de las funciones y las
  políticas RLS **no están en este repo**; ver [`backend/SECURITY-BACKEND.md`](backend/SECURITY-BACKEND.md).

## Autenticación y roles

- `js/cs-auth.js` (`CSAuth`) es la fuente de verdad del rol en el cliente. Resuelve en
  capas: email admin → RPC `my_role()` → tabla `profiles` → metadata.
- Roles: `visitor` / `client` / `technician` / `admin`.
- `js/auth-middleware.js` ajusta la UI (precios, menús, header) según el rol.

## Estructura

```
├── index.html, tienda.html, producto.html, servicios.html, ...   # páginas públicas
├── css/                  # estilos
├── js/                   # lógica del sitio público
│   ├── config.js         # init de Supabase (anon key pública)
│   ├── cs-auth.js        # detección de rol
│   ├── auth-middleware.js
│   ├── register-native.js# registro con OTP nativo de Supabase
│   ├── checkout.js       # checkout → Edge Function create-payment
│   └── ...
├── admin/                # panel de administración (SPA)
└── backend/              # documentación de configuración de Supabase (SQL/RLS)
```

## Configuración de Supabase

Antes de operar en producción, aplicá los cambios de seguridad documentados en
[`backend/SECURITY-BACKEND.md`](backend/SECURITY-BACKEND.md) (RLS de `profiles`, plantilla
de email para el registro, recálculo de precios en `create-payment`, etc.).

## Dependencias externas (versiones fijadas + SRI)

Los scripts/estilos de CDN están **fijados a una versión exacta** y protegidos con
**Subresource Integrity** (`integrity` + `crossorigin`), para que un CDN comprometido no
pueda inyectar código:

| Dependencia | Versión | Dónde |
|---|---|---|
| `@supabase/supabase-js` | 2.112.2 | todas las páginas + admin |
| Font Awesome | 6.4.0 | todas las páginas + admin |
| `@emailjs/browser` | 3.12.1 | checkout.html |

> ⚠️ **Mantenimiento:** al fijar la versión, ya no se actualizan solas. Para subir de
> versión hay que cambiar la URL **y** recalcular el hash:
> ```bash
> curl -s "<URL_EXACTA>" | openssl dgst -sha384 -binary | openssl base64 -A
> ```
> y reemplazar el `integrity="sha384-..."` en las páginas. Si el hash no coincide, el
> navegador **bloquea** el recurso (la página no carga ese script), así que verificá
> después de cada bump.

## Desarrollo local

Al ser estático, alcanza con servir la carpeta:

```bash
python -m http.server 8899
# luego abrir http://127.0.0.1:8899
```

> Las llamadas a Supabase apuntan siempre al proyecto real; no hay entorno local de backend.
