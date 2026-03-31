import os
import pandas as pd
import random

RAW_DIR = r"c:\Users\admin\Downloads\europa2\raw"
filename = "internal_master_catalog_legacy.xlsx"
filepath = os.path.join(RAW_DIR, filename)
target_count = 5000

if os.path.exists(filepath):
    df = pd.read_excel(filepath)
    if not df.empty:
        new_rows = []
        original_data = df.to_dict('records')
        
        while len(new_rows) + len(df) < target_count:
            row = random.choice(original_data).copy()
            # Mutate string columns slightly
            for k in row:
                if isinstance(row[k], str) and ('id' in k.lower() or 'sku' in k.lower()):
                    if '-' in row[k]:
                        row[k] = f"{row[k].split('-')[0]}-{random.randint(10000, 99999)}"
                    else:
                        row[k] = f"LEG-{random.randint(10000, 99999)}"
                elif isinstance(row[k], (int, float)):
                    row[k] = row[k] * random.uniform(0.8, 1.2)
            new_rows.append(row)
            
        final_df = pd.concat([df, pd.DataFrame(new_rows)], ignore_index=True)
        final_df.to_excel(filepath, index=False)
        print(f"Generated {target_count} rows for {filename}")
else:
    print(f"File not found: {filename}")
