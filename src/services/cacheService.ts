import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheConfig {
  key: string;
  ttl: number; // Time to live in milliseconds
  maxSize: number;
  maxTotalSize: number; // Maximum total size in bytes
  fallbackStorage?: 'memory' | 'disk' | 'both';
  compressThreshold?: number; // Size threshold for compression in bytes
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number;
  lastAccessed: number;
  compressed?: boolean;
}

export class CacheService {
  private static instance: CacheService;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private diskCache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private totalSize: number = 0;
  private readonly COMPRESSION_THRESHOLD = 1024 * 1024; // 1MB

  private constructor(config: CacheConfig) {
    this.config = {
      ...config,
      fallbackStorage: config.fallbackStorage || 'both',
      compressThreshold: config.compressThreshold || this.COMPRESSION_THRESHOLD
    };
  }

  public static getInstance(config: CacheConfig = {
    key: '@dictionary_cache',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 100,
    maxTotalSize: 2 * 1024 * 1024 // 2MB
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

  private compressData(data: any): string {
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.error('Error compressing data:', error);
      return JSON.stringify({ error: 'Compression failed' });
    }
  }

  private decompressData(compressed: string): any {
    try {
      return JSON.parse(compressed);
    } catch (error) {
      console.error('Error decompressing data:', error);
      return null;
    }
  }

  private async cleanupCache(): Promise<void> {
    // Sort entries by last accessed time (oldest first)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed) as [string, CacheEntry<any>][];

    // Remove oldest entries until we're under the size limit
    for (const [key] of entries) {
      if (this.totalSize <= this.config.maxTotalSize) {
        break;
      }
      await this.evictEntry(key);
    }
  }

  private async evictEntry(key: string): Promise<void> {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      this.memoryCache.delete(key);
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

      // Only store on disk if the data is small enough
      if (size < this.config.compressThreshold) {
        try {
          const compressedData = this.compressData(entry);
          await AsyncStorage.setItem(key, compressedData);
        } catch (diskError) {
          console.warn('Failed to store in disk cache:', diskError);
          // Continue with memory-only storage
        }
      }
    } catch (error) {
      console.warn('Failed to store in memory:', error);
      throw new Error('Cache storage failed');
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
    try {
      const compressedData = await AsyncStorage.getItem(key);
      if (compressedData) {
        const data = this.decompressData(compressedData);
        if (data) {
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            size: this.calculateSize(data),
            lastAccessed: Date.now()
          };
          
          // Try to store in memory if there's space
          if (this.totalSize + entry.size <= this.config.maxTotalSize) {
            this.memoryCache.set(key, entry);
            this.totalSize += entry.size;
          }
          
          return data as T;
        }
      }
    } catch (error) {
      console.error('Error retrieving from disk cache:', error);
    }

    return null;
  }

  public async invalidate(key: string): Promise<void> {
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      this.totalSize -= memoryEntry.size;
    }

    this.memoryCache.delete(key);

    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  public async clear(): Promise<void> {
    this.memoryCache.clear();
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