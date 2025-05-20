import { DictionaryEntry } from '../types/dictionary';
import { CacheService } from './cacheService';
import { TrieService } from './trieService';

export class CambridgeDictionaryService {
  private static instance: CambridgeDictionaryService;
  private dictionary: DictionaryEntry[] = [];
  private isInitialized = false;
  private cacheService: CacheService;
  private trieService: TrieService;
  private readonly DICTIONARY_CACHE_KEY = 'cambridge_dictionary_data';
  private readonly DICTIONARY_ID = 'cambridge';

  private constructor() {
    this.cacheService = CacheService.getInstance({
      key: '@cambridge_dictionary_cache',
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000,
      maxTotalSize: 5000
    });
    this.trieService = TrieService.getInstance();
  }

  public static getInstance(): CambridgeDictionaryService {
    if (!CambridgeDictionaryService.instance) {
      CambridgeDictionaryService.instance = new CambridgeDictionaryService();
    }
    return CambridgeDictionaryService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try to get dictionary from cache first
      const cachedDictionary = await this.cacheService.get<DictionaryEntry[]>(this.DICTIONARY_CACHE_KEY);
      if (cachedDictionary) {
        this.dictionary = cachedDictionary;
        await this.trieService.initialize(this.dictionary, this.DICTIONARY_ID);
        this.isInitialized = true;
        return;
      }

      // If not in cache, load from file
      const rawDictionary = require('../../assets/cambridge_dic_zh_en.json');
      // Transform the raw dictionary data to match our DictionaryEntry type
      this.dictionary = rawDictionary.map((entry: any) => {
        try {
          if (!entry.word) {
            console.warn('Dictionary entry missing word:', entry);
            return null;
          }

          let allTranslations: string[] = [];

          // Handle the new Cambridge dictionary format
          const meanings = entry.meanings?.map((meaning: any) => {
            const definitions: string[] = [];
            const translations: string[] = [];
            const examples: string[] = [];

            // Process definitions and translations
            meaning.definition?.forEach((defGroup: any) => {
              if (Array.isArray(defGroup)) {
                defGroup.forEach((def: any) => {
                  if (Array.isArray(def)) {
                    // English definition is usually the first element
                    if (def[0]) definitions.push(def[0]);
                    // Chinese translation is usually the second element
                    if (def[1]) {
                      translations.push(def[1]);
                      allTranslations.push(def[1]);
                    }
                  }
                });
              }
            });

            // Process examples
            meaning.examples?.forEach((exampleGroup: any) => {
              if (Array.isArray(exampleGroup)) {
                exampleGroup.forEach((example: any) => {
                  if (typeof example === 'string') {
                    examples.push(example);
                  }
                });
              }
            });

            return {
              partOfSpeech: meaning.part_of_speech || 'word',
              definitions: definitions.length > 0 ? definitions : ['暂无中文释义'],
              examples: examples,
              level: meaning.level?.[0] || null
            };
          }) || [{
            partOfSpeech: 'word',
            definitions: ['暂无中文释义'],
            examples: []
          }];

          return {
            word: entry.word,
            phonetic: entry.phonics || '',
            meanings: meanings,
            translation: allTranslations.join('; ') || '',
            audioSrc: entry.audio_src || null
          };
        } catch (error) {
          console.error('Error transforming dictionary entry:', error, entry);
          return null;
        }
      }).filter(Boolean) as DictionaryEntry[];

      // Cache the dictionary data
      await this.cacheService.set(this.DICTIONARY_CACHE_KEY, this.dictionary);
      await this.trieService.initialize(this.dictionary, this.DICTIONARY_ID);
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing cambridge dictionary:', error);
      throw new Error('Failed to load cambridge dictionary');
    }
  }

  private calculateMatchScore(entry: DictionaryEntry, query: string): number {
    const normalizedQuery = query.toLowerCase().trim();
    let score = 0;

    // Exact word match gets highest score
    if (entry.word.toLowerCase() === normalizedQuery) {
      score += 1000;
    }
    // Word starts with query
    else if (entry.word.toLowerCase().startsWith(normalizedQuery)) {
      score += 80;
    }
    // Word contains query
    else if (entry.word.toLowerCase().includes(normalizedQuery)) {
      score += 60;
    }

    // Check definitions
    for (const meaning of entry.meanings) {
      for (const definition of meaning.definitions) {
        if (definition.toLowerCase().includes(normalizedQuery)) {
          score += 20;
        }
      }
      if (meaning.examples) {
        for (const example of meaning.examples) {
          if (example.toLowerCase().includes(normalizedQuery)) {
            score += 10;
          }
        }
      }
    }

    // Check translation
    if (entry.translation && entry.translation.toLowerCase().includes(normalizedQuery)) {
      score += 5;
    }

    return score;
  }

  public async search(query: string): Promise<DictionaryEntry[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return [];
    }

    // Use trie for initial search
    let results = this.trieService.search(normalizedQuery, this.DICTIONARY_ID);
    
    // If no results from trie, try fuzzy search
    if (results.length === 0) {
      results = this.trieService.fuzzySearch(normalizedQuery, this.DICTIONARY_ID);
    }

    // Sort results by match score
    results = results
      .map(entry => ({ entry, score: this.calculateMatchScore(entry, normalizedQuery) }))
      .sort((a, b) => b.score - a.score)
      .map(result => result.entry);

    return results;
  }
} 