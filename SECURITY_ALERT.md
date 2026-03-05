# 🚨 ACCIÓN DE SEGURIDAD REQUERIDA 🚨

## Las credenciales de Cloudinary fueron expuestas en Git

### Pasos inmediatos a seguir:

1. **Ir a Cloudinary Dashboard**: https://cloudinary.com/console
2. **Regenerar las credenciales**:
   - Ve a Settings → API Keys
   - Regenerar API Key y API Secret
   - Anotar las nuevas credenciales

3. **Actualizar las credenciales en el backend**:
   - Editar `PuraLinoMVC-api/.env`
   - Reemplazar `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`

4. **Actualizar las credenciales locales**:
   - Editar `PuraLinoMVC/.env`
   - Reemplazar las credenciales

### Qué se ha hecho:
- ✅ Removido credenciales hardcodeadas del código
- ✅ Archivo `.env` agregado a `.gitignore`
- ✅ Commit de seguridad pushed

### Recomendación adicional:
Considera revocar las credenciales actuales y generar unas nuevas.

### Comando para verificar que no hay más secretos expuestos:
```bash
git log --all --full-history -- *upload* | grep -E "(api_key|api_secret|cloud_name)"
```
