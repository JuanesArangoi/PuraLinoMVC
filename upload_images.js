const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configurar Cloudinary (necesitarás tus credenciales)
cloudinary.config({
  cloud_name: 'TU_CLOUD_NAME',
  api_key: 'TU_API_KEY',
  api_secret: 'TU_API_SECRET'
});

async function uploadImages() {
  const imagesDir = path.join(__dirname, 'images-manual');
  const images = fs.readdirSync(imagesDir).filter(file => file.endsWith('.png'));
  
  console.log(`Found ${images.length} images to upload`);
  
  for (const image of images) {
    try {
      const imagePath = path.join(imagesDir, image);
      const result = await cloudinary.uploader.upload(imagePath, {
        folder: 'puralino/manual',
        public_id: path.parse(image).name,
        resource_type: 'image'
      });
      
      console.log(`${image}: ${result.secure_url}`);
    } catch (error) {
      console.error(`Error uploading ${image}:`, error);
    }
  }
}

uploadImages();
