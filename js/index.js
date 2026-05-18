// functions/index.js
const functions = require("firebase-functions");
const axios = require("axios");

// TUS CLAVES SECRETAS (Nunca se exponen al navegador)
const IFREECLOUD_KEY = "BE9-5RV-B6W-T4A-XOR-GJ5-SMM-I4C";
const SICKW_KEY = "N8K-BQR-O7U-FPK-9VL-HIC-1NW-R8U";

exports.checkIMEI = functions.https.onCall(async (data, context) => {
  const { imei } = data;

  if (!imei || imei.length < 10) {
    throw new functions.https.HttpsError('invalid-argument', 'IMEI no válido');
  }

  let lastError = "";

  // ==========================================
  // 1️⃣ INTENTO PRINCIPAL: iFreeiCloud (DHRU)
  // ==========================================
  try {
    console.log(`🚀 Intentando iFreeiCloud para: ${imei}`);
    
    const params = new URLSearchParams({
      key: IFREECLOUD_KEY,
      action: 'order',
      service: '1',
      imei: imei
    });

    const response = await axios.post('https://api.ifreeicloud.co.uk/api/', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const result = response.data;

    if (result.status === 'success' && result.order_id) {
      return { 
        success: true, 
        source: 'ifreeicloud', 
        orderId: result.order_id,
        message: result.message 
      };
    } else if (result.status === 'error') {
      throw new Error(result.message || 'Error en iFreeiCloud');
    }

  } catch (error) {
    console.warn("⚠️ iFreeiCloud falló:", error.message);
    lastError = error.message;
  }

  // ==========================================
  // 2️⃣ INTENTO DE RESPALDO: SickW
  // ==========================================
  try {
    console.log(`🔄 Intentando SickW (Respaldo) para: ${imei}`);
    
    const url = `https://sickw.com/api/v2/check?imei=${imei}&key=${SICKW_KEY}`;
    const response = await axios.get(url);
    const result = response.data;

    if (result.status === 'success' || result.description) {
      return { success: true, source: 'sickw', data: result };
    } else {
      throw new Error(result.message || 'Error en SickW');
    }

  } catch (error) {
    console.error("❌ SickW también falló:", error.message);
    throw new functions.https.HttpsError('internal', `Ambos proveedores fallaron. Último error: ${lastError}`);
  }
});
