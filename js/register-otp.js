// ========================================
// VERIFICACIÓN POR CÓDIGO (OTP) EN REGISTRO
// Reusa la misma tabla otp_codes y EmailJS que ya usa el login.
// ========================================

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendRegisterOTP(email) {
  const otp = generateOTP();
  await supabase.from('otp_codes').upsert({
    email: email,
    code: otp,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    attempts: 0
  });
  const userName = email.split('@')[0];
  await emailjs.send('service_822cqyn', 'template_2ue0da9', {
    to_email: email,
    user_name: userName,
    otp_code: otp
  });
}

function openRegisterOTPModal(email) {
  document.getElementById('otpEmail').textContent = email;
  document.getElementById('otpModal').style.display = 'flex';
  document.getElementById('otpError').textContent = '';
  document.querySelectorAll('.otp-input').forEach(i => i.value = '');
  document.querySelector('.otp-input').focus();
}
function closeRegisterOTPModal() {
  document.getElementById('otpModal').style.display = 'none';
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
  });
}

/**
 * Verifica el código ingresado contra otp_codes.
 * Si es correcto, ejecuta onVerified() (la función que crea la cuenta).
 */
async function verifyRegisterOTP(email, onVerified) {
  const otpInputs = document.querySelectorAll('.otp-input');
  let otp = '';
  otpInputs.forEach(input => otp += input.value);

  if (otp.length !== 6) {
    document.getElementById('otpError').textContent = 'Ingresá los 6 dígitos';
    return;
  }

  try {
    const { data, error } = await supabase.from('otp_codes').select('*').eq('email', email).single();
    if (error || !data) throw new Error('Código inválido');
    if (new Date(data.expires_at) < new Date()) throw new Error('Código expirado, pedí uno nuevo');

    if (data.code !== otp) {
      const newAttempts = (data.attempts || 0) + 1;
      await supabase.from('otp_codes').update({ attempts: newAttempts }).eq('email', email);
      document.getElementById('otpError').textContent = `Incorrecto. Intentos: ${newAttempts}/3`;
      if (newAttempts >= 3) {
        alert('⚠️ Demasiados intentos. Volvé a intentar el registro.');
        closeRegisterOTPModal();
      }
      return;
    }

    await supabase.from('otp_codes').delete().eq('email', email);
    await onVerified();

  } catch (err) {
    document.getElementById('otpError').textContent = err.message;
  }
}

async function resendRegisterOTP(email) {
  try {
    await sendRegisterOTP(email);
    alert('✅ Código reenviado');
    document.querySelectorAll('.otp-input').forEach(i => i.value = '');
    document.getElementById('otpError').textContent = '';
  } catch (e) {
    alert('❌ No se pudo reenviar el código');
  }
}
