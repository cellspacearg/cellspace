// CARGAR FOOTER EN TODAS LAS PAGINAS
async function loadFooter() {
  try {
    const doc = await db.collection('site_config').doc('footer').get();
    
    if (doc.exists) {
      const data = doc.data();
      
      // Descripción
      if (data.description) {
        const descEl = document.getElementById('footerDescription');
        if (descEl) descEl.textContent = data.description;
      }
      
      // Redes Sociales
      const socialContainer = document.getElementById('socialLinks');
      if (socialContainer && data.social) {
        const socials = data.social;
        let html = '';
        
        if (socials.facebook) {
          html += `<a href="${socials.facebook}" target="_blank" class="social-link" title="Facebook">📘</a>`;
        }
        if (socials.instagram) {
          html += `<a href="${socials.instagram}" target="_blank" class="social-link" title="Instagram">📷</a>`;
        }
        if (socials.tiktok) {
          html += `<a href="${socials.tiktok}" target="_blank" class="social-link" title="TikTok">🎵</a>`;
        }
        if (socials.telegram) {
          html += `<a href="${socials.telegram}" target="_blank" class="social-link" title="Telegram">✈️</a>`;
        }
        
        socialContainer.innerHTML = html;
      }
      
      // Servicios
      if (data.services && data.services.length > 0) {
        const servicesList = document.getElementById('footerServices');
        if (servicesList) {
          servicesList.innerHTML = data.services.map(s => `<li><a href="#servicios">${s}</a></li>`).join('');
        }
      }
      
      // Tienda
      if (data.store && data.store.length > 0) {
        const storeList = document.getElementById('footerStore');
        if (storeList) {
          storeList.innerHTML = data.store.map(s => `<li><a href="tienda.html">${s}</a></li>`).join('');
        }
      }
      
      // Contacto
      if (data.contact) {
        const c = data.contact;
        const addrEl = document.getElementById('footerAddress');
        const hoursEl = document.getElementById('footerHours');
        const phoneEl = document.getElementById('footerPhone');
        const emailEl = document.getElementById('footerEmail');
        
        if (addrEl && c.address) addrEl.textContent = '📍 ' + c.address;
        if (hoursEl && c.hours) hoursEl.innerHTML = '🕒 ' + c.hours.replace(/\n/g, '<br>');
        if (phoneEl && c.phone) phoneEl.textContent = '📱 ' + c.phone;
        if (emailEl && c.email) emailEl.textContent = '✉️ ' + c.email;
      }
      
      // Año
      const yearEl = document.getElementById('footerYear');
      if (yearEl) yearEl.textContent = new Date().getFullYear();
      
    } else {
      loadDefaultFooter();
    }
  } catch (e) {
    console.error('Error cargando footer:', e);
  }
}

function loadDefaultFooter() {
  const descEl = document.getElementById('footerDescription');
  if (descEl) descEl.textContent = 'Tu tienda de tecnología y centro de reparaciones profesional. Calidad, garantía y precio justo.';
  
  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// GUARDAR FOOTER DESDE ADMIN
async function saveFooterSettings() {
  try {
    const servicesText = document.getElementById('footerServicesList').value;
    const storeText = document.getElementById('footerStoreList').value;
    
    const data = {
      description: document.getElementById('footerDesc').value,
      social: {
        facebook: document.getElementById('socialFacebook').value,
        instagram: document.getElementById('socialInstagram').value,
        tiktok: document.getElementById('socialTiktok').value,
        telegram: document.getElementById('socialTelegram').value
      },
      services: servicesText.split(',').map(s => s.trim()).filter(s => s),
      store: storeText.split(',').map(s => s.trim()).filter(s => s),
      contact: {
        address: document.getElementById('contactAddress').value,
        hours: document.getElementById('contactHours').value,
        phone: document.getElementById('contactPhone').value,
        email: document.getElementById('contactEmail').value
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('site_config').doc('footer').set(data, { merge: true });
    alert('✅ Footer guardado correctamente');
    
  } catch (e) {
    alert('❌ Error: ' + e.message);
  }
}

// Cargar footer al iniciar
document.addEventListener('DOMContentLoaded', loadFooter);
