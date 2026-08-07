// ========================================
// LOGIN · Cell Space Argentina
// Contraseña + OTP nativo de Supabase + Google
// Sin tabla otp_codes y sin EmailJS.
// ========================================

let otpEmailSent = '';

document.addEventListener('DOMContentLoaded', () => {
  wireTabs();
  wirePasswordLogin();
  wireOtpLogin();
  wireForgot();
  watchSession();
  console.log('✅ login-otp.js cargado correctamente');
});

const $ = (id) => document.getElementById(id);

function msg(html, type) {
  const box = $('loginAlert');
  if (!box) return;
  box.innerHTML = html
    ? `<div class="alert-${type === 'ok' ? 'success' : 'error'}">${html}</div>`
    : '';
  if (html) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function busy(btn, on, text) {
  if (!btn) return;
  if (on) {
    btn.dataset.html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text || 'Un momento...'}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
  }
}

/* ---------- Pestañas ---------- */
function wireTabs() {
  const tp = $('tabPass'), tc = $('tabCode');
  const pp = $('panePass'), pc = $('paneCode');
  if (!tp || !tc) return;

  tp.addEventListener('click', () => {
    tp.classList.add('on'); tc.classList.remove('on');
    pp.classList.add('on'); pc.classList.remove('on');
    msg('', 'ok');
  });

  tc.addEventListener('click', () => {
    tc.classList.add('on'); tp.classList.remove('on');
    pc.classList.add('on'); pp.classList.remove('on');
    msg('', 'ok');
    const from = $('loginIdentifier')?.value.trim();
    if (from && !$('otpEmail').value) $('otpEmail').value = from;
  });
}

/* ---------- Redirección según rol ---------- */
async function redirectAfterLogin() {
  const params = new URLSearchParams(window.location.search);
  const back = params.get('redirect');
  if (back && /^[a-zA-Z0-9._-]+\.html/.test(back)) {
    window.location.href = back;
    return;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', session.user.id).single();

    if (profile?.role === 'admin')            window.location.href = 'admin/index.html';
    else if (profile?.role === 'technician')  window.location.href = 'central-space.html';
    else                                      window.location.href = 'index.html';
  } catch {
    window.location.href = 'index.html';
  }
}

/* ---------- Login con contraseña ---------- */
function wirePasswordLogin() {
  const form = $('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg('', 'ok');

    const email = ($('loginIdentifier').value || '').trim();
    const password = $('loginPassword').value || '';

    if (!email.includes('@')) { msg('Ingresá un email válido.', 'err'); return; }
    if (!password) { msg('Ingresá tu contraseña.', 'err'); return; }

    const btn = $('loginBtn');
    busy(btn, true, 'Ingresando...');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await redirectAfterLogin();
    } catch (err) {
      const m = String(err.message || '');
      if (m.includes('Invalid login credentials')) {
        msg('El email o la contraseña no son correctos. Podés entrar con un código al email o recuperar tu contraseña.', 'err');
      } else if (m.includes('Email not confirmed')) {
        msg('Todavía no confirmaste tu email. Revisá tu bandeja de entrada y la carpeta de spam.', 'err');
      } else {
        msg(m || 'No pudimos iniciar sesión.', 'err');
      }
      busy(btn, false);
    }
  });
}

/* ---------- Login con código de 6 dígitos (OTP nativo) ---------- */
function wireOtpLogin() {
  const send = $('sendCodeBtn');
  const verify = $('verifyCodeBtn');
  const resend = $('resendBtn');
  const back = $('backBtn');
  if (!send) return;

  send.addEventListener('click', () => requestCode(send));
  resend?.addEventListener('click', () => requestCode(resend, true));
  verify?.addEventListener('click', () => verifyCode(verify));

  back?.addEventListener('click', () => {
    $('codeStep2').style.display = 'none';
    $('codeStep1').style.display = 'block';
    msg('', 'ok');
  });

  // Navegación entre las 6 casillas
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((b, i) => {
    b.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      if (e.target.value && i < boxes.length - 1) boxes[i + 1].focus();
      if (i === boxes.length - 1 && readCode().length === 6) verifyCode($('verifyCodeBtn'));
    });
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) boxes[i - 1].focus();
    });
    b.addEventListener('paste', (e) => {
      e.preventDefault();
      const txt = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
      txt.split('').forEach((ch, k) => { if (boxes[k]) boxes[k].value = ch; });
      if (txt.length === 6) verifyCode($('verifyCodeBtn'));
    });
  });
}

function readCode() {
  return Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
}

async function requestCode(btn, isResend) {
  const email = ($('otpEmail').value || '').trim();
  if (!email.includes('@')) { msg('Ingresá un email válido.', 'err'); return; }

  busy(btn, true, 'Enviando...');
  msg('', 'ok');

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) throw error;

    otpEmailSent = email;
    $('otpEmailShown').textContent = email;
    $('codeStep1').style.display = 'none';
    $('codeStep2').style.display = 'block';
    document.querySelector('.otp-box')?.focus();

    if (isResend) msg('Te enviamos un código nuevo.', 'ok');
  } catch (err) {
    const m = String(err.message || '').toLowerCase();
    if (m.includes('rate') || m.includes('seconds')) {
      msg('Esperá un minuto antes de pedir otro código.', 'err');
    } else if (m.includes('signups not allowed') || m.includes('not found')) {
      msg('No encontramos una cuenta con ese email. ¿Querés <a href="register-client.html" style="color:#FF6A00;font-weight:700;">crear una</a>?', 'err');
    } else {
      msg(err.message || 'No pudimos enviar el código.', 'err');
    }
  } finally {
    busy(btn, false);
  }
}

async function verifyCode(btn) {
  const token = readCode();
  if (token.length !== 6) { msg('Ingresá los 6 dígitos.', 'err'); return; }

  busy(btn, true, 'Verificando...');
  msg('', 'ok');

  try {
    const { error } = await supabase.auth.verifyOtp({
      email: otpEmailSent,
      token,
      type: 'email',
    });
    if (error) throw error;
    await redirectAfterLogin();
  } catch (err) {
    msg('El código no es correcto o ya venció. Pedí uno nuevo.', 'err');
    document.querySelectorAll('.otp-box').forEach(b => b.value = '');
    document.querySelector('.otp-box')?.focus();
    busy(btn, false);
  }
}

/* ---------- Recuperar contraseña ---------- */
function wireForgot() {
  $('forgotBtn')?.addEventListener('click', async () => {
    const email = ($('loginIdentifier').value || '').trim();
    if (!email.includes('@')) {
      msg('Escribí tu email arriba y volvé a tocar "¿Olvidaste tu contraseña?".', 'err');
      $('loginIdentifier').focus();
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html',
      });
      if (error) throw error;
      msg(`Te enviamos un enlace a <strong>${email}</strong> para crear una contraseña nueva. Revisá también el spam.`, 'ok');
    } catch (err) {
      msg(err.message || 'No pudimos enviar el enlace.', 'err');
    }
  });
}

/* ---------- Google ---------- */
function signInWithGoogle() {
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/index.html' },
  });
}

/* ---------- Sesión ---------- */
function watchSession() {
  // Solo redirigimos cuando el usuario ACABA de entrar.
  // Antes escuchábamos cualquier sesión y eso provocaba el bucle al login.
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) redirectAfterLogin();
  });
}

window.signInWithGoogle = signInWithGoogle;
