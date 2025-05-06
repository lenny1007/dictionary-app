import { DictionaryEntry } from '../types/dictionary';
import { CacheService } from './cacheService';
import { TrieService } from './trieService';

export class VoicetubeDictionaryService {
  private static instance: VoicetubeDictionaryService;
  private dictionary: DictionaryEntry[] = [];
  private isInitialized = false;
  private cacheService: CacheService;
  private trieService: TrieService;
  private readonly DICTIONARY_CACHE_KEY = 'voicetube_dictionary_data';

  private constructor() {
    this.cacheService = CacheService.getInstance({
      key: '@voicetube_dictionary_cache',
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000,
      maxTotalSize: 5000
    });
    this.trieService = TrieService.getInstance();
  }

  public static getInstance(): VoicetubeDictionaryService {
    if (!VoicetubeDictionaryService.instance) {
      VoicetubeDictionaryService.instance = new VoicetubeDictionaryService();
    }
    return VoicetubeDictionaryService.instance;
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
      const rawDictionary = require('../../assets/voicetube_dic_zh.json');
      // Transform the raw dictionary data to match our DictionaryEntry type
      this.dictionary = rawDictionary.map((entry: any) => {
        try {
          if (!entry.word) {
            console.warn('Dictionary entry missing word:', entry);
            return null;
          }

          return {
            word: entry.word,
            phonetic: Array.isArray(entry.phonetic) ? entry.phonetic.join('; ') : (entry.phonetic || ''),
            meanings: Array.isArray(entry.meanings)
              ? entry.meanings.map((meaning: any) => ({
                  partOfSpeech: meaning.partOfSpeech || 'word',
                  definitions: [meaning.definition || '暂无中文释义'],
                  examples: entry.sentences || []
                }))
              : [{
                  partOfSpeech: 'word',
                  definitions: ['暂无中文释义'],
                  examples: entry.sentences || []
                }],
            translation: entry.translation || ''
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
      console.error('Error initializing voicetube dictionary:', error);
      throw new Error('Failed to load voicetube dictionary');
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
    let results = this.trieService.search(normalizedQuery);
    
    // If no results from trie, try fuzzy search
    if (results.length === 0) {
      results = this.trieService.fuzzySearch(normalizedQuery);
    }

    // Sort results by match score
    results = results
      .map(entry => ({ entry, score: this.calculateMatchScore(entry, normalizedQuery) }))
      .sort((a, b) => b.score - a.score)
      .map(result => result.entry);

    return results;
  }
} 