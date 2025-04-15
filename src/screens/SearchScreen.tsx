import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { SearchService } from '../services/searchService';
import { Ionicons } from '@expo/vector-icons';

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

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

type ListItem = string | DictionaryEntry;

const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<DictionaryEntry>>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  const searchService = SearchService.getInstance();

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await searchService.getSearchHistory();
      setSearchHistory(history);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setSearchResults([]);
      setShowHistory(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowHistory(false);

    try {
      if (query.length < 3) {
        // Show autocomplete suggestions for short queries
        const suggestions = await searchService.getAutocompleteSuggestions(query);
        setSuggestions(suggestions);
        setSearchResults([]);
      } else {
        // Show full search results for longer queries
        const results = await searchService.search(query);
        setSearchResults(results);
        setSuggestions([]);
      }
    } catch (err) {
      setError('Failed to search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  const debouncedSearch = useCallback(
    debounce((query: string) => handleSearch(query), 300),
    [handleSearch]
  );

  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleWordSelect = (entry: DictionaryEntry) => {
    setSearchQuery(entry.word);
    Keyboard.dismiss();
    navigation.navigate('WordDetail', { word: entry.word });
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (typeof item === 'string') {
      return showHistory ? renderHistoryItem(item) : renderSuggestionItem(item);
    }
    return renderSearchResultItem(item);
  };

  const renderHistoryItem = (item: string) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => {
        setSearchQuery(item);
        handleSearch(item);
      }}
    >
      <Ionicons name="time" size={20} color="#666" style={styles.historyIcon} />
      <Text style={styles.historyText}>{item}</Text>
    </TouchableOpacity>
  );

  const renderSuggestionItem = (item: string) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => {
        setSearchQuery(item);
        handleSearch(item);
      }}
    >
      <Ionicons name="search" size={20} color="#666" style={styles.suggestionIcon} />
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  const renderSearchResultItem = (item: DictionaryEntry) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleWordSelect(item)}
    >
      <View style={styles.resultContent}>
        <View style={styles.wordHeader}>
          <Text style={styles.resultWord}>{item.word}</Text>
          {item.phonic && (
            <Text style={styles.resultPhonetic}>{item.phonic}</Text>
          )}
        </View>

        {item.paragraph && (
          <Text style={styles.paragraph}>
            {item.paragraph}
          </Text>
        )}

        {Array.isArray(item.definitions) && item.definitions.map((def, index) => (
          <View key={`def-${index}`} style={styles.definitionContainer}>
            <View style={styles.posContainer}>
              <Text style={styles.partOfSpeech}>{def.pos}</Text>
              <Text style={styles.cefr}>{def.cefr}</Text>
            </View>
            <Text style={styles.definition}>
              {def.definition}
            </Text>
            {def.example && def.example !== "WRONG WITH EXCEPTION" && (
              <Text style={styles.example}>
                Example: {def.example}
              </Text>
            )}
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for words..."
          value={searchQuery}
          onChangeText={handleQueryChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isLoading && <ActivityIndicator style={styles.loadingIndicator} />}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList<ListItem>
        data={showHistory ? searchHistory : suggestions.length > 0 ? suggestions : searchResults}
        renderItem={renderItem}
        keyExtractor={(item) => typeof item === 'string' ? item : item.word}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !showHistory && searchQuery.length > 0 && !isLoading ? (
            <Text style={styles.noResultsText}>No results found. Try a different word!</Text>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  list: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyIcon: {
    marginRight: 12,
  },
  historyText: {
    fontSize: 16,
    color: '#666',
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultContent: {
    flex: 1,
  },
  resultWord: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  resultPhonetic: {
    fontSize: 14,
    color: '#666',
  },
  paragraph: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  posContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cefr: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  partOfSpeech: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
  },
  definitionContainer: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#eee',
  },
  definition: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  example: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16,
  },
});

export default SearchScreen; 