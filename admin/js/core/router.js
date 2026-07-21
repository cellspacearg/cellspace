import { store } from './state.js';
import { initAuthListener } from '../hooks/useAuth.js';

class Router {
  constructor(routes) {
    this.routes = routes;
    this.app = document.getElementById('app');
    
    // Inicializar listener de autenticación (sesión persistente)
    initAuthListener();
    
    window.addEventListener('hashchange', () => this.render());
    window.addEventListener('load', () => this.render());
  }

  async render() {
    // Obtener ruta actual (ej: #/login o #/dashboard)
    const hash = window.location.hash || '#/login';
    const path = hash.replace('#', '') || '/login';
    
    // Buscar la vista correspondiente
    const route = this.routes[path] || this.routes['/login'];
    
    // Ejecutar middleware de autenticación (beforeEnter)
    if (route.beforeEnter) {
      const canAccess = await route.beforeEnter();
      if (!canAccess) {
        // Si no tiene acceso, redirigir al login
        if (path !== '/login') {
          window.location.hash = '#/login';
          return;
        }
      }
    }

    // Renderizar la vista
    this.app.innerHTML = await route.component();
    
    // Ejecutar scripts post-render si la vista lo necesita
    if (route.onMount) {
      route.onMount();
    }
  }

  // Navegar a una ruta
  navigate(path) {
    window.location.hash = path;
  }
}

export default Router;