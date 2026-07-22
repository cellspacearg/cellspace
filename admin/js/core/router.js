import { initAuthListener } from '../hooks/useAuth.js';

class Router {
  constructor(routes) {
    this.routes = routes;
    this.app = document.getElementById('app');
    initAuthListener();
    window.addEventListener('hashchange', () => this.render());
    window.addEventListener('load', () => this.render());
  }

  async render() {
    const hash = window.location.hash || '#/login';
    const raw = hash.replace('#', '') || '/login';
    const path = raw.split('?')[0];                 // ✅ /builder  (separa el ?id=...)
    const route = this.routes[path] || this.routes['/login'];

    if (route.beforeEnter) {
      const canAccess = await route.beforeEnter();
      if (!canAccess) {
        if (path !== '/login') { window.location.hash = '#/login'; return; }
      }
    }

    this.app.innerHTML = await route.component();
    if (route.onMount) route.onMount();
  }

  navigate(path) { window.location.hash = path; }
}

export default Router;
