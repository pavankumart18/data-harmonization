import os
import csv
import json
import random
import uuid

RAW_DIR = r"c:\Users\admin\Downloads\europa2\raw"

# Targets based on previous adjustments
TARGETS = {
    'supplier_feed_us_antibodies.csv': 4320,
    'supplier_feed_eu_reagents.csv': 2850,
    'acquisition_catalog_nordic.csv': 1440,
    'customer_search_logs.csv': 35000,
    'pricing_and_inventory_snapshot.csv': 8600,
    'supplier_datasheets.json': 1250
}

def generate_csv(filename, target_count):
    filepath = os.path.join(RAW_DIR, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filename}")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = list(csv.reader(f))
        
    if not reader:
        return
        
    headers = reader[0]
    data = reader[1:]
    
    if not data:
        return
        
    new_data = list(data)
    
    # Generate until target
    while len(new_data) < target_count:
        # Pick a random row
        row = random.choice(data).copy()
        
        # Mutate some common fields to make it look "synthetic" but realistic
        # For example, if there's an ID or SKU, change a number in it
        for i, h in enumerate(headers):
            h_lower = h.lower()
            if 'sku' in h_lower or 'id' in h_lower or 'code' in h_lower:
                if row[i]:
                    row[i] = f"{row[i].split('-')[0] if '-' in row[i] else 'GEN'}-{random.randint(10000, 99999)}"
            elif 'price' in h_lower:
                if row[i]:
                    try:
                        base_price = float(row[i].replace(',','.'))
                        new_price = base_price * random.uniform(0.8, 1.2)
                        if ',' in row[i]:
                            row[i] = f"{new_price:.2f}".replace('.', ',')
                        else:
                            row[i] = f"{new_price:.2f}"
                    except:
                        pass
        
        new_data.append(row)
        
    # Write back
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(new_data[:target_count])
    print(f"Generated {target_count} rows for {filename}")

def generate_json(filename, target_count):
    filepath = os.path.join(RAW_DIR, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filename}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    if not isinstance(data, list) or not data:
        return
        
    new_data = list(data)
    
    while len(new_data) < target_count:
        row = random.choice(data).copy()
        # Mutate keys slightly
        for k in row.keys():
            k_lower = k.lower()
            if 'id' in k_lower or 'sku' in k_lower:
                if isinstance(row[k], str):
                    row[k] = f"GEN-{random.randint(10000,99999)}"
            elif 'price' in k_lower and isinstance(row[k], (int, float)):
                row[k] = round(row[k] * random.uniform(0.8, 1.2), 2)
                
        new_data.append(row)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(new_data[:target_count], f, indent=2)
    print(f"Generated {target_count} rows for {filename}")

def main():
    for filename, count in TARGETS.items():
        if filename.endswith('.csv'):
            generate_csv(filename, count)
        elif filename.endswith('.json'):
            generate_json(filename, count)

if __name__ == '__main__':
    main()
