// Script para subir imágenes a Cloudinary
// Requiere: npm install cloudinary

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// CONFIGURACIÓN - Reemplaza con tus credenciales de Cloudinary
const CLOUDINARY_CONFIG = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'TU_CLOUD_NAME',
  api_key: process.env.CLOUDINARY_API_KEY || 'TU_API_KEY', 
  api_secret: process.env.CLOUDINARY_API_SECRET || 'TU_API_SECRET'
};

// Configurar Cloudinary
cloudinary.config(CLOUDINARY_CONFIG);

async function uploadAllImages() {
  const imagesDir = path.join(__dirname, 'images-manual');
  
  if (!fs.existsSync(imagesDir)) {
    console.error('Error: La carpeta images-manual no existe');
    return;
  }
  
  const images = fs.readdirSync(imagesDir).filter(file => 
    file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
  );
  
  console.log(`📁 Encontradas ${images.length} imágenes para subir...`);
  
  const results = [];
  
  for (const image of images) {
    try {
      const imagePath = path.join(imagesDir, image);
      const publicId = `puralino-manual-${path.parse(image).name}`;
      
      console.log(`⬆️  Subiendo ${image}...`);
      
      const result = await cloudinary.uploader.upload(imagePath, {
        folder: 'puralino/manual',
        public_id: publicId,
        resource_type: 'image',
        format: 'webp', // Optimizar formato
        quality: 'auto:good'
      });
      
      const url = result.secure_url;
      console.log(`✅ ${image} → ${url}`);
      
      results.push({
        filename: image,
        publicId: publicId,
        url: url
      });
      
    } catch (error) {
      console.error(`❌ Error subiendo ${image}:`, error.message);
      results.push({
        filename: image,
        error: error.message
      });
    }
  }
  
  // Generar reporte
  console.log('\n📊 REPORTE DE SUBIDA:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);
  
  console.log(`✅ Exitosas: ${successful.length}`);
  console.log(`❌ Fallidas: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n🔗 URLs generadas:');
    successful.forEach(item => {
      console.log(`${item.filename}: ${item.url}`);
    });
  }
  
  // Generar archivo con URLs para reemplazo
  const urlsFile = path.join(__dirname, 'image_urls.json');
  fs.writeFileSync(urlsFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 URLs guardadas en: ${urlsFile}`);
  
  return results;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  uploadAllImages().catch(console.error);
}

module.exports = { uploadAllImages };
