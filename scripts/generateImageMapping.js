const fs = require('fs');
const path = require('path');

// Directory containing the images
const imagesDir = path.join(__dirname, '../src/assets/images');

// Output file path
const outputFile = path.join(__dirname, '../src/services/imageMapping.ts');

// Get all jpg and png files
const imageFiles = fs.readdirSync(imagesDir)
  .filter(file => file.endsWith('.jpg') || file.endsWith('.png'));

// Generate the mapping object
const mappingContent = `// This file is auto-generated. Do not edit manually.
const imageMapping: { [key: string]: any } = {
${imageFiles.map(file => `  '${file}': require('../assets/images/${file}'),`).join('\n')}
};

export default imageMapping;
`;

// Write the file
fs.writeFileSync(outputFile, mappingContent);
console.log(`Generated image mapping for ${imageFiles.length} images`); 