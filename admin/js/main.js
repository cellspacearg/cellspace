import Router from './core/router.js';
import { checkSession } from './hooks/useAuth.js';
import { loginView, loginViewOnMount } from './views/login.js';
import { dashboardView, dashboardViewOnMount } from './views/dashboard.js';
import { productsView, productsViewOnMount } from './views/products.js';
import { servicesView, servicesViewOnMount } from './views/services.js';
import { pagesView, pagesViewOnMount } from './views/pages.js';
import { builderView, builderViewOnMount } from './views/builder.js';

function showError(msg){ const app=document.getElementById('app'); if(app){ app.innerHTML=`<div style="max-width:600px;margin:60px auto;padding:30px;background:#151515;border:1px solid #ff4444;border-radius:16px;color:#fff;font-family:Montserrat,sans-serif;"><h2 style="color:#ff4444;">⚠️ Error al cargar el panel</h2><p style="color:#ccc;">Copiá este mensaje y mandáselo a tu asistente:</p><pre style="background:#0a0a0a;padding:15px;border-radius:8px;color:#ff9999;white-space:pre-wrap;word-break:break-word;font-size:13px;">${msg}</pre></div>`; } }
window.addEventListener('error', e=>showError(e.message+'\n'+(e.filename||'')));
window.addEventListener('unhandledrejection', e=>showError(String(e.reason)));

try {
  const auth = async () => await checkSession();
  const routes = {
    '/login':     { component: loginView,     onMount: loginViewOnMount,     beforeEnter: async () => { const a=await auth(); if(a){ window.location.hash='#/dashboard'; return false; } return true; } },
    '/dashboard': { component: dashboardView, onMount: dashboardViewOnMount, beforeEnter: auth },
    '/products':  { component: productsView,  onMount: productsViewOnMount,  beforeEnter: auth },
    '/services':  { component: servicesView,  onMount: servicesViewOnMount,  beforeEnter: auth },
    '/pages':     { component: pagesView,     onMount: pagesViewOnMount,     beforeEnter: auth },
    '/builder':   { component: builderView,   onMount: builderViewOnMount,   beforeEnter: auth }
  };
  new Router(routes);
} catch (err) { showError(err.message+'\n'+err.stack); }
