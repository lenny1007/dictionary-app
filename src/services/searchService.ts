import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DictionaryEntry, Meaning } from '../types/dictionary';
import { CacheService } from './cacheService';
import { TrieService } from './trieService';

interface SearchResult {
  entry: DictionaryEntry;
  score: number;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export class SearchService {
  private static instance: SearchService;
  private dictionary: DictionaryEntry[] = [];
  private readonly SEARCH_HISTORY_KEY = '@search_history';
  private readonly MAX_HISTORY_ITEMS = 20;
  private isInitialized = false;
  private cacheService: CacheService;
  private trieService: TrieService;
  private readonly DICTIONARY_CACHE_KEY = 'dictionary_data';
  private readonly SEARCH_RESULT_CACHE_KEY = 'search_results';

  private constructor() {
    this.cacheService = CacheService.getInstance({
      key: '@dictionary_cache',
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000
    });
    this.trieService = TrieService.getInstance();
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try to get dictionary from cache first
      const cachedDictionary = await this.cacheService.get<DictionaryEntry[]>(this.DICTIONARY_CACHE_KEY);
      if (cachedDictionary) {
        this.dictionary = cachedDictionary;
        await this.trieService.initialize(this.dictionary);
        this.isInitialized = true;
        return;
      }

      // If not in cache, load from file
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

      // Cache the dictionary data
      await this.cacheService.set(this.DICTIONARY_CACHE_KEY, this.dictionary);
      await this.trieService.initialize(this.dictionary);
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
      score += 1000;
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

  public async search(
    query: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<DictionaryEntry>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const normalizedQuery = this.normalizeText(query);
    if (!normalizedQuery) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        hasMore: false
      };
    }

    // Try to get results from cache
    const cacheKey = `${this.SEARCH_RESULT_CACHE_KEY}:${normalizedQuery}`;
    const cachedResults = await this.cacheService.get<DictionaryEntry[]>(cacheKey);
    
    let results: DictionaryEntry[];
    if (cachedResults) {
      results = cachedResults;
    } else {
      // Use trie for initial search
      const trieResults = this.trieService.search(normalizedQuery);
      
      // If no results from trie, try fuzzy search
      if (trieResults.length === 0) {
        results = this.trieService.fuzzySearch(normalizedQuery);
      } else {
        results = trieResults;
      }

      // Sort results by score
      results = results
        .map(entry => ({
          entry,
          score: this.calculateMatchScore(entry, normalizedQuery)
        }))
        .sort((a, b) => b.score - a.score)
        .map(result => result.entry);

      // Cache the results
      await this.cacheService.set(cacheKey, results);
    }

    // Add to search history
    await this.addToSearchHistory(query);

    // Calculate pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = results.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      total: results.length,
      page,
      pageSize,
      hasMore: endIndex < results.length
    };
  }

  public async getAutocompleteSuggestions(query: string): Promise<DictionaryEntry[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const normalizedQuery = this.normalizeText(query);
    if (!normalizedQuery) {
      return [];
    }

    // Try to get suggestions from cache
    const cacheKey = `autocomplete:${normalizedQuery}`;
    const cachedSuggestions = await this.cacheService.get<DictionaryEntry[]>(cacheKey);
    if (cachedSuggestions) {
      return cachedSuggestions;
    }

    // Use trie for suggestions
    const suggestions = this.trieService.search(normalizedQuery).slice(0, 5);

    // Cache the suggestions
    await this.cacheService.set(cacheKey, suggestions);
    return suggestions;
  }

  private async addToSearchHistory(query: string): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      const newHistory = [query, ...history.filter(item => item !== query)]
        .slice(0, this.MAX_HISTORY_ITEMS);
      await AsyncStorage.setItem(this.SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
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

  public async clearSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }
} 