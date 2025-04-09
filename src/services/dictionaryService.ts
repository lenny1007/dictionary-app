import axios from 'axios';

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
    synonyms?: string[];
    antonyms?: string[];
  }>;
  sourceUrls: string[];
}

export interface DictionaryError {
  title: string;
  message: string;
  resolution: string;
}

export const fetchWordDefinition = async (word: string): Promise<DictionaryEntry[]> => {
  try {
    const response = await axios.get<DictionaryEntry[]>(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error('Word not found');
    }
    throw new Error('Failed to fetch word definition');
  }
}; 