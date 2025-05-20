import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, ScrollView, Image, TouchableOpacity, Alert, Share, Clipboard } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, WordDetailParams } from '../types/navigation';
import { DictionaryEntry, Meaning } from '../types/dictionary';
import { translateForKids, TranslationResult as ServiceTranslationResult, CharacterZhuyinPair, getZhuyinPairsForChinese } from '../services/kidFriendlyTranslationService';
import { Audio } from 'expo-av';
import { translateToChinese } from '../services/translationService';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../services/storageService';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingScreen from '../components/LoadingScreen';
import { WordImageGallery } from '../components/WordImageGallery';
import { imageService } from '../services/imageService';
// import { WordAIAssistant } from '../components/WordAIAssistant';

type WordDetailScreenRouteProp = RouteProp<RootStackParamList, 'WordDetail'>;

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

const getImageSource = async (word: string) => {
  const imageResult = await imageService.getImageForWord(word);
  if (imageResult) {
    return { uri: imageResult.url };
  }
  return { uri: `https://api.dictionaryapi.dev/media/pronunciations/${word.toLowerCase()}.png` };
};

function getZhuyinPairs(text: string): CharacterZhuyinPair[] {
  // Placeholder: Replace with your actual Zhuyin annotation logic
  return text.split('').map(char => ({ character: char, zhuyin: '' }));
}

// Utility function to check if a string is pure English
function isPureEnglish(text: string): boolean {
  // Matches only ASCII (English letters, numbers, punctuation, and whitespace)
  return /^[\x00-\x7F]+$/.test(text.trim());
}

const WordDetailScreen: React.FC = () => {
  const route = useRoute<WordDetailScreenRouteProp>();
  const navigation = useNavigation();
  const { entry } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [translations, setTranslations] = useState<TranslationState>({
    word: null,
    definitions: {},
    examples: [],
  });
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [definitionZhuyinPairs, setDefinitionZhuyinPairs] = useState<{ [key: string]: CharacterZhuyinPair[] }>({});
  const [zhuyinLoading, setZhuyinLoading] = useState(false);

  const translateDefinition = async (definition: string): Promise<ServiceTranslationResult | null> => {
    try {
      return await translateForKids(definition);
    } catch (error) {
      console.error('Error translating definition:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeScreen = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          checkFavoriteStatus(),
          addToRecentSearches(),
          translateContent(),
        ]);
      } catch (error) {
        console.error('Error initializing screen:', error);
        setTranslationError('Failed to load word details');
      } finally {
        setIsLoading(false);
      }
    };

    initializeScreen();
  }, [entry]);

  useEffect(() => {
    // Initialize audio system
    const initializeAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };

    initializeAudio();
  }, []);

  useEffect(() => {
    // Generate Zhuyin pairs for all definitions when entry changes
    const generateZhuyinForDefinitions = async () => {
      setZhuyinLoading(true);
      const pairsMap: { [key: string]: CharacterZhuyinPair[] } = {};
      for (const meaning of entry.meanings) {
        for (const definition of meaning.definitions) {
          pairsMap[definition] = await getZhuyinPairsForChinese(definition);
        }
      }
      setDefinitionZhuyinPairs(pairsMap);
      setZhuyinLoading(false);
    };
    generateZhuyinForDefinitions();
  }, [entry]);

    const translateContent = async () => {
      setTranslating(true);
      setTranslationError(null);
    
    try {
      // Translate the word if it's not already in Chinese
      const wordTranslation = !entry.translation 
        ? await translateForKids(entry.word)
        : { english: entry.word, pairs: [] };
      
      // Translate definitions
      const translatedDefinitions: TranslationState['definitions'] = {};
      
      for (let meaningIndex = 0; meaningIndex < entry.meanings.length; meaningIndex++) {
        translatedDefinitions[meaningIndex] = {};
        const meaning = entry.meanings[meaningIndex];
        
        for (let defIndex = 0; defIndex < meaning.definitions.length; defIndex++) {
          const definition = meaning.definitions[defIndex];
          const translatedDef = await translateDefinition(definition);
          if (translatedDef) {
            translatedDefinitions[meaningIndex][defIndex] = translatedDef;
          }
        }
      }
      
      // Translate examples
      const examples = entry.meanings.flatMap((meaning: Meaning) => 
        meaning.examples || []
      );
        const translatedExamples = await Promise.all(
        examples.map(translateDefinition)
        );

        setTranslations({
          word: wordTranslation,
          definitions: translatedDefinitions,
        examples: translatedExamples.filter((t: ServiceTranslationResult | null): t is ServiceTranslationResult => t !== null)
        });
      } catch (err) {
      setTranslationError(err instanceof Error ? err.message : 'Translation failed');
      } finally {
        setTranslating(false);
      }
    };

  const checkFavoriteStatus = async () => {
    const storageService = StorageService.getInstance();
    const favorite = await storageService.isFavorite(entry.word);
    setIsFavorite(favorite);
  };

  const addToRecentSearches = async () => {
    const storageService = StorageService.getInstance();
    await storageService.addToRecentSearches(entry);
  };

  const toggleFavorite = async () => {
    const storageService = StorageService.getInstance();
    if (isFavorite) {
      await storageService.removeFromFavorites(entry.word);
    } else {
      await storageService.addToFavorites(entry);
    }
    setIsFavorite(!isFavorite);
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied to clipboard', text);
  };

  const shareWord = async () => {
    try {
      const message = `Word: ${entry.word}\n\nDefinitions:\n${entry.meanings
        .map(meaning => `- ${meaning.definitions.join('\n  ')}`)
        .join('\n')}`;

      await Share.share({
        message,
        title: `Share: ${entry.word}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share word');
    }
  };

  const speakText = async (text: string, language: 'en' | 'zh'): Promise<void> => {
    try {
      // Stop any currently playing speech
      await Speech.stop();
      
      // Speak the new text
      await Speech.speak(text, {
        language: language === 'zh' ? 'zh-CN' : 'en-US',
        pitch: 1,
        rate: 0.75,
        onStart: () => {
          console.log('Started speaking:', text);
        },
        onDone: () => {
          console.log('Finished speaking:', text);
        },
        onError: (error) => {
          console.error('Speech error:', error);
        },
      });
    } catch (error) {
      console.error('Error speaking text:', error);
      Alert.alert('Error', 'Failed to play audio. Please try again.');
    }
  };

  const renderTranslation = (translation: ServiceTranslationResult | null, isExample: boolean = false, showEnglish: boolean = true) => {
    if (!translation) return null;
    
    return (
      <View style={styles.translationContainer}>
        {showEnglish && (
          <View style={styles.textWithIcon}>
            <TouchableOpacity 
              onPress={() => speakText(translation.english, 'en')}
              style={styles.textContainer}
            >
              <Text style={styles.englishText}>{translation.english}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => speakText(translation.english, 'en')}
              style={styles.iconButton}
            >
              <Ionicons name="volume-medium-outline" size={20} color="#2D3436" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => copyToClipboard(translation.english)}
              style={styles.iconButton}
            >
              <Ionicons name="copy-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        {translation.pairs.length > 0 && (
          <View style={[styles.textWithIcon, styles.zhuyinContainer]}>
            <TouchableOpacity 
              onPress={() => speakText(translation.pairs.map(p => p.character).join(''), 'zh')}
              style={styles.textContainer}
            >
              <Text>
                <ZhuyinText pairs={translation.pairs} />
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => speakText(translation.pairs.map(p => p.character).join(''), 'zh')}
              style={styles.iconButton}
            >
              <Ionicons name="volume-medium-outline" size={20} color="#2D3436" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => copyToClipboard(translation.pairs.map(p => p.character).join(''))}
              style={styles.iconButton}
            >
              <Ionicons name="copy-outline" size={20} color="#666" />
            </TouchableOpacity>
      </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return <LoadingScreen message="Loading word details..." />;
  }

  if (translationError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{translationError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setTranslationError(null);
            setIsLoading(true);
            translateContent();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  let exampleGlobalIdx = 0;

  return (
    <ErrorBoundary>
    <ScrollView style={styles.container}>
        <View style={styles.header}>
      <View style={styles.wordContainer}>
            <Text style={styles.wordText}>{entry.word}</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={toggleFavorite} style={styles.iconButton}>
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isFavorite ? '#FF3B30' : '#000'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={shareWord} style={styles.iconButton}>
                <Ionicons name="share-outline" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
          
        <TouchableOpacity 
            onPress={() => speakText(entry.word, 'en')}
            style={styles.phoneticContainer}
          >
            <Text style={styles.phoneticText}>{entry.phonetic}</Text>
            <Ionicons name="volume-medium-outline" size={24} color="#2D3436" />
          </TouchableOpacity>

          <WordImageGallery word={entry.word} style={styles.wordImage} />
        </View>
        
        {translating ? (
          <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
        ) : (
          <>
            {entry.translation && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Explanation</Text>
                <View style={styles.textWithIcon}>
                  <TouchableOpacity 
                    onPress={() => speakText(entry.translation, 'en')}
                    style={styles.textContainer}
                  >
                    <Text style={styles.translationText}>{entry.translation}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => speakText(entry.translation, 'en')}
                    style={styles.iconButton}
                  >
                    <Ionicons name="volume-medium-outline" size={20} color="#2D3436" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => copyToClipboard(entry.translation)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="copy-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
      
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meanings</Text>
              {entry.meanings.map((meaning: Meaning, meaningIndex: number) => (
                <View key={meaningIndex} style={styles.meaningContainer}>
            <Text style={styles.partOfSpeech}>{meaning.partOfSpeech}</Text>
                  {meaning.definitions.map((definition: string, defIndex: number) => (
                    isPureEnglish(definition) ? (
                      <View key={defIndex} style={[styles.definitionContainer, { backgroundColor: '#F8F9FA', borderLeftWidth: 0, padding: 12, borderRadius: 8 }]}> 
                        <View style={[styles.textWithIcon, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                          <Text style={[styles.englishText, { flex: 1 }]}>{definition}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity 
                              onPress={() => speakText(definition, 'en')}
                              style={styles.iconButton}
                            >
                              <Ionicons name="volume-medium-outline" size={20} color="#2D3436" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => copyToClipboard(definition)}
                              style={[styles.iconButton, { marginLeft: 8 }]}
                            >
                              <Ionicons name="copy-outline" size={20} color="#666" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View key={defIndex} style={styles.definitionContainer}>
                        <View style={styles.textWithIcon}>
                          <TouchableOpacity 
                            onPress={() => speakText(definition, 'zh')}
                            style={styles.textContainer}
                          >
                            {zhuyinLoading || !definitionZhuyinPairs[definition] ? (
                              <ActivityIndicator size="small" color="#007AFF" />
                            ) : (
                              <ZhuyinText pairs={definitionZhuyinPairs[definition]} />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => copyToClipboard(definition)}
                            style={styles.iconButton}
                          >
                            <Ionicons name="copy-outline" size={20} color="#666" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  ))}
                  {meaning.examples && meaning.examples.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Examples</Text>
                      {meaning.examples.map((example, exIdx) => {
                        const translation = translations.examples[exampleGlobalIdx];
                        exampleGlobalIdx++;
                        return (
                          <View key={exIdx} style={styles.exampleContainer}>
                            {translation && renderTranslation(translation, true)}
                          </View>
                        );
                      })}
              </View>
            )}
                </View>
              ))}
            </View>
          </>
      )}
    </ScrollView>
    </ErrorBoundary>
  );
};

export default WordDetailScreen;

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
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  header: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wordContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  wordText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneticContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  phoneticText: {
    fontSize: 18,
    color: '#636E72',
    fontStyle: 'italic',
    marginRight: 8,
  },
  wordImage: {
    width: '100%',
    marginTop: 0,
    marginBottom: 0,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
    paddingBottom: 8,
  },
  meaningContainer: {
    marginBottom: 20,
  },
  partOfSpeech: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#636E72',
    marginBottom: 8,
    backgroundColor: '#F1F2F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  definitionContainer: {
    marginBottom: 16,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#DFE6E9',
  },
  definitionText: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 12,
    lineHeight: 24,
  },
  translationContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  englishText: {
    fontSize: 16,
    color: '#2D3436',
    marginRight: 8,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  translationText: {
    fontSize: 16,
    color: '#2D3436',
    marginRight: 8,
    lineHeight: 24,
  },
  exampleContainer: {
    marginBottom: 16,
    backgroundColor: '#F1F2F6',
    borderRadius: 8,
    padding: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  textWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  zhuyinContainer: {
    marginTop: 0,
  },
  loader: {
    marginTop: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
}); 