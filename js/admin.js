// Configuración de Firebase
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

// Referencias a servicios de Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 👑 EMAIL DE ADMINISTRADOR (SOLO VOS PODÉS ENTRAR AL ADMIN)
const ADMIN_EMAIL = "nahuel0123encinas@gmail.com";
