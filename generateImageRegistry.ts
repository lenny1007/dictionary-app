import * as fs from 'fs';
import * as path from 'path';
import sizeOf from 'image-size';

interface ImageDimensions {
  width: number;
  height: number;
}

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function moveFile(sourcePath: string, targetDir: string): void {
  const fileName = path.basename(sourcePath);
  const targetPath = path.join(targetDir, fileName);
  
  // If file with same name exists, append timestamp
  if (fs.existsSync(targetPath)) {
    const timestamp = new Date().getTime();
    const [name, ext] = fileName.split('.');
    const newFileName = `${name}_${timestamp}.${ext}`;
    fs.renameSync(sourcePath, path.join(targetDir, newFileName));
  } else {
    fs.renameSync(sourcePath, targetPath);
  }
}

function isJPEG(buffer: Buffer): boolean {
  // Check JPEG file signature (FF D8)
  if (buffer.length < 2) return false;
  return buffer[0] === 0xFF && buffer[1] === 0xD8;
}

function isValidImage(filePath: string): boolean {
  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Additional JPEG validation
    if (ext === '.jpg' || ext === '.jpeg') {
      if (!isJPEG(buffer)) {
        console.error(`❌ Invalid JPEG signature for file: ${filePath}`);
        return false;
      }
    }

    const dimensions = sizeOf(buffer);
    if (!dimensions || !dimensions.width || !dimensions.height) {
      console.error(`❌ Invalid image dimensions for file: ${filePath}`);
      return false;
    }

    // Additional size sanity check
    if (dimensions.width <= 0 || dimensions.height <= 0 || dimensions.width > 10000 || dimensions.height > 10000) {
      console.error(`❌ Suspicious image dimensions (${dimensions.width}x${dimensions.height}) for file: ${filePath}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`❌ Error processing image ${filePath}:`, error.message);
    return false;
  }
}

function generateImageRegistry() {
  const validImages: string[] = [];
  const invalidImages: string[] = [];
  const rootDir = process.cwd();
  const assetsDir = path.join(rootDir, 'assets', 'images');
  const invalidImagesDir = path.join(rootDir, 'invalid_images');
  
  console.log(`📂 Processing images from: ${assetsDir}`);
  
  // Ensure directories exist
  ensureDirectoryExists(invalidImagesDir);

  if (!fs.existsSync(assetsDir)) {
    console.error(`❌ Assets directory not found: ${assetsDir}`);
    process.exit(1);
  }

  function processDirectory(dir: string) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      // Skip the invalid_images directory
      if (fullPath === invalidImagesDir) continue;

      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (/\.(jpg|jpeg|png|gif)$/i.test(item)) {
        if (isValidImage(fullPath)) {
          // Store paths relative to the root directory
          const relativePath = path.relative(rootDir, fullPath)
            .split(path.sep)
            .join('/'); // Normalize path separators for consistency
          validImages.push(relativePath);
        } else {
          invalidImages.push(fullPath);
          // Move invalid image to invalid_images directory
          moveFile(fullPath, invalidImagesDir);
          console.log(`🔄 Moved invalid image: ${item} to ${invalidImagesDir}`);
        }
      }
    }
  }

  processDirectory(assetsDir);

  // Generate the registry
  const registryContent = `// This file is auto-generated. Do not edit manually.
export const imageRegistry = ${JSON.stringify(validImages, null, 2)};
`;

  const registryPath = path.join(rootDir, 'imageRegistry.ts');
  fs.writeFileSync(registryPath, registryContent, 'utf-8');

  console.log(`\n📊 Image Registry Generation Report:`);
  console.log(`✅ Valid images: ${validImages.length}`);
  if (invalidImages.length > 0) {
    console.log(`\n❌ ${invalidImages.length} invalid images moved to ${invalidImagesDir}:`);
    invalidImages.forEach(img => console.log(`- ${path.basename(img)}`));
    console.log('\n⚠️  Please review these images and either fix or remove them.');
  }
  console.log(`\n💾 Registry saved to: ${registryPath}`);
}

generateImageRegistry(); 