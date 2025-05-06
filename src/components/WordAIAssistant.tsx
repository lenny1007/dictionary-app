import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LLMService, LLMResponse } from '../services/llmService';

interface Props {
  word: string;
  context?: string;
}

export const WordAIAssistant: React.FC<Props> = ({ word, context }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<LLMResponse | null>(null);

  const llmService = LLMService.getInstance();

  useEffect(() => {
    loadExplanation();
  }, [word, context]);

  const loadExplanation = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await llmService.getEnhancedExplanation(word, context);
      setExplanation(result);
    } catch (error) {
      setError('Failed to load AI-powered explanation');
      console.error('Error loading explanation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading AI-powered insights...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadExplanation}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {explanation && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI-Enhanced Explanation</Text>
            <Text style={styles.explanationText}>{explanation.explanation}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Example Usage</Text>
            {explanation.examples.map((example, index) => (
              <Text key={index} style={styles.exampleText}>• {example}</Text>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related Words</Text>
            <View style={styles.relatedWordsContainer}>
              {explanation.relatedWords.map((word, index) => (
                <Text key={index} style={styles.relatedWordText}>• {word}</Text>
              ))}
            </View>
          </View>

          {explanation.mnemonics && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Memory Aid</Text>
              <Text style={styles.mnemonicsText}>{explanation.mnemonics}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 16,
    color: '#2D3436',
    lineHeight: 24,
  },
  exampleText: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  relatedWordsContainer: {
    flexDirection: 'column',
  },
  relatedWordText: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 4,
  },
  mnemonicsText: {
    fontSize: 16,
    color: '#2D3436',
    fontStyle: 'italic',
    backgroundColor: '#F0F3F4',
    padding: 12,
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#2D3436',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 