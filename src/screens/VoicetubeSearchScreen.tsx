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
import { VoicetubeDictionaryService } from '../services/voicetubeDictionaryService';
import { DictionaryEntry } from '../types/dictionary';
import { RootStackParamList } from '../types/navigation';

type VoicetubeSearchScreenNavigationProp = NavigationProp<RootStackParamList>;

const VoicetubeSearchScreen: React.FC = () => {
  const navigation = useNavigation<VoicetubeSearchScreenNavigationProp>();
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
      const searchService = VoicetubeDictionaryService.getInstance();
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
          placeholder="Search in Voicetube Dictionary..."
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

export default VoicetubeSearchScreen; 