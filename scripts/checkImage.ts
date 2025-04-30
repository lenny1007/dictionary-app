import * as fs from 'fs';
import * as path from 'path';
import sizeOf from 'image-size';

function isJPEG(buffer: Buffer): boolean {
  if (buffer.length < 2) return false;
  return buffer[0] === 0xFF && buffer[1] === 0xD8;
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function checkImage(filePath: string) {
  try {
    console.log(`\nChecking image: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);
    
    // Check file exists
    if (!fs.existsSync(filePath)) {
      console.error('❌ File does not exist');
      return false;
    }

    // Report file size
    const fileSize = stats.size;
    console.log(`📊 File size: ${formatFileSize(fileSize)}`);
    
    // Metro typically warns about files over 1MB
    if (fileSize > 1024 * 1024) {
      console.error('❌ File size exceeds recommended 1MB limit for Metro bundler');
    }

    // Check JPEG signature
    if (ext === '.jpg' || ext === '.jpeg') {
      if (!isJPEG(buffer)) {
        console.error('❌ Invalid JPEG signature');
        return false;
      }
      console.log('✅ Valid JPEG signature');
    }

    // Check dimensions
    const dimensions = sizeOf(buffer);
    if (!dimensions || !dimensions.width || !dimensions.height) {
      console.error('❌ Invalid image dimensions');
      return false;
    }

    console.log(`✅ Image dimensions: ${dimensions.width}x${dimensions.height}`);

    // Size sanity check
    if (dimensions.width <= 0 || dimensions.height <= 0 || dimensions.width > 10000 || dimensions.height > 10000) {
      console.error(`❌ Suspicious image dimensions`);
      return false;
    }

    // Metro recommendations
    if (dimensions.width > 4096 || dimensions.height > 4096) {
      console.error('❌ Image dimensions exceed Metro\'s recommended maximum of 4096px');
    }

    return true;
  } catch (error: any) {
    console.error(`❌ Error processing image:`, error.message);
    return false;
  }
}

const imagePath = path.join(process.cwd(), 'assets', 'images', 'birch-0.jpg');
checkImage(imagePath); 