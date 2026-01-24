# Crear Iconos PNG - Solución Rápida

## Opción 1: Generador Online (2 minutos) ⚡ RECOMENDADO

1. Ve a: https://realfavicongenerator.net/
2. Sube el archivo: `C:\Dev\EDILSON\AppProject\public\icon.svg`
3. Scroll down y presiona "Generate your Favicons and HTML code"
4. Descarga el paquete ZIP
5. Extrae los archivos:
   - `android-chrome-192x192.png` → Renombra a `icon-192.png`
   - `android-chrome-512x512.png` → Renombra a `icon-512.png`
6. Copia ambos a: `C:\Dev\EDILSON\AppProject\public\`

## Opción 2: Usar Canva (5 minutos)

1. Ve a: https://www.canva.com
2. Crea un diseño de 512x512px
3. Agrega un ícono de casa + símbolo de dólar
4. Descarga como PNG → Guarda como `icon-512.png`
5. Redimensiona a 192x192px y guarda como `icon-192.png`
6. Copia a `public/`

## Opción 3: Iconos Temporales (30 segundos) ⚡ PARA PROBAR YA

Si solo quieres probar la app AHORA sin preocuparte por los iconos:

1. Ve a: https://via.placeholder.com/512/3B82F6/FFFFFF?text=FB
2. Click derecho → Guardar imagen como → `icon-512.png`
3. Ve a: https://via.placeholder.com/192/3B82F6/FFFFFF?text=FB
4. Click derecho → Guardar imagen como → `icon-192.png`
5. Guarda ambos en `C:\Dev\EDILSON\AppProject\public\`

¡Listo! Ya puedes probar la app en tu celular.

## Opción 4: Copiar iconos de ejemplo

Si tienes cualquier imagen PNG de 512x512, puedes usarla temporalmente:

```bash
# En PowerShell:
# Copiar cualquier imagen y renombrarla
copy cualquier-imagen.png public\icon-512.png
copy cualquier-imagen.png public\icon-192.png
```
