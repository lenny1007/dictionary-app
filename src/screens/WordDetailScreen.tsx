import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { DictionaryEntry, fetchWordDefinition } from '../services/dictionaryService';
import { translateToChinese } from '../services/translationService';
import { Audio } from 'expo-av';

type WordDetailScreenRouteProp = RouteProp<RootStackParamList, 'WordDetail'>;

interface TranslationState {
  word: string | null;
  definitions: string[];
  examples: string[];
}

export default function WordDetailScreen() {
  const route = useRoute<WordDetailScreenRouteProp>();
  const { word } = route.params;
  const [data, setData] = useState<DictionaryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslationState>({
    word: null,
    definitions: [],
    examples: [],
  });
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadWord = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchWordDefinition(word);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load word definition');
      } finally {
        setLoading(false);
      }
    };

    loadWord();
  }, [word]);

  useEffect(() => {
    const translateContent = async () => {
      if (!data || data.length === 0) return;

      setTranslating(true);
      setTranslationError(null);
      const entry = data[0];
      
      try {
        console.log('Starting translation for word:', entry.word);
        
        // Translate the word
        const wordTranslation = await translateToChinese(entry.word);
        console.log('Word translation:', wordTranslation);
        
        // Translate definitions and examples
        const definitions = entry.meanings.flatMap(meaning => 
          meaning.definitions.map(def => def.definition)
        );
        const examples = entry.meanings.flatMap(meaning => 
          meaning.definitions
            .filter(def => def.example)
            .map(def => def.example as string)
        );

        console.log('Translating definitions:', definitions);
        const translatedDefinitions = await Promise.all(
          definitions.map(def => translateToChinese(def))
        );
        console.log('Translated definitions:', translatedDefinitions);

        console.log('Translating examples:', examples);
        const translatedExamples = await Promise.all(
          examples.map(example => translateToChinese(example))
        );
        console.log('Translated examples:', translatedExamples);

        setTranslations({
          word: wordTranslation,
          definitions: translatedDefinitions,
          examples: translatedExamples,
        });
      } catch (err) {
        console.error('Translation error:', err);
        setTranslationError('Failed to translate content');
      } finally {
        setTranslating(false);
      }
    };

    if (data && !loading) {
      translateContent();
    }
  }, [data, loading]);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const playSound = async () => {
    try {
      setIsLoading(true);
      
      // First, unload any existing sound
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // Set up audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and play the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('../assets/hello.mp3'), // We'll need to add this file
        { shouldPlay: true }
      );
      
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert(
        'Audio Error',
        'Could not play the pronunciation. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading word definition...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No definition found for "{word}"</Text>
      </View>
    );
  }

  const entry = data[0];
  let definitionIndex = 0;
  let exampleIndex = 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.wordContainer}>
        <Text style={styles.word}>{entry.word}</Text>
        <TouchableOpacity 
          style={styles.speakerButton} 
          onPress={playSound}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.speakerIcon}>🔊</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {translations.word && (
        <Text style={styles.translation}>{translations.word}</Text>
      )}
      
      {entry.phonetic && (
        <View style={styles.phoneticContainer}>
          <Text style={styles.phonetic}>{entry.phonetic}</Text>
        </View>
      )}
      
      {entry.meanings.map((meaning, index) => (
        <View key={index} style={styles.meaningContainer}>
          <View style={styles.partOfSpeechContainer}>
            <Text style={styles.partOfSpeech}>{meaning.partOfSpeech}</Text>
          </View>
          {meaning.definitions.map((definition, defIndex) => {
            const currentDefIndex = definitionIndex++;
            return (
              <View key={defIndex} style={styles.definitionContainer}>
                <View style={styles.definitionContent}>
                  <Text style={styles.definition}>{definition.definition}</Text>
                  {translations.definitions[currentDefIndex] && (
                    <Text style={styles.translation}>
                      {translations.definitions[currentDefIndex]}
                    </Text>
                  )}
                </View>
                {definition.example && (
                  <View style={styles.exampleContainer}>
                    <Text style={styles.exampleLabel}>Example:</Text>
                    <Text style={styles.example}>{definition.example}</Text>
                    {translations.examples[exampleIndex] && (
                      <Text style={styles.translation}>
                        {translations.examples[exampleIndex++]}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
      
      {translating && (
        <View style={styles.translatingContainer}>
          <ActivityIndicator size="small" color="#FF6B6B" />
          <Text style={styles.translatingText}>Translating...</Text>
        </View>
      )}
      
      {translationError && (
        <Text style={styles.errorText}>{translationError}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  word: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2D3436',
    marginRight: 15,
  },
  speakerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  speakerIcon: {
    fontSize: 24,
  },
  translation: {
    fontSize: 20,
    color: '#636E72',
    marginTop: 5,
  },
  phoneticContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  phonetic: {
    fontSize: 18,
    color: '#636E72',
    fontStyle: 'italic',
  },
  meaningContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  partOfSpeechContainer: {
    backgroundColor: '#FFEAA7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  partOfSpeech: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  definitionContainer: {
    marginBottom: 15,
  },
  definitionContent: {
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#74B9FF',
  },
  definition: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2D3436',
    marginBottom: 5,
  },
  exampleContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F1F2F6',
    borderRadius: 8,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 5,
  },
  example: {
    fontSize: 14,
    color: '#636E72',
    fontStyle: 'italic',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#636E72',
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  translatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  translatingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#636E72',
  },
}); 