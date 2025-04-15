import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, WordDetailParams } from '../types/navigation';
import { DictionaryEntry, fetchWordDefinition } from '../services/dictionaryService';
import { translateForKids, TranslationResult as ServiceTranslationResult, CharacterZhuyinPair } from '../services/kidFriendlyTranslationService';
import { Audio } from 'expo-av';
import { translateToChinese } from '../services/translationService';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { SearchService } from '../services/searchService';

type WordDetailScreenRouteProp = RouteProp<RootStackParamList, 'WordDetail'>;

interface Definition {
  pos: string;
  definition: string;
  cefr: string;
  example: string;
}

interface DictionaryEntry {
  _id: {
    $oid: string;
  };
  word: string;
  paragraph: string;
  definitions: Definition[];
  phonic: string;
  audio: string;
}

interface TranslationState {
  paragraph: ServiceTranslationResult | null;
  definitions: ServiceTranslationResult[];
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
  const { word } = route.params;
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslationState>({
    paragraph: null,
    definitions: [],
    examples: []
  });
  const [translating, setTranslating] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadWord = async () => {
      try {
        setLoading(true);
        setError(null);
        const searchService = SearchService.getInstance();
        await searchService.initialize();
        const results = await searchService.search(word);
        if (results.length > 0) {
          setEntry(results[0] as DictionaryEntry);
        } else {
          setError(`No definition found for "${word}"`);
        }
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
      if (!entry) return;

      setTranslating(true);
      try {
        // Translate paragraph
        const paragraphTranslation = await translateForKids(entry.paragraph);

        // Translate definitions
        const definitionTranslations = await Promise.all(
          entry.definitions.map((def: Definition) => translateForKids(def.definition))
        );

        // Translate examples (excluding "WRONG WITH EXCEPTION")
        const validExamples = entry.definitions
          .filter((def: Definition) => def.example && def.example !== "WRONG WITH EXCEPTION")
          .map((def: Definition) => def.example);
        const exampleTranslations = await Promise.all(
          validExamples.map((example: string) => translateForKids(example))
        );

        setTranslations({
          paragraph: paragraphTranslation,
          definitions: definitionTranslations,
          examples: exampleTranslations
        });
      } catch (err) {
        console.error('Translation error:', err);
        setError('Failed to translate content');
      } finally {
        setTranslating(false);
      }
    };

    if (entry && !loading) {
      translateContent();
    }
  }, [entry, loading]);

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

      if (!entry) {
        Alert.alert(
          'Error',
          'Word data is not available.'
        );
        return;
      }

      // Get the first available audio URL from phonetics
      const audioUrl = entry.audio;
      
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

  if (!entry) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No definition found for "{word}"</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.wordContainer}>
          <TouchableOpacity 
            style={styles.mainWordContainer}
            onPress={() => speakText(entry.word, 'en')}
            activeOpacity={0.7}
          >
            <Text style={styles.word}>{entry.word}</Text>
            <Ionicons name="volume-medium" size={24} color="#007AFF" style={styles.mainWordIcon} />
          </TouchableOpacity>
          {entry.phonic && <Text style={styles.phonetic}>{entry.phonic}</Text>}
        </View>
      </View>

      {translations.paragraph && (
        <View style={styles.paragraphContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          {renderTranslation(translations.paragraph)}
        </View>
      )}

      <View style={styles.definitionsContainer}>
        <Text style={styles.sectionTitle}>Definitions</Text>
        {entry.definitions.map((def, index) => (
          <View key={index} style={styles.definitionBlock}>
            <View style={styles.defHeader}>
              <Text style={styles.partOfSpeech}>{def.pos}</Text>
            </View>
            {translations.definitions[index] && renderTranslation(translations.definitions[index])}
          </View>
        ))}
      </View>

      {translations.examples.length > 0 && (
        <View style={styles.examplesContainer}>
          <Text style={styles.sectionTitle}>Examples</Text>
          {translations.examples.map((example, index) => (
            <View key={index} style={styles.exampleBlock}>
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
    </ScrollView>
  );
}

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
  paragraphContainer: {
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
  definitionsContainer: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 15,
  },
  definitionBlock: {
    marginBottom: 20,
  },
  defHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  partOfSpeech: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    backgroundColor: '#FFEAA7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cefrLevel: {
    fontSize: 14,
    color: '#636E72',
    marginLeft: 10,
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  examplesContainer: {
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
  exampleBlock: {
    marginBottom: 15,
  },
  translationContainer: {
    marginTop: 10,
  },
  exampleTranslationContainer: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
  },
  sentenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  chineseContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  englishText: {
    flex: 1,
    fontSize: 16,
    color: '#2D3436',
  },
  zhuyinTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  characterPair: {
    marginRight: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  characterText: {
    fontSize: 20,
    color: '#2D3436',
  },
  zhuyinText: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  inlineIcon: {
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#636E72',
    textAlign: 'center',
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
    padding: 10,
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