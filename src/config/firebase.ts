import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Configuración de Firebase - Reemplazar con tus credenciales
const firebaseConfig = {
  apiKey: "AIzaSyAVVsZYhJ8Yrsa-U9yFkgocJL-obUFIqaU",
  authDomain: "familiabuilder-df93a.firebaseapp.com",
  projectId: "familiabuilder-df93a",
  storageBucket: "familiabuilder-df93a.firebasestorage.app",
  messagingSenderId: "280802039541",
  appId: "1:280802039541:web:c4ed0ce308a5811f8497bc"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Habilitar persistencia offline
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Múltiples pestañas abiertas, la persistencia solo puede estar habilitada en una pestaña a la vez
    console.warn('Persistencia offline: Múltiples pestañas abiertas');
  } else if (err.code === 'unimplemented') {
    // El navegador no soporta persistencia
    console.warn('Persistencia offline: Navegador no compatible');
  }
});
