// Simula un Contexto Global de React
class GlobalState {
  constructor() {
    this.state = {
      user: null,
      isLoading: true,
      theme: 'dark'
    };
    this.listeners = [];
  }

  // Simula useState / useContext
  setState(newState) {
    this.state = { ...this.state, ...newState };
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