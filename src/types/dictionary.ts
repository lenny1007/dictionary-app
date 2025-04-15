export interface Meaning {
  partOfSpeech: string;
  definitions: string[];
  examples?: string[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: Meaning[];
  translation: string;
  zhuyin?: string;
  pinyin?: string;
} 