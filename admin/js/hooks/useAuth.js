import { supabase, ADMIN_EMAIL } from '../config.js';
import { store } from '../core/state.js';

// Listener de sesión persistente (se ejecuta una sola vez al cargar)
export function initAuthListener() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user?.email === ADMIN_EMAIL) {
      store.setState({ user: session.user });
    } else if (event === 'SIGNED_OUT') {
      store.setState({ user: null });
      window.location.hash = '#/login';
    }
  });
}

// Login con email y contraseña
export async function login(email, password) {
  try {
    // Verificar que sea el admin correcto
    if (email !== ADMIN_EMAIL) {
      return {
        success: false,
        error: 'Este usuario no tiene permisos de administrador'
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      // Mensajes de error amigables
      let errorMessage = 'Error al iniciar sesión';
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email o contraseña incorrectos';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Por favor, verificá tu email antes de iniciar sesión';
      } else {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    // Verificar que sea el admin
    if (data.user.email !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Este usuario no tiene permisos de administrador'
      };
    }

    store.setState({ user: data.user });
    return {
      success: true,
      user: data.user
    };

  } catch (error) {
    console.error('Error en login:', error);
    return {
      success: false,
      error: 'Error de conexión. Intentalo de nuevo.'
    };
  }
}

// Recuperar contraseña
export async function resetPassword(email) {
  try {
    if (email !== ADMIN_EMAIL) {
      return {
        success: false,
        error: 'Este email no está registrado como administrador'
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/admin/#/reset-password'
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      message: 'Se envió un link de recuperación a tu email'
    };

  } catch (error) {
    console.error('Error en resetPassword:', error);
    return {
      success: false,
      error: 'Error al enviar el email de recuperación'
    };
  }
}

// Cerrar sesión
export async function logout() {
  try {
    await supabase.auth.signOut();
    store.setState({ user: null });
    window.location.hash = '#/login';
  } catch (error) {
    console.error('Error en logout:', error);
  }
}

// Verificar si hay sesión activa
export async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session && session.user.email === ADMIN_EMAIL) {
    store.setState({ user: session.user });
    return true;
  }
  
  store.setState({ user: null });
  return false;
}

// Hacer logout disponible globalmente
window.logout = logout;