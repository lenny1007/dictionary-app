import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DictionaryEntry, Meaning } from '../types/dictionary';

interface SearchResult {
  entry: DictionaryEntry;
  score: number;
}

export class SearchService {
  private static instance: SearchService;
  private dictionary: DictionaryEntry[] = [];
  private readonly SEARCH_HISTORY_KEY = '@search_history';
  private readonly MAX_HISTORY_ITEMS = 20;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const rawDictionary = require('../../assets/gpt_dict.json');
      // Transform the raw dictionary data to match our DictionaryEntry type
      this.dictionary = rawDictionary.map((entry: any) => {
        try {
          if (!entry.word) {
            console.warn('Dictionary entry missing word:', entry);
            return null;
          }

          return {
            word: entry.word,
            phonetic: entry.phonic || '',
            meanings: Array.isArray(entry.definitions) 
              ? entry.definitions.map((def: any) => ({
                  partOfSpeech: def.pos || 'word',
                  definitions: [def.definition || ''],
                  examples: def.example ? [def.example] : []
                }))
              : [{
                  partOfSpeech: 'word',
                  definitions: [''],
                  examples: []
                }],
            translation: entry.paragraph || ''
          };
        } catch (error) {
          console.error('Error transforming dictionary entry:', error, entry);
          return null;
        }
      }).filter(Boolean) as DictionaryEntry[];

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing dictionary:', error);
      throw new Error('Failed to load dictionary');
    }
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().trim();
  }

  private calculateMatchScore(entry: DictionaryEntry, query: string): number {
    const normalizedQuery = this.normalizeText(query);
    let score = 0;

    // Exact word match gets highest score
    if (this.normalizeText(entry.word) === normalizedQuery) {
      score += 100;
    }
    // Word starts with query
    else if (this.normalizeText(entry.word).startsWith(normalizedQuery)) {
      score += 80;
    }
    // Word contains query
    else if (this.normalizeText(entry.word).includes(normalizedQuery)) {
      score += 60;
    }

    // Check definitions
    for (const meaning of entry.meanings) {
      for (const definition of meaning.definitions) {
        if (this.normalizeText(definition).includes(normalizedQuery)) {
          score += 20;
        }
      }
      if (meaning.examples) {
        for (const example of meaning.examples) {
          if (this.normalizeText(example).includes(normalizedQuery)) {
            score += 10;
          }
        }
      }
    }

    // Check translation
    if (entry.translation && this.normalizeText(entry.translation).includes(normalizedQuery)) {
      score += 5;
    }

    return score;
  }

  public async search(query: string): Promise<DictionaryEntry[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const normalizedQuery = this.normalizeText(query);
    if (!normalizedQuery) {
      return [];
    }

    const results = this.dictionary
      .map(entry => ({
        entry,
        score: this.calculateMatchScore(entry, normalizedQuery)
      }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.entry);

    await this.addToSearchHistory(query);
    return results;
  }

  public async getAutocompleteSuggestions(query: string): Promise<DictionaryEntry[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const normalizedQuery = this.normalizeText(query);
    if (!normalizedQuery) {
      return [];
    }

    return this.dictionary
      .filter(entry => this.normalizeText(entry.word).startsWith(normalizedQuery))
      .slice(0, 5);
  }

  public async getSearchHistory(): Promise<string[]> {
    try {
      const history = await AsyncStorage.getItem(this.SEARCH_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }

  private async addToSearchHistory(query: string): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      const normalizedQuery = this.normalizeText(query);
      const newHistory = [normalizedQuery, ...history.filter(item => item !== normalizedQuery)]
        .slice(0, this.MAX_HISTORY_ITEMS);
      await AsyncStorage.setItem(this.SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  }
} 