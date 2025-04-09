import axios from 'axios';
import Constants from 'expo-constants';

// Remove dotenv import and config
// import * as dotenv from 'dotenv';
// dotenv.config();

// Use the environment variable directly
const API_KEY = Constants.expoConfig?.extra?.googleTranslateApiKey;

export const translateToChinese = async (text: string): Promise<string> => {
  try {
    console.log('Translating text:', text);
    console.log('API Key:', API_KEY);
    
    if (!API_KEY) {
      console.error('API Key is missing');
      return 'Translation API key not configured';
    }

    const response = await axios.get('https://translation.googleapis.com/language/translate/v2', {
      params: {
        q: text,
        target: 'zh-TW',
        source: 'en',
        key: API_KEY,
      },
    });

    console.log('Translation response:', response.data);
    
    if (response.data && response.data.data && response.data.data.translations) {
      return response.data.data.translations[0].translatedText;
    } else {
      console.error('Unexpected response format:', response.data);
      return 'Translation format error';
    }
  } catch (error) {
    console.error('Translation error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
    }
    return 'Translation not available';
  }
}; 