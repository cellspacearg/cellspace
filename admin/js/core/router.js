import { store } from './state.js';

class Router {
  constructor(routes) {
    this.routes = routes;
    this.app = document.getElementById('app');
    window.addEventListener('hashchange', () => this.render());
    window.addEventListener('load', () => this.render());
  }

  async render() {
    // Obtener ruta actual (ej: #/login o #/dashboard)
    const hash = window.location.hash || '#/login';
    const path = hash.replace('#', '') || '/login';
    
    // Buscar la vista correspondiente
    const route = this.routes[path] || this.routes['/login'];
    
    // Simular carga
    store.setState({ isLoading: true });
    
    // Renderizar la vista (que devuelve HTML string o un objeto con lógica)
    if (route.beforeEnter) {
      const canAccess = await route.beforeEnter();
      if (!canAccess) {
        window.location.hash = '#/login';
        return;
      }
    }

    this.app.innerHTML = await route.component();
    store.setState({ isLoading: false });
    
    // Ejecutar scripts post-render si la vista lo necesita
    if (route.onMount) route.onMount();
  }

  // Simula useNavigate()
  navigate(path) {
    window.location.hash = path;
  }
}

export default Router;