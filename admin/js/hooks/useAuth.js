import { supabase, ADMIN_EMAIL } from '../config.js';
import { store } from '../core/state.js';

// Simula el hook useAuth() de React
export async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session && session.user.email === ADMIN_EMAIL) {
    store.setState({ user: session.user });
    return true;
  }
  
  store.setState({ user: null });
  return false;
}

export async function logout() {
  await supabase.auth.signOut();
  store.setState({ user: null });
  window.location.hash = '#/login';
}