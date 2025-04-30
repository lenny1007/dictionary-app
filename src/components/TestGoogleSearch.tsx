import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet } from 'react-native';
import { imageService } from '../services/imageService';
import { API_KEYS } from '../config/apiKeys';

export const TestGoogleSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Debug log for API keys
    console.log('API Keys Configuration:', {
      hasGoogleApiKey: !!API_KEYS.GOOGLE_CUSTOM_SEARCH_API_KEY,
      hasGoogleEngineId: !!API_KEYS.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
      googleApiKeyLength: API_KEYS.GOOGLE_CUSTOM_SEARCH_API_KEY?.length,
      googleEngineIdLength: API_KEYS.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.length,
    });
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const result = await imageService.testGoogleImageSearch(searchTerm);
      if (result) {
        setImageUrl(result.url as string);
      } else {
        setError('No image found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Google Image Search</Text>
      
      <TextInput
        style={styles.input}
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Enter search term"
      />
      
      <Button
        title={loading ? "Searching..." : "Search"}
        onPress={handleSearch}
        disabled={loading}
      />
      
      {error && <Text style={styles.error}>{error}</Text>}
      
      {imageUrl && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
  imageContainer: {
    marginTop: 20,
    width: '100%',
    height: 300,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  image: {
    width: '100%',
    height: '100%',
  },
}); 