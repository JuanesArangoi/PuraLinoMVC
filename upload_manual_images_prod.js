// Script para subir imágenes del manual usando la API del backend en producción
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// URL del backend desplegado en Render
const API_BASE_URL = 'https://puralinomvc-api.onrender.com'; // Reemplaza con tu URL real de Render

async function uploadManualImages() {
  const imagesDir = path.join(__dirname, 'images-manual');
  
  if (!fs.existsSync(imagesDir)) {
    console.error('❌ Error: La carpeta images-manual no existe');
    return;
  }
  
  const images = fs.readdirSync(imagesDir).filter(file => 
    file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
  );
  
  console.log(`📁 Encontradas ${images.length} imágenes para subir...`);
  
  const results = [];
  
  // Subir imágenes en lotes de 5 para no sobrecargar el servidor
  const batchSize = 5;
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    
    try {
      console.log(`⬆️  Subiendo lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(images.length/batchSize)} (${batch.length} imágenes)...`);
      
      const formData = new FormData();
      
      // Agregar todas las imágenes del lote
      batch.forEach(imageFile => {
        const imagePath = path.join(imagesDir, imageFile);
        formData.append('images', fs.createReadStream(imagePath));
      });
      
      const response = await fetch(`${API_BASE_URL}/upload/manual/batch`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        result.images.forEach(img => {
          console.log(`✅ ${img.filename} → ${img.url}`);
          results.push({
            filename: img.filename,
            url: img.url,
            public_id: img.public_id
          });
        });
      } else {
        throw new Error(result.error || 'Error en la subida');
      }
      
      // Esperar más tiempo entre lotes para no sobrecargar Render
      if (i + batchSize < images.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`❌ Error en lote ${Math.floor(i/batchSize) + 1}:`, error.message);
      
      // Si falla el lote, intentar subir individualmente
      for (const imageFile of batch) {
        try {
          console.log(`🔄 Reintentando ${imageFile} individualmente...`);
          
          const singleFormData = new FormData();
          const imagePath = path.join(imagesDir, imageFile);
          singleFormData.append('image', fs.createReadStream(imagePath));
          
          const singleResponse = await fetch(`${API_BASE_URL}/upload/manual/single`, {
            method: 'POST',
            body: singleFormData
          });
          
          if (singleResponse.ok) {
            const singleResult = await singleResponse.json();
            if (singleResult.success) {
              console.log(`✅ ${imageFile} → ${singleResult.image.url}`);
              results.push({
                filename: imageFile,
                url: singleResult.image.url,
                public_id: singleResult.image.public_id
              });
            }
          } else {
            console.error(`❌ Error subiendo ${imageFile}: ${singleResponse.statusText}`);
            results.push({
              filename: imageFile,
              error: `HTTP ${singleResponse.status}`
            });
          }
        } catch (singleError) {
          console.error(`❌ Error subiendo ${imageFile} individualmente:`, singleError.message);
          results.push({
            filename: imageFile,
            error: singleError.message
          });
        }
        
        // Esperar entre intentos individuales
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
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
  
  // Generar archivo con URLs para reemplzo
  const urlsFile = path.join(__dirname, 'image_urls.json');
  fs.writeFileSync(urlsFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 URLs guardadas en: ${urlsFile}`);
  
  return results;
}

// Verificar que el servidor esté accesible
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  (async () => {
    console.log('🔍 Verificando que el servidor esté accesible...');
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
      console.error('❌ Error: El servidor no está accesible en', API_BASE_URL);
      console.log('💡 Verifica que el backend esté corriendo en Render');
      process.exit(1);
    }
    
    console.log('✅ Servidor accesible, iniciando subida...');
    await uploadManualImages();
  })().catch(console.error);
}

module.exports = { uploadManualImages };
