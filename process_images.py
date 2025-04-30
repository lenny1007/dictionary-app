import json
import os
import chardet

# Read the file in binary mode to detect encoding
with open('image_mapping.txt', 'rb') as file:
    raw_data = file.read()
    result = chardet.detect(raw_data)
    encoding = result['encoding']
    print(f"Detected encoding: {encoding}")

# Process the file with the detected encoding
word_to_images = {}
with open('image_mapping.txt', 'r', encoding=encoding) as file:
    for line in file:
        line = line.strip()
        if line:
            # Split by pipe character
            parts = line.split('|')
            if len(parts) == 2:
                word = parts[0].strip()
                image = parts[1].strip()
                
                # Initialize list for word if not exists
                if word not in word_to_images:
                    word_to_images[word] = []
                
                # Add image to the list if not already present
                if image not in word_to_images[word]:
                    word_to_images[word].append(image)

# Ensure the output directory exists
os.makedirs('src/assets/images', exist_ok=True)

# Write the JSON file with proper formatting
output_path = 'src/assets/images/localImages.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(word_to_images, f, indent=2, ensure_ascii=False)

print(f"Successfully created {output_path}")
print(f"Total words processed: {len(word_to_images)}") 