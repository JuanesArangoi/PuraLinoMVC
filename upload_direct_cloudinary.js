// Script para subir imágenes directamente a Cloudinary (sin backend)
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: 'dwi1ws3oa',
  api_key: '985352846199155',
  api_secret: '77R4X-TFUJmAiwWvshohOothlcU'
});

async function uploadDirectToCloudinary() {
  const imagesDir = path.join(__dirname, 'images-manual');
  
  if (!fs.existsSync(imagesDir)) {
    console.error('❌ Error: La carpeta images-manual no existe');
    return;
  }
  
  const images = fs.readdirSync(imagesDir).filter(file => 
    file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
  );
  
  console.log(`📁 Encontradas ${images.length} imágenes para subir directamente a Cloudinary...`);
  
  const results = [];
  
  for (const image of images) {
    try {
      console.log(`⬆️  Subiendo ${image}...`);
      
      const imagePath = path.join(imagesDir, image);
      const publicId = `puralino-manual-${path.parse(image).name}`;
      
      const result = await cloudinary.uploader.upload(imagePath, {
        folder: 'puralino/manual',
        public_id: publicId,
        resource_type: 'image',
        format: 'webp',
        quality: 'auto:good',
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto:good' }
        ]
      });
      
      const url = result.secure_url;
      console.log(`✅ ${image} → ${url}`);
      
      results.push({
        filename: image,
        publicId: publicId,
        url: url
      });
      
      // Pequeña pausa entre subidas
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
  
  if (failed.length > 0) {
    console.log('\n❌ Fallidas:');
    failed.forEach(item => {
      console.log(`${item.filename}: ${item.error}`);
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
  uploadDirectToCloudinary().catch(console.error);
}

module.exports = { uploadDirectToCloudinary };
