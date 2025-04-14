declare module 'chinese-to-pinyin' {
    interface Options {
        toneType?: 'num' | 'none' | 'symbol';
        type?: 'string' | 'array';
        removeNonZh?: boolean;
    }

    class ChineseToPinyin {
        convert(text: string, options?: Options): string | string[];
    }

    export = ChineseToPinyin;
} 