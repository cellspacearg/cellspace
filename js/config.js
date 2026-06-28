const firebaseConfig = {
  apiKey: "AIzaSyCNHshneVJhwu6XvxrYAT52w4O8UM_9P94",
  authDomain: "cellspace-login.firebaseapp.com",
  projectId: "cellspace-login",
  storageBucket: "cellspace-login.appspot.com",
  messagingSenderId: "312985834328",
  appId: "1:312985834328:web:4a99d20f26427d48300b2d"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias globales
const auth = firebase.auth();
const db = firebase.firestore();

// Storage - Verificar que existe antes de usarlo
let storage = null;
try {
  if (typeof firebase.storage === 'function') {
    storage = firebase.storage();
    console.log('✅ Firebase Storage cargado correctamente');
  } else {
    console.warn('⚠️ Firebase Storage no disponible');
  }
} catch (error) {
  console.error('❌ Error inicializando Storage:', error);
}

const ADMIN_EMAIL = "nahuel0123encinas@gmail.com";

// Hacer globales
window.auth = auth;
window.db = db;
window.storage = storage;
window.firebase = firebase;

console.log('✅ Firebase inicializado correctamente');
