export interface ImageResult {
  url: string | number;  // number for local require(), string for remote URLs
  source: 'local' | 'wikimedia' | 'google' | 'unsplash';
  width: number;
  height: number;
  timestamp?: number; // Unix timestamp in milliseconds
}

export interface WikimediaImage {
  name: string;
  url: string;
  width: number;
  height: number;
}

export interface GoogleImage {
  link: string;
  image: {
    width: number;
    height: number;
  };
}

export interface UnsplashPhoto {
  urls: {
    regular: string;
  };
} 