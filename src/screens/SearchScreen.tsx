import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SearchService } from '../services/searchService';
import { StorageService } from '../services/storageService';
import { DictionaryEntry } from '../types/dictionary';
import { RootStackParamList } from '../types/navigation';
import { VoicetubeDictionaryService } from '../services/voicetubeDictionaryService';
import { YahooDictionaryService } from '../services/yahooDictionaryService';
import { CambridgeDictionaryService } from '../services/cambridgeDictionaryService';

type SearchScreenNavigationProp = NavigationProp<RootStackParamList>;

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<DictionaryEntry[]>([]);
  const [favorites, setFavorites] = useState<DictionaryEntry[]>([]);
  const [showRecent, setShowRecent] = useState(true);

  useEffect(() => {
    loadRecentSearches();
    loadFavorites();
  }, []);

  const loadRecentSearches = async () => {
    const storageService = StorageService.getInstance();
    const searches = await storageService.getRecentSearches();
    setRecentSearches(searches);
  };

  const loadFavorites = async () => {
    const storageService = StorageService.getInstance();
    const favs = await storageService.getFavorites();
    setFavorites(favs);
  };

  const calculateRelevanceScore = (entry: DictionaryEntry, searchQuery: string): number => {
    const query = searchQuery.toLowerCase();
    let score = 0;

    // Exact word match gets highest score
    if (entry.word.toLowerCase() === query) {
      score += 1000;
    }
    // Word starts with query
    else if (entry.word.toLowerCase().startsWith(query)) {
      score += 500;
    }
    // Word contains query
    else if (entry.word.toLowerCase().includes(query)) {
      score += 250;
    }

    // Check definitions
    for (const meaning of entry.meanings) {
      for (const definition of meaning.definitions) {
        if (definition.toLowerCase().includes(query)) {
          score += 100;
        }
      }
      // Check examples
      if (meaning.examples) {
        for (const example of meaning.examples) {
          if (example.toLowerCase().includes(query)) {
            score += 50;
          }
        }
      }
    }

    // Check translation if available
    if (entry.translation && entry.translation.toLowerCase().includes(query)) {
      score += 150;
    }

    return score;
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      setShowRecent(true);
      return;
    }

    setLoading(true);
    setShowRecent(false);
    try {
      // Search in all dictionaries, use a large page size for GPT/main dictionary
      const [gptResults, voicetubeResults, yahooResults, cambridgeResults] = await Promise.all([
        SearchService.getInstance().search(text, 1, 100),
        VoicetubeDictionaryService.getInstance().search(text),
        YahooDictionaryService.getInstance().search(text),
        CambridgeDictionaryService.getInstance().search(text)
      ]);

      // Helper to tag entries with their source
      const tagSource = (entries: DictionaryEntry[] | undefined, source: string): (DictionaryEntry & { _source: string })[] =>
        (entries || []).map((e: DictionaryEntry) => ({ ...e, _source: source }));

      // For each source, keep only one entry per word
      const uniqueByWord = (entries: (DictionaryEntry & { _source: string })[]): (DictionaryEntry & { _source: string })[] => {
        const seen = new Set<string>();
        return entries.filter((e) => {
          if (seen.has(e.word)) return false;
          seen.add(e.word);
          return true;
        });
      };

      const lowerQuery = text.toLowerCase();
      // Find exact matches in each source (search the full result arrays)
      const gptExact = (gptResults.items || []).find(e => e.word.toLowerCase() === lowerQuery);
      const voicetubeExact = (voicetubeResults || []).find(e => e.word.toLowerCase() === lowerQuery);
      const yahooExact = (yahooResults || []).find(e => e.word.toLowerCase() === lowerQuery);
      const cambridgeExact = (cambridgeResults || []).find(e => e.word.toLowerCase() === lowerQuery);

      // Tag and collect all exact matches (one per source, if found)
      const exactMatches: (DictionaryEntry & { _source: string })[] = [];
      if (gptExact) exactMatches.push({ ...gptExact, _source: 'GPT' });
      if (voicetubeExact) exactMatches.push({ ...voicetubeExact, _source: 'Voicetube' });
      if (yahooExact) exactMatches.push({ ...yahooExact, _source: 'Yahoo' });
      if (cambridgeExact) exactMatches.push({ ...cambridgeExact, _source: 'Cambridge' });

      // Tag all results
      const allResults = [
        ...tagSource(gptResults.items, 'GPT'),
        ...tagSource(voicetubeResults, 'Voicetube'),
        ...tagSource(yahooResults, 'Yahoo'),
        ...tagSource(cambridgeResults, 'Cambridge'),
      ];

      // Remove any (source, word) already in exactMatches
      const shownKeys = new Set(exactMatches.map(e => `${e._source}::${e.word.toLowerCase()}`));
      const nonExactMatches = allResults.filter(e => !shownKeys.has(`${e._source}::${e.word.toLowerCase()}`));

      // Sort non-exact matches by relevance
      const sortedNonExact = nonExactMatches
        .map(entry => ({
          entry,
          score: calculateRelevanceScore(entry, text)
        }))
        .sort((a, b) => b.score - a.score)
        .map(item => item.entry);

      setResults([...exactMatches, ...sortedNonExact]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWordSelect = async (entry: DictionaryEntry) => {
    const storageService = StorageService.getInstance();
    await storageService.addToRecentSearches(entry);
    navigation.navigate('WordDetail', { entry });
  };

  const renderItem = ({ item }: { item: DictionaryEntry }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleWordSelect(item)}
    >
      <Text style={styles.wordText}>{item.word}</Text>
      {item.phonetic && (
        <Text style={styles.phoneticText}>{item.phonetic}</Text>
      )}
      {item.meanings[0]?.definitions[0] && (
        <Text style={styles.definitionText} numberOfLines={1}>
          {item.meanings[0].definitions[0]}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = () => {
    if (query.length > 0) return null;
    
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {showRecent ? 'Recent Searches' : 'Favorites'}
        </Text>
        <TouchableOpacity
          onPress={() => setShowRecent(!showRecent)}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>
            {showRecent ? 'Show Favorites' : 'Show Recent'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a word..."
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {loading && <ActivityIndicator style={styles.loadingIndicator} />}
      </View>

      <FlatList
        data={query.length > 0 ? results : (showRecent ? recentSearches : favorites)}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.word}-${index}`}
        ListHeaderComponent={renderSectionHeader}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 8,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleButton: {
    padding: 8,
  },
  toggleText: {
    color: '#007AFF',
    fontSize: 14,
  },
  resultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
  },
  phoneticText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  definitionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default SearchScreen; 