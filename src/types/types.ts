export interface ImageResult {
  url: string;
  source: 'local' | 'google' | 'unsplash' | 'wikimedia';
  word: string;
  width: number;
  height: number;
  requireId?: number;
  timestamp?: number;
}

export type LocalImages = {
  [key: string]: string[];
}; 