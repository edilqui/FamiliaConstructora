import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { googleProvider, db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../types';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  initialized: boolean;
  isPendingApproval: boolean; // Nuevo: indica si el usuario está pendiente de aprobación
  login: () => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  initialized: false,
  isPendingApproval: false,

  initialize: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Obtener o crear el documento del usuario en Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          // Si el usuario ya existe pero no tiene el campo 'approved',
          // asumimos que es un usuario antiguo (uno de los 4 hermanos) y lo marcamos como aprobado
          if (userData.approved === undefined) {
            // Actualizar usuario existente para agregar campo approved
            await setDoc(userRef, { approved: true }, { merge: true });
            userData.approved = true;
          }

          const user: User = {
            id: userSnap.id,
            name: userData.name,
            email: userData.email,
            approved: userData.approved,
            approvedBy: userData.approvedBy,
            approvedAt: userData.approvedAt?.toDate(),
            createdAt: userData.createdAt?.toDate(),
          };

          set({
            firebaseUser,
            user,
            loading: false,
            initialized: true,
            isPendingApproval: !user.approved
          });
        } else {
          // Crear nuevo usuario en Firestore - PENDIENTE DE APROBACIÓN
          const newUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuario',
            email: firebaseUser.email || '',
            approved: false, // Nuevo usuario NO está aprobado por defecto
          };

          await setDoc(userRef, {
            ...newUser,
            createdAt: serverTimestamp(),
          });

          set({
            firebaseUser,
            user: newUser,
            loading: false,
            initialized: true,
            isPendingApproval: true // Nuevo usuario está pendiente
          });
        }
      } else {
        set({
          firebaseUser: null,
          user: null,
          loading: false,
          initialized: true,
          isPendingApproval: false
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
      set({ user: null, firebaseUser: null, isPendingApproval: false });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  },
}));
