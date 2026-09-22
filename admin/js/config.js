// ========================================
// ADMIN - CONFIG SUPABASE
// ========================================

// ✅ URL BASE (SIN el /rest/v1/ del final)
const SUPABASE_URL = 'https://cfoajkbzsqyimbfjhfsa.supabase.co';

// ✅ Clave pública (segura en frontend)
const SUPABASE_ANON_KEY = 'sb_publishable_PO6r84B1ZNAwFXZAQ_pVfQ_7Ij3qRpS';

// ❌ NUNCA la sb_secret_... acá (esta página es pública)

// Cartel legible cuando algo de la configuración está roto. Se pinta con estilos
// inline (no depende de admin.css) porque puede fallar ANTES de que el CSS cargue.
function mostrarErrorConfig(titulo, mensaje, pasos = []) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:#0a0a0a;color:#fff;font-family:'Montserrat',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;">
      <div style="max-width:560px;width:100%;background:#151515;border:1px solid rgba(255,68,68,.35);
        border-radius:16px;padding:32px;box-shadow:0 8px 32px rgba(0,0,0,.5);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <span style="font-size:28px;">⚠️</span>
          <h1 style="font-size:20px;margin:0;color:#ff4444;">${titulo}</h1>
        </div>
        <p style="color:#ccc;line-height:1.6;margin:0 0 16px;">${mensaje}</p>
        ${pasos.length ? `<ol style="color:#888;line-height:1.8;margin:0;padding-left:20px;">
          ${pasos.map(p => `<li>${p}</li>`).join('')}
        </ol>` : ''}
      </div>
    </div>`;
}

// Blindaje: el SDK de Supabase (supabase-js) tiene que estar cargado antes que este módulo.
if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  mostrarErrorConfig(
    'No se pudo cargar Supabase',
    'El SDK de Supabase (supabase-js) no está disponible en esta página. Esto pasa cuando el script del CDN no cargó, o cargó después de este archivo.',
    [
      'Revisá que el &lt;script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2..."&gt; esté ANTES de los scripts del panel en admin/index.html.',
      'Revisá tu conexión a internet: el SDK se carga desde un CDN externo.',
      'Abrí la consola del navegador (F12 → Console/Network) y buscá errores de carga de ese script.',
    ]
  );
  throw new Error('Supabase SDK no disponible: window.supabase.createClient no existe.');
}

// Blindaje: la anon key tiene que tener un formato válido de Supabase.
// Acepta el JWT clásico ("eyJ...") y el formato nuevo "publishable" ("sb_publishable_...").
const ANON_KEY_VALIDA = SUPABASE_ANON_KEY.startsWith('eyJ') || SUPABASE_ANON_KEY.startsWith('sb_publishable_');
if (!ANON_KEY_VALIDA) {
  mostrarErrorConfig(
    'Clave de Supabase inválida',
    'La SUPABASE_ANON_KEY configurada en admin/js/config.js no tiene un formato válido.',
    [
      'Entrá a supabase.com → tu proyecto → Project Settings → API Keys.',
      'Copiá la "anon public key" (empieza con "eyJ...") o la "publishable key" (empieza con "sb_publishable_...").',
      'Pegala en la constante SUPABASE_ANON_KEY de admin/js/config.js.',
      'Nunca uses acá la "service_role" / "secret" key: esta página es pública.',
    ]
  );
  throw new Error('SUPABASE_ANON_KEY con formato inválido.');
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const ADMIN_EMAIL = 'nahuel0123encinas@gmail.com';
