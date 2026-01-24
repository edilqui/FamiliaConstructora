# 📱 Probar FamiliaBuilder en tu Celular - SOLUCIÓN RÁPIDA

## ⚡ Método 1: PWA desde Red Local (5 minutos)

### Paso 1: Descargar Iconos
1. Ve a: https://www.simpleimageresizer.com/upload
2. Sube `public/icon.svg`
3. Redimensiona a 192x192px → Descarga como `icon-192.png`
4. Sube de nuevo `public/icon.svg`
5. Redimensiona a 512x512px → Descarga como `icon-512.png`
6. Coloca ambos archivos en `C:\Dev\EDILSON\AppProject\public\`

### Paso 2: Obtener tu IP Local
Abre PowerShell y ejecuta:
```bash
ipconfig
```
Busca tu "IPv4 Address" (ejemplo: 192.168.1.100)

### Paso 3: Servir la Aplicación
En tu terminal del proyecto:
```bash
# Si npm run dev ya está corriendo, anota el puerto (ejemplo: 5173)
# Si no, inícialo con:
npm run dev
```

Nota el puerto en que está corriendo (ejemplo: 5173)

### Paso 4: Configurar Vite para Red Local
Detén el servidor (Ctrl+C) y ábrelo con acceso de red:
```bash
npm run dev -- --host
```

Te mostrará algo como:
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
```

### Paso 5: Instalar en tu Celular
1. En tu celular, conecta a la MISMA red WiFi
2. Abre Chrome
3. Ve a: `http://[TU-IP]:5173/` (ejemplo: http://192.168.1.100:5173/)
4. Presiona el menú (⋮) → "Agregar a pantalla de inicio" o "Instalar app"
5. ✅ ¡Listo! La app está instalada como si fuera nativa

---

## 🚀 Método 2: Deploy Online + APK (Producción)

Si quieres compartir la app o generar APK, usa Firebase Hosting:

### Paso 1: Build de Producción
```bash
npm run build
```

### Paso 2: Deploy a Firebase
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar
firebase init hosting

# Configuración:
# - ¿Qué carpeta usar? → dist
# - ¿Configurar como SPA? → Yes
# - ¿Overwrite index.html? → No

# Deploy
firebase deploy --only hosting
```

Firebase te dará una URL como: `https://familiabuilder-xxxxx.web.app`

### Paso 3: Generar APK
1. Ve a: https://www.pwabuilder.com
2. Pega tu URL de Firebase
3. Click "Start" → "Package for Stores"
4. Selecciona "Android"
5. Descarga el APK

### Paso 4: Instalar APK en Android
1. Transfiere el APK a tu celular
2. Settings → Security → "Install from Unknown Sources" (habilitar)
3. Abre el APK desde tu celular
4. Instala

---

## ⚡ ATAJO ULTRA-RÁPIDO (Sin iconos PNG)

Si quieres probar AHORA MISMO sin iconos:

```bash
# En tu terminal:
npm run dev -- --host
```

Luego en tu celular:
1. Conecta a la misma WiFi
2. Chrome → `http://[TU-IP]:5173/`
3. La app funcionará (aunque sin icono bonito)

---

## 🔧 Solución de Problemas

### No puedo conectar desde el celular
- ✅ Verifica que ambos estén en la misma red WiFi
- ✅ Desactiva el Firewall de Windows temporalmente
- ✅ Usa la IP correcta (no uses 127.0.0.1)

### El navegador no muestra "Instalar app"
- ✅ Usa Chrome (no funciona en todos los navegadores)
- ✅ Verifica que los iconos PNG estén en public/
- ✅ Asegúrate que sea HTTPS o localhost

### La app no se ve bien en móvil
- ✅ Ya está optimizada para móvil con Tailwind responsive
- ✅ El BottomNav ya está configurado
- ✅ Todos los modales son mobile-first

---

## 📝 Comandos Útiles Resumidos

```bash
# Desarrollo con acceso de red
npm run dev -- --host

# Build de producción
npm run build

# Servir build local
npx serve -s dist -l 8080

# Deploy a Firebase
firebase deploy --only hosting

# Ver IP local
ipconfig
```
