import Router from './core/router.js';
import { checkSession } from './hooks/useAuth.js';
import { loginView } from './views/login.js';
import { dashboardView } from './views/dashboard.js';

// Definición de rutas (Simula <Routes> y <Route> de React)
const routes = {
  '/login': {
    component: loginView,
    beforeEnter: async () => {
      // Si ya está logueado, redirigir al dashboard
      const isAuth = await checkSession();
      if (isAuth) return false; 
      return true;
    }
  },
  '/dashboard': {
    component: dashboardView,
    beforeEnter: async () => {
      // Protección de ruta: solo admin
      const isAuth = await checkSession();
      if (!isAuth) return false;
      return true;
    }
  }
};

// Inicializar el router
const router = new Router(routes);