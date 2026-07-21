import { login, resetPassword } from '../hooks/useAuth.js';

export async function loginView() {
  return `
    <div class="admin-login-container">
      <div class="admin-login-box">
        <div class="admin-login-header">
          <img src="../assets/logo.png" alt="Cell Space" class="admin-login-logo" onerror="this.style.display='none'">
          <h2>Panel de Administración</h2>
          <p>Cell Space Argentina</p>
        </div>
        
        <form id="adminLoginForm" class="admin-form">
          <div class="form-group">
            <label for="adminEmail">Email</label>
            <input 
              type="email" 
              id="adminEmail" 
              placeholder="admin@cellspace.com" 
              required
              autocomplete="email"
            >
          </div>
          
          <div class="form-group">
            <label for="adminPassword">Contraseña</label>
            <input 
              type="password" 
              id="adminPassword" 
              placeholder="••••••••" 
              required
              autocomplete="current-password"
            >
          </div>
          
          <div id="loginError" class="alert-error" style="display: none;"></div>
          <div id="loginSuccess" class="alert-success" style="display: none;"></div>
          
          <button type="submit" id="loginBtn" class="btn-primary">
            <span id="loginBtnText">Iniciar Sesión</span>
            <span id="loginBtnLoader" style="display: none;">
              <i class="fas fa-spinner fa-spin"></i> Verificando...
            </span>
          </button>
        </form>
        
        <div class="admin-login-footer">
          <a href="#" id="forgotPasswordLink">¿Olvidaste tu contraseña?</a>
        </div>
        
        <!-- Formulario de recuperación (oculto por defecto) -->
        <div id="resetPasswordForm" style="display: none;">
          <h3>Recuperar Contraseña</h3>
          <p>Ingresa tu email para recibir un link de recuperación</p>
          
          <form id="adminResetForm" class="admin-form">
            <div class="form-group">
              <label for="resetEmail">Email</label>
              <input 
                type="email" 
                id="resetEmail" 
                placeholder="admin@cellspace.com" 
                required
              >
            </div>
            
            <div id="resetError" class="alert-error" style="display: none;"></div>
            <div id="resetSuccess" class="alert-success" style="display: none;"></div>
            
            <button type="submit" class="btn-primary">
              Enviar Link de Recuperación
            </button>
          </form>
          
          <div class="admin-login-footer">
            <a href="#" id="backToLoginLink">← Volver al login</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Ejecutar después de que el HTML se renderice
export function loginViewOnMount() {
  const loginForm = document.getElementById('adminLoginForm');
  const resetForm = document.getElementById('adminResetForm');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const backToLoginLink = document.getElementById('backToLoginLink');
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  
  // Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;
      const loginBtn = document.getElementById('loginBtn');
      const loginBtnText = document.getElementById('loginBtnText');
      const loginBtnLoader = document.getElementById('loginBtnLoader');
      const loginError = document.getElementById('loginError');
      const loginSuccess = document.getElementById('loginSuccess');
      
      // Ocultar mensajes previos
      loginError.style.display = 'none';
      loginSuccess.style.display = 'none';
      
      // Mostrar loading
      loginBtn.disabled = true;
      loginBtnText.style.display = 'none';
      loginBtnLoader.style.display = 'inline';
      
      // Intentar login
      const result = await login(email, password);
      
      // Restaurar botón
      loginBtn.disabled = false;
      loginBtnText.style.display = 'inline';
      loginBtnLoader.style.display = 'none';
      
      if (result.success) {
        loginSuccess.textContent = '✅ Inicio de sesión exitoso. Redirigiendo...';
        loginSuccess.style.display = 'block';
        
        // Redirigir al dashboard después de 1 segundo
        setTimeout(() => {
          window.location.hash = '#/dashboard';
        }, 1000);
      } else {
        loginError.textContent = '❌ ' + result.error;
        loginError.style.display = 'block';
      }
    });
  }
  
  // Mostrar formulario de recuperación
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      resetPasswordForm.style.display = 'block';
    });
  }
  
  // Volver al login
  if (backToLoginLink) {
    backToLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      resetPasswordForm.style.display = 'none';
      loginForm.style.display = 'block';
    });
  }
  
  // Recuperar contraseña
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('resetEmail').value.trim();
      const resetError = document.getElementById('resetError');
      const resetSuccess = document.getElementById('resetSuccess');
      
      resetError.style.display = 'none';
      resetSuccess.style.display = 'none';
      
      const result = await resetPassword(email);
      
      if (result.success) {
        resetSuccess.textContent = '✅ ' + result.message;
        resetSuccess.style.display = 'block';
      } else {
        resetError.textContent = '❌ ' + result.error;
        resetError.style.display = 'block';
      }
    });
  }
}