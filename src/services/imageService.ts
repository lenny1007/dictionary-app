import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Platform } from 'react-native';
import { CacheService } from './cacheService';
import imageMapping from './imageMapping';

console.log('Attempting to load localImages.json...');
const localImages = require('../assets/images/localImages.json');
console.log('localImages loaded:', Object.keys(localImages).length, 'entries');

interface ImageResult {
  url: string | number;  // number for local require(), string for remote URLs
  source: string;
  width: number;
  height: number;
}

interface LocalImages {
  [key: string]: string[];
}

class ImageService {
  private cacheService: CacheService;
  private readonly CACHE_KEY = 'dictionary_images';
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.cacheService = CacheService.getInstance({
      key: this.CACHE_KEY,
      ttl: this.CACHE_TTL,
      maxSize: 100,
      maxTotalSize: 50 * 1024 * 1024, // 50MB
    });
  }

  async getImageForWord(word: string): Promise<ImageResult | null> {
    try {
      console.log('Getting image for word:', word);

      // First check local cache
      const cachedImage = await this.cacheService.get<ImageResult>(`${this.CACHE_KEY}:${word}`);
      if (cachedImage) {
        console.log('Found cached image:', cachedImage);
        return cachedImage;
      }

      // Check local bundled images for common words
      const localImage = await this.getLocalImage(word);
      if (localImage) {
        console.log('Found local image:', localImage);
        return localImage;
      }

      // If no local image, fetch from API
      const apiImage = await this.fetchImageFromAPI(word);
      if (apiImage) {
        console.log('Found API image:', apiImage);
        // Cache the API result
        await this.cacheService.set(`${this.CACHE_KEY}:${word}`, apiImage);
        return apiImage;
      }

      console.log('No image found for word:', word);
      return null;
    } catch (error) {
      console.error('Error getting image for word:', error);
      return null;
    }
  }

  private async getLocalImage(word: string): Promise<ImageResult | null> {
    try {
      // First check if the word exists in our local images registry
      const wordKey = word.toLowerCase();
      if (!localImages[wordKey] || !localImages[wordKey].length) {
        console.log('Word not found in local images registry:', wordKey);
        return null;
      }

      // Get the first available image for this word
      const imageName = localImages[wordKey][0];
      
      // Check if we have this image in our mapping
      if (imageMapping[imageName]) {
        return {
          url: imageMapping[imageName],
          source: 'local',
          width: 300,
          height: 300
        };
      }

      console.log('Image not found in mapping:', imageName);
      return null;
    } catch (error) {
      console.error('Error getting local image:', error);
      return null;
    }
  }

  private async fetchImageFromAPI(word: string): Promise<ImageResult | null> {
    try {
      // Try multiple image services
      const urls = [
        `https://api.dictionaryapi.dev/media/pronunciations/${word.toLowerCase()}.png`,
        `https://source.unsplash.com/300x300/?${word.toLowerCase()}`,
        `https://picsum.photos/300/300?random=${word.toLowerCase()}`
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            return {
              url: response.url,
              source: 'api',
              width: 300,
              height: 300
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch from ${url}:`, error);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching image from API:', error);
      return null;
    }
  }

  async clearImageCache(): Promise<void> {
    await this.cacheService.clear();
  }
}

export const imageService = new ImageService(); 