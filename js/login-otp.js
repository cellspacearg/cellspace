// ========================================
// CELL SPACE - LOGIN CON OTP (EmailJS)
// ========================================

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuthState();
  setupOTPInputs();
});

// ========================================
// LOGIN CON EMAIL/USERNAME
// ========================================

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  let email = identifier;
  
  // Si no es email, buscar username en Firestore
  if (!identifier.includes('@')) {
    try {
      const usernameDoc = await db.collection('usernames').doc(identifier.toLowerCase()).get();
      if (usernameDoc.exists) {
        email = usernameDoc.data().email;
      } else {
        alert('❌ Nombre de usuario no encontrado');
        return;
      }
    } catch (error) {
      console.error('Error buscando username:', error);
      alert('❌ Error al buscar usuario');
      return;
    }
  }
  
  try {
    // Generar y enviar OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    
    // Guardar OTP en Firestore
    await db.collection('otp_codes').doc(email).set({
      code: otp,
      expiresAt: expiresAt,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      attempts: 0
    });
    
    // Enviar email con OTP
    await sendOTPEmail(email, otp);
    
    // Guardar temporalmente para después del OTP
    sessionStorage.setItem('tempEmail', email);
    sessionStorage.setItem('tempPassword', password);
    
    // Mostrar modal de OTP
    showOTPModal(email);
    
  } catch (error) {
    console.error('Error:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      alert('❌ Email o contraseña incorrectos');
    } else if (error.code === 'auth/too-many-requests') {
      alert('⚠️ Demasiados intentos. Intentá de nuevo más tarde.');
    } else {
      alert('❌ Error: ' + error.message);
    }
  }
});

// ========================================
// LOGIN CON GOOGLE
// ========================================

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  
  firebase.auth().signInWithPopup(provider)
    .then(async (result) => {
      const user = result.user;
      const userId = user.uid;
      
      // Verificar si ya existe en Firestore
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        // Crear nuevo usuario
        const username = user.displayName.toLowerCase().replace(/\s+/g, '_');
        
        await db.collection('users').doc(userId).set({
          username: username,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          userType: 'client',
          isPremium: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Reservar username
        await db.collection('usernames').doc(username).set({
          email: user.email,
          userType: 'client',
          uid: userId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Actualizar lastLogin
        await db.collection('users').doc(userId).update({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Redirigir
      window.location.href = 'index.html';
    })
    .catch((error) => {
      console.error('Error con Google:', error);
      alert('❌ Error con Google: ' + error.message);
    });
}

// ========================================
// ENVÍO DE OTP CON EMAILJS
// ========================================

async function sendOTPEmail(email, otp) {
  const userName = email.split('@')[0];
  
  const templateParams = {
    to_email: email,
    user_name: userName,
    otp_code: otp
  };
  
  try {
    // ✅ TUS CREDENCIALES DE EMAILJS
    const serviceID = 'service_822cqyn';       // Tu Service ID
    const templateID = 'template_kdt4wrs';    // Tu Template ID
    
    await emailjs.send(serviceID, templateID, templateParams);
    
    console.log('✅ Email enviado exitosamente a:', email);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw new Error('No se pudo enviar el código de verificación');
  }
}

// ========================================
// VERIFICACIÓN DE OTP
// ========================================

async function verifyOTP() {
  const email = sessionStorage.getItem('tempEmail');
  const password = sessionStorage.getItem('tempPassword');
  
  if (!email || !password) {
    alert('❌ Sesión expirada. Intentá de nuevo.');
    sessionStorage.clear();
    document.getElementById('otpModal').style.display = 'none';
    return;
  }
  
  // Obtener código ingresado
  const otpInputs = document.querySelectorAll('.otp-input');
  let otp = '';
  otpInputs.forEach(input => otp += input.value);
  
  if (otp.length !== 6) {
    document.getElementById('otpError').textContent = 'Ingresá los 6 dígitos del código';
    return;
  }
  
  try {
    // Buscar OTP en Firestore
    const otpDoc = await db.collection('otp_codes').doc(email).get();
    
    if (!otpDoc.exists) {
      document.getElementById('otpError').textContent = 'Código no válido o expirado';
      return;
    }
    
    const otpData = otpDoc.data();
    
    // Verificar si expiró
    if (otpData.expiresAt.toDate() < new Date()) {
      document.getElementById('otpError').textContent = 'El código expiró. Solicitá uno nuevo.';
      await db.collection('otp_codes').doc(email).delete();
      return;
    }
    
    // Verificar intentos
    if (otpData.attempts >= 3) {
      document.getElementById('otpError').textContent = 'Demasiados intentos. Solicitá un nuevo código.';
      await db.collection('otp_codes').doc(email).delete();
      return;
    }
    
    // Verificar código
    if (otpData.code !== otp) {
      // Incrementar intentos
      await db.collection('otp_codes').doc(email).update({
        attempts: firebase.firestore.FieldValue.increment(1)
      });
      
      const remaining = 3 - (otpData.attempts + 1);
      document.getElementById('otpError').textContent = `Código incorrecto. Te quedan ${remaining} intentos.`;
      return;
    }
    
    // OTP válido - iniciar sesión
    await firebase.auth().signInWithEmailAndPassword(email, password);
    
    // Limpiar OTP
    await db.collection('otp_codes').doc(email).delete();
    sessionStorage.removeItem('tempEmail');
    sessionStorage.removeItem('tempPassword');
    
    // Limpiar inputs
    otpInputs.forEach(input => input.value = '');
    
    // Redirigir según tipo de usuario
    const userId = email.split('@')[0];
    const techDoc = await db.collection('technicians').doc(userId).get();
    
    if (techDoc.exists) {
      window.location.href = 'technician-zone.html';
    } else {
      window.location.href = 'index.html';
    }
    
  } catch (error) {
    console.error('Error verificando OTP:', error);
    document.getElementById('otpError').textContent = 'Error al verificar. Intentá de nuevo.';
  }
}

// ========================================
// REENVÍO DE OTP
// ========================================

async function resendOTP() {
  const email = sessionStorage.getItem('tempEmail');
  
  if (!email) {
    alert('❌ Sesión expirada. Intentá de nuevo.');
    return;
  }
  
  try {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await db.collection('otp_codes').doc(email).set({
      code: otp,
      expiresAt: expiresAt,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      attempts: 0
    });
    
    await sendOTPEmail(email, otp);
    
    // Limpiar inputs y error
    document.querySelectorAll('.otp-input').forEach(input => input.value = '');
    document.getElementById('otpError').textContent = '';
    
    alert('✅ Nuevo código enviado a tu email');
    document.querySelector('.otp-input').focus();
    
  } catch (error) {
    console.error('Error reenviando OTP:', error);
    alert('❌ Error al reenviar el código. Intentá de nuevo.');
  }
}

// ========================================
// UTILIDADES
// ========================================

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function showOTPModal(email) {
  document.getElementById('otpEmail').textContent = email;
  document.getElementById('otpModal').style.display = 'flex';
  document.querySelector('.otp-input').focus();
}

function setupOTPInputs() {
  const inputs = document.querySelectorAll('.otp-input');
  
  inputs.forEach((input, index) => {
    // Auto-focus al siguiente input
    input.addEventListener('input', (e) => {
      // Solo permitir números
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      
      if (e.target.value && index < 5) {
        inputs[index + 1].focus();
      }
    });
    
    // Retroceder con backspace
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        inputs[index - 1].focus();
      }
      // Navegación con flechas
      if (e.key === 'ArrowLeft' && index > 0) {
        inputs[index - 1].focus();
      }
      if (e.key === 'ArrowRight' && index < 5) {
        inputs[index + 1].focus();
      }
    });
    
    // Pegar código completo
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
      
      pastedData.forEach((char, i) => {
        if (inputs[i] && /[0-9]/.test(char)) {
          inputs[i].value = char;
        }
      });
      
      // Focus en el último input con valor o el siguiente
      const lastFilled = pastedData.length - 1;
      if (inputs[lastFilled]) {
        inputs[lastFilled].focus();
      }
    });
  });
}

function checkAuthState() {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Si ya está logueado, redirigir
      window.location.href = 'index.html';
    }
  });
}

// Cerrar modal con ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('otpModal').style.display === 'flex') {
    // No permitir cerrar con ESC por seguridad
  }
});
