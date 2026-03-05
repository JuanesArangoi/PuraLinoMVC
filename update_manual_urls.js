// Script para actualizar las URLs de las imágenes en el manual
const fs = require('fs');
const path = require('path');

function updateManualUrls() {
  const manualPath = path.join(__dirname, 'docs', 'Manual_Usuario.html');
  const urlsPath = path.join(__dirname, 'image_urls.json');
  
  if (!fs.existsSync(urlsPath)) {
    console.error('❌ Error: No se encontró el archivo image_urls.json');
    console.log('💡 Primero ejecuta: node upload_to_cloudinary.js');
    return;
  }
  
  if (!fs.existsSync(manualPath)) {
    console.error('❌ Error: No se encontró el archivo docs/Manual_Usuario.html');
    return;
  }
  
  // Leer URLs
  const urlsData = JSON.parse(fs.readFileSync(urlsPath, 'utf8'));
  const urlMap = {};
  
  // Crear mapa de filename -> URL
  urlsData.forEach(item => {
    if (!item.error) {
      // Mapear tanto el nombre original como el número
      const filename = item.filename;
      const baseName = path.parse(filename).name;
      
      urlMap[filename] = item.url;
      urlMap[baseName] = item.url;
    }
  });
  
  // Leer manual
  let manualContent = fs.readFileSync(manualPath, 'utf8');
  
  // Reemplazar URLs locales con URLs de Cloudinary
  const localPathPattern = /C:\\Users\\jaran\\Documents\\PuraLinoMVC\\images-manual\\([^"'\s>]+)/g;
  
  let replacements = 0;
  manualContent = manualContent.replace(localPathPattern, (match, filename) => {
    if (urlMap[filename]) {
      replacements++;
      console.log(`🔄 ${filename} → ${urlMap[filename]}`);
      return urlMap[filename];
    } else {
      console.warn(`⚠️  No se encontró URL para: ${filename}`);
      return match;
    }
  });
  
  // Guardar manual actualizado
  fs.writeFileSync(manualPath, manualContent);
  
  console.log(`\n✅ Manual actualizado con ${replacements} reemplazos`);
  console.log(`📄 Archivo guardado: ${manualPath}`);
  
  // Generar backup
  const backupPath = path.join(__dirname, 'docs', `Manual_Usuario_backup_${Date.now()}.html`);
  fs.copyFileSync(manualPath, backupPath);
  console.log(`💾 Backup creado: ${backupPath}`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateManualUrls();
}

module.exports = { updateManualUrls };
