import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { DictionaryEntry } from '../types/dictionary';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [searchWord, setSearchWord] = useState('');

  const handleSearch = () => {
    if (searchWord.trim()) {
      // Create a basic DictionaryEntry object for navigation
      const entry: DictionaryEntry = {
        word: searchWord.trim(),
        meanings: [],
        translation: '',
      };
      navigation.navigate('WordDetail', { entry });
    }
  };

  const handleSearchFocus = () => {
    navigation.navigate('Search');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Word World! 🌈</Text>
          <Text style={styles.subtitle}>Let's learn new words together!</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Type a word to search..."
              placeholderTextColor="#999"
              value={searchWord}
              onChangeText={setSearchWord}
              onSubmitEditing={handleSearch}
              onFocus={handleSearchFocus}
              returnKeyType="search"
            />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={handleSearch}
            >
              <Text style={styles.searchButtonText}>🔍</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.favoritesButton]}
              onPress={() => navigation.navigate('Favorites')}
            >
              <Text style={styles.buttonText}>⭐ My Favorite Words</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9', // Light green background
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32', // Dark green
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 20,
    color: '#43A047', // Medium green
    textAlign: 'center',
    marginBottom: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  searchInput: {
    flex: 1,
    height: 50,
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 18,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD166',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchButtonText: {
    fontSize: 24,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '80%',
    padding: 20,
    borderRadius: 25,
    marginVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  favoritesButton: {
    backgroundColor: '#4ECDC4', // Teal
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default HomeScreen; 