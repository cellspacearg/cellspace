// ========================================
// LOGIN CON SUPABASE
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  checkAuthState();
  setupLoginForm();
  setupOTPInputs();
});

function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    let email = identifier;
    
    // Si es username, buscar email
    if (!identifier.includes('@')) {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('username', identifier.toLowerCase())
        .single();
      
      if (error || !data) {
        alert(' Usuario no encontrado');
        return;
      }
      email = data.email;
    }
    
    try {
      const otp = generateOTP();
      
      // Guardar OTP
      await supabase.from('otp_codes').upsert({
        email: email,
        code: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        attempts: 0
      });
      
      // Enviar email
      await sendOTPEmail(email, otp);
      
      sessionStorage.setItem('tempEmail', email);
      sessionStorage.setItem('tempPassword', password);
      showOTPModal(email);
      
    } catch (error) {
      console.error('Error:', error);
      alert('❌ ' + (error.message || 'Error desconocido'));
    }
  });
}

async function verifyOTP() {
  const email = sessionStorage.getItem('tempEmail');
  const password = sessionStorage.getItem('tempPassword');
  
  if (!email || !password) {
    alert('❌ Sesión expirada.');
    hideOTPModal();
    return;
  }
  
  const otpInputs = document.querySelectorAll('.otp-input');
  let otp = '';
  otpInputs.forEach(input => otp += input.value);
  
  if (otp.length !== 6) {
    document.getElementById('otpError').textContent = 'Ingresá los 6 dígitos';
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) throw new Error('Código inválido');
    
    if (new Date(data.expires_at) < new Date()) throw new Error('Código expirado');
    
    if (data.code !== otp) {
      const newAttempts = (data.attempts || 0) + 1;
      await supabase.from('otp_codes').update({ attempts: newAttempts }).eq('email', email);
      document.getElementById('otpError').textContent = `Incorrecto. Intentos: ${newAttempts}/3`;
      
      if (newAttempts >= 3) {
        alert('⚠️ Demasiados intentos. Solicitá un nuevo código.');
        sessionStorage.clear();
        hideOTPModal();
      }
      return;
    }
    
    // Login con Supabase
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (signInError) throw signInError;
    
    // Limpiar OTP
    await supabase.from('otp_codes').delete().eq('email', email);
    sessionStorage.clear();
    
    // Redirección según rol
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('email', email)
      .single();
    
    if (userData?.role === 'technician') {
      window.location.href = 'technician-zone.html';
    } else {
      window.location.href = 'index.html';
    }
    
  } catch (error) {
    document.getElementById('otpError').textContent = error.message;
  }
}

function signInWithGoogle() {
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/index.html'
    }
  });
}

async function resendOTP() {
  const email = sessionStorage.getItem('tempEmail');
  if (!email) return;
  
  try {
    const otp = generateOTP();
    await supabase.from('otp_codes').upsert({
      email: email,
      code: otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attempts: 0
    });
    await sendOTPEmail(email, otp);
    alert('✅ Código reenviado');
    document.querySelectorAll('.otp-input').forEach(i => i.value = '');
    document.getElementById('otpError').textContent = '';
  } catch (e) {
    alert('❌ Error al reenviar');
  }
}

async function sendOTPEmail(email, otp) {
  const userName = email.split('@')[0];
  
  const templateParams = {
    to_email: email,
    user_name: userName,
    otp_code: otp
  };
  
  try {
    await emailjs.send('service_822cqyn', 'template_2ue0da9', templateParams);
    return true;
  } catch (error) {
    throw new Error('No se pudo enviar el código');
  }
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function showOTPModal(email) {
  document.getElementById('otpEmail').textContent = email;
  document.getElementById('otpModal').style.display = 'flex';
  document.querySelector('.otp-input').focus();
}

function hideOTPModal() {
  document.getElementById('otpModal').style.display = 'none';
}

function setupOTPInputs() {
  const inputs = document.querySelectorAll('.otp-input');
  if (!inputs.length) return;
  
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      if (e.target.value && index < 5) inputs[index + 1].focus();
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        inputs[index - 1].focus();
      }
    });
  });
}

function checkAuthState() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      window.location.href = 'index.html';
    }
  });
}

// Hacer funciones globales
window.signInWithGoogle = signInWithGoogle;
window.verifyOTP = verifyOTP;
window.resendOTP = resendOTP;

console.log('✅ login.js cargado correctamente');
