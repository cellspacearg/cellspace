// ========================================
// ADMIN - CONFIG SUPABASE
// ========================================

// ️⬇️⬇️ ESTA LÍNEA ES LA QUE TE FALTA ⬇️️⬇️
// Copiá la URL de TU proyecto (ver abajo cómo)
const SUPABASE_URL = 'https://XXXXX.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PO6r84B1ZNAwFXZAQ_pVfQ_7Ij3qRpS';

// ✅ Tu clave pública (esta SÍ va, es segura)
const SUPABASE_ANON_KEY = 'sb_publishable_PO6r84B1ZNAwFXZAQ_pVfQ_7Ij3qRpS';

// ❌ NUNCA pongas la sb_secret_... acá

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const ADMIN_EMAIL = 'nahuel0123encinas@gmail.com';
