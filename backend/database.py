
import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).parent / "cogniva.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                time TEXT NOT NULL,
                repeat TEXT NOT NULL DEFAULT 'Once',
                patient_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Upcoming',
                created_at TEXT NOT NULL
            )
        """)


if __name__ == "__main__":
    initialize_database()
    print("Cogniva database initialized successfully!")
