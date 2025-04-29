export interface ImageResult {
  url: string;
  source: 'local' | 'wikimedia' | 'google' | 'unsplash';
  word: string;
  width?: number;
  height?: number;
  timestamp?: number;
}

export interface LocalImages {
  [key: string]: string[];
} 