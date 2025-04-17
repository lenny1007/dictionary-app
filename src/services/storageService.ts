import AsyncStorage from '@react-native-async-storage/async-storage';
import { DictionaryEntry } from '../types/dictionary';

const FAVORITES_KEY = '@dictionary_favorites';
const RECENT_SEARCHES_KEY = '@dictionary_recent_searches';
const MAX_RECENT_SEARCHES = 20;

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Favorites Management
  public async addToFavorites(entry: DictionaryEntry): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      if (!favorites.some(fav => fav.word === entry.word)) {
        favorites.unshift(entry);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  }

  public async removeFromFavorites(word: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const updatedFavorites = favorites.filter(fav => fav.word !== word);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  }

  public async getFavorites(): Promise<DictionaryEntry[]> {
    try {
      const favorites = await AsyncStorage.getItem(FAVORITES_KEY);
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  }

  public async isFavorite(word: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.some(fav => fav.word === word);
  }

  // Recent Searches Management
  public async addToRecentSearches(entry: DictionaryEntry): Promise<void> {
    try {
      const recentSearches = await this.getRecentSearches();
      const updatedSearches = recentSearches.filter(search => search.word !== entry.word);
      updatedSearches.unshift(entry);
      
      // Keep only the most recent searches
      if (updatedSearches.length > MAX_RECENT_SEARCHES) {
        updatedSearches.length = MAX_RECENT_SEARCHES;
      }
      
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
    } catch (error) {
      console.error('Error adding to recent searches:', error);
      throw error;
    }
  }

  public async getRecentSearches(): Promise<DictionaryEntry[]> {
    try {
      const recentSearches = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      return recentSearches ? JSON.parse(recentSearches) : [];
    } catch (error) {
      console.error('Error getting recent searches:', error);
      return [];
    }
  }

  public async clearRecentSearches(): Promise<void> {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
      throw error;
    }
  }
} 