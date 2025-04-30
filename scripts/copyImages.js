const fs = require('fs');
const path = require('path');

// Create the public/assets/images directory if it doesn't exist
const publicImagesDir = path.join(__dirname, '../public/assets/images');
if (!fs.existsSync(publicImagesDir)) {
  fs.mkdirSync(publicImagesDir, { recursive: true });
}

// Copy all images from src/assets/images to public/assets/images
const srcImagesDir = path.join(__dirname, '../src/assets/images');
fs.readdirSync(srcImagesDir).forEach(file => {
  if (file.endsWith('.jpg') || file.endsWith('.png')) {
    fs.copyFileSync(
      path.join(srcImagesDir, file),
      path.join(publicImagesDir, file)
    );
  }
});

console.log('Images copied successfully!'); 