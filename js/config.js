const firebaseConfig = {
  apiKey: "AIzaSyCNHshneVJhwu6XvxrYAT52w4O8UM_9P94",
  authDomain: "cellspace-login.firebaseapp.com",
  projectId: "cellspace-login",
  storageBucket: "cellspace-login.appspot.com",
  messagingSenderId: "312985834328",
  appId: "1:312985834328:web:4a99d20f26427d48300b2d"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const ADMIN_EMAIL = "nahuel0123encinas@gmail.com";
