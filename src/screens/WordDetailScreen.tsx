import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { DictionaryEntry, fetchWordDefinition } from '../services/dictionaryService';
import { translateForKids, TranslationResult, CharacterZhuyinPair } from '../services/kidFriendlyTranslationService';
import { Audio } from 'expo-av';
import { translateToChinese } from '../services/translationService';

type WordDetailScreenRouteProp = RouteProp<RootStackParamList, 'WordDetail'>;

interface TranslationState {
  word: TranslationResult | null;
  definitions: TranslationResult[];
  examples: TranslationResult[];
}

interface ZhuyinTextProps {
  pairs: CharacterZhuyinPair[];
}

const ZhuyinText: React.FC<ZhuyinTextProps> = ({ pairs }) => {
  if (!pairs || pairs.length === 0) return null;
  
  return (
    <View style={styles.zhuyinTextContainer}>
      {pairs.map((pair, idx) => {
        // Handle punctuation marks and spaces
        if (!pair.zhuyin) {
          return (
            <Text key={idx} style={[
              styles.characterText,
              styles.punctuationText,
              /\s/.test(pair.character) && styles.spaceText
            ]}>
              {pair.character}
            </Text>
          );
        }

        const zhuyinChars = pair.zhuyin.split('');
        const toneMark = zhuyinChars.find(char => 'ˉˊˇˋ˙'.includes(char));
        const baseChars = zhuyinChars.filter(char => !'ˉˊˇˋ˙'.includes(char));
        const charCount = baseChars.length;
        
        return (
          <View key={idx} style={styles.characterPairContainer}>
            <Text style={styles.characterText}>
              {pair.character}
            </Text>
            <View style={[
              styles.zhuyinContainer,
              charCount === 1 && styles.zhuyinContainerSingle,
              charCount === 2 && styles.zhuyinContainerDouble,
              charCount === 3 && styles.zhuyinContainerTriple
            ]}>
              <View style={[
                styles.zhuyinStack,
                charCount === 1 && styles.zhuyinStackSingle,
                charCount === 2 && styles.zhuyinStackDouble,
                charCount === 3 && styles.zhuyinStackTriple
              ]}>
                {baseChars.map((zhuyinChar, zhuyinIdx) => (
                  <Text key={zhuyinIdx} style={[
                    styles.zhuyinText,
                    charCount === 1 && styles.zhuyinTextSingle,
                    charCount === 3 && styles.zhuyinTextTriple,
                    zhuyinIdx === baseChars.length - 1 && styles.lastZhuyinChar
                  ]}>
                    {zhuyinChar}
                  </Text>
                ))}
                {toneMark && (
                  <Text style={[
                    styles.toneMark,
                    toneMark === '˙' && styles.neutralTone,
                    toneMark !== '˙' && (
                      charCount === 1 ? styles.normalToneSingle :
                      charCount === 2 ? styles.normalToneDouble :
                      styles.normalToneTriple
                    )
                  ]}>
                    {toneMark}
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

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
        const wordTranslation = await translateForKids(entry.word);
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
          definitions.map(def => translateForKids(def))
        );
        console.log('Translated definitions:', translatedDefinitions);

        console.log('Translating examples:', examples);
        const translatedExamples = await Promise.all(
          examples.map(example => translateForKids(example))
        );
        console.log('Translated examples:', translatedExamples);

        setTranslations({
          word: wordTranslation,
          definitions: translatedDefinitions,
          examples: translatedExamples
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

      if (!data || data.length === 0) {
        Alert.alert(
          'Error',
          'Word data is not available.'
        );
        return;
      }

      // Get the first available audio URL from phonetics
      const entry = data[0];
      const audioUrl = entry.phonetics.find(p => p.audio)?.audio;
      
      if (!audioUrl) {
        Alert.alert(
          'Audio Not Available',
          'Pronunciation audio is not available for this word.'
        );
        return;
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
        { uri: audioUrl },
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
        <View style={styles.translationContainer}>
          <ZhuyinText pairs={translations.word.pairs} />
        </View>
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
                    <View style={styles.translationContainer}>
                      <ZhuyinText 
                        pairs={translations.definitions[currentDefIndex].pairs}
                      />
                    </View>
                  )}
                </View>
                {definition.example && (
                  <View style={styles.exampleContainer}>
                    <Text style={styles.exampleLabel}>Example:</Text>
                    <Text style={styles.example}>{definition.example}</Text>
                    {translations.examples[exampleIndex] && (
                      <View style={styles.translationContainer}>
                        <ZhuyinText 
                          pairs={translations.examples[exampleIndex].pairs}
                        />
                      </View>
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
  translationContainer: {
    marginVertical: 5,
  },
  translationText: {
    fontSize: 18,
    color: '#2D3436',
    marginBottom: 2,
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
  zhuyinTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  characterPairContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 16,
    marginBottom: 8,
    height: 32,
  },
  characterText: {
    fontSize: 24,
    color: '#000',
    marginRight: 4,
    lineHeight: 32,
  },
  zhuyinContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    height: 32,
  },
  zhuyinContainerSingle: {
    justifyContent: 'center',
    paddingTop: 4,
  },
  zhuyinContainerDouble: {
    paddingTop: 8,
  },
  zhuyinContainerTriple: {
    paddingTop: 2,
    height: 28,
  },
  zhuyinStack: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: 16,
    position: 'relative',
  },
  zhuyinStackSingle: {
    justifyContent: 'center',
    height: 20,
  },
  zhuyinStackDouble: {
    justifyContent: 'flex-end',
  },
  zhuyinStackTriple: {
    justifyContent: 'space-between',
    height: 26,
  },
  zhuyinText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 11,
    height: 11,
    textAlign: 'center',
    width: '100%',
    marginBottom: 1,
  },
  zhuyinTextSingle: {
    marginBottom: 0,
    height: 14,
    lineHeight: 14,
  },
  zhuyinTextTriple: {
    marginBottom: 0,
    height: 9,
    lineHeight: 9,
  },
  lastZhuyinChar: {
    marginBottom: 0,
  },
  toneMark: {
    fontSize: 14,
    color: '#333',
    position: 'absolute',
    width: 14,
    height: 14,
    textAlign: 'center',
  },
  neutralTone: {
    right: 3,
    top: -12,
    fontSize: 16,
  },
  normalToneSingle: {
    right: -10,
    top: 2,
  },
  normalToneDouble: {
    right: -10,
    bottom: 0,
  },
  normalToneTriple: {
    right: -10,
    bottom: -2,
  },
  punctuationText: {
    marginHorizontal: 2,
    fontSize: 20, // Slightly smaller than Chinese characters
  },
  spaceText: {
    width: 8, // Fixed width for spaces
  },
}); 