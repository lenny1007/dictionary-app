import * as fs from 'fs';
import * as path from 'path';
import sizeOf from 'image-size';

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function moveFile(sourcePath: string, targetDir: string): void {
  try {
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
  } catch (error: any) {
    console.error(`Failed to move file ${sourcePath}: ${error.message}`);
  }
}

function isValidImage(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return false;
    }
    
    const buffer = fs.readFileSync(filePath);
    const dimensions = sizeOf(buffer);
    return !!(dimensions && dimensions.width && dimensions.height);
  } catch (error: any) {
    console.error(`Error validating image ${filePath}: ${error.message}`);
    return false;
  }
}

function updateJsonFile(filePath: string, validImages: Set<string>) {
  if (!fs.existsSync(filePath)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Filter out invalid images
    if (Array.isArray(data)) {
      const filteredData = data.filter(item => !item.endsWith('.jpg') || validImages.has(item));
      fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 2));
      console.log(`✅ Updated ${path.basename(filePath)}`);
    }
  } catch (error: any) {
    console.error(`Error updating ${filePath}: ${error.message}`);
  }
}

function updateSourceFile(filePath: string, validImages: Set<string>) {
  if (!fs.existsSync(filePath)) return;
  
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Find all image references
    const regex = /'([^']+\.(jpg|jpeg|png|gif))': require\('[^']+'\)/gi;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const imageName = match[1];
      if (!validImages.has(imageName)) {
        content = content.replace(
          new RegExp(`\\s*'${imageName}': require\\('[^']+'\\),?\\n?`),
          ''
        );
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated ${path.basename(filePath)}`);
    }
  } catch (error: any) {
    console.error(`Error updating ${filePath}: ${error.message}`);
  }
}

function cleanImageReferences() {
  const rootDir = process.cwd();
  const assetsDir = path.join(rootDir, 'assets', 'images');
  const invalidImagesDir = path.join(rootDir, 'invalid_images');
  
  console.log(`\n🔍 Scanning directory: ${assetsDir}`);
  
  // Ensure directories exist
  ensureDirectoryExists(invalidImagesDir);
  if (!fs.existsSync(assetsDir)) {
    console.error(`❌ Assets directory not found: ${assetsDir}`);
    process.exit(1);
  }

  // Get list of actual valid images
  const validImages = new Set<string>();
  const invalidImages = new Set<string>();
  const files = fs.readdirSync(assetsDir);
  
  files.forEach(file => {
    if (!/\.(jpg|jpeg|png|gif)$/i.test(file)) return;
    
    const fullPath = path.join(assetsDir, file);
    if (isValidImage(fullPath)) {
      validImages.add(file);
    } else {
      invalidImages.add(file);
      console.log(`🔄 Moving invalid image: ${file} to ${invalidImagesDir}`);
      moveFile(fullPath, invalidImagesDir);
    }
  });

  // Update source files
  const sourceFiles = [
    path.join(rootDir, 'src', 'services', 'imageMapping.ts'),
    path.join(rootDir, 'src', 'services', 'imageRegistry.ts'),
    path.join(rootDir, 'imageRegistry.ts')
  ];
  
  sourceFiles.forEach(file => updateSourceFile(file, validImages));

  // Update JSON files
  updateJsonFile(path.join(assetsDir, 'localImages.json'), validImages);
  updateJsonFile(path.join(rootDir, 'public', 'static', 'assets', 'images', 'localImages.json'), validImages);

  // Update text files
  ['image_list.txt', 'image_mapping.txt'].forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const filteredLines = lines.filter(line => {
        const imageName = line.split('|').pop()?.trim();
        return !imageName?.endsWith('.jpg') || validImages.has(imageName);
      });
      fs.writeFileSync(filePath, filteredLines.join('\n'));
      console.log(`✅ Updated ${file}`);
    }
  });

  console.log('\n📊 Cleanup Report:');
  console.log(`✅ Valid images: ${validImages.size}`);
  console.log(`❌ Invalid images: ${invalidImages.size}`);
  if (invalidImages.size > 0) {
    console.log('\nMoved the following invalid images to invalid_images directory:');
    invalidImages.forEach(img => console.log(`- ${img}`));
  }
}

cleanImageReferences(); 