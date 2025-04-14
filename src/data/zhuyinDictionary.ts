export interface DictionaryEntry {
  traditional: string;
  simplified: string;
  pinyin: string;
  zhuyin: string;
  definition: string;
}

// This is a sample of entries from dict_concised_2014_20250326.csv
export const dictionaryData: DictionaryEntry[] = [
  {
    traditional: '快樂',
    simplified: '快乐',
    pinyin: 'kuai4 le4',
    zhuyin: 'ㄎㄨㄞˋ ㄌㄜˋ',
    definition: 'happy, joyful'
  },
  {
    traditional: '的',
    simplified: '的',
    pinyin: 'de5',
    zhuyin: 'ㄉㄜ˙',
    definition: 'possessive particle, of'
  },
  {
    traditional: '前面',
    simplified: '前面',
    pinyin: 'qian2 mian4',
    zhuyin: 'ㄑㄧㄢˊ ㄇㄧㄢˋ',
    definition: 'front, ahead'
  },
  {
    traditional: '是',
    simplified: '是',
    pinyin: 'shi4',
    zhuyin: 'ㄕˋ',
    definition: 'to be, is, are'
  },
  {
    traditional: '群',
    simplified: '群',
    pinyin: 'qun2',
    zhuyin: 'ㄑㄩㄣˊ',
    definition: 'group, crowd'
  },
  {
    traditional: '人',
    simplified: '人',
    pinyin: 'ren2',
    zhuyin: 'ㄖㄣˊ',
    definition: 'person, people'
  },
  {
    traditional: '常',
    simplified: '常',
    pinyin: 'chang2',
    zhuyin: 'ㄔㄤˊ',
    definition: 'often, common'
  },
  {
    traditional: '跟',
    simplified: '跟',
    pinyin: 'gen1',
    zhuyin: 'ㄍㄣ',
    definition: 'with, to follow'
  },
  {
    traditional: '在',
    simplified: '在',
    pinyin: 'zai4',
    zhuyin: 'ㄗㄞˋ',
    definition: 'at, in, on'
  },
  {
    traditional: '後面',
    simplified: '后面',
    pinyin: 'hou4 mian4',
    zhuyin: 'ㄏㄡˋ ㄇㄧㄢˋ',
    definition: 'behind, back'
  },
  {
    traditional: '變',
    simplified: '变',
    pinyin: 'bian4',
    zhuyin: 'ㄅㄧㄢˋ',
    definition: 'to change'
  },
  {
    traditional: '得',
    simplified: '得',
    pinyin: 'de2',
    zhuyin: 'ㄉㄜˊ',
    definition: 'to obtain, structural particle'
  },
  {
    traditional: '使',
    simplified: '使',
    pinyin: 'shi3',
    zhuyin: 'ㄕˇ',
    definition: 'to cause, to make'
  },
  {
    traditional: '明',
    simplified: '明',
    pinyin: 'ming2',
    zhuyin: 'ㄇㄧㄥˊ',
    definition: 'bright, clear'
  },
  {
    traditional: '亮',
    simplified: '亮',
    pinyin: 'liang4',
    zhuyin: 'ㄌㄧㄤˋ',
    definition: 'bright, light'
  },
  {
    traditional: '起',
    simplified: '起',
    pinyin: 'qi3',
    zhuyin: 'ㄑㄧˇ',
    definition: 'to rise, to start'
  },
  {
    traditional: '來',
    simplified: '来',
    pinyin: 'lai2',
    zhuyin: 'ㄌㄞˊ',
    definition: 'to come'
  },
  {
    traditional: '你好',
    simplified: '你好',
    pinyin: 'ni3 hao3',
    zhuyin: 'ㄋㄧˇ ㄏㄠˇ',
    definition: 'hello'
  },
  {
    traditional: '謝謝',
    simplified: '谢谢',
    pinyin: 'xie4 xie5',
    zhuyin: 'ㄒㄧㄝˋ ㄒㄧㄝ˙',
    definition: 'thank you'
  },
  {
    traditional: '再見',
    simplified: '再见',
    pinyin: 'zai4 jian4',
    zhuyin: 'ㄗㄞˋ ㄐㄧㄢˋ',
    definition: 'goodbye'
  },
  {
    traditional: '有',
    simplified: '有',
    pinyin: 'you3',
    zhuyin: 'ㄧㄡˇ',
    definition: 'to have'
  },
  {
    traditional: '要',
    simplified: '要',
    pinyin: 'yao4',
    zhuyin: 'ㄧㄠˋ',
    definition: 'to want, will'
  },
  {
    traditional: '時間',
    simplified: '时间',
    pinyin: 'shi2 jian1',
    zhuyin: 'ㄕˊ ㄐㄧㄢ',
    definition: 'time'
  },
  {
    traditional: '東西',
    simplified: '东西',
    pinyin: 'dong1 xi1',
    zhuyin: 'ㄉㄨㄥ ㄒㄧ',
    definition: 'thing, stuff'
  },
  {
    traditional: '好',
    simplified: '好',
    pinyin: 'hao3',
    zhuyin: 'ㄏㄠˇ',
    definition: 'good'
  },
  {
    traditional: '大',
    simplified: '大',
    pinyin: 'da4',
    zhuyin: 'ㄉㄚˋ',
    definition: 'big'
  },
  {
    traditional: '小',
    simplified: '小',
    pinyin: 'xiao3',
    zhuyin: 'ㄒㄧㄠˇ',
    definition: 'small'
  },
  {
    traditional: '什麼',
    simplified: '什么',
    pinyin: 'shen2 me5',
    zhuyin: 'ㄕㄣˊ ㄇㄜ˙',
    definition: 'what'
  },
  {
    traditional: '為什麼',
    simplified: '为什么',
    pinyin: 'wei4 shen2 me5',
    zhuyin: 'ㄨㄟˋ ㄕㄣˊ ㄇㄜ˙',
    definition: 'why'
  },
  {
    traditional: '怎麼',
    simplified: '怎么',
    pinyin: 'zen3 me5',
    zhuyin: 'ㄗㄣˇ ㄇㄜ˙',
    definition: 'how'
  },
  {
    traditional: '個',
    simplified: '个',
    pinyin: 'ge4',
    zhuyin: 'ㄍㄜˋ',
    definition: 'general measure word'
  },
  {
    traditional: '件',
    simplified: '件',
    pinyin: 'jian4',
    zhuyin: 'ㄐㄧㄢˋ',
    definition: 'measure word for items'
  },
  {
    traditional: '今天',
    simplified: '今天',
    pinyin: 'jin1 tian1',
    zhuyin: 'ㄐㄧㄣ ㄊㄧㄢ',
    definition: 'today'
  },
  {
    traditional: '明天',
    simplified: '明天',
    pinyin: 'ming2 tian1',
    zhuyin: 'ㄇㄧㄥˊ ㄊㄧㄢ',
    definition: 'tomorrow'
  },
  {
    traditional: '昨天',
    simplified: '昨天',
    pinyin: 'zuo2 tian1',
    zhuyin: 'ㄗㄨㄛˊ ㄊㄧㄢ',
    definition: 'yesterday'
  },
  {
    traditional: '一',
    simplified: '一',
    pinyin: 'yi1',
    zhuyin: 'ㄧ',
    definition: 'one'
  },
  {
    traditional: '二',
    simplified: '二',
    pinyin: 'er4',
    zhuyin: 'ㄦˋ',
    definition: 'two'
  },
  {
    traditional: '三',
    simplified: '三',
    pinyin: 'san1',
    zhuyin: 'ㄙㄢ',
    definition: 'three'
  },
  {
    traditional: '我',
    simplified: '我',
    pinyin: 'wo3',
    zhuyin: 'ㄨㄛˇ',
    definition: 'I, me'
  },
  {
    traditional: '你',
    simplified: '你',
    pinyin: 'ni3',
    zhuyin: 'ㄋㄧˇ',
    definition: 'you'
  },
  {
    traditional: '他',
    simplified: '他',
    pinyin: 'ta1',
    zhuyin: 'ㄊㄚ',
    definition: 'he'
  },
  {
    traditional: '和',
    simplified: '和',
    pinyin: 'he2',
    zhuyin: 'ㄏㄜˊ',
    definition: 'and'
  },
  {
    traditional: '但是',
    simplified: '但是',
    pinyin: 'dan4 shi4',
    zhuyin: 'ㄉㄢˋ ㄕˋ',
    definition: 'but'
  },
  {
    traditional: '因為',
    simplified: '因为',
    pinyin: 'yin1 wei4',
    zhuyin: 'ㄧㄣ ㄨㄟˋ',
    definition: 'because'
  },
  {
    traditional: '上',
    simplified: '上',
    pinyin: 'shang4',
    zhuyin: 'ㄕㄤˋ',
    definition: 'up, above'
  },
  {
    traditional: '下',
    simplified: '下',
    pinyin: 'xia4',
    zhuyin: 'ㄒㄧㄚˋ',
    definition: 'down, below'
  },
  {
    traditional: '前',
    simplified: '前',
    pinyin: 'qian2',
    zhuyin: 'ㄑㄧㄢˊ',
    definition: 'front'
  },
  {
    traditional: '後',
    simplified: '后',
    pinyin: 'hou4',
    zhuyin: 'ㄏㄡˋ',
    definition: 'back'
  }
]; 