import Router from './core/router.js?v=cb16';
import { checkSession } from './hooks/useAuth.js?v=cb16';
import { loginView, loginViewOnMount } from './views/login.js?v=cb16';
import { dashboardView, dashboardViewOnMount } from './views/dashboard.js?v=cb16';
import { productsView, productsViewOnMount } from './views/products.js?v=cb16';
import { categoriesView, categoriesViewOnMount } from './views/categories.js?v=cb16';
import { servicesView, servicesViewOnMount } from './views/services.js?v=cb16';
import { pagesView, pagesViewOnMount } from './views/pages.js?v=cb16';
import { builderView, builderViewOnMount } from './views/builder.js?v=cb16';
import { mediaView, mediaViewOnMount } from './views/media.js?v=cb16';
import { settingsView, settingsViewOnMount } from './views/settings.js?v=cb16';
import { customersView, customersViewOnMount } from './views/customers.js?v=cb16';
import { ordersView, ordersViewOnMount } from './views/orders.js?v=cb16';
import { centralView, centralViewOnMount } from './views/central.js?v=cb16';
import { repairsView, repairsViewOnMount } from './views/repairs.js?v=cb16';
import { inventoryView, inventoryViewOnMount } from './views/inventory.js?v=cb16';
import { reportsView, reportsViewOnMount } from './views/reports.js?v=cb16';
import { suppliersView, suppliersViewOnMount } from './views/suppliers.js?v=cb16';
import { expensesView, expensesViewOnMount } from './views/expenses.js?v=cb16';
import { promotionsView, promotionsViewOnMount } from './views/promotions.js?v=cb16';
import { techniciansView, techniciansViewOnMount } from './views/technicians.js?v=cb16';
import { auditView, auditViewOnMount } from './views/audit.js?v=cb16';
import { notificationsView, notificationsViewOnMount } from './views/notifications.js?v=cb16';
import { socialView, socialViewOnMount } from './views/social.js?v=cb16';
import { notFoundView, notFoundViewOnMount } from './views/not-found.js?v=cb16';

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
    '/suppliers':  { component: suppliersView,  onMount: suppliersViewOnMount,  beforeEnter: auth },
    '/expenses':   { component: expensesView,   onMount: expensesViewOnMount,   beforeEnter: auth },
    '/promotions': { component: promotionsView, onMount: promotionsViewOnMount, beforeEnter: auth },
    '/technicians':{ component: techniciansView,onMount: techniciansViewOnMount, beforeEnter: auth },
    '/audit':      { component: auditView,      onMount: auditViewOnMount,      beforeEnter: auth },
    '/notifications':{ component: notificationsView, onMount: notificationsViewOnMount, beforeEnter: auth },
    '/social':     { component: socialView,     onMount: socialViewOnMount,     beforeEnter: auth },
    '/404':        { component: notFoundView,   onMount: notFoundViewOnMount,   beforeEnter: auth },
  };

  new Router(routes);
} catch (err) {
  showError(err.message + '\n' + err.stack);
}
