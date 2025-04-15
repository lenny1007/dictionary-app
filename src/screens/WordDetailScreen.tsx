import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { DictionaryEntry, fetchWordDefinition } from '../services/dictionaryService';
import { translateForKids, TranslationResult as ServiceTranslationResult, CharacterZhuyinPair } from '../services/kidFriendlyTranslationService';
import { Audio } from 'expo-av';
import { translateToChinese } from '../services/translationService';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

type WordDetailScreenRouteProp = RouteProp<RootStackParamList, 'WordDetail'>;

interface WordDetailParams {
  word: string;
  phonetic?: string;
}

interface TranslationState {
  word: ServiceTranslationResult | null;
  definitions: {
    [meaningIndex: number]: {
      [defIndex: number]: ServiceTranslationResult;
    };
  };
  examples: ServiceTranslationResult[];
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

interface TranslationResult {
  english: string;
  pairs: Array<{
    character: string;
    zhuyin: string;
  }>;
}

export default function WordDetailScreen() {
  const route = useRoute<WordDetailScreenRouteProp>();
  const { word, phonetic } = route.params as WordDetailParams;
  const [data, setData] = useState<DictionaryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslationState>({
    word: null,
    definitions: {},
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

  const translateDefinition = async (definition: string) => {
    try {
      return await translateForKids(definition);
    } catch (error) {
      console.error('Error translating definition:', error);
      return null;
    }
  };

  useEffect(() => {
    const translateContent = async () => {
      if (!data || data.length === 0) return;

      setTranslating(true);
      setTranslationError(null);
      const entry = data[0];
      
      try {
        // Translate the word
        const wordTranslation = await translateForKids(entry.word);
        
        // Translate definitions
        const translatedDefinitions: TranslationState['definitions'] = {};
        
        for (let meaningIndex = 0; meaningIndex < entry.meanings.length; meaningIndex++) {
          translatedDefinitions[meaningIndex] = {};
          const meaning = entry.meanings[meaningIndex];
          
          for (let defIndex = 0; defIndex < meaning.definitions.length; defIndex++) {
            const definition = meaning.definitions[defIndex];
            const translatedDef = await translateDefinition(definition.definition);
            if (translatedDef) {
              translatedDefinitions[meaningIndex][defIndex] = translatedDef;
            }
          }
        }
        
        // Translate examples
        const examples = entry.meanings.flatMap(meaning => 
          meaning.definitions
            .filter(def => def.example)
            .map(def => def.example as string)
        );
        const translatedExamples = await Promise.all(
          examples.map(translateDefinition)
        );

        setTranslations({
          word: wordTranslation,
          definitions: translatedDefinitions,
          examples: translatedExamples.filter((t): t is ServiceTranslationResult => t !== null)
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

  const speakText = async (text: string, language: 'en' | 'zh') => {
    try {
      await Speech.speak(text, {
        language: language,
        pitch: 1.0,
        rate: 0.8,
      });
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  };

  const renderTranslation = (translation: ServiceTranslationResult | null, isExample: boolean = false) => {
    if (!translation || !translation.pairs) return null;

    return (
      <View style={[styles.translationContainer, isExample && styles.exampleTranslationContainer]}>
        <TouchableOpacity 
          style={styles.sentenceContainer}
          onPress={() => speakText(translation.english, 'en')}
          activeOpacity={0.7}
        >
          <Text style={styles.englishText}>{translation.english}</Text>
          <Ionicons name="volume-low" size={16} color="#007AFF" style={styles.inlineIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.chineseContainer}
          onPress={() => speakText(translation.pairs.map(p => p.character).join(''), 'zh')}
          activeOpacity={0.7}
        >
          <ZhuyinText pairs={translation.pairs} />
          <Ionicons name="volume-low" size={16} color="#007AFF" style={styles.inlineIcon} />
        </TouchableOpacity>
      </View>
    );
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.wordContainer}>
          <TouchableOpacity 
            style={styles.mainWordContainer}
            onPress={() => speakText(word, 'en')}
            activeOpacity={0.7}
          >
            <Text style={styles.word}>{word}</Text>
            <Ionicons name="volume-medium" size={24} color="#007AFF" style={styles.mainWordIcon} />
          </TouchableOpacity>
          {phonetic && <Text style={styles.phonetic}>{phonetic}</Text>}
        </View>
        
        {translations.word && renderTranslation(translations.word)}
      </View>

      {entry.meanings.map((meaning, meaningIndex) => (
        <View key={meaningIndex} style={styles.meaningContainer}>
          <View style={styles.partOfSpeechContainer}>
            <Text style={styles.partOfSpeech}>{meaning.partOfSpeech}</Text>
          </View>
          {meaning.definitions.map((definition, defIndex) => {
            const translation = translations.definitions[meaningIndex]?.[defIndex];
            return (
              <View key={defIndex} style={styles.definitionContainer}>
                <Text style={styles.definitionLabel}>Definition {defIndex + 1}</Text>
                {translation && renderTranslation(translation)}
              </View>
            );
          })}
        </View>
      ))}

      {translations.examples.length > 0 && (
        <View style={styles.examplesSection}>
          <Text style={styles.sectionTitle}>Examples</Text>
          {translations.examples.map((example, index) => (
            <View key={index} style={styles.exampleContainer}>
              {renderTranslation(example, true)}
            </View>
          ))}
        </View>
      )}

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

/*
 * ⚠️ IMPORTANT WARNING ⚠️
 * 
 * DO NOT MODIFY ANY OF THE FOLLOWING ZHUYIN-RELATED STYLES:
 * - zhuyinTextContainer
 * - characterPairContainer
 * - characterText
 * - punctuationText
 * - spaceText
 * - zhuyinContainer
 * - zhuyinContainerSingle
 * - zhuyinContainerDouble
 * - zhuyinContainerTriple
 * - zhuyinStack
 * - zhuyinStackSingle
 * - zhuyinStackDouble
 * - zhuyinStackTriple
 * - zhuyinText
 * - zhuyinTextSingle
 * - zhuyinTextDouble
 * - zhuyinTextTriple
 * - lastZhuyinChar
 * - toneMark
 * - neutralTone
 * - normalToneSingle
 * - normalToneDouble
 * - normalToneTriple
 *
 * These styles have been carefully calibrated for proper Zhuyin display
 * following traditional Chinese typography conventions.
 * Modifying these may break the precise alignment and spacing of Zhuyin characters.
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainWordIcon: {
    marginLeft: 10,
  },
  word: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2D3436',
    marginRight: 15,
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
    marginVertical: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
  },
  definitionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
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
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  exampleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
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
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  characterPairContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 10,
    marginVertical: 4,
  },
  characterText: {
    fontSize: 32,
    color: '#333',
    lineHeight: 40,
    fontWeight: '400',
  },
  punctuationText: {
    marginHorizontal: 4,
    fontSize: 24,
  },
  spaceText: {
    marginHorizontal: 2,
  },
  zhuyinContainer: {
    marginLeft: 1,
    position: 'relative',
    width: 12,
  },
  zhuyinContainerSingle: {
    height: 40,
  },
  zhuyinContainerDouble: {
    height: 40,
  },
  zhuyinContainerTriple: {
    height: 44,
  },
  zhuyinStack: {
    alignItems: 'center',
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  zhuyinStackSingle: {
    justifyContent: 'center',
  },
  zhuyinStackDouble: {
    justifyContent: 'center',
    paddingTop: 0,
  },
  zhuyinStackTriple: {
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  zhuyinText: {
    fontSize: 11,
    color: '#666',
    lineHeight: 11,
    height: 11,
    textAlign: 'center',
    width: '100%',
  },
  zhuyinTextSingle: {
  },
  zhuyinTextDouble: {
    marginBottom: -1,
  },
  zhuyinTextTriple: {
    marginBottom: -1,
  },
  lastZhuyinChar: {
    marginBottom: 0,
  },
  toneMark: {
    fontSize: 12,
    color: '#666',
    position: 'absolute',
    width: 10,
    height: 10,
    right: -12,
    fontWeight: '700',
  },
  neutralTone: {
    top: 0,
    right: -3,
  },
  normalToneSingle: {
    top: 8,
    right: -13,
  },
  normalToneDouble: {
    top: 14,
    right: -13,
  },
  normalToneTriple: {
    top: 18,
    right: -13,
  },
  sentenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  chineseContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  chineseTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  chineseCharacter: {
    fontSize: 24,
    color: '#000',
    marginRight: 4,
    lineHeight: 32,
  },
  englishText: {
    fontSize: 18,
    color: '#2D3436',
    fontWeight: 'bold',
  },
  chineseText: {
    fontSize: 18,
    color: '#2D3436',
    fontStyle: 'italic',
  },
  characterPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 16,
    marginBottom: 8,
    height: 32,
  },
  zhuyinChar: {
    fontSize: 12,
    color: '#333',
    lineHeight: 11,
    height: 11,
    textAlign: 'center',
    width: '100%',
    marginBottom: 1,
  },
  exampleTranslationContainer: {
    marginLeft: 10,
  },
  inlineIcon: {
    marginLeft: 8,
    opacity: 0.7,
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 15,
    marginTop: 10,
  },
  examplesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  translationContainer: {
    marginVertical: 5,
  },
}); 