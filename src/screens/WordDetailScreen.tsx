import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, WordDetailParams } from '../types/navigation';
import { DictionaryEntry, Meaning } from '../types/dictionary';
import { translateForKids, TranslationResult as ServiceTranslationResult, CharacterZhuyinPair } from '../services/kidFriendlyTranslationService';
import { Audio } from 'expo-av';
import { translateToChinese } from '../services/translationService';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

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

export default function WordDetailScreen() {
  const route = useRoute<WordDetailScreenRouteProp>();
  const { entry } = route.params;
  const [translations, setTranslations] = useState<TranslationState>({
    word: null,
    definitions: {},
    examples: [],
  });
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const translateDefinition = async (definition: string): Promise<ServiceTranslationResult | null> => {
    try {
      return await translateForKids(definition);
    } catch (error) {
      console.error('Error translating definition:', error);
      return null;
    }
  };

  useEffect(() => {
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

    translateContent();
  }, [entry]);

  const speakText = async (text: string, language: 'en' | 'zh'): Promise<void> => {
    try {
      await Speech.speak(text, {
        language: language === 'zh' ? 'zh-CN' : 'en-US',
        pitch: 1,
        rate: 0.75,
      });
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  };

  const renderTranslation = (translation: ServiceTranslationResult | null, isExample: boolean = false, showEnglish: boolean = true) => {
    if (!translation) return null;
    
    return (
      <View style={styles.translationContainer}>
        {showEnglish && (
          <TouchableOpacity 
            onPress={() => speakText(translation.english, 'en')}
            style={styles.textWithIcon}
          >
            <Text style={styles.englishText}>{translation.english}</Text>
            <Ionicons name="volume-medium-outline" size={20} color="#2D3436" />
          </TouchableOpacity>
        )}
        {translation.pairs.length > 0 && (
          <TouchableOpacity 
            onPress={() => speakText(translation.pairs.map(p => p.character).join(''), 'zh')}
            style={[styles.textWithIcon, styles.zhuyinContainer]}
          >
            <ZhuyinText pairs={translation.pairs} />
            <Ionicons name="volume-medium-outline" size={20} color="#2D3436" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => speakText(entry.word, 'en')}
          style={styles.textWithIcon}
        >
          <Text style={styles.wordText}>{entry.word}</Text>
          <Ionicons name="volume-medium-outline" size={24} color="#2D3436" />
        </TouchableOpacity>
        {entry.phonetic && (
          <Text style={styles.phoneticText}>{entry.phonetic}</Text>
        )}
      </View>

      {translating ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : translationError ? (
        <Text style={styles.errorText}>{translationError}</Text>
      ) : (
        <>
          {entry.translation && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Translation</Text>
              <TouchableOpacity 
                onPress={() => speakText(entry.translation, 'zh')}
                style={styles.textWithIcon}
              >
                <Text style={styles.translationText}>{entry.translation}</Text>
                <Ionicons name="volume-medium-outline" size={20} color="#2D3436" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meanings</Text>
            {entry.meanings.map((meaning: Meaning, meaningIndex: number) => (
              <View key={meaningIndex} style={styles.meaningContainer}>
                <Text style={styles.partOfSpeech}>{meaning.partOfSpeech}</Text>
                {meaning.definitions.map((definition: string, defIndex: number) => (
                  <View key={defIndex} style={styles.definitionContainer}>
                    <TouchableOpacity 
                      onPress={() => speakText(definition, 'en')}
                      style={styles.textWithIcon}
                    >
                      <Text style={styles.definitionText}>{definition}</Text>
                      <Ionicons name="volume-medium-outline" size={20} color="#2D3436" />
                    </TouchableOpacity>
                    {translations.definitions[meaningIndex]?.[defIndex] && 
                      renderTranslation(translations.definitions[meaningIndex][defIndex], false, false)}
                  </View>
                ))}
              </View>
            ))}
          </View>

          {translations.examples.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Examples</Text>
              {translations.examples.map((example, index) => (
                <View key={index} style={styles.exampleContainer}>
                  {renderTranslation(example, true)}
                </View>
              ))}
            </View>
          )}
        </>
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
  wordText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2D3436',
    marginRight: 8,
  },
  phoneticText: {
    fontSize: 18,
    color: '#636E72',
    marginTop: 8,
    fontStyle: 'italic',
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
  textWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zhuyinContainer: {
    marginTop: 0,
  },
  loader: {
    marginTop: 24,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFE3E3',
    borderRadius: 8,
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
}); 