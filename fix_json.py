import json

def fix_json():
    result = {}
    current_word = None
    current_images = []
    
    with open('./src/assets/images/localImages.json.bak', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
                
            if line.endswith('": ['):
                if current_word:
                    result[current_word] = current_images
                current_word = line[1:-4]  # Remove quotes and ": ["
                current_images = []
            elif line.startswith('"') and (line.endswith('",') or line.endswith('"')):
                image = line.strip('"').rstrip(',')
                if image.endswith('.jpg'):
                    current_images.append(image)
    
    if current_word:
        result[current_word] = current_images
    
    with open('./src/assets/images/localImages.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)
    
    print(f'Processed {len(result)} entries')

if __name__ == '__main__':
    fix_json() 