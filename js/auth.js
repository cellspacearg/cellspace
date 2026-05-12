// Cambiar tabs login/registro
function switchAuth(type){
  document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('loginForm').style.display = type==='login'?'block':'none';
  document.getElementById('registerForm').style.display = type==='register'?'block':'none';
  document.getElementById('authMsg').textContent='';
}

// LOGIN
document.getElementById('loginForm')?.addEventListener('submit', async e=>{
  e.preventDefault();
  try{
    await auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value, document.getElementById('loginPass').value);
    showAuthMsg('✅ Iniciando sesión...','success');
    setTimeout(()=>{
      window.location.href = 'index.html';
    },1000);
  }catch(err){
    showAuthMsg('❌ '+(err.code==='auth/user-not-found'?'Email no registrado':'Credenciales incorrectas'));
  }
});

// REGISTRO
document.getElementById('registerForm')?.addEventListener('submit', async e=>{
  e.preventDefault();
  try{
    const cred = await auth.createUserWithEmailAndPassword(document.getElementById('regEmail').value, document.getElementById('regPass').value);
    await db.collection('users').doc(cred.user.uid).set({
      name: document.getElementById('regName').value,
      email: document.getElementById('regEmail').value,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      role: 'client'
    });
    showAuthMsg('✅ Cuenta creada. Redirigiendo...','success');
    setTimeout(()=>{
      window.location.href = 'index.html';
    },1500);
  }catch(err){
    showAuthMsg('❌ '+(err.code==='auth/email-already-in-use'?'Email ya registrado':err.message));
  }
});

function showAuthMsg(msg, type='error'){
  const el = document.getElementById('authMsg');
  if(el){
    el.textContent = msg;
    el.className = `auth-msg ${type}`;
  }
}

function logout(){
  auth.signOut().then(()=>{
    window.location.href = 'index.html';
  });
}

// Verificar autenticación
auth.onAuthStateChanged(user=>{
  const loginLink = document.getElementById('loginLink');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminLink = document.getElementById('adminLink');
  
  if(user){
    if(loginLink) loginLink.style.display = 'none';
    if(logoutBtn) logoutBtn.style.display = 'inline-block';
    if(user.email === ADMIN_EMAIL){
      if(adminLink) adminLink.style.display = 'inline-block';
    }
  } else {
    if(loginLink) loginLink.style.display = 'inline-block';
    if(logoutBtn) logoutBtn.style.display = 'none';
    if(adminLink) adminLink.style.display = 'none';
  }
});

// Proteger admin.html
if(window.location.pathname.includes('admin.html')){
  auth.onAuthStateChanged(user=>{
    if(!user || user.email !== ADMIN_EMAIL){
      window.location.href = 'login.html';
    } else {
      document.getElementById('adminEmail').textContent = user.email;
    }
  });
}