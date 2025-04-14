import AsyncStorage from '@react-native-async-storage/async-storage';
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';

export interface DictionaryEntry {
  traditional: string;
  simplified: string;
  pinyin: string;
  zhuyin: string;
  definition: string;
}

interface DictionaryCache {
  [key: string]: DictionaryEntry[];
}

class DatabaseService {
  private static instance: DatabaseService;
  private cache: DictionaryCache = {};
  private readonly STORAGE_KEY = '@dictionary_entries';
  private initialized = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initializeDatabase(): Promise<void> {
    if (this.initialized) return;

    try {
      // Try to load existing data from AsyncStorage
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        this.cache = JSON.parse(storedData);
        this.initialized = true;
        return;
      }

      // If no stored data, initialize empty cache
      this.cache = {};
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  public async importEntries(entries: DictionaryEntry[]): Promise<void> {
    try {
      // Process entries and update cache
      entries.forEach(entry => {
        // Index by traditional characters
        if (!this.cache[entry.traditional]) {
          this.cache[entry.traditional] = [];
        }
        this.cache[entry.traditional].push(entry);

        // Index by simplified characters if different
        if (entry.simplified !== entry.traditional) {
          if (!this.cache[entry.simplified]) {
            this.cache[entry.simplified] = [];
          }
          this.cache[entry.simplified].push(entry);
        }
      });

      // Save to AsyncStorage
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Error importing entries:', error);
      throw error;
    }
  }

  public async findByTraditional(traditional: string): Promise<DictionaryEntry[]> {
    await this.ensureInitialized();
    return this.cache[traditional] || [];
  }

  public async findBySimplified(simplified: string): Promise<DictionaryEntry[]> {
    await this.ensureInitialized();
    return this.cache[simplified] || [];
  }

  public async searchByPinyin(pinyin: string): Promise<DictionaryEntry[]> {
    await this.ensureInitialized();
    const results: DictionaryEntry[] = [];
    Object.values(this.cache).forEach(entries => {
      entries.forEach(entry => {
        if (entry.pinyin.includes(pinyin)) {
          results.push(entry);
        }
      });
    });
    return results;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeDatabase();
    }
  }

  public async clearDatabase(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      this.cache = {};
      this.initialized = false;
    } catch (error) {
      console.error('Error clearing database:', error);
      throw error;
    }
  }
}

export const databaseService = DatabaseService.getInstance(); 