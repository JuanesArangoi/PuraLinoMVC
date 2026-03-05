# Subir imágenes del Manual de Usuario a Cloudinary

## Opción 1: Usar el script automático (recomendado)

1. **Configurar credenciales de Cloudinary:**
   ```bash
   # Opción A: Variables de entorno
   export CLOUDINARY_CLOUD_NAME="tu_cloud_name"
   export CLOUDINARY_API_KEY="tu_api_key" 
   export CLOUDINARY_API_SECRET="tu_api_secret"
   
   # Opción B: Editar el archivo upload_to_cloudinary.js
   # y reemplazar los valores en CLOUDINARY_CONFIG
   ```

2. **Ejecutar el script:**
   ```bash
   node upload_to_cloudinary.js
   ```

3. **Resultado:**
   - Todas las imágenes se subirán a la carpeta `puralino/manual` en Cloudinary
   - Se generará un archivo `image_urls.json` con las URLs generadas
   - Las imágenes se optimizarán a formato WebP

## Opción 2: Subida manual (alternativa)

Si no tienes cuenta Cloudinary o prefieres subirlas manualmente:

1. Ve a [cloudinary.com](https://cloudinary.com) y regístrate
2. Crea una carpeta llamada "puralino/manual"
3. Sube todas las imágenes de la carpeta `images-manual`
4. Copia las URLs generadas

## Opción 3: Usar servicio gratuito alternativo

Si prefieres un servicio gratuito sin registro:
- Usa [imgbb.com](https://imgbb.com) para subir imágenes individualmente
- O [postimages.org](https://postimages.org) para subida masiva

## Formato de URLs esperado

Las URLs deben tener este formato:
```
https://res.cloudinary.com/TU_CLOUD_NAME/image/upload/v1234567890/puralino/manual/nombre-imagen.webp
```

## Próximos pasos

Una vez tengas las URLs, ejecuta:
```bash
node update_manual_urls.js
```

Este script actualizará automáticamente todas las rutas en `docs/Manual_Usuario.html`
