import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchService } from '../services/searchService';
import { DictionaryEntry } from '../types/dictionary';
import { RootStackParamList } from '../types/navigation';

type SearchScreenNavigationProp = NavigationProp<RootStackParamList>;

interface SearchScreenProps {
  navigation: SearchScreenNavigationProp;
}

type ListItem = DictionaryEntry | string;

interface State {
  query: string;
  searchHistory: string[];
  suggestions: DictionaryEntry[];
  searchResults: DictionaryEntry[];
}

const HISTORY_KEY = 'searchHistory';
const MAX_HISTORY = 10;

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [state, setState] = useState<State>({
    query: '',
    searchHistory: [],
    suggestions: [],
    searchResults: [],
  });

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(HISTORY_KEY);
      if (history) {
        setState(prev => ({
          ...prev,
          searchHistory: JSON.parse(history),
        }));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const saveSearchHistory = async (query: string) => {
    try {
      const updatedHistory = [
        query,
        ...state.searchHistory.filter(item => item !== query),
      ].slice(0, MAX_HISTORY);
      
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      setState(prev => ({
        ...prev,
        searchHistory: updatedHistory,
      }));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const handleSearch = async (text: string) => {
    setState(prev => ({ ...prev, query: text }));

    if (!text.trim()) {
      setState(prev => ({
        ...prev,
        suggestions: [],
        searchResults: [],
      }));
      return;
    }

    const searchService = SearchService.getInstance();
    await searchService.initialize();

    if (text.length < 3) {
      const suggestions = await searchService.getAutocompleteSuggestions(text);
      setState(prev => ({
        ...prev,
        suggestions,
        searchResults: [],
      }));
    } else {
      const results = await searchService.search(text);
      setState(prev => ({
        ...prev,
        suggestions: [],
        searchResults: results,
      }));
    }
  };

  const handleWordSelect = async (entry: DictionaryEntry) => {
    await saveSearchHistory(entry.word);
    navigation.navigate('WordDetail', {
      entry
    });
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (typeof item === 'string') {
      return (
        <TouchableOpacity
          style={styles.historyItem}
          onPress={() => handleSearch(item)}
        >
          <Text style={styles.historyText}>{item}</Text>
        </TouchableOpacity>
      );
    }

    if (!item || !item.word) {
      return null;
    }

    const definition = item.meanings?.[0]?.definitions?.[0] || '';
    const partOfSpeech = item.meanings?.[0]?.partOfSpeech || 'word';

    return (
      <TouchableOpacity
        style={styles.suggestionItem}
        onPress={() => handleWordSelect(item)}
      >
        <View>
          <Text style={styles.wordText}>{item.word}</Text>
          {item.phonetic ? (
            <Text style={styles.phoneticText}>/{item.phonetic}/</Text>
          ) : null}
          {definition ? (
            <Text style={styles.definitionText}>
              <Text style={styles.partOfSpeech}>{partOfSpeech}</Text>
              {': '}
              {definition}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search for words in English..."
        value={state.query}
        onChangeText={handleSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FlatList<ListItem>
        data={
          state.query
            ? state.suggestions.length > 0
              ? state.suggestions
              : state.searchResults
            : state.searchHistory
        }
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          if (typeof item === 'string') {
            return `history-${item}-${index}`;
          }
          if (!item || !item.word) {
            return `empty-${index}`;
          }
          return `word-${item.word}-${index}`;
        }}
        style={styles.list}
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
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  list: {
    flex: 1,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  phoneticText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  definitionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  partOfSpeech: {
    fontWeight: '500',
    color: '#444',
  },
  historyItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default SearchScreen; 