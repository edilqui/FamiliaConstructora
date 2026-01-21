# FamiliaBuilder

PWA para gestión de gastos de construcción familiar.

## Stack Tecnológico

- **Frontend**: React + Vite + TypeScript
- **Estilos**: Tailwind CSS
- **Estado**: Zustand
- **Backend**: Firebase (Firestore, Auth, Hosting)
- **PWA**: vite-plugin-pwa

## Configuración

### 1. Configurar Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita **Authentication** con el proveedor de Google
3. Crea una base de datos **Firestore** en modo de prueba
4. Copia las credenciales de configuración

### 2. Actualizar credenciales de Firebase

Edita `src/config/firebase.ts` y reemplaza las credenciales:

```typescript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 3. Configurar Firestore Rules

En Firebase Console > Firestore Database > Rules, usa estas reglas:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden leer y escribir
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Crear datos iniciales en Firestore

Crea una colección `projects` con un documento de ejemplo:

```json
{
  "name": "Cimientos",
  "budget": 5000,
  "totalSpent": 0,
  "status": "active"
}
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

## Estructura del Proyecto

```
src/
├── config/         # Configuración de Firebase
├── store/          # Estado global con Zustand
├── types/          # Tipos TypeScript
├── components/     # Componentes reutilizables
├── features/       # Componentes de características principales
├── hooks/          # Custom hooks
├── lib/            # Utilidades
└── services/       # Lógica de negocio
```

## Características

- ✅ Autenticación con Google
- ✅ Balance personal y global
- ✅ Gestión de proyectos
- ✅ Registro de gastos
- ✅ Persistencia offline
- ✅ PWA (instalable)
- ✅ Mobile-first design

## Próximos Pasos

1. Configurar Firebase Hosting para deployment
2. Agregar más categorías de gastos
3. Implementar historial de transacciones
4. Agregar gráficos con Recharts
5. Notificaciones push
