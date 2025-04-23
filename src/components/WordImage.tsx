import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Platform, Text, ImageSourcePropType } from 'react-native';
import { imageService } from '../services/imageService';

interface WordImageProps {
  word: string;
  style?: any;
}

interface ImageData {
  url: string | number;  // number for local require(), string for remote URLs
  source: string;
  width: number;
  height: number;
}

export const WordImage: React.FC<WordImageProps> = ({ word, style }) => {
  const [image, setImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Loading image for word:', word);
        const imageResult = await imageService.getImageForWord(word);
        console.log('Image result:', imageResult);
        
        if (!imageResult) {
          console.log('No image result available');
          setError('No image available');
          return;
        }

        setImage(imageResult);
      } catch (err) {
        console.error('Error loading image:', err);
        setError('Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [word]);

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error || !image) {
    console.log('Error or no image:', error);
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>{error || 'No image available'}</Text>
      </View>
    );
  }

  const imageSource: ImageSourcePropType = image.source === 'local' 
    ? image.url as number  // Local images from require() are numbers
    : { uri: image.url as string };  // Remote images need uri property

  return (
    <View style={[styles.container, style]}>
      <Image
        source={imageSource}
        style={[
          styles.image,
          {
            aspectRatio: image.width / image.height
          }
        ]}
        resizeMode="contain"
        onError={(e) => {
          console.error('Error loading image:', e.nativeEvent.error);
          setError('Failed to load image');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: undefined,
    maxHeight: 250,
    borderRadius: 8,
  },
  errorText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 