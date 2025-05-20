import React, { useState } from 'react';
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
import { CambridgeDictionaryService } from '../services/cambridgeDictionaryService';
import { DictionaryEntry } from '../types/dictionary';
import { RootStackParamList } from '../types/navigation';

type CambridgeSearchScreenNavigationProp = NavigationProp<RootStackParamList>;

const CambridgeSearchScreen: React.FC = () => {
  const navigation = useNavigation<CambridgeSearchScreenNavigationProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchService = CambridgeDictionaryService.getInstance();
      const searchResults = await searchService.search(text);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWordSelect = (entry: DictionaryEntry) => {
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

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search in Cambridge Dictionary..."
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {loading && <ActivityIndicator style={styles.loadingIndicator} />}
      </View>

      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.word}-${index}`}
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
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  loadingIndicator: {
    marginLeft: 10,
  },
  listContent: {
    padding: 10,
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  wordText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  phoneticText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  definitionText: {
    fontSize: 14,
    color: '#333',
  },
});

export default CambridgeSearchScreen; 