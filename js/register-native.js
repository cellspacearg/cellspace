// ========================================
// REGISTRO · OTP NATIVO DE SUPABASE
// Reemplaza al viejo js/register-otp.js (tabla otp_codes + EmailJS),
// que era inseguro: el código viajaba a la tabla y se comparaba en el
// navegador. Ahora el código de 6 dígitos lo genera, envía y valida
// Supabase Auth (type: 'signup').
//
// ⚙️ REQUISITO DE CONFIGURACIÓN (Supabase → Authentication):
//   • "Confirm email" debe estar ACTIVADO.
//   • Plantilla "Confirm signup" debe incluir el código {{ .Token }}
//     (no solo el enlace {{ .ConfirmationURL }}).
// Ver backend/SECURITY-BACKEND.md para el detalle.
// ========================================

/* ---------- helpers de UI del modal (mismos ids que el HTML) ---------- */

function readRegisterOtp() {
  let otp = '';
  document.querySelectorAll('.otp-input').forEach((input) => { otp += input.value; });
  return otp;
}

function setRegisterOtpError(text) {
  const el = document.getElementById('otpError');
  if (el) el.textContent = text || '';
}

function clearRegisterOtpInputs() {
  document.querySelectorAll('.otp-input').forEach((i) => { i.value = ''; });
  const first = document.querySelector('.otp-input');
  if (first) first.focus();
}

function openRegisterOTPModal(email) {
  const emailEl = document.getElementById('otpEmail');
  if (emailEl) emailEl.textContent = email;
  const modal = document.getElementById('otpModal');
  if (modal) modal.style.display = 'flex';
  setRegisterOtpError('');
  clearRegisterOtpInputs();
}

function closeRegisterOTPModal() {
  const modal = document.getElementById('otpModal');
  if (modal) modal.style.display = 'none';
}

function setupOTPInputs() {
  const inputs = document.querySelectorAll('.otp-input');
  if (!inputs.length) return;
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      if (e.target.value && index < inputs.length - 1) inputs[index + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) inputs[index - 1].focus();
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const txt = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
      txt.split('').forEach((ch, k) => { if (inputs[k]) inputs[k].value = ch; });
      if (txt.length === 6 && inputs[5]) inputs[5].focus();
    });
  });
}

/* ---------- flujo OTP nativo ---------- */

/**
 * Crea la cuenta (sin confirmar) y dispara el email con el código de 6 dígitos.
 * @param {string} email
 * @param {string} password
 * @param {object} meta  metadata para user_metadata (ej: { name, role:'client' })
 */
async function sendRegisterOTP(email, password, meta) {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: { data: meta || {} }
  });

  if (error) {
    const m = String(error.message || '');
    if (/already registered|already been registered|already exists/i.test(m)) {
      // La cuenta existe. Si todavía no está confirmada, reenviamos el código.
      const { error: resendErr } = await supabase.auth.resend({ type: 'signup', email: email });
      if (resendErr) {
        throw new Error('Ese email ya está registrado. Iniciá sesión o recuperá tu contraseña.');
      }
      return data; // código reenviado a la cuenta sin confirmar
    }
    throw error;
  }

  // Si "Confirm email" estuviera desactivado, signUp devuelve sesión y NO manda
  // código. Avisamos para que se corrija la config en vez de esperar un código.
  if (data && data.session) {
    throw new Error('La verificación por email está desactivada en el servidor. Avisá al administrador.');
  }

  return data;
}

/**
 * Valida el código nativo (type: 'signup'). Si es correcto queda una sesión
 * activa y recién ahí ejecuta onVerified() (que crea el perfil / la solicitud).
 */
async function verifyRegisterOTP(email, onVerified) {
  const token = readRegisterOtp();
  if (token.length !== 6) { setRegisterOtpError('Ingresá los 6 dígitos'); return; }

  setRegisterOtpError('');
  const btn = document.getElementById('otpVerifyBtn');
  if (btn) btn.disabled = true;

  try {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) throw error;
    await onVerified();
  } catch (err) {
    setRegisterOtpError(err && err.message ? err.message : 'El código no es correcto o ya venció. Pedí uno nuevo.');
    clearRegisterOtpInputs();
    if (btn) btn.disabled = false;
  }
}

async function resendRegisterOTP(email) {
  const link = document.getElementById('otpResendLink');
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email });
    if (error) throw error;
    setRegisterOtpError('');
    clearRegisterOtpInputs();
    if (link) {
      const prev = link.textContent;
      link.textContent = 'Código reenviado ✓';
      setTimeout(() => { link.textContent = prev; }, 4000);
    }
  } catch (err) {
    const m = String(err && err.message || '').toLowerCase();
    if (m.includes('rate') || m.includes('seconds')) {
      setRegisterOtpError('Esperá un minuto antes de pedir otro código.');
    } else {
      setRegisterOtpError('No se pudo reenviar el código. Intentá de nuevo.');
    }
  }
}
