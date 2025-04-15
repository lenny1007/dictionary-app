import { translateToChinese } from './translationService';
import { pinyin } from 'pinyin-pro';
import { databaseService } from './databaseService';

export interface CharacterZhuyinPair {
  character: string;
  zhuyin: string;
}

export interface Example {
  pairs: CharacterZhuyinPair[];
  english: string;
}

export interface TranslationResult {
  pairs: CharacterZhuyinPair[];
  english: string;
  examples?: Example[];
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
  '於': 'ㄩˊ',
};

const initialMap: { [key: string]: string } = {
  'b': 'ㄅ', 'p': 'ㄆ', 'm': 'ㄇ', 'f': 'ㄈ',
  'd': 'ㄉ', 't': 'ㄊ', 'n': 'ㄋ', 'l': 'ㄌ',
  'g': 'ㄍ', 'k': 'ㄎ', 'h': 'ㄏ',
  'j': 'ㄐ', 'q': 'ㄑ', 'x': 'ㄒ',
  'zh': 'ㄓ', 'ch': 'ㄔ', 'sh': 'ㄕ', 'r': 'ㄖ',
  'z': 'ㄗ', 'c': 'ㄘ', 's': 'ㄙ'
};

// Add special initial sounds that don't need 'i' added
const iInherentInitials = ['zh', 'ch', 'sh', 'r', 'z', 'c', 's'];

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
  'iong': 'ㄩㄥ',
  'yue': 'ㄩㄝ', 'yuan': 'ㄩㄢ', 'yun': 'ㄩㄣ'
};

// Add Chinese punctuation mapping
const punctuationMap: Record<string, string> = {
  '。': '。',
  '，': '，',
  '、': '、',
  '；': '；',
  '：': '：',
  '「': '「',
  '」': '」',
  '『': '『',
  '』': '』',
  '（': '（',
  '）': '）',
  '！': '！',
  '？': '？',
  '…': '…',
  '—': '—',
  '～': '～',
  '·': '·',
  '《': '《',
  '》': '》',
  '\u201C': '\u201C', // Opening double quote (")
  '\u201D': '\u201D', // Closing double quote (")
  '\u2018': '\u2018', // Opening single quote (')
  '\u2019': '\u2019', // Closing single quote (')
  '【': '【',
  '】': '】',
  '〈': '〈',
  '〉': '〉',
  '﹏': '﹏'
};

async function getZhuyinForCharacter(char: string): Promise<string> {
  // Check special cases first
  if (specialCases[char]) {
    return specialCases[char];
  }

  // Try to find the character in the database
  const entries = await databaseService.findByTraditional(char);
  
  if (entries && entries.length > 0) {
    // Use the first entry's Zhuyin if found in database
    return entries[0].zhuyin;
  }

  // Fallback to pinyin-pro if not found in database
  const pinyinResult = pinyin(char, { 
    toneType: 'num',
    type: 'array',
    v: true // Use v for ü
  })[0];

  const zhuyin = convertPinyinToZhuyin(pinyinResult);
  if (zhuyin) {
    return zhuyin;
  } else {
    console.warn(`No Zhuyin found for character: ${char}`);
    return '';
  }
}

export const translateForKids = async (text: string): Promise<TranslationResult> => {
  try {
    // First translate to Chinese
    const translatedText = await translateToChinese(text);
    
    // Process each character in the translated Chinese text
    const processedPairs = await Promise.all(
      translatedText.split('').map(async (char) => {
        // Check if character is Chinese
        const isChinese = /[\u4e00-\u9fff]/.test(char);
        
        if (isChinese) {
          // Get Zhuyin for Chinese characters
          const zhuyin = await getZhuyinForCharacter(char);
          return { character: char, zhuyin };
        } else {
          // For non-Chinese characters, keep them in the output but with empty zhuyin
          return { character: char, zhuyin: '' };
        }
      })
    );

    return {
      english: text,
      pairs: processedPairs
    };
  } catch (error) {
    console.error('Error in translateForKids:', error);
    throw error;
  }
};

function convertPinyinToZhuyin(pinyinSyllable: string): string {
  if (!pinyinSyllable) return '';

  // Clean up the pinyin syllable
  pinyinSyllable = pinyinSyllable.toLowerCase().replace('v', 'ü');

  // Handle special case where 'u' after j/q/x should be 'ü'
  if (/^(j|q|x)u/.test(pinyinSyllable)) {
    pinyinSyllable = pinyinSyllable.replace('u', 'ü');
  }

  // Extract tone number and syllable
  const match = pinyinSyllable.match(/([a-zü]+)([1-5])?$/i);
  if (!match) return '';

  const [, syllable, tone = '1'] = match;
  let result = '';

  // Handle yu-based syllables first
  if (syllable === 'yu') {
    result = 'ㄩ';
  } else if (syllable === 'yue') {
    result = 'ㄩㄝ';
  } else if (syllable === 'yuan') {
    result = 'ㄩㄢ';
  } else if (syllable === 'yun') {
    result = 'ㄩㄣ';
  } else if (syllable === 'yong') {
    result = 'ㄩㄥ';
  } else if (syllable.startsWith('y')) {
    // For syllables starting with 'y', treat 'y' as 'i' except for yu-based syllables
    const remaining = syllable.slice(1);
    if (remaining === 'i' || remaining === '') {
      // For 'yi' or 'y', just use 'i'
      result = finalMap['i'];
    } else {
      // For other cases, check if it's a compound final first
      const withI = 'i' + remaining;
      if (finalMap[withI]) {
        // Use the compound final directly to avoid duplicate 'i'
        result = finalMap[withI];
      } else if (finalMap[remaining]) {
        // Only add 'i' if the remaining part doesn't start with 'i'
        result = remaining.startsWith('i') ? finalMap[remaining] : finalMap['i'] + finalMap[remaining];
      }
    }
  } else if (syllable.startsWith('w')) {
    // For syllables starting with 'w', treat 'w' as 'u'
    const remaining = syllable.slice(1);
    if (remaining === 'u' || remaining === '') {
      // For 'wu' or 'w', just use 'u'
      result = finalMap['u'];
    } else {
      // For other cases, check if it's a compound final first
      const withU = 'u' + remaining;
      if (finalMap[withU]) {
        result = finalMap[withU];
      } else if (finalMap[remaining]) {
        // Only add 'u' if the remaining part doesn't start with 'u'
        result = remaining.startsWith('u') ? finalMap[remaining] : finalMap['u'] + finalMap[remaining];
      }
    }
  } else {
    // Try to match the entire syllable first (for compound finals)
    if (finalMap[syllable]) {
      result = finalMap[syllable];
    } else {
      // Handle initials and finals separately
      for (const [initial, zhuyinInitial] of Object.entries(initialMap)) {
        if (syllable.startsWith(initial)) {
          result = zhuyinInitial;
          const remaining = syllable.slice(initial.length);
          
          // Don't add 'i' for certain initials
          if (iInherentInitials.includes(initial) && remaining === 'i') {
            break;
          }
          
          // Handle finals - try compound finals first
          if (finalMap[remaining]) {
            result += finalMap[remaining];
          }
          break;
        }
      }

      // If no initial found, try to match as final only
      if (!result && finalMap[syllable]) {
        result = finalMap[syllable];
      }
    }
  }

  // Add tone mark if we have a valid Zhuyin result
  if (result) {
    result += (toneMarks[tone] || '');
  }

  return result;
}