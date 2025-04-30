import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

async function compressSpecificImage(fileName: string) {
  const inputPath = path.join(process.cwd(), 'assets', 'images', fileName);
  
  try {
    console.log(`\n📝 Processing: ${fileName}`);
    
    // Read the file into memory
    console.log('Reading file...');
    const inputBuffer = fs.readFileSync(inputPath);
    console.log(`File size: ${formatFileSize(inputBuffer.length)}`);

    // Try to get metadata
    console.log('\nGetting metadata...');
    const metadata = await sharp(inputBuffer).metadata();
    console.log('Metadata:', metadata);

    // Try compression
    console.log('\nAttempting compression...');
    const compressedBuffer = await sharp(inputBuffer)
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    
    console.log(`\nCompressed size: ${formatFileSize(compressedBuffer.length)}`);
    
    // Save if successful
    const backupDir = path.join(process.cwd(), 'backup_images');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    // Backup original
    const backupPath = path.join(backupDir, fileName);
    fs.writeFileSync(backupPath, inputBuffer);
    
    // Save compressed version
    fs.writeFileSync(inputPath, compressedBuffer);
    
    // Update public copy
    const publicPath = path.join(process.cwd(), 'public', 'static', 'assets', 'images', fileName);
    if (fs.existsSync(publicPath)) {
      fs.writeFileSync(publicPath, compressedBuffer);
    }
    
    console.log('✅ Successfully compressed and saved');
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

// Process twin-0.jpg
compressSpecificImage('twin-0.jpg').catch(console.error); 