export interface DictionaryEntry {
  id?: number;
  traditional: string;
  simplified: string;
  pinyin: string;
  zhuyin: string;
  definition: string;
  frequency?: number;
  hskLevel?: number;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DictionaryEntrySearchParams {
  query?: string;
  traditional?: string;
  simplified?: string;
  pinyin?: string;
  zhuyin?: string;
  hskLevel?: number;
  limit?: number;
  offset?: number;
} 