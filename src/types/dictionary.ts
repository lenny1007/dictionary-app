export interface Meaning {
  partOfSpeech: string;
  definitions: string[];
  examples: string[];
  level?: string | null;
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: Meaning[];
  translation: string;
  zhuyin?: string;
  pinyin?: string;
  audioSrc?: string | null;
} 