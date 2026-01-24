# 🚀 Guía de Inicialización de FamiliaBuilder

## ✅ Script de Inicialización Automática Instalado

La aplicación ahora incluye un **panel de inicialización automática** que te permite crear todos los proyectos con un solo clic.

---

## 📋 Pasos para Inicializar la Base de Datos

### 1. Asegúrate de tener Firestore habilitado

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto **familiabuilder-df93a**
3. Ve a **Firestore Database**
4. Si no está creado, haz clic en **"Create database"**
5. Selecciona **"Start in test mode"**
6. Elige una ubicación cercana (ej: `us-central1`)
7. Haz clic en **"Enable"**

### 2. Configura las Reglas de Seguridad

En **Firestore Database** → **Rules**, copia y pega:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if request.auth != null;
    }

    match /users/{userId} {
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /projects/{projectId} {
      allow read, write: if request.auth != null;
    }

    match /transactions/{transactionId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
  }
}
```

Haz clic en **"Publish"** o **"Publicar"**.

### 3. Ejecuta la Aplicación

```bash
npm run dev
```

### 4. Inicia Sesión

1. Abre http://localhost:5173 en tu navegador
2. Haz clic en **"Entrar con Google"**
3. Selecciona tu cuenta de Google

### 5. Inicializa los Proyectos

Una vez que inicies sesión, verás un **panel azul de inicialización** que dice:

- **"Inicializar Datos"**
- **"Primera configuración del sistema"**

Haz clic en el botón **"Crear Proyectos Iniciales"**

Esto creará automáticamente:
- ✅ Cimientos ($8,000)
- ✅ Paredes ($12,000)
- ✅ Techo ($15,000)
- ✅ Instalaciones Eléctricas ($6,000)

### 6. Agrega tu Aporte Inicial (Opcional)

Después de crear los proyectos, puedes hacer clic en **"Agregar Mi Aporte Inicial"**:
1. Se abrirá un cuadro de diálogo
2. Ingresa el monto que quieras aportar (ej: 2000)
3. Haz clic en **OK**

Esto registrará tu aporte inicial en el sistema.

---

## 🔄 ¿Qué pasa después?

Una vez que crees los proyectos:
- El panel de inicialización **desaparecerá automáticamente**
- Verás los 4 proyectos en el Dashboard
- Podrás empezar a registrar gastos usando el botón **+** flotante

---

## 🎯 Características del Script

### ✅ Protección contra Duplicados
- Si ya existen proyectos, NO se crearán duplicados
- El sistema te avisará cuántos proyectos ya existen

### ✅ Creación Atómica
- Todos los proyectos se crean al mismo tiempo
- Si falla alguno, se te notificará el error

### ✅ Mensajes Claros
- ✅ Verde = Éxito
- ❌ Rojo = Error
- Mensaje detallado de lo que ocurrió

---

## 🛠️ Solución de Problemas

### Error: "Permission denied"
**Causa**: Las reglas de Firestore no están configuradas correctamente.
**Solución**: Revisa el Paso 2 y asegúrate de publicar las reglas.

### Error: "Failed to get document because the client is offline"
**Causa**: Firestore no está habilitado o hay problemas de conexión.
**Solución**:
1. Verifica tu conexión a internet
2. Asegúrate de haber creado la base de datos Firestore (Paso 1)

### El botón no hace nada
**Causa**: Puede haber un error de JavaScript en la consola.
**Solución**:
1. Abre las **DevTools** (F12)
2. Ve a la pestaña **Console**
3. Busca errores en rojo
4. Comparte el error para ayudarte mejor

---

## 📊 Datos que se Crearán

### Colección: `projects`

| Nombre | Presupuesto | Gastado | Estado |
|--------|-------------|---------|--------|
| Cimientos | $8,000 | $0 | Activo |
| Paredes | $12,000 | $0 | Activo |
| Techo | $15,000 | $0 | Activo |
| Instalaciones Eléctricas | $6,000 | $0 | Activo |

**Total Presupuesto**: $41,000

---

## 🎉 ¡Listo!

Una vez completados estos pasos, tu aplicación FamiliaBuilder estará 100% funcional y lista para usar.

Cada hermano debe:
1. Iniciar sesión con su cuenta de Google
2. Agregar su aporte inicial
3. Comenzar a registrar gastos
