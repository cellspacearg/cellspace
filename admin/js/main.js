import Router from './core/router.js?v=cb6';
import { checkSession } from './hooks/useAuth.js?v=cb6';
import { loginView, loginViewOnMount } from './views/login.js?v=cb6';
import { dashboardView, dashboardViewOnMount } from './views/dashboard.js?v=cb6';
import { productsView, productsViewOnMount } from './views/products.js?v=cb6';
import { categoriesView, categoriesViewOnMount } from './views/categories.js?v=cb6';
import { servicesView, servicesViewOnMount } from './views/services.js?v=cb6';
import { pagesView, pagesViewOnMount } from './views/pages.js?v=cb6';
import { builderView, builderViewOnMount } from './views/builder.js?v=cb6';
import { mediaView, mediaViewOnMount } from './views/media.js?v=cb6';
import { settingsView, settingsViewOnMount } from './views/settings.js?v=cb6';
import { customersView, customersViewOnMount } from './views/customers.js?v=cb6';
import { ordersView, ordersViewOnMount } from './views/orders.js?v=cb6';
import { centralView, centralViewOnMount } from './views/central.js?v=cb6';
import { repairsView, repairsViewOnMount } from './views/repairs.js?v=cb6';
import { inventoryView, inventoryViewOnMount } from './views/inventory.js?v=cb6';
import { reportsView, reportsViewOnMount } from './views/reports.js?v=cb6';
import { notFoundView, notFoundViewOnMount } from './views/not-found.js?v=cb6';

function showError(msg){
  const app = document.getElementById('app');
  if (app) app.innerHTML =
    `<div style="max-width:600px;margin:60px auto;padding:30px;background:#151515;border:1px solid #ff4444;border-radius:16px;color:#fff;font-family:Montserrat,sans-serif;">
      <h2 style="color:#ff4444;">⚠️ Error al cargar el panel</h2>
      <p style="color:#ccc;">Copiá este mensaje y mandáselo a tu asistente:</p>
      <pre style="background:#0a0a0a;padding:15px;border-radius:8px;color:#ff9999;white-space:pre-wrap;word-break:break-word;font-size:13px;">${msg}</pre>
    </div>`;
}
window.addEventListener('error', e => showError(e.message + '\n' + (e.filename || '')));
window.addEventListener('unhandledrejection', e => showError(String(e.reason)));

try {
  const auth = async () => await checkSession();

  const routes = {
    '/login': {
      component: loginView, onMount: loginViewOnMount,
      beforeEnter: async () => {
        const a = await auth();
        if (a) { window.location.hash = '#/dashboard'; return false; }
        return true;
      }
    },
    '/dashboard':  { component: dashboardView,  onMount: dashboardViewOnMount,  beforeEnter: auth },
    '/products':   { component: productsView,   onMount: productsViewOnMount,   beforeEnter: auth },
    '/categories': { component: categoriesView, onMount: categoriesViewOnMount, beforeEnter: auth },
    '/services':   { component: servicesView,   onMount: servicesViewOnMount,   beforeEnter: auth },
    '/pages':      { component: pagesView,      onMount: pagesViewOnMount,      beforeEnter: auth },
    '/builder':    { component: builderView,    onMount: builderViewOnMount,    beforeEnter: auth },
    '/media':      { component: mediaView,      onMount: mediaViewOnMount,      beforeEnter: auth },
    '/settings':   { component: settingsView,   onMount: settingsViewOnMount,   beforeEnter: auth },
    '/customers':  { component: customersView,  onMount: customersViewOnMount,  beforeEnter: auth },
    '/orders':     { component: ordersView,     onMount: ordersViewOnMount,     beforeEnter: auth },
    '/central':    { component: centralView,    onMount: centralViewOnMount,    beforeEnter: auth },
    '/repairs':    { component: repairsView,    onMount: repairsViewOnMount,    beforeEnter: auth },
    '/inventory':  { component: inventoryView,  onMount: inventoryViewOnMount,  beforeEnter: auth },
    '/reports':    { component: reportsView,    onMount: reportsViewOnMount,    beforeEnter: auth },
    '/404':        { component: notFoundView,   onMount: notFoundViewOnMount,   beforeEnter: auth },
  };

  new Router(routes);
} catch (err) {
  showError(err.message + '\n' + err.stack);
}
