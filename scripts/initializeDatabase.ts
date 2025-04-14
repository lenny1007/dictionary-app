import { databaseService } from '../src/services/databaseService';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

interface RawDictionaryEntry {
  traditional: string;
  simplified: string;
  pinyin: string;
  zhuyin: string;
  definition: string;
}

async function processCSV(filePath: string): Promise<RawDictionaryEntry[]> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    return records as RawDictionaryEntry[];
  } catch (error) {
    console.error('Error processing CSV:', error);
    throw error;
  }
}

async function initializeDatabase() {
  try {
    console.log('Processing CSV data...');
    const csvPath = path.join(process.cwd(), 'assets', 'dict_concised_2014_20250326.csv');
    const entries = await processCSV(csvPath);
    
    console.log('Initializing database...');
    await databaseService.initializeDatabase();
    
    console.log('Importing entries...');
    await databaseService.importEntries(entries);
    
    console.log('Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase(); 