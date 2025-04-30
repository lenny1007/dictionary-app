// This file contains a mapping of image filenames to their paths
// For web platform, use static paths to public assets

const registry = {
  'acrobat-0.jpg': '/assets/images/acrobat-0.jpg'
} as const;

export type ImageRegistry = typeof registry;
export const imageRegistry = registry; 