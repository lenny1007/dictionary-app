import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Platform } from 'react-native';
import { CacheService } from './cacheService';
import imageMapping from './imageMapping';
import { API_KEYS } from '../config/apiKeys';
import { ImageResult, LocalImages } from '../types/types';
import localImages from '../assets/images/localImages.json';

console.log('Attempting to load localImages.json...');
console.log('localImages loaded:', Object.keys(localImages).length, 'entries');

// Test local image loading
const testLocalImage = imageMapping['aardvark-0.jpg'];
console.log('Test local image require result:', testLocalImage);

interface WikimediaImage {
  name: string;
  url: string;
  width: number;
  height: number;
}

interface GoogleImage {
  link: string;
  image: {
    width: number;
    height: number;
  };
}

interface UnsplashPhoto {
  urls: {
    regular: string;
  };
}

export class ImageService {
  private cacheService: CacheService;
  private readonly CACHE_PREFIX = 'dictionary_images';
  private readonly CACHE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly UNSPLASH_BASE_URL = 'https://api.unsplash.com';
  private readonly WIKIMEDIA_BASE_URL = 'https://commons.wikimedia.org/w/api.php';
  private readonly GOOGLE_CUSTOM_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1';

  constructor() {
    this.cacheService = CacheService.getInstance({
      key: this.CACHE_PREFIX,
      ttl: this.CACHE_TTL,
      maxSize: 100,
      maxTotalSize: 50 * 1024 * 1024, // 50MB
    });
  }

  async getImageForWord(word: string): Promise<ImageResult | null> {
    try {
      console.log('Getting image for word:', word);

      // First check local cache
      const cacheKey = `${this.CACHE_PREFIX}:${word}`;
      console.log('Checking cache with key:', cacheKey);
      const cachedImage = await this.cacheService.get<ImageResult>(cacheKey);
      if (cachedImage && cachedImage.url) {
        console.log('Found cached image:', {
          url: cachedImage.url,
          source: cachedImage.source,
          width: cachedImage.width,
          height: cachedImage.height
        });
        return cachedImage;
      }
      console.log('No cached image found');

      // Check local bundled images for common words
      const localImage = await this.getLocalImage(word);
      if (localImage) {
        console.log('Found local image:', localImage);
        const imageWithTimestamp = {
          ...localImage,
          timestamp: Date.now()
        };
        await this.cacheService.set(cacheKey, imageWithTimestamp);
        return localImage;
      }

      // If no local image, fetch from API
      const apiImages = await this.fetchImageFromAPI(word);
      if (apiImages.length > 0) {
        console.log('Found API images:', apiImages);
        // Cache the API result with timestamp
        const imageWithTimestamp = {
          ...apiImages[0],
          timestamp: Date.now()
        };
        console.log('Caching API result with key:', cacheKey);
        await this.cacheService.set(cacheKey, imageWithTimestamp);
        console.log('Cache set complete');
        return apiImages[0];
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
      const wordKey = word.toLowerCase();
      console.log('Checking local images for word:', wordKey);
      
      const localImageFiles = (localImages as LocalImages)[wordKey];
      if (!localImageFiles || !localImageFiles.length) {
        console.log('Word not found in local images registry:', wordKey);
        return null;
      }

      const imageName = localImageFiles[0];
      console.log('Found local image name:', imageName);
      
      if (!imageMapping[imageName]) {
        console.log('Image not found in mapping:', imageName);
        return null;
      }

      // Get the image from the mapping
      const imageSource = imageMapping[imageName];
      console.log('Found image source:', imageSource);

      return {
        url: imageName,
        source: 'local',
        word,
        width: 300,  // We'll use fixed dimensions for local images
        height: 300
      };
    } catch (error) {
      console.error('Error getting local image:', error);
      return null;
    }
  }

  async fetchImageFromAPI(word: string): Promise<ImageResult[]> {
    const results: ImageResult[] = [];
    try {
      // Try Wikimedia Commons first (free, no API key needed)
      const wikimediaUrl = `https://corsproxy.io/?${encodeURIComponent(
        `${this.WIKIMEDIA_BASE_URL}?action=query&list=allimages&ailimit=3&aiprop=url|size&format=json&aisort=name&aifrom=${encodeURIComponent(word.toLowerCase())}`
      )}`;
      
      console.log('Fetching from Wikimedia Commons:', wikimediaUrl);
      
      try {
        const wikimediaResponse = await fetch(wikimediaUrl, {
          headers: {
            'Accept': 'application/json',
          }
        });
        if (wikimediaResponse.ok) {
          const data = await wikimediaResponse.json();
          console.log('Wikimedia response:', JSON.stringify(data, null, 2));
          
          const images = data.query?.allimages as WikimediaImage[];
          if (images && images.length > 0) {
            images.forEach(image => {
              console.log('Found Wikimedia image:', {
                name: image.name,
                url: image.url,
                dimensions: `${image.width}x${image.height}`
              });
              
              results.push({
                url: image.url,
                source: 'wikimedia',
                word,
                width: image.width || 300,
                height: image.height || 300
              });
            });
          } else {
            console.log('No images found in Wikimedia response');
          }
        } else {
          console.warn('Wikimedia API request failed:', wikimediaResponse.status);
        }
      } catch (error) {
        console.warn('Failed to fetch from Wikimedia:', error);
      }

      // Try Google Custom Search if configured
      if (API_KEYS.GOOGLE_CUSTOM_SEARCH_API_KEY && API_KEYS.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
        const googleUrl = `${this.GOOGLE_CUSTOM_SEARCH_URL}?key=${API_KEYS.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${API_KEYS.GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=${encodeURIComponent(word.toLowerCase())}&searchType=image&num=3`;
        
        console.log('Fetching from Google Custom Search:', googleUrl);
        
        try {
          const googleResponse = await fetch(googleUrl);
          if (googleResponse.ok) {
            const data = await googleResponse.json();
            console.log('Google Custom Search response:', JSON.stringify(data, null, 2));
            
            if (data.items && data.items.length > 0) {
              (data.items as GoogleImage[]).forEach(image => {
                results.push({
                  url: image.link,
                  source: 'google',
                  word,
                  width: image.image.width || 300,
                  height: image.image.height || 300
                });
              });
            }
          }
        } catch (error) {
          console.warn('Failed to fetch from Google Custom Search:', error);
        }
      }

      // If configured, try Unsplash
      if (API_KEYS.UNSPLASH_ACCESS_KEY) {
        const unsplashUrl = `${this.UNSPLASH_BASE_URL}/photos/random?query=${encodeURIComponent(word.toLowerCase())}&count=3&client_id=${API_KEYS.UNSPLASH_ACCESS_KEY}`;
        try {
          const unsplashResponse = await fetch(unsplashUrl);
          if (unsplashResponse.ok) {
            const data = await unsplashResponse.json();
            if (Array.isArray(data)) {
              (data as UnsplashPhoto[]).forEach(photo => {
                results.push({
                  url: photo.urls.regular,
                  source: 'unsplash',
                  word,
                  width: 300,
                  height: 300
                });
              });
            }
          }
        } catch (error) {
          console.warn('Failed to fetch from Unsplash:', error);
        }
      }

      console.log(`Found ${results.length} images for word:`, word);
      return results;
    } catch (error) {
      console.error('Error fetching images from API:', error);
      return results;
    }
  }

  async clearImageCache(): Promise<void> {
    await this.cacheService.clear();
  }

  async testGoogleImageSearch(word: string): Promise<ImageResult | null> {
    console.log('Testing Google Custom Search for word:', word);
    
    if (!API_KEYS.GOOGLE_CUSTOM_SEARCH_API_KEY || !API_KEYS.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
      console.error('Google Custom Search API keys are not configured');
      return null;
    }

    const googleUrl = `${this.GOOGLE_CUSTOM_SEARCH_URL}?key=${API_KEYS.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${API_KEYS.GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=${encodeURIComponent(word.toLowerCase())}&searchType=image&num=1`;
    
    console.log('Google Custom Search URL:', googleUrl);
    
    try {
      const response = await fetch(googleUrl);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Full response:', JSON.stringify(data, null, 2));
        
        if (data.items && data.items.length > 0) {
          const image = data.items[0];
          console.log('Found image:', {
            url: image.link,
            width: image.image.width,
            height: image.image.height,
            title: image.title
          });
          
          return {
            url: image.link,
            source: 'google',
            word,
            width: image.image.width || 300,
            height: image.image.height || 300
          };
        } else {
          console.log('No images found in response');
        }
      } else {
        console.error('API request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      }
    } catch (error) {
      console.error('Error during Google Custom Search:', error);
    }
    
    return null;
  }

  async getImagesForWord(word: string): Promise<ImageResult[]> {
    const images: ImageResult[] = [];
    
    // Get local images
    const localImageFiles = (localImages as LocalImages)[word.toLowerCase()];
    if (localImageFiles) {
      images.push(...localImageFiles.map(filename => ({
        url: filename,
        source: 'local' as const,
        word,
        width: 300,
        height: 300
      })));
    }

    // Get remote images
    try {
      const remoteImages = await this.fetchImageFromAPI(word);
      images.push(...remoteImages);
    } catch (err) {
      console.error('Error fetching remote images:', err);
    }

    return images;
  }
}

export const imageService = new ImageService(); 