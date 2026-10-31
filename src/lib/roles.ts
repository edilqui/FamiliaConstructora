import type { User } from '../types';

// Los miembros administran la app. Los colaboradores ven la información y solo
// registran sus propios aportes (firestore.rules aplica lo mismo en el servidor).
export function isCollaborator(user: User | null | undefined): boolean {
  return user?.role === 'collaborator';
}
