import { DictionaryEntry, Meaning } from '../types/dictionary';

interface TrieNode {
  children: { [key: string]: TrieNode };
  isEndOfWord: boolean;
  entries: { [dictionaryId: string]: DictionaryEntry[] };
}

export class TrieService {
  private static instance: TrieService;
  private root: TrieNode;
  private isInitialized: boolean = false;
  private currentDictionaryId: string | null = null;

  private constructor() {
    this.root = this.createNode();
  }

  public static getInstance(): TrieService {
    if (!TrieService.instance) {
      TrieService.instance = new TrieService();
    }
    return TrieService.instance;
  }

  private createNode(): TrieNode {
    return {
      children: {},
      isEndOfWord: false,
      entries: {}
    };
  }

  public async initialize(dictionary: DictionaryEntry[], dictionaryId: string): Promise<void> {
    this.currentDictionaryId = dictionaryId;
    
    try {
      for (const entry of dictionary) {
        this.insert(entry.word.toLowerCase(), entry);
        
        // Also index by first letter of each word in the definition
        const words = entry.meanings.flatMap((meaning: Meaning) => 
          meaning.definitions.flatMap((def: string) => def.toLowerCase().split(/\s+/))
        );
        
        for (const word of words) {
          if (word.length > 2) { // Only index words longer than 2 characters
            this.insert(word, entry);
          }
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing trie:', error);
      throw error;
    }
  }

  private insert(word: string, entry: DictionaryEntry): void {
    if (!this.currentDictionaryId) {
      throw new Error('Dictionary ID not set');
    }

    let node = this.root;
    
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = this.createNode();
      }
      node = node.children[char];
    }
    
    node.isEndOfWord = true;
    if (!node.entries[this.currentDictionaryId]) {
      node.entries[this.currentDictionaryId] = [];
    }
    if (!node.entries[this.currentDictionaryId].includes(entry)) {
      node.entries[this.currentDictionaryId].push(entry);
    }
  }

  public search(prefix: string, dictionaryId: string): DictionaryEntry[] {
    const normalizedPrefix = prefix.toLowerCase();
    let node = this.root;
    
    // Traverse to the node representing the prefix
    for (const char of normalizedPrefix) {
      if (!node.children[char]) {
        return [];
      }
      node = node.children[char];
    }
    
    // Collect all entries from this node and its children for the specific dictionary
    return this.collectAllEntries(node, dictionaryId);
  }

  private collectAllEntries(node: TrieNode, dictionaryId: string): DictionaryEntry[] {
    const entries: DictionaryEntry[] = [...(node.entries[dictionaryId] || [])];
    
    for (const child of Object.values(node.children)) {
      entries.push(...this.collectAllEntries(child, dictionaryId));
    }
    
    return entries;
  }

  public fuzzySearch(query: string, dictionaryId: string, maxDistance: number = 2): DictionaryEntry[] {
    const results: DictionaryEntry[] = [];
    const normalizedQuery = query.toLowerCase();
    
    const searchNode = (node: TrieNode, currentWord: string, remainingDistance: number) => {
      if (remainingDistance < 0) return;
      
      if (node.isEndOfWord) {
        const distance = this.levenshteinDistance(currentWord, normalizedQuery);
        if (distance <= maxDistance) {
          results.push(...(node.entries[dictionaryId] || []));
        }
      }
      
      for (const [char, child] of Object.entries(node.children)) {
        searchNode(child, currentWord + char, remainingDistance);
      }
    };
    
    searchNode(this.root, '', maxDistance);
    return results;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[a.length][b.length];
  }
} 