import Constants from 'expo-constants';

const getGoogleTranslateApiKey = () => {
  // Try to get from process.env first (for development)
  const envKey = process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
  if (envKey) {
    console.log('Using API key from process.env');
    return envKey;
  }

  // Try to get from Constants.expoConfig (for production)
  const configKey = Constants.expoConfig?.extra?.googleTranslateApiKey;
  if (configKey) {
    console.log('Using API key from Constants.expoConfig');
    return configKey;
  }

  console.warn('No Google Translate API key found');
  return undefined;
};

export const ENV = {
  GOOGLE_TRANSLATE_API_KEY: getGoogleTranslateApiKey(),
  OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY
}; 