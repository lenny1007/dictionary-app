import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheConfig {
  key: string;
  ttl: number; // Time to live in milliseconds
  maxSize: number;
  maxTotalSize: number; // Maximum total size in bytes
  fallbackStorage?: 'memory' | 'disk' | 'both';
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number;
  lastAccessed: number;
}

export class CacheService {
  private static instance: CacheService;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private diskCache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private totalSize: number = 0;

  private constructor(config: CacheConfig) {
    this.config = {
      ...config,
      fallbackStorage: config.fallbackStorage || 'both'
    };
  }

  public static getInstance(config: CacheConfig = {
    key: '@dictionary_cache',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 1000,
    maxTotalSize: 5 * 1024 * 1024 // 5MB
  }): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(config);
    }
    return CacheService.instance;
  }

  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch (error) {
      console.error('Error calculating size:', error);
      return 0;
    }
  }

  private async cleanupCache(): Promise<void> {
    // Sort entries by last accessed time (oldest first)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    // Remove oldest entries until we're under the size limit
    while (this.totalSize > this.config.maxTotalSize && entries.length > 0) {
      const [key] = entries.shift()!;
      await this.evictEntry(key);
    }
  }

  private async evictEntry(key: string): Promise<void> {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      this.memoryCache.delete(key);

      // If fallback storage is enabled, move to disk
      if (this.config.fallbackStorage === 'disk' || this.config.fallbackStorage === 'both') {
        try {
          this.diskCache.set(key, entry);
          await AsyncStorage.setItem(key, JSON.stringify(entry));
        } catch (error) {
          console.warn('Failed to move entry to disk cache:', error);
        }
      }
    }
  }

  public async set<T>(key: string, data: T): Promise<void> {
    const size = this.calculateSize(data);
    
    // Check if adding this entry would exceed the total size limit
    if (this.totalSize + size > this.config.maxTotalSize) {
      await this.cleanupCache();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      size,
      lastAccessed: Date.now()
    };

    try {
      // Try to store in memory first
      this.memoryCache.set(key, entry);
      this.totalSize += size;

      // If fallback storage is enabled, also store on disk
      if (this.config.fallbackStorage === 'disk' || this.config.fallbackStorage === 'both') {
        await AsyncStorage.setItem(key, JSON.stringify(entry));
      }
    } catch (error) {
      console.warn('Failed to store in memory, falling back to disk:', error);
      
      // If memory storage fails, try disk storage
      if (this.config.fallbackStorage === 'disk' || this.config.fallbackStorage === 'both') {
        try {
          this.diskCache.set(key, entry);
          await AsyncStorage.setItem(key, JSON.stringify(entry));
        } catch (diskError) {
          console.error('Failed to store in disk cache:', diskError);
          throw new Error('Cache storage failed');
        }
      }
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      memoryEntry.lastAccessed = Date.now();
      return memoryEntry.data as T;
    }

    // If not in memory, check disk cache
    if (this.config.fallbackStorage === 'disk' || this.config.fallbackStorage === 'both') {
      try {
        const diskEntry = this.diskCache.get(key) || await this.getFromDisk(key);
        if (diskEntry && !this.isExpired(diskEntry)) {
          // Move back to memory if possible
          try {
            this.memoryCache.set(key, diskEntry);
            this.totalSize += diskEntry.size;
            diskEntry.lastAccessed = Date.now();
            return diskEntry.data as T;
          } catch (error) {
            console.warn('Failed to move entry back to memory:', error);
            return diskEntry.data as T;
          }
        }
      } catch (error) {
        console.error('Error retrieving from disk cache:', error);
      }
    }

    return null;
  }

  private async getFromDisk(key: string): Promise<CacheEntry<any> | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const entry = JSON.parse(data);
        this.diskCache.set(key, entry);
        return entry;
      }
    } catch (error) {
      console.error('Error reading from disk:', error);
    }
    return null;
  }

  public async invalidate(key: string): Promise<void> {
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      this.totalSize -= memoryEntry.size;
    }

    this.memoryCache.delete(key);
    this.diskCache.delete(key);

    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  public async clear(): Promise<void> {
    this.memoryCache.clear();
    this.diskCache.clear();
    this.totalSize = 0;

    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > this.config.ttl;
  }
} 