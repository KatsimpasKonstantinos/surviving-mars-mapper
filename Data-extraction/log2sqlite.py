import sqlite3

input_txt_file = 'data.log'
sqlite_db_file = 'output.db'
table_name = 'mars_data'

def create_database():
    conn = sqlite3.connect(sqlite_db_file)
    cursor = conn.cursor()
    
    cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS {table_name} (
            Coords TEXT PRIMARY KEY,
            Lat REAL,
            Long REAL,
            Seed TEXT,
            SiteName TEXT,
            Locales TEXT,
            TerrainType TEXT,
            Topography TEXT,
            Altitude INTEGER,
            Temperature INTEGER,
            Difficulty INTEGER,
            MetalsBars INTEGER,
            ConcreteBars INTEGER,
            WaterBars INTEGER,
            DustDevilsBars INTEGER,
            DustStormBars INTEGER,
            MeteorBars INTEGER,
            ColdWaveBars INTEGER,
            Metals INTEGER,
            Concrete INTEGER,
            Water INTEGER,
            DustDevils INTEGER,
            DustStorm INTEGER,
            Meteor INTEGER,
            ColdWave INTEGER,
            MapTemplateID TEXT,
            Breakthrough1 TEXT, Breakthrough2 TEXT, Breakthrough3 TEXT, Breakthrough4 TEXT, Breakthrough5 TEXT, Breakthrough6 TEXT, 
            Breakthrough7 TEXT, Breakthrough8 TEXT, Breakthrough9 TEXT, Breakthrough10 TEXT, Breakthrough11 TEXT, Breakthrough12 TEXT, Breakthrough13 TEXT
        )
    ''')
    conn.commit()
    return conn

def process_data(conn):
    cursor = conn.cursor()
    with open(input_txt_file, 'r', encoding='utf-8') as file:
        lines = file.readlines()

    data_to_insert = []
    for line in lines:
        line = line.strip()
        
        if not line or 'Lua' in line or '====' in line or line.startswith('Coords,'):
            continue
            
        row = line.split(',')
        
        if len(row) == 39:
            data_to_insert.append(tuple(row))
        else:
            print(f"Skipping line with incorrect column count ({len(row)} expected 39): {line[:60]}...")

    if data_to_insert:
        placeholders = ', '.join(['?'] * 39) 
        
        cursor.executemany(f'''
            INSERT OR REPLACE INTO {table_name} VALUES ({placeholders})
        ''', data_to_insert)
        conn.commit()
        print(f"Successfully processed {len(data_to_insert)} rows.")

if __name__ == '__main__':
    db_connection = create_database()
    process_data(db_connection)
    db_connection.close()