# Guía para Generar APK de FamiliaBuilder

## Prerequisitos Completados ✅
- ✅ Manifest.json creado
- ✅ Service Worker configurado
- ✅ index.html actualizado

## Paso 1: Generar Iconos PNG

### Opción A - Usando un generador online (RECOMENDADO):
1. Ve a: https://www.pwabuilder.com/imageGenerator
2. Sube el archivo `public/icon.svg`
3. Descarga el paquete de iconos
4. Extrae `icon-192.png` y `icon-512.png` en la carpeta `public/`

### Opción B - Usando Bubblewrap CLI (requiere iconos PNG ya creados):
```bash
# Inicializar proyecto TWA
bubblewrap init --manifest https://tu-dominio.com/manifest.json

# Construir APK
bubblewrap build

# El APK estará en: app-release-signed.apk
```

## Paso 2: Generar APK usando PWA Builder (MÁS FÁCIL)

### 2.1 - Hacer Build de Producción
```bash
npm run build
```

### 2.2 - Subir tu PWA a un servidor
Tienes 3 opciones:

#### Opción A: Firebase Hosting (GRATIS)
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar hosting
firebase init hosting

# Seleccionar la carpeta dist como public directory
# Configurar como SPA: Yes

# Deploy
firebase deploy --only hosting
```

#### Opción B: Netlify (GRATIS - MÁS SIMPLE)
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

#### Opción C: Vercel (GRATIS)
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 2.3 - Generar APK con PWA Builder
1. Una vez deployado, ve a: https://www.pwabuilder.com
2. Ingresa la URL de tu PWA deployada
3. Haz clic en "Start" → "Package For Stores"
4. Selecciona "Android" → "Generate"
5. Descarga el APK firmado

## Paso 3: Instalar en tu Celular

1. Habilita "Fuentes desconocidas" en tu Android:
   - Settings → Security → Unknown sources (habilitarlo)

2. Transfiere el APK a tu celular

3. Abre el archivo APK desde tu celular

4. Instala la aplicación

## RUTA RÁPIDA (Sin deploy a internet - Solo pruebas locales)

Si solo quieres probar en tu red local:

1. Asegúrate de tener los iconos PNG en `public/` (descárgalos del generador de PWA Builder)

2. Haz build de producción:
```bash
npm run build
```

3. Sirve la carpeta dist en tu red local:
```bash
# Instalar un servidor simple
npm install -g serve

# Servir en tu red local (encuentra tu IP local con ipconfig)
serve -s dist -l 8080
```

4. Desde tu celular (conectado a la misma red WiFi):
   - Abre Chrome
   - Ve a: http://[TU-IP-LOCAL]:8080
   - Presiona el menú (⋮) → "Instalar app"
   - La PWA se instalará como una app nativa

## Notas Importantes

- Para generar un APK firmado y subirlo a Google Play Store, necesitarás:
  - Cuenta de Google Play Developer ($25 USD una sola vez)
  - Firmar el APK con tu keystore
  - Cumplir con las políticas de Google Play

- Para uso personal/testing, la instalación directa de PWA desde el navegador es suficiente

- El APK generado por PWA Builder viene pre-firmado para testing, pero para producción necesitarás tu propia firma
