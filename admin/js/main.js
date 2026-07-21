import Router from './core/router.js';
import { checkSession } from './hooks/useAuth.js';
import { loginView, loginViewOnMount } from './views/login.js';
import { dashboardView } from './views/dashboard.js';

// Definición de rutas
const routes = {
  '/login': {
    component: loginView,
    onMount: loginViewOnMount, // Ejecutar scripts del login
    beforeEnter: async () => {
      // Si ya está logueado, redirigir al dashboard
      const isAuth = await checkSession();
      if (isAuth) {
        window.location.hash = '#/dashboard';
        return false;
      }
      return true;
    }
  },
  '/dashboard': {
    component: dashboardView,
    beforeEnter: async () => {
      // Protección de ruta: solo admin
      const isAuth = await checkSession();
      if (!isAuth) {
        return false; // Redirige al login
      }
      return true;
    }
  }
};

// Inicializar el router
const router = new Router(routes);