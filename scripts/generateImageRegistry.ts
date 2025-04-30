import fs from 'fs';
import path from 'path';
import sizeOf from 'image-size';

function isValidJPEG(buffer: Buffer): { isValid: boolean; reason?: string } {
  // Check minimum size
  if (buffer.length < 4) {
    return { isValid: false, reason: 'File too small' };
  }

  // Check for SOI marker (Start of Image)
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    return { isValid: false, reason: 'Missing SOI marker' };
  }

  // Check for JFIF or Exif marker
  if (buffer[2] !== 0xFF || (buffer[3] !== 0xE0 && buffer[3] !== 0xE1)) {
    return { isValid: false, reason: 'Missing JFIF/Exif marker' };
  }

  // Check for valid segment markers
  let i = 4;
  let foundSOF = false;
  let foundSOS = false;

  while (i < buffer.length - 1) {
    if (buffer[i] !== 0xFF) {
      i++;
      continue;
    }

    const marker = buffer[i + 1];
    
    // Check for Start of Frame (SOF) markers
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      foundSOF = true;
      // Try to read dimensions from SOF marker
      try {
        const height = (buffer[i + 5] << 8) | buffer[i + 6];
        const width = (buffer[i + 7] << 8) | buffer[i + 8];
        if (height === 0 || width === 0) {
          return { isValid: false, reason: 'Invalid dimensions in SOF marker' };
        }
      } catch (e) {
        return { isValid: false, reason: 'Failed to read dimensions from SOF marker' };
      }
    }
    
    // Check for Start of Scan (SOS) marker
    if (marker === 0xDA) {
      foundSOS = true;
    }

    // Skip to next marker
    if (marker === 0xDA) { // SOS marker
      i += 2;
      while (i < buffer.length - 1 && !(buffer[i] === 0xFF && buffer[i + 1] !== 0x00)) {
        i++;
      }
    } else {
      i += 2;
      if (i + 1 < buffer.length) {
        const length = (buffer[i] << 8) | buffer[i + 1];
        i += length;
      }
    }
  }

  if (!foundSOF) {
    return { isValid: false, reason: 'Missing SOF marker' };
  }

  if (!foundSOS) {
    return { isValid: false, reason: 'Missing SOS marker' };
  }

  return { isValid: true };
}

// Get all image files from the images directory
const imagesDir = path.join(__dirname, '../assets/images');
const imageFiles = fs.readdirSync(imagesDir)
  .filter(file => file.endsWith('.jpg') || file.endsWith('.png'))
  .filter(file => file !== 'localImages.json' && file !== 'localImages.json.bak');

// Generate the registry code
let registryCode = `// This file is auto-generated. Do not edit manually.
// Generate using: npm run generate-image-registry

export const imageRegistry: { [key: string]: any } = {
`;

let validImages = 0;
let invalidImages: Array<{name: string; reason: string}> = [];

imageFiles.forEach(image => {
  try {
    const imagePath = path.join(imagesDir, image);
    
    // Additional validation: check file size
    const stats = fs.statSync(imagePath);
    if (stats.size === 0) {
      invalidImages.push({ name: image, reason: 'Zero-byte file' });
      return;
    }

    // Read file as buffer and validate dimensions
    const buffer = fs.readFileSync(imagePath);
    if (buffer.length === 0) {
      invalidImages.push({ name: image, reason: 'Empty buffer' });
      return;
    }

    // Check JPG validity for JPG files
    if (image.toLowerCase().endsWith('.jpg') || image.toLowerCase().endsWith('.jpeg')) {
      const validation = isValidJPEG(buffer);
      if (!validation.isValid) {
        invalidImages.push({ name: image, reason: `Invalid JPG format: ${validation.reason}` });
        return;
      }
    }

    try {
      // Use the same image-size package that Metro uses
      const dimensions = sizeOf(buffer);
      if (!dimensions || !dimensions.width || !dimensions.height) {
        invalidImages.push({ name: image, reason: 'Invalid image dimensions' });
        return;
      }
      registryCode += `  '${image}': require('../../assets/images/${image}'),\n`;
      validImages++;
    } catch (sizeError: unknown) {
      const errorMessage = sizeError instanceof Error ? sizeError.message : String(sizeError);
      invalidImages.push({ name: image, reason: `Failed to read dimensions: ${errorMessage}` });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    invalidImages.push({ name: image, reason: `Error processing file: ${errorMessage}` });
  }
});

registryCode += `};

export const defaultImage = require('../../assets/images/dictionary-0.jpg');
`;

// Write the registry file
const outputPath = path.join(__dirname, '../src/services/imageRegistry.ts');
fs.writeFileSync(outputPath, registryCode);

console.log(`\nImage Validation Report:`);
console.log(`------------------------`);
console.log(`Total images processed: ${imageFiles.length}`);
console.log(`Valid images: ${validImages}`);

if (invalidImages.length > 0) {
  console.log(`\nInvalid images found (${invalidImages.length}):`);
  invalidImages.forEach(({name, reason}) => {
    console.log(`- ${name}: ${reason}`);
  });
  console.log('\nPlease fix or remove these images to prevent bundling errors.');
  process.exit(1); // Exit with error if invalid images found
} else {
  console.log('\nAll images are valid.');
  console.log(`Registry generated at: ${outputPath}`);
} 