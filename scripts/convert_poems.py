from opencc import OpenCC
import json
import os
import uuid

def convert_to_simplified(data):
    cc = OpenCC('t2s') 
    
    simplified_data = []
    
    for poem in data:
        # Filter: Only keep poems that are manageable for a kid (e.g., <= 12 lines)
        paragraphs = [cc.convert(p).strip() for p in poem.get("paragraphs", []) if p.strip()]
        
        if not paragraphs or len(paragraphs) > 12:
            continue
            
        simplified_poem = {
            "id": f"poem_{uuid.uuid4().hex[:8]}",
            "title": cc.convert(poem.get("title", "")),
            "author": cc.convert(poem.get("author", "")),
            "paragraphs": paragraphs,
            "dynasty": cc.convert(poem.get("dynasty", "")),
        }
        simplified_data.append(simplified_poem)
        
    return simplified_data

if __name__ == "__main__":
    # We will assume a file named original_poems.json exists in this directory later.
    input_file = "original_poems.json"
    output_file = "../src/data/poems.json" # Output specifically to the Next.js data directory
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found. Please place the raw JSON file here.")
        # Create a sample to test the UI with
        sample_data = [
            {
                "title": "下终南山过斛斯山人宿置酒", 
                "notes": [], 
                "author": "李白", 
                "paragraphs": [
                  "暮从碧山下，山月随人归。", 
                  "却顾所来径，苍苍横翠微。", 
                  "相携及田家，童稚开荆扉。", 
                  "绿竹入幽径，青萝拂行衣。", 
                  "欢言得所憩，美酒聊共挥。", 
                  "长歌吟松风，曲尽河星稀。", 
                  "我醉君复乐，陶然共忘机。"
                ], 
                "dynasty": "唐代"
              }
        ]
        
        # Ensure the output directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(convert_to_simplified(sample_data), f, ensure_ascii=False, indent=2)
        print(f"Created fallback sample data at {output_file}")
        exit(0)

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            traditional_data = json.load(f)
            
        print(f"Loaded {len(traditional_data)} poems. Converting...")
        simplified_results = convert_to_simplified(traditional_data)
        
        # Ensure the output directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(simplified_results, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully converted and saved {len(simplified_results)} poems to {output_file}")
    except Exception as e:
        print(f"An error occurred: {e}")
