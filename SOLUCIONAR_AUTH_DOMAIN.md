# 🔧 Solucionar Error: auth/unauthorized-domain

## El Problema
Firebase Authentication no permite login desde dominios no autorizados.
Tu IP local (192.168.1.91:5174) necesita ser agregada a la lista de dominios permitidos.

## 🚀 SOLUCIÓN RÁPIDA (2 minutos)

### Paso 1: Ir a Firebase Console
1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto "FamiliaBuilder" (o el nombre que le hayas dado)

### Paso 2: Autorizar el Dominio
1. En el menú lateral izquierdo, busca **Authentication** (Autenticación)
2. Click en la pestaña **Settings** (Configuración)
3. Scroll down hasta **Authorized domains** (Dominios autorizados)
4. Click en **Add domain** (Agregar dominio)
5. Escribe: `192.168.1.91`
6. Click en **Add** (Agregar)

### Paso 3: Recarga tu App
1. En tu celular, recarga la página
2. Intenta hacer login nuevamente
3. ✅ ¡Debería funcionar!

---

## 🌐 ALTERNATIVAS

### Opción A: Usar localhost (Solo para probar en PC)
Si solo quieres probar en tu PC:
- Ve a: http://localhost:5174/
- `localhost` ya está autorizado por defecto

### Opción B: Deploy a Firebase Hosting (Recomendado para producción)
Para usar la app de forma permanente:

```bash
# 1. Build de producción
npm run build

# 2. Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# 3. Login
firebase login

# 4. Inicializar hosting
firebase init hosting
# Cuando pregunte:
# - What do you want to use as your public directory? → dist
# - Configure as SPA? → Yes
# - Set up automatic builds? → No

# 5. Deploy
firebase deploy --only hosting
```

Esto te dará una URL como: `https://familiabuilder-xxxxx.web.app`
Esta URL ya estará autorizada automáticamente.

---

## 📋 LISTA DE DOMINIOS A AUTORIZAR (Para diferentes escenarios)

En Firebase Console → Authentication → Settings → Authorized domains, agrega:

✅ localhost (ya viene por defecto)
✅ 192.168.1.91 (tu IP local actual)
✅ tu-proyecto.web.app (cuando hagas deploy a Firebase)
✅ tu-proyecto.firebaseapp.com (cuando hagas deploy a Firebase)

**IMPORTANTE**: Si tu IP local cambia (al reiniciar router), tendrás que agregar la nueva IP.

---

## 🔍 ¿Cómo saber qué dominio autorizar?

El dominio es lo que aparece en la barra de direcciones de tu navegador:

Ejemplos:
- `http://192.168.1.91:5174/` → Autorizar: `192.168.1.91`
- `http://localhost:5174/` → Ya está autorizado
- `https://mi-app.web.app/` → Se autoriza automáticamente al hacer deploy

**Nota**: NO incluyas el puerto (`:5174`), solo la IP o dominio.

---

## ❌ ERRORES COMUNES

### Error: "Dominio ya autorizado pero sigue sin funcionar"
- Limpia el cache del navegador
- Cierra y vuelve a abrir el navegador
- Espera 1-2 minutos (Firebase tarda en propagar cambios)

### Error: "No encuentro Authentication en Firebase Console"
- Verifica que estés en el proyecto correcto
- Si no aparece, ve a Build → Authentication → Get Started

### Error: "Mi IP cambió"
- Ejecuta: `ipconfig | findstr "IPv4"`
- Agrega la nueva IP en Authorized domains
- Reinicia el servidor: `npm run dev`

---

## 🎯 RECOMENDACIÓN FINAL

Para desarrollo local con celular, la mejor solución es:

1. **Corto plazo** (para probar ahora):
   - Autoriza tu IP actual (192.168.1.91)

2. **Largo plazo** (para usar permanentemente):
   - Haz deploy a Firebase Hosting
   - Usa la URL de Firebase desde cualquier dispositivo
   - No tendrás que preocuparte por IPs cambiantes

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Autoriza 192.168.1.91 en Firebase Console
2. ✅ Recarga tu app en el celular
3. ✅ Haz login
4. ✅ ¡Disfruta tu app!

Si planeas usar esto permanentemente, considera hacer deploy a Firebase Hosting.
