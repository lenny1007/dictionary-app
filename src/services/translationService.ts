import axios from 'axios';
import { ENV } from '../config/env';

// Remove dotenv import and config
// import * as dotenv from 'dotenv';
// dotenv.config();

interface TranslationResponse {
  data: {
    translations: Array<{
      translatedText: string;
    }>;
  };
}

// Use the environment variable directly
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY;

export const translateToChinese = async (text: string): Promise<string> => {
  try {
    console.log('Translating text:', text);
    console.log('Using API key:', ENV.GOOGLE_TRANSLATE_API_KEY ? 'Present' : 'Missing');
    
    if (!ENV.GOOGLE_TRANSLATE_API_KEY) {
      console.error('API Key is missing');
      throw new Error('Translation API key not configured');
    }

    const response = await axios.post<TranslationResponse>(
      `https://translation.googleapis.com/language/translate/v2?key=${ENV.GOOGLE_TRANSLATE_API_KEY}`,
      {
        q: text,
        target: 'zh-TW',
        source: 'en',
      }
    );

    console.log('Translation response:', response.data);
    
    if (response.data?.data?.translations?.[0]?.translatedText) {
      return response.data.data.translations[0].translatedText;
    } else {
      console.error('Unexpected response format:', response.data);
      throw new Error('Translation format error');
    }
  } catch (error: unknown) {
    console.error('Translation error:', error);
    
    // Check if it's an Axios error with a response
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: unknown; status?: number } };
      console.error('Error response:', axiosError.response?.data);
      console.error('Error status:', axiosError.response?.status);
    }
    
    // Get error message if available
    const errorMessage = error instanceof Error ? error.message : 'Translation failed';
    throw new Error(errorMessage);
  }
}; 