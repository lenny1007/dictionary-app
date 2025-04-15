import { Platform } from 'react-native';
import NativeDictionaryDatabaseService from './dictionaryDatabaseService';
import WebDictionaryDatabaseService from './webDictionaryDatabaseService';

export interface DictionaryEntry {
  id: number;
  word: string;
  translation: string;
  zhuyin: string;
  pinyin: string;
  source: string;
}

export interface IDictionaryDatabaseService {
  initialize(): Promise<void>;
  search(query: string): Promise<DictionaryEntry[]>;
}

export function getDictionaryDatabaseService(): IDictionaryDatabaseService {
  if (Platform.OS === 'web') {
    return WebDictionaryDatabaseService.getInstance();
  } else {
    return NativeDictionaryDatabaseService.getInstance();
  }
} 