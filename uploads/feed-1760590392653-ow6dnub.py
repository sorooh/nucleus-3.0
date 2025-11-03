import os
from dotenv import load_dotenv

load_dotenv()

CONFIG = {
    'system': {
        'name': 'سُروح',
        'version': '2.0.0',
        'mode': os.getenv('MODE', 'development')
    },
    'memory': {
        'short_term': {
            'type': 'redis',
            'host': os.getenv('REDIS_HOST', 'redis'),
            'port': os.getenv('REDIS_PORT', 6379)
        },
        'long_term': {
            'type': 'faiss',
            'host': os.getenv('FAISS_HOST', 'faiss'),
            'port': os.getenv('FAISS_PORT', 9000)
        }
    },
    'voice': {
        'enabled': True,
        'model': os.getenv('VOICE_MODEL', 'whisper-medium')
    }
}