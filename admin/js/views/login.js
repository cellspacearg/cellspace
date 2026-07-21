// Esta vista se renderizará cuando la ruta sea #/login
export async function loginView() {
  return `
    <div class="admin-login-container">
      <div class="admin-login-box">
        <h2>Acceso Administrativo</h2>
        <p>Panel de Control Cell Space</p>
        <form id="adminLoginForm">
          <input type="email" placeholder="Email" required>
          <input type="password" placeholder="Contraseña" required>
          <button type="submit">Ingresar</button>
        </form>
      </div>
    </div>
  `;
}