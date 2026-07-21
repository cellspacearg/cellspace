// Reutiliza las mismas credenciales de tu js/config.js público
const SUPABASE_URL = 'https://XXXXX.supabase.co'; // <-- Reemplaza con tu URL real
const SUPABASE_ANON_KEY = 'sb_publishable_PO6r84B1ZNAwFXZAQ_pVfQ_7Ij3qRpS'; // <-- Tu clave pública

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const ADMIN_EMAIL = "nahuel0123encinas@gmail.com";