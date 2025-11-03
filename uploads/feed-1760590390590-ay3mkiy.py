from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.surooh_core import SuroohCore
from config import settings

app = FastAPI()
surooh = SuroohCore(settings.CONFIG)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*']
)

@app.post('/api/process')
async def process_input(input_data: dict):
    return surooh.process_input(input_data)

@app.get('/api/system-status')
async def get_status():
    return {
        'status': 'running',
        'details': surooh.awareness.get_current_state()
    }