"""
نظام سُروح - العقل المركزي
مساعد ذكي يحلل المحادثات والملفات، يتذكر ويتعلم مع الوقت
"""

import os
import sqlite3
from datetime import datetime
from typing import Optional, List, Dict, Any
import uuid

# FastAPI and file handling
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# File processing
import pytesseract
from PIL import Image
import fitz  # PyMuPDF
from docx import Document
import io

# AI and Vector DB
from openai import OpenAI
import numpy as np
import faiss

# Environment
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("surooh")

# Load environment variables
load_dotenv()

# Initialize the app
app = FastAPI(
    title="نظام سُروح - العقل المركزي",
    description="مساعد ذكي يحلل المحادثات والملفات ويتذكر ويتعلم مع الوقت",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
SUPPORTED_FILE_TYPES = {
    'image/jpeg': 'image',
    'image/png': 'image',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'text'
}

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Database setup
def init_db():
    conn = sqlite3.connect('memory.db')
    cursor = conn.cursor()
    
    # Conversations table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        title TEXT,
        category TEXT,
        tone TEXT,
        summary TEXT
    )
    ''')
    
    # Messages table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        role TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tokens INTEGER,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    )
    ''')
    
    # Files table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        filename TEXT,
        filetype TEXT,
        content TEXT,
        summary TEXT,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    )
    ''')
    
    conn.commit()
    conn.close()

init_db()

# Vector DB setup
class VectorDB:
    def __init__(self):
        self.dimension = 1536  # OpenAI embedding dimension
        self.index = faiss.IndexFlatL2(self.dimension)
        self.id_to_doc = {}
        self.next_id = 0
    
    def add_document(self, text: str, metadata: dict):
        # Get embedding from OpenAI
        response = openai_client.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        embedding = response.data[0].embedding
        vector = np.array([embedding], dtype='float32')
        
        # Add to FAISS index
        self.index.add(vector)
        
        # Store metadata
        self.id_to_doc[self.next_id] = {
            'text': text,
            'metadata': metadata,
            'timestamp': datetime.now().isoformat()
        }
        
        self.next_id += 1
        return self.next_id - 1
    
    def search(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        # Get query embedding
        response = openai_client.embeddings.create(
            input=query,
            model="text-embedding-3-small"
        )
        query_embedding = response.data[0].embedding
        query_vector = np.array([query_embedding], dtype='float32')
        
        # Search in FAISS
        distances, indices = self.index.search(query_vector, k)
        
        # Prepare results
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx in self.id_to_doc:
                doc = self.id_to_doc[idx]
                results.append({
                    'text': doc['text'],
                    'metadata': doc['metadata'],
                    'timestamp': doc['timestamp'],
                    'score': float(distance)
                })
        
        return results

vector_db = VectorDB()

class SuroohBrain:
    def __init__(self):
        self.system_prompt = """
        أنت مساعد ذكي اسمه سُروح، مهمتك هي مساعدة المستخدم في جميع احتياجاته.
        لديك القدرة على تذكر المحادثات السابقة وتحليل الملفات وتقديم إجابات ذكية.
        يجب أن تكون إجاباتك دقيقة ومفصلة ومكتوبة بلغة عربية فصحى واضحة ما لم يطلب منك غير ذلك.
        
        المهام الخاصة بك:
        1. تحليل المحادثات وتصنيفها تلقائياً
        2. تحليل نبرة المحادثة (غضب، شكوى، مديح، الخ)
        3. تقديم ملخصات للملفات والمحادثات
        4. اقتراح قرارات ذكية بناءً على السياق
        5. التعلم من التفاعلات السابقة لتحسين الردود
        """
    
    def _get_db_connection(self):
        return sqlite3.connect('memory.db')
    
    def _send_to_gpt(self, messages: List[Dict[str, str]], model: str = "gpt-4-turbo") -> str:
        try:
            response = openai_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error in GPT request: {str(e)}")
            raise HTTPException(status_code=500, detail=f"GPT request failed: {str(e)}")
    
    def analyze_tone(self, text: str) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": "قم بتحليل النبرة العاطفية للنص التالي وحدد ما إذا كانت تعبر عن غضب، شكوى، مديح، أو محايدة. قدم نتيجة تحليلك كـ JSON مع الحقول: tone (النبرة)، confidence (الثقة بين 0 و1)، explanation (تفسير قصير)."},
            {"role": "user", "content": text}
        ]
        
        response = self._send_to_gpt(messages)
        try:
            import json
            return json.loads(response)
        except:
            return {
                "tone": "neutral",
                "confidence": 0.8,
                "explanation": "تعذر تحليل النبرة بدقة"
            }
    
    def categorize_text(self, text: str) -> str:
        messages = [
            {"role": "system", "content": "قم بتصنيف النص التالي إلى واحدة من هذه الفئات: عقود، مشاكل، مبيعات، استفسارات، أخرى. قدم الإجابة كفئة واحدة فقط بدون أي شرح إضافي."},
            {"role": "user", "content": text}
        ]
        
        return self._send_to_gpt(messages)
    
    def summarize_text(self, text: str) -> str:
        messages = [
            {"role": "system", "content": "قم بتلخيص النص التالي في فقرة واحدة مركزة باللغة العربية. احتفظ بالنقاط الرئيسية والأفكار المهمة."},
            {"role": "user", "content": text}
        ]
        
        return self._send_to_gpt(messages)
    
    def generate_decisions(self, context: str) -> List[str]:
        messages = [
            {"role": "system", "content": "بناءً على السياق التالي، قدم ثلاثة خيارات قرار ذكية كقائمة مرقمة. كل خيار يجب أن يكون عملياً وقابلاً للتنفيذ."},
            {"role": "user", "content": context}
        ]
        
        response = self._send_to_gpt(messages)
        return [line.strip() for line in response.split('\n') if line.strip()]
    
    def process_conversation(self, conversation_id: Optional[str], message: str, role: str = "user") -> Dict[str, Any]:
        conn = self._get_db_connection()
        cursor = conn.cursor()
        
        # Create new conversation if needed
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            
            # Generate initial title
            title_messages = [
                {"role": "system", "content": "أنشئ عنواناً مختصراً (3-5 كلمات) للمحادثة التالية."},
                {"role": "user", "content": message}
            ]
            title = self._send_to_gpt(title_messages)
            
            # Analyze tone and category
            tone_result = self.analyze_tone(message)
            category = self.categorize_text(message)
            
            cursor.execute('''
            INSERT INTO conversations (id, title, category, tone)
            VALUES (?, ?, ?, ?)
            ''', (conversation_id, title, category, tone_result['tone']))
        else:
            # Update conversation timestamp
            cursor.execute('''
            UPDATE conversations 
            SET updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
            ''', (conversation_id,))
        
        # Save message
        message_id = str(uuid.uuid4())
        cursor.execute('''
        INSERT INTO messages (id, conversation_id, role, content)
        VALUES (?, ?, ?, ?)
        ''', (message_id, conversation_id, role, message))
        
        # Get conversation history
        cursor.execute('''
        SELECT role, content FROM messages 
        WHERE conversation_id = ? 
        ORDER BY created_at
        ''', (conversation_id,))
        history = [{"role": row[0], "content": row[1]} for row in cursor.fetchall()]
        
        # Prepare GPT messages
        gpt_messages = [{"role": "system", "content": self.system_prompt}]
        gpt_messages.extend(history)
        
        # Get GPT response
        gpt_response = self._send_to_gpt(gpt_messages)
        
        # Save GPT response
        response_id = str(uuid.uuid4())
        cursor.execute('''
        INSERT INTO messages (id, conversation_id, role, content)
        VALUES (?, ?, ?, ?)
        ''', (response_id, conversation_id, "assistant", gpt_response))
        
        # Update conversation summary if needed
        if len(history) > 3:
            cursor.execute('''
            SELECT summary FROM conversations WHERE id = ?
            ''', (conversation_id,))
            if not cursor.fetchone()[0]:
                # Generate summary
                full_conversation = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
                summary = self.summarize_text(full_conversation)
                
                cursor.execute('''
                UPDATE conversations SET summary = ? WHERE id = ?
                ''', (summary, conversation_id))
        
        conn.commit()
        conn.close()
        
        # Add to vector DB for semantic search
        vector_db.add_document(
            text=message,
            metadata={
                'type': 'message',
                'conversation_id': conversation_id,
                'message_id': message_id
            }
        )
        
        return {
            "conversation_id": conversation_id,
            "response": gpt_response,
            "message_id": message_id
        }
    
    def process_file(self, conversation_id: Optional[str], file: UploadFile) -> Dict[str, Any]:
        # Check file type
        if file.content_type not in SUPPORTED_FILE_TYPES:
            raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم")
        
        file_type = SUPPORTED_FILE_TYPES[file.content_type]
        file_content = ""
        
        try:
            # Process based on file type
            if file_type == 'image':
                image = Image.open(io.BytesIO(file.file.read()))
                file_content = pytesseract.image_to_string(image, lang='ara')
            elif file_type == 'pdf':
                pdf_document = fitz.open(stream=file.file.read(), filetype="pdf")
                file_content = "\n".join([page.get_text() for page in pdf_document])
            elif file_type == 'docx':
                doc = Document(io.BytesIO(file.file.read()))
                file_content = "\n".join([para.text for para in doc.paragraphs])
            elif file_type == 'text':
                file_content = file.file.read().decode('utf-8')
        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"خطأ في معالجة الملف: {str(e)}")
        
        # Generate summary and category
        summary = self.summarize_text(file_content)
        category = self.categorize_text(file_content)
        
        # Store in database
        conn = self._get_db_connection()
        cursor = conn.cursor()
        
        file_id = str(uuid.uuid4())
        
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            
            # Create conversation for this file
            cursor.execute('''
            INSERT INTO conversations (id, title, category, summary)
            VALUES (?, ?, ?, ?)
            ''', (conversation_id, f"ملف: {file.filename}", category, summary))
        
        cursor.execute('''
        INSERT INTO files (id, conversation_id, filename, filetype, content, summary, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (file_id, conversation_id, file.filename, file_type, file_content, summary, category))
        
        conn.commit()
        conn.close()
        
        # Add to vector DB for semantic search
        vector_db.add_document(
            text=file_content,
            metadata={
                'type': 'file',
                'conversation_id': conversation_id,
                'file_id': file_id,
                'filename': file.filename
            }
        )
        
        return {
            "conversation_id": conversation_id,
            "file_id": file_id,
            "summary": summary,
            "category": category
        }
    
    def get_conversation_history(self, conversation_id: str) -> Dict[str, Any]:
        conn = self._get_db_connection()
        cursor = conn.cursor()
        
        # Get conversation info
        cursor.execute('''
        SELECT id, created_at, updated_at, title, category, tone, summary
        FROM conversations WHERE id = ?
        ''', (conversation_id,))
        conv_row = cursor.fetchone()
        
        if not conv_row:
            raise HTTPException(status_code=404, detail="المحادثة غير موجودة")
        
        # Get messages
        cursor.execute('''
        SELECT id, role, content, created_at
        FROM messages WHERE conversation_id = ?
        ORDER BY created_at
        ''', (conversation_id,))
        messages = [{
            "id": row[0],
            "role": row[1],
            "content": row[2],
            "timestamp": row[3]
        } for row in cursor.fetchall()]
        
        # Get files
        cursor.execute('''
        SELECT id, filename, filetype, summary, created_at
        FROM files WHERE conversation_id = ?
        ORDER BY created_at
        ''', (conversation_id,))
        files = [{
            "id": row[0],
            "filename": row[1],
            "type": row[2],
            "summary": row[3],
            "timestamp": row[4]
        } for row in cursor.fetchall()]
        
        conn.close()
        
        return {
            "id": conv_row[0],
            "created_at": conv_row[1],
            "updated_at": conv_row[2],
            "title": conv_row[3],
            "category": conv_row[4],
            "tone": conv_row[5],
            "summary": conv_row[6],
            "messages": messages,
            "files": files
        }
    
    def search_memory(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        results = vector_db.search(query, k)
        
        # Enhance results with additional info
        enhanced_results = []
        conn = self._get_db_connection()
        cursor = conn.cursor()
        
        for result in results:
            metadata = result['metadata']
            enhanced = {
                'text': result['text'],
                'score': result['score'],
                'type': metadata['type'],
                'timestamp': result['timestamp']
            }
            
            if metadata['type'] == 'message':
                cursor.execute('''
                SELECT c.title, m.role, m.created_at 
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE m.id = ?
                ''', (metadata['message_id'],))
                row = cursor.fetchone()
                if row:
                    enhanced.update({
                        'conversation_title': row[0],
                        'role': row[1],
                        'message_timestamp': row[2]
                    })
            elif metadata['type'] == 'file':
                cursor.execute('''
                SELECT f.filename, f.filetype, c.title, f.created_at
                FROM files f
                JOIN conversations c ON f.conversation_id = c.id
                WHERE f.id = ?
                ''', (metadata['file_id'],))
                row = cursor.fetchone()
                if row:
                    enhanced.update({
                        'filename': row[0],
                        'filetype': row[1],
                        'conversation_title': row[2],
                        'file_timestamp': row[3]
                    })
            
            enhanced_results.append(enhanced)
        
        conn.close()
        return enhanced_results

# Initialize the brain
brain = SuroohBrain()

# API Endpoints
@app.post("/api/conversation")
async def handle_conversation(request: Request):
    data = await request.json()
    conversation_id = data.get("conversation_id")
    message = data.get("message")
    
    if not message:
        raise HTTPException(status_code=400, detail="الرسالة مطلوبة")
    
    result = brain.process_conversation(conversation_id, message)
    return JSONResponse(result)

@app.post("/api/upload")
async def upload_file(
    conversation_id: Optional[str] = None,
    file: UploadFile = File(...)
):
    result = brain.process_file(conversation_id, file)
    return JSONResponse(result)

@app.get("/api/conversation/{conversation_id}")
async def get_conversation(conversation_id: str):
    result = brain.get_conversation_history(conversation_id)
    return JSONResponse(result)

@app.get("/api/search")
async def search_memory(query: str, k: int = 5):
    results = brain.search_memory(query, k)
    return JSONResponse({"results": results})

@app.post("/api/analyze/tone")
async def analyze_tone(request: Request):
    data = await request.json()
    text = data.get("text")
    
    if not text:
        raise HTTPException(status_code=400, detail="النص مطلوب للتحليل")
    
    result = brain.analyze_tone(text)
    return JSONResponse(result)

@app.post("/api/decisions")
async def generate_decisions(request: Request):
    data = await request.json()
    context = data.get("context")
    
    if not context:
        raise HTTPException(status_code=400, detail="السياق مطلوب لتوليد القرارات")
    
    decisions = brain.generate_decisions(context)
    return JSONResponse({"decisions": decisions})

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)