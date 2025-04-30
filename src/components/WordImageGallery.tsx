import React, { useEffect, useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { ImageResult } from '../types/types';
import { imageService } from '../services/imageService';
import imageMapping from '../services/imageMapping';

interface Props {
  word: string;
  style?: any;
  onImageClick?: (image: ImageResult) => void;
}

// Extend ImageResult to include requireId for local images
interface LocalImageResult extends ImageResult {
  requireId: number;
}

/**
 * WARNING: Local Image Loading Implementation Notes
 * 
 * Current Implementation:
 * - Local images are stored in src/assets/images/
 * - Images are mapped in imageMapping.ts using require('../assets/images/...')
 * - The mapping is generated at build time and cannot be dynamic
 * 
 * Known Issues:
 * 1. React Native requires static require statements for local images
 * 2. The current implementation might break if:
 *    - Images are added/removed after build
 *    - The image path changes
 *    - The require statement is used with dynamic values
 * 
 * DO NOT:
 * - Use dynamic paths in require statements
 * - Try to load local images that weren't included in the build
 * - Modify imageMapping.ts manually
 * 
 * TO ADD NEW IMAGES:
 * 1. Place them in src/assets/images/
 * 2. Rebuild the imageMapping.ts file
 * 3. Rebuild the app
 * 
 * Future Improvements Needed:
 * - Implement proper error handling for missing images
 * - Add image preloading mechanism
 * - Consider using a CDN for dynamic image loading
 */

export const WordImageGallery: React.FC<Props> = ({ word, style, onImageClick }) => {
  const [images, setImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        setError(null);
        const results = await imageService.getImagesForWord(word);
        setImages(results);
      } catch (err) {
        console.error('Error loading images:', err);
        setError('Failed to load images');
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [word]);

  const renderImage = (image: ImageResult, index: number) => {
    const handlePress = () => {
      if (onImageClick) {
        onImageClick(image);
      }
    };

    const handleError = () => {
      console.error(`Error loading ${image.source} image:`, image.url);
    };

    const handleLoad = () => {
      console.log(`Successfully loaded ${image.source} image:`, image.url);
    };

    // WARNING: Critical Image Loading Logic
    // This section handles both local and remote images differently
    // Local images MUST be included in the imageMapping file and bundled with the app
    // Remote images can be loaded dynamically via URLs
    let imageSource;
    if (image.source === 'local') {
      // CAUTION: This requires the image to be in imageMapping
      // If the image is not found, this will cause a runtime error
      imageSource = imageMapping[image.url];
      console.log('Local image source:', imageSource);
      
      // TODO: Add fallback mechanism if local image fails to load
      if (!imageSource) {
        console.warn(`Local image not found in mapping: ${image.url}`);
        // Currently no fallback - consider adding default image
      }
    } else {
      // Remote images are more flexible but require internet connection
      imageSource = { uri: image.url };
    }

    return (
      <View key={index} style={styles.imageContainer}>
        <Image
          source={imageSource}
          style={styles.image}
          onError={handleError}
          onLoad={handleLoad}
          resizeMode="cover"
        />
        <View style={styles.sourceContainer}>
          <Text style={styles.sourceText}>Source: {image.source}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (images.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No images available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.gallery, style]}>
      {images.map((image, index) => renderImage(image, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 10,
  },
  imageContainer: {
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: 150,
    height: 150,
  },
  sourceContainer: {
    padding: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sourceText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
}); 