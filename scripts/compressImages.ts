import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const QUALITY_STEPS = [80, 60, 40, 20]; // Progressive quality reduction steps

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

async function compressImage(inputPath: string): Promise<void> {
  try {
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️ File not found: ${inputPath}`);
      return;
    }

    const stats = fs.statSync(inputPath);
    const originalSize = stats.size;
    const fileName = path.basename(inputPath);
    
    // Skip if file is already under max size
    if (originalSize <= MAX_FILE_SIZE) {
      console.log(`✅ ${fileName} (${formatFileSize(originalSize)}) - Already within size limit`);
      return;
    }

    console.log(`\n📝 Processing: ${fileName}`);
    console.log(`Original size: ${formatFileSize(originalSize)}`);

    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backup_images');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    // Read the original file into memory
    const inputBuffer = fs.readFileSync(inputPath);

    // Get image metadata
    const metadata = await sharp(inputBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      console.error('❌ Could not read image dimensions');
      return;
    }

    console.log(`📐 Original dimensions: ${metadata.width}x${metadata.height}`);

    // Try different quality settings until file size is under limit
    let compressedBuffer: Buffer | null = null;
    let finalQuality: number | null = null;

    for (const quality of QUALITY_STEPS) {
      try {
        console.log(`   Trying quality: ${quality}%`);
        
        const buffer = await sharp(inputBuffer)
          .jpeg({ quality, mozjpeg: true })
          .resize(metadata.width, metadata.height)
          .toBuffer();

        if (buffer.length <= MAX_FILE_SIZE) {
          compressedBuffer = buffer;
          finalQuality = quality;
          break;
        } else {
          console.log(`   ⚠️ File still too large at ${quality}% quality: ${formatFileSize(buffer.length)}`);
        }
      } catch (error: any) {
        console.error(`   ⚠️ Failed at quality ${quality}%:`, error.message);
        continue;
      }
    }

    if (compressedBuffer && finalQuality !== null) {
      // Create backup first
      const backupPath = path.join(backupDir, fileName);
      fs.writeFileSync(backupPath, inputBuffer);

      // Write the compressed version
      fs.writeFileSync(inputPath, compressedBuffer);
      const newSize = fs.statSync(inputPath).size;

      console.log(`✅ Successfully compressed:`);
      console.log(`   - Quality: ${finalQuality}%`);
      console.log(`   - New size: ${formatFileSize(newSize)}`);
      console.log(`   - Reduction: ${Math.round((1 - newSize / originalSize) * 100)}%`);
      console.log(`   - Backup saved: ${backupPath}`);

      // If this is in assets/images, also compress the copy in public/static/assets/images
      if (inputPath.includes('assets\\images')) {
        const publicPath = inputPath.replace('assets\\images', 'public\\static\\assets\\images');
        if (fs.existsSync(publicPath)) {
          console.log(`\n📝 Updating public copy: ${publicPath}`);
          fs.writeFileSync(publicPath, compressedBuffer);
        }
      }
    } else {
      console.error('❌ Could not compress to target size with any quality setting');
    }

  } catch (error: any) {
    console.error(`❌ Error processing ${path.basename(inputPath)}:`, error.message);
  }
}

async function processDirectory() {
  const rootDir = process.cwd();
  const imagesDirs = [
    path.join(rootDir, 'assets', 'images'),
    path.join(rootDir, 'public', 'static', 'assets', 'images')
  ];

  let totalOversized = 0;
  let totalProcessed = 0;

  for (const imagesDir of imagesDirs) {
    if (!fs.existsSync(imagesDir)) {
      console.log(`⚠️ Directory not found: ${imagesDir}`);
      continue;
    }

    console.log(`\n🔍 Scanning directory: ${imagesDir}`);

    const files = fs.readdirSync(imagesDir);
    let oversizedCount = 0;
    let processedCount = 0;

    for (const file of files) {
      if (!/\.(jpg|jpeg)$/i.test(file)) continue;

      const filePath = path.join(imagesDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.size > MAX_FILE_SIZE) {
        oversizedCount++;
        await compressImage(filePath);
        processedCount++;
      }
    }

    totalOversized += oversizedCount;
    totalProcessed += processedCount;
  }

  console.log(`\n📊 Compression Report:`);
  console.log(`Found ${totalOversized} oversized images`);
  console.log(`Successfully processed: ${totalProcessed}`);
}

// Run the script
processDirectory().catch(console.error); 