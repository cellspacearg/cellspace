// ========================================
// SUPABASE CONFIGURATION
// ========================================

// ⚠️ Reemplazá XXXXX por tu Project URL real
const SUPABASE_URL = 'https://XXXXX.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PO6r84B1ZNAwFXZAQ_pVfQ_7Ij3qRpS';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Referencias globales (compatibilidad)
const db = supabase;
const auth = supabase.auth;

const ADMIN_EMAIL = "nahuel0123encinas@gmail.com";

// Hacer globales
window.supabase = supabase;
window.db = db;
window.auth = auth;
window.ADMIN_EMAIL = ADMIN_EMAIL;

console.log('✅ Supabase inicializado correctamente');
