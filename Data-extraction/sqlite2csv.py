import sqlite3
import csv

def sqlite_to_csv(db_path, table_name, csv_file_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute(f"SELECT * FROM {table_name}")
    
    rows = cursor.fetchall()
    
    column_names = [description[0] for description in cursor.description]
    
    with open(csv_file_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(column_names)  
        writer.writerows(rows)        
        
    conn.close()
    print(f"Successfully converted '{table_name}' to '{csv_file_path}'")

sqlite_to_csv('output.db', 'mars_data', 'output.csv')