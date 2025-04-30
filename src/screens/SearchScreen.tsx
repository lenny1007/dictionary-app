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
      const searchResults = await SearchService.getInstance().search(text);
      setResults(searchResults.items);
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