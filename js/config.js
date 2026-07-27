// ========================================
// SUPABASE CONFIGURATION (público) — blindado
// ========================================
(function () {
  // ✅ URL real de tu proyecto (antes estaba el placeholder XXXXX)
  var SUPABASE_URL = 'https://cfoajkbzsqyimbfjhfsa.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_PO6r84B1ZNAwFXZAQ_pVfQ_7Ij3qRpS';
  var ADMIN_EMAIL = 'nahuel0123encinas@gmail.com';

  // El SDK UMD ya creó window.supabase (el módulo con createClient).
  // ⚠️ NO declaramos `const/let supabase` (colisiona con el global del SDK).
  // Reasignamos el global al cliente. Idempotente si este script se carga 2 veces.
  var client = (window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : window.supabase; // si ya era el cliente (script duplicado), lo dejamos igual

  // Exponer globales (compatibilidad con el resto del sitio)
  window.supabase = client;
  window.db = client;
  window.auth = client ? client.auth : null;
  window.ADMIN_EMAIL = ADMIN_EMAIL;

  console.log('✅ Supabase inicializado correctamente');
})();

// ========================================
// BUSCADOR DEL HEADER (usado en todas las páginas)
// ========================================
window.performSearch = function () {
  var input = document.getElementById('headerSearchInput');
  var q = input ? input.value.trim() : '';
  if (!q) return;
  window.location.href = 'tienda.html?q=' + encodeURIComponent(q);
};
document.addEventListener('DOMContentLoaded', function () {
  var input = document.getElementById('headerSearchInput');
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); performSearch(); }
    });
  }
});
