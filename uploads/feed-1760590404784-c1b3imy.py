import sqlite3
from datetime import datetime

class LifeLogger:
    def __init__(self, db_path='memory/life_logs.db'):
        self.conn = sqlite3.connect(db_path)
        self._init_db()

    def _init_db(self):
        cursor = self.conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS interactions (
            id INTEGER PRIMARY KEY,
            timestamp TEXT NOT NULL,
            input_type TEXT NOT NULL,
            input_data TEXT,
            output_data TEXT,
            context TEXT
        )
        ''')
        self.conn.commit()

    def log_interaction(self, input_data, output_data, context):
        cursor = self.conn.cursor()
        cursor.execute('''
        INSERT INTO interactions (timestamp, input_type, input_data, output_data, context)
        VALUES (?, ?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(),
            input_data.get('type', 'unknown'),
            str(input_data),
            str(output_data),
            str(context)
        ))
        self.conn.commit()