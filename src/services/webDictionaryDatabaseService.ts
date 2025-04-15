import { openDB, IDBPDatabase } from 'idb';
import { DictionaryEntry, IDictionaryDatabaseService } from './dictionaryDatabaseServiceFactory';
import { dictionaryData } from '../data/zhuyinDictionary';

class WebDictionaryDatabaseService implements IDictionaryDatabaseService {
  private static instance: WebDictionaryDatabaseService;
  private db: IDBPDatabase | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): WebDictionaryDatabaseService {
    if (!WebDictionaryDatabaseService.instance) {
      WebDictionaryDatabaseService.instance = new WebDictionaryDatabaseService();
    }
    return WebDictionaryDatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await openDB('dictionary', 1, {
        upgrade(db: IDBPDatabase) {
          if (!db.objectStoreNames.contains('dictionary')) {
            db.createObjectStore('dictionary', { keyPath: 'id', autoIncrement: true });
          }
        },
      });

      await this.importDictionaryData();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async processAndInsertData(data: any[], source: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction('dictionary', 'readwrite');
    const store = tx.objectStore('dictionary');

    for (const item of data) {
      await store.add({
        word: item.traditional,
        translation: item.definition,
        zhuyin: item.zhuyin,
        pinyin: item.pinyin,
        source: source,
      });
    }

    await tx.done;
  }

  private async importDictionaryData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if data is already imported
    const count = await this.db.count('dictionary');
    if (count > 0) return;

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
    const tx = this.db.transaction('dictionary', 'readonly');
    const store = tx.objectStore('dictionary');
    const allEntries = await store.getAll();

    if (isChinese) {
      return allEntries.filter((entry: DictionaryEntry) => 
        entry.word.includes(query) || 
        entry.translation.includes(query) ||
        entry.pinyin.includes(query)
      );
    } else {
      return allEntries.filter((entry: DictionaryEntry) => 
        entry.word.toLowerCase().includes(query.toLowerCase()) || 
        entry.translation.toLowerCase().includes(query.toLowerCase()) ||
        entry.pinyin.toLowerCase().includes(query.toLowerCase())
      );
    }
  }
}

export default WebDictionaryDatabaseService; 