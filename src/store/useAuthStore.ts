import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { googleProvider, db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from '../types';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  initialized: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  initialized: false,

  initialize: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Obtener o crear el documento del usuario en Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          set({
            firebaseUser,
            user: userData,
            loading: false,
            initialized: true
          });
        } else {
          // Crear nuevo usuario en Firestore
          const newUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuario',
            email: firebaseUser.email || '',
          };
          await setDoc(userRef, newUser);
          set({
            firebaseUser,
            user: newUser,
            loading: false,
            initialized: true
          });
        }
      } else {
        set({
          firebaseUser: null,
          user: null,
          loading: false,
          initialized: true
        });
      }
    });
  },

  login: async () => {
    try {
      set({ loading: true });
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged se encargará de actualizar el estado
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      set({ user: null, firebaseUser: null });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  },
}));
