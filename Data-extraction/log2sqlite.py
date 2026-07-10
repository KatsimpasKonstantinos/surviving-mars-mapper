import sqlite3
import os

input_txt_file = "data.log"
sqlite_db_file = "mars_data.db"
table_name = "mars_data"

CSV_START = "================== CSV START =================="
CSV_END = "================== CSV END =================="

COLUMN_COUNT = 28


def create_database():
    # Delete old database
    if os.path.exists(sqlite_db_file):
        os.remove(sqlite_db_file)
        print(f"Deleted old database: {sqlite_db_file}")

    conn = sqlite3.connect(sqlite_db_file)
    cursor = conn.cursor()

    cursor.execute(f"""
        CREATE TABLE {table_name} (
            Coords TEXT PRIMARY KEY,
            Lat REAL,
            Long REAL,
            Seed TEXT,
            xxhashShuffleBreakThroughTech TEXT,
            SiteName TEXT,
            Locales TEXT,
            TerrainType TEXT,
            Topography TEXT,
            Rating INTEGER,
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

            MapTemplateID TEXT
        )
    """)

    conn.commit()
    return conn


def process_data(conn):
    cursor = conn.cursor()

    with open(input_txt_file, "r", encoding="utf-8") as file:
        lines = file.readlines()

    data_to_insert = []
    in_csv = False

    for line in lines:
        line = line.strip()

        if line == CSV_START:
            in_csv = True
            continue

        if line == CSV_END:
            break

        if not in_csv:
            continue

        if (
            not line
            or "Lua" in line
            or line.startswith("Coords,")
        ):
            continue

        row = line.split(",")

        if len(row) == COLUMN_COUNT:
            data_to_insert.append(tuple(row))
        else:
            print(
                f"Skipping line with incorrect column count "
                f"({len(row)} found, expected {COLUMN_COUNT}): "
                f"{line[:100]}..."
            )

    if data_to_insert:
        placeholders = ", ".join(["?"] * COLUMN_COUNT)

        cursor.executemany(
            f"""
            INSERT INTO {table_name}
            VALUES ({placeholders})
            """,
            data_to_insert,
        )

        conn.commit()
        print(f"Successfully processed {len(data_to_insert)} rows.")
    else:
        print("No CSV data found.")


if __name__ == "__main__":
    db_connection = create_database()
    process_data(db_connection)
    db_connection.close()