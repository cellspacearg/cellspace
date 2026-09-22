// Simula un Contexto Global de React
const STORAGE_KEY = 'cs_admin_user';

// Recupera el user persistido de una recarga previa (se borra al cerrar la pestaña).
function recuperarUserGuardado() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

// Guarda (o borra) el user en sessionStorage.
function guardarUser(user) {
  try {
    if (user) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) { /* sessionStorage no disponible (modo privado, storage lleno, etc.) */ }
}

class GlobalState {
  constructor() {
    this.state = {
      user: recuperarUserGuardado(),
      isLoading: true,
      theme: 'dark'
    };
    this.listeners = [];
  }

  // Simula useState / useContext
  setState(newState) {
    this.state = { ...this.state, ...newState };
    if ('user' in newState) guardarUser(this.state.user);
    this.notify();
  }

  getState() {
    return this.state;
  }

  // Simula suscripción a cambios (como useEffect)
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

export const store = new GlobalState();
