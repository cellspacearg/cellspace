import Router from './core/router.js';
import { checkSession } from './hooks/useAuth.js';
import { loginView, loginViewOnMount } from './views/login.js';
import { dashboardView } from './views/dashboard.js';

//  Si ALGO falla, lo pintamos en pantalla (en vez de quedar negro)
function showError(msg) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="max-width:600px;margin:60px auto;padding:30px;background:#151515;
                  border:1px solid #ff4444;border-radius:16px;color:#fff;font-family:Montserrat,sans-serif;">
        <h2 style="color:#ff4444;">⚠️ Error al cargar el panel</h2>
        <p style="color:#ccc;">Copiá este mensaje y mandáselo a tu asistente:</p>
        <pre style="background:#0a0a0a;padding:15px;border-radius:8px;color:#ff9999;
                    white-space:pre-wrap;word-break:break-word;font-size:13px;">${msg}</pre>
      </div>`;
  }
}

// Captura errores de módulos / imports
window.addEventListener('error', (e) => showError(e.message + '\n' + (e.filename || '')));
window.addEventListener('unhandledrejection', (e) => showError(String(e.reason)));

try {
  const routes = {
    '/login': {
      component: loginView,
      onMount: loginViewOnMount,
      beforeEnter: async () => {
        const isAuth = await checkSession();
        if (isAuth) { window.location.hash = '#/dashboard'; return false; }
        return true;
      }
    },
    '/dashboard': {
      component: dashboardView,
      beforeEnter: async () => await checkSession()
    }
  };

  new Router(routes);
} catch (err) {
  showError(err.message + '\n' + err.stack);
}
