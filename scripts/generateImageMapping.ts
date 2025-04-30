import fs from 'fs';
import path from 'path';
import sizeOf from 'image-size';

interface LocalImages {
  [key: string]: string[];
}

// Read the localImages.json file
const localImagesPath = path.join(__dirname, '../assets/images/localImages.json');
const localImages = JSON.parse(fs.readFileSync(localImagesPath, 'utf8')) as LocalImages;

// Get all unique image paths and validate them
const uniqueImages = new Set<string>();
const invalidImages = new Set<string>();

Object.values(localImages).forEach((images: string[]) => {
  images.forEach(image => {
    const imagePath = path.join(__dirname, '../assets/images', image);
    try {
      if (fs.existsSync(imagePath)) {
        // Try to get image dimensions to validate the image
        const dimensions = sizeOf(fs.readFileSync(imagePath));
        if (dimensions && dimensions.width && dimensions.height) {
          uniqueImages.add(image);
        } else {
          invalidImages.add(image);
          console.warn(`Warning: Invalid image dimensions for ${image}`);
        }
      } else {
        invalidImages.add(image);
        console.warn(`Warning: Image file not found: ${image}`);
      }
    } catch (error) {
      invalidImages.add(image);
      console.error(`Error processing image ${image}:`, error);
    }
  });
});

// Generate the mapping code
let mappingCode = `// This file is auto-generated. Do not edit manually.
// Generate using: npm run generate-image-mapping

const imageMapping: { [key: string]: any } = {
`;

uniqueImages.forEach(image => {
  mappingCode += `  '${image}': require('../../assets/images/${image}'),\n`;
});

mappingCode += `};

export default imageMapping;
`;

// Write the mapping file
const outputPath = path.join(__dirname, '../src/services/imageMapping.ts');
fs.writeFileSync(outputPath, mappingCode);

console.log(`Generated image mapping for ${uniqueImages.size} valid images at ${outputPath}`);
if (invalidImages.size > 0) {
  console.log(`\nFound ${invalidImages.size} invalid images:`);
  invalidImages.forEach(image => console.log(`- ${image}`));
} 