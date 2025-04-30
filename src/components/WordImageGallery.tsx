import React, { useEffect, useState } from 'react';
import { ImageResult } from '../types/types';
import { imageService } from '../services/imageService';
import imageMapping from '../services/imageMapping';
import styles from './WordImageGallery.module.css';

interface Props {
  word: string;
  style?: React.CSSProperties;
  onImageClick?: (image: ImageResult) => void;
}

// Extend ImageResult to include requireId for local images
interface LocalImageResult extends ImageResult {
  requireId: number;
}

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
    const handleClick = () => {
      if (onImageClick) {
        onImageClick(image);
      }
    };

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      console.error(`Error loading ${image.source} image:`, image.url);
      e.currentTarget.style.display = 'none';
    };

    const handleLoad = () => {
      console.log(`Successfully loaded ${image.source} image:`, image.url);
    };

    let imgSrc = image.url;
    if (image.source === 'local') {
      // For local images, use the imageMapping to get the required image
      const localImage = imageMapping[image.url];
      if (localImage) {
        imgSrc = localImage;
      }
    }

    return (
      <div key={index} className={styles.imageContainer} onClick={handleClick}>
        <img
          src={imgSrc}
          alt={`Image for ${image.word}`}
          className={styles.image}
          onError={handleError}
          onLoad={handleLoad}
        />
        <div className={styles.imageSource}>
          Source: {image.source}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div>Loading images...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (images.length === 0) {
    return <div>No images available</div>;
  }

  return (
    <div className={styles.gallery} style={style}>
      {images.map((image, index) => renderImage(image, index))}
    </div>
  );
}; 