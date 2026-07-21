// ========================================
// PERFIL DE USUARIO - SUPABASE
// ========================================

let currentUser = null;
let originalUsername = '';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificar sesión
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    window.location.href = 'login.html';
    return;
  }
  
  currentUser = session.user;
  
  // 2. Cargar datos del perfil
  await loadProfileData(currentUser);
  
  // 3. Configurar formulario de guardado
  setupProfileForm();
});

async function loadProfileData(user) {
  try {
    // Obtener datos principales de la tabla 'users'
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (userError || !userData) {
      console.error('Error cargando usuario:', userError);
      alert('⚠️ No se pudieron cargar los datos del perfil.');
      return;
    }
    
    // Rellenar campos básicos
    document.getElementById('profileUsername').value = userData.username || '';
    originalUsername = userData.username || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profileName').value = userData.name || '';
    document.getElementById('profilePhone').value = userData.phone || '';
    document.getElementById('profileTelegram').value = userData.telegram || '';
    document.getElementById('profileWhatsApp').value = userData.whatsapp || '';
    document.getElementById('profileLocation').value = userData.location || '';
    
    // Actualizar Sidebar
    const displayName = userData.name || userData.username || 'Usuario';
    document.getElementById('sidebarName').textContent = displayName;
    document.getElementById('sidebarEmail').textContent = user.email;
    document.getElementById('profileInitial').textContent = displayName.charAt(0).toUpperCase();
    
    // Actualizar badge de rol en sidebar y header
    const roleNames = { 'client': 'Cliente', 'technician': 'Técnico', 'admin': 'Admin' };
    const role = userData.role || 'client';
    document.getElementById('userBadge').textContent = roleNames[role];
    
    // Si es técnico, mostrar campos técnicos y cargar sus datos
    if (role === 'technician') {
      document.getElementById('techFields').style.display = 'block';
      
      const { data: techData, error: techError } = await supabase
        .from('technicians')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (!techError && techData) {
        document.getElementById('profileSpecialty').value = techData.specialty || '';
        document.getElementById('profileExperience').value = techData.experience || '';
        document.getElementById('profileBio').value = techData.bio || '';
      }
    }
    
    // Foto de perfil (si existe en metadata o en la tabla)
    const photoUrl = userData.photo_url || user.user_metadata?.avatar_url;
    if (photoUrl) {
      document.getElementById('profilePhotoImg').src = photoUrl;
      document.getElementById('profilePhotoImg').style.display = 'block';
      document.getElementById('profileInitial').style.display = 'none';
    }
    
  } catch (error) {
    console.error('Error general cargando perfil:', error);
  }
}

function setupProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const saveBtn = document.getElementById('saveBtn');
    const saveBtnText = document.getElementById('saveBtnText');
    const saveBtnLoader = document.getElementById('saveBtnLoader');
    
    const newUsername = document.getElementById('profileUsername').value.trim().toLowerCase().replace(/\s+/g, '_');
    const name = document.getElementById('profileName').value.trim();
    const phone = document.getElementById('profilePhone').value.trim();
    const telegram = document.getElementById('profileTelegram').value.trim();
    const whatsapp = document.getElementById('profileWhatsApp').value.trim();
    const location = document.getElementById('profileLocation').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    
    if (newUsername.length < 3) {
      alert('⚠️ El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }
    
    // Mostrar estado de carga
    saveBtn.disabled = true;
    saveBtnText.style.display = 'none';
    saveBtnLoader.style.display = 'inline-block';
    
    try {
      // 1. Verificar si el username cambió y si ya existe
      if (newUsername !== originalUsername) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', newUsername)
          .neq('id', currentUser.id)
          .maybeSingle();
          
        if (existingUser) {
          alert('⚠️ Ese nombre de usuario ya está en uso. Probá con otro.');
          resetButton();
          return;
        }
      }
      
      // 2. Actualizar tabla 'users'
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: newUsername,
          name: name,
          phone: phone,
          telegram: telegram,
          whatsapp: whatsapp,
          location: location,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);
        
      if (updateError) throw updateError;
      
      // 3. Si es técnico, actualizar tabla 'technicians'
      const roleBadge = document.getElementById('userBadge').textContent;
      if (roleBadge === 'Técnico') {
        const specialty = document.getElementById('profileSpecialty').value.trim();
        const experience = document.getElementById('profileExperience').value.trim();
        const bio = document.getElementById('profileBio').value.trim();
        
        // Verificar si ya existe el registro en technicians, si no, insertarlo
        const { data: techExists } = await supabase
          .from('technicians')
          .select('id')
          .eq('user_id', currentUser.id)
          .maybeSingle();
          
        if (techExists) {
          await supabase
            .from('technicians')
            .update({ specialty, experience, bio })
            .eq('user_id', currentUser.id);
        } else {
          await supabase
            .from('technicians')
            .insert({ user_id: currentUser.id, specialty, experience, bio });
        }
      }
      
      // 4. Actualizar contraseña si se proporcionó una nueva
      if (newPassword && newPassword.length >= 6) {
        const { error: passError } = await supabase.auth.updateUser({
          password: newPassword
        });
        
        if (passError) {
          alert('⚠️ No se pudo actualizar la contraseña: ' + passError.message);
          resetButton();
          return;
        }
      }
      
      alert('✅ Perfil actualizado correctamente');
      window.location.reload();
      
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('❌ Error al guardar los cambios: ' + error.message);
      resetButton();
    }
    
    function resetButton() {
      saveBtn.disabled = false;
      saveBtnText.style.display = 'inline-block';
      saveBtnLoader.style.display = 'none';
    }
  });
}

function cancelChanges() {
  if (confirm('¿Estás seguro de que querés cancelar? Se perderán los cambios no guardados.')) {
    window.location.reload();
  }
}

function logout() {
  if (confirm('¿Cerrar sesión?')) {
    supabase.auth.signOut().then(() => {
      window.location.href = 'index.html';
    });
  }
}
