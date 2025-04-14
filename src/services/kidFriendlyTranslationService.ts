import { translateToChinese } from './translationService';
import { pinyin } from 'pinyin-pro';
import { databaseService } from './databaseService';

export interface CharacterZhuyinPair {
  character: string;
  zhuyin: string;
}

export interface TranslationResult {
  english: string;
  pairs: CharacterZhuyinPair[];
}

const toneMarks: { [key: string]: string } = {
  '1': '',
  '2': 'ˊ',
  '3': 'ˇ',
  '4': 'ˋ',
  '5': '˙'
};

// Special cases mapping for common characters
const specialCases: { [key: string]: string } = {
  '的': 'ㄉㄜ˙',
  '了': 'ㄌㄜ˙',
  '著': 'ㄓㄜ˙',
  '得': 'ㄉㄜ˙',
  '地': 'ㄉㄜ˙',
  '麼': 'ㄇㄜ˙',
  '個': 'ㄍㄜ˙',
};

const initialMap: { [key: string]: string } = {
  'b': 'ㄅ', 'p': 'ㄆ', 'm': 'ㄇ', 'f': 'ㄈ',
  'd': 'ㄉ', 't': 'ㄊ', 'n': 'ㄋ', 'l': 'ㄌ',
  'g': 'ㄍ', 'k': 'ㄎ', 'h': 'ㄏ',
  'j': 'ㄐ', 'q': 'ㄑ', 'x': 'ㄒ',
  'zh': 'ㄓ', 'ch': 'ㄔ', 'sh': 'ㄕ', 'r': 'ㄖ',
  'z': 'ㄗ', 'c': 'ㄘ', 's': 'ㄙ'
};

const finalMap: { [key: string]: string } = {
  'i': 'ㄧ', 'u': 'ㄨ', 'ü': 'ㄩ', 'v': 'ㄩ',
  'a': 'ㄚ', 'o': 'ㄛ', 'e': 'ㄜ', 'ê': 'ㄝ',
  'ai': 'ㄞ', 'ei': 'ㄟ', 'ao': 'ㄠ', 'ou': 'ㄡ',
  'an': 'ㄢ', 'en': 'ㄣ', 'ang': 'ㄤ', 'eng': 'ㄥ',
  'er': 'ㄦ',
  'ia': 'ㄧㄚ', 'ie': 'ㄧㄝ', 'iao': 'ㄧㄠ', 'iu': 'ㄧㄡ',
  'ian': 'ㄧㄢ', 'in': 'ㄧㄣ', 'iang': 'ㄧㄤ', 'ing': 'ㄧㄥ',
  'ua': 'ㄨㄚ', 'uo': 'ㄨㄛ', 'uai': 'ㄨㄞ', 'ui': 'ㄨㄟ',
  'uan': 'ㄨㄢ', 'un': 'ㄨㄣ', 'uang': 'ㄨㄤ', 'ong': 'ㄨㄥ',
  'üe': 'ㄩㄝ', 'ue': 'ㄩㄝ', 'üan': 'ㄩㄢ', 'ün': 'ㄩㄣ',
  'iong': 'ㄩㄥ'
};

export async function translateForKids(text: string): Promise<TranslationResult> {
  try {
    // First, translate the English text to Chinese
    const chineseText = await translateToChinese(text);
    if (!chineseText) {
      throw new Error('Translation failed');
    }

    // Process each character to get its Zhuyin
    const pairs: CharacterZhuyinPair[] = [];
    for (const char of chineseText) {
      // Skip non-Chinese characters
      if (!/[\u4e00-\u9fff]/.test(char)) {
        continue;
      }

      // Check special cases first
      if (specialCases[char]) {
        pairs.push({
          character: char,
          zhuyin: specialCases[char]
        });
        continue;
      }

      // Try to find the character in the database
      const entries = await databaseService.findByTraditional(char);
      
      if (entries && entries.length > 0) {
        // Use the first entry's Zhuyin if found in database
        pairs.push({
          character: char,
          zhuyin: entries[0].zhuyin
        });
      } else {
        // Fallback to pinyin-pro if not found in database
        const pinyinResult = pinyin(char, { 
          toneType: 'num',
          type: 'array',
          v: true // Use v for ü
        })[0];

        const zhuyin = convertPinyinToZhuyin(pinyinResult);
        if (zhuyin) {
          pairs.push({
            character: char,
            zhuyin: zhuyin
          });
        } else {
          console.warn(`No Zhuyin found for character: ${char}`);
        }
      }
    }

    return {
      english: text,
      pairs: pairs.filter(pair => pair.zhuyin) // Filter out any empty Zhuyin results
    };
  } catch (error) {
    console.error('Error in translateForKids:', error);
    throw error;
  }
}

function convertPinyinToZhuyin(pinyinSyllable: string): string {
  if (!pinyinSyllable) return '';

  // Clean up the pinyin syllable
  pinyinSyllable = pinyinSyllable.toLowerCase().replace('v', 'ü');

  // Extract tone number and syllable
  const match = pinyinSyllable.match(/([a-zü]+)([1-5])?$/i);
  if (!match) return '';

  const [, syllable, tone = '1'] = match;
  let result = '';

  // Try to match the entire syllable first (for compound finals)
  if (finalMap[syllable]) {
    result = finalMap[syllable];
  } else {
    // Handle initials and finals separately
    for (const [initial, zhuyinInitial] of Object.entries(initialMap)) {
      if (syllable.startsWith(initial)) {
        result = zhuyinInitial;
        const remaining = syllable.slice(initial.length);
        
        // Handle finals
        if (finalMap[remaining]) {
          result += finalMap[remaining];
          break;
        }
      }
    }

    // If no initial found, try to match as final only
    if (!result && finalMap[syllable]) {
      result = finalMap[syllable];
    }
  }

  // Add tone mark if we have a valid Zhuyin result
  if (result) {
    result += (toneMarks[tone] || '');
  }

  return result;
}