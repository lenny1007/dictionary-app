import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { DictionaryEntry, IDictionaryDatabaseService } from './dictionaryDatabaseServiceFactory';
import { dictionaryData } from '../data/zhuyinDictionary';

// Only import SQLite for native platforms
let SQLite: any;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

class NativeDictionaryDatabaseService implements IDictionaryDatabaseService {
  private static instance: NativeDictionaryDatabaseService;
  private db: any | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): NativeDictionaryDatabaseService {
    if (!NativeDictionaryDatabaseService.instance) {
      NativeDictionaryDatabaseService.instance = new NativeDictionaryDatabaseService();
    }
    return NativeDictionaryDatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (Platform.OS === 'web') {
        throw new Error('NativeDictionaryDatabaseService should not be used on web platform');
      }

      this.db = SQLite.openDatabaseSync('dictionary.db');
      await this.createTables();
      await this.importDictionaryData();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS dictionary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        translation TEXT NOT NULL,
        zhuyin TEXT,
        pinyin TEXT,
        source TEXT
      );
    `);
  }

  private async processAndInsertData(data: any[], source: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    for (const item of data) {
      await this.db.runAsync(
        'INSERT INTO dictionary (word, translation, zhuyin, pinyin, source) VALUES (?, ?, ?, ?, ?)',
        [item.traditional, item.definition, item.zhuyin, item.pinyin, source]
      );
    }
  }

  private async importDictionaryData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Process and insert the dictionary data
      await this.processAndInsertData(dictionaryData, 'zhuyinDictionary');
    } catch (error) {
      console.error('Error importing dictionary data:', error);
    }
  }

  public async search(query: string): Promise<DictionaryEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    const isChinese = /[\u4e00-\u9fff]/.test(query);
    let results: DictionaryEntry[] = [];

    if (isChinese) {
      results = await this.searchChinese(query);
    } else {
      results = await this.searchWords(query);
    }

    return results;
  }

  private async searchWords(query: string): Promise<DictionaryEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM dictionary WHERE word LIKE ? OR translation LIKE ? OR pinyin LIKE ?',
      [`%${query}%`, `%${query}%`, `%${query}%`]
    ) as DictionaryEntry[];
    return result;
  }

  private async searchChinese(query: string): Promise<DictionaryEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM dictionary WHERE word LIKE ? OR translation LIKE ?',
      [`%${query}%`, `%${query}%`]
    ) as DictionaryEntry[];
    return result;
  }
}

export default NativeDictionaryDatabaseService; 