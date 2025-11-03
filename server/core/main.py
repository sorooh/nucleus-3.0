"""
🧠 Surooh Core - FastAPI Application
نواة التنفيذ - Smart Delegation + Core Dispatcher
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from loguru import logger
import sys

from .dispatcher import dispatcher

# إعداد Loguru
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{message}</cyan>",
    level="INFO"
)

# تطبيق FastAPI
app = FastAPI(
    title="Surooh Core - Execution Brain",
    description="نواة التنفيذ الذكية لإمبراطورية سُروح",
    version="1.0.0"
)

# 📋 نماذج البيانات
class DispatchRequest(BaseModel):
    """نموذج طلب التوزيع"""
    task: str
    payload: Optional[Dict[str, Any]] = None

class DispatchResponse(BaseModel):
    """نموذج رد التوزيع"""
    success: bool
    task: str
    bot: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    """الصفحة الرئيسية"""
    return {
        "name": "Surooh Core - Execution Brain",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "dispatch": "/api/core/dispatch",
            "health": "/api/core/health",
            "tasks": "/api/core/tasks",
            "roles": "/api/core/roles"
        }
    }

@app.post("/api/core/dispatch")
async def core_dispatch(request: DispatchRequest) -> Dict:
    """
    🎯 نقطة التوزيع الرئيسية - عقل التنفيذ
    
    يستقبل المهمة ويوزعها على البوت المناسب بعد التحقق من الصلاحيات
    """
    try:
        logger.info(f"📥 Received dispatch request: {request.task}")
        
        result = dispatcher.dispatch_task(
            task=request.task,
            payload=request.payload
        )
        
        return result
    
    except Exception as e:
        logger.error(f"❌ Dispatch error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/core/health")
async def health_check():
    """فحص صحة النظام"""
    try:
        health = dispatcher.health_check()
        return health
    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/core/tasks")
async def get_available_tasks():
    """الحصول على قائمة المهام المتاحة"""
    try:
        tasks = dispatcher.get_available_tasks()
        return {
            "success": True,
            "total": len(tasks),
            "tasks": tasks
        }
    except Exception as e:
        logger.error(f"❌ Failed to get tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/core/roles")
async def get_roles():
    """الحصول على قائمة الأدوار المتاحة"""
    try:
        roles = dispatcher.delegation.get_all_roles()
        
        # تفاصيل كل دور
        roles_detail = {}
        for role in roles:
            role_config = dispatcher.delegation.roles.get(role)
            if role_config:
                roles_detail[role] = {
                    "name": role_config.get("name"),
                    "allowed_tasks": role_config.get("allowed_tasks", []),
                    "permissions": role_config.get("permissions", [])
                }
        
        return {
            "success": True,
            "total": len(roles),
            "roles": roles_detail
        }
    except Exception as e:
        logger.error(f"❌ Failed to get roles: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/core/bot/{role}")
async def get_bot_status(role: str):
    """الحصول على حالة بوت معين"""
    try:
        bot = dispatcher.get_bot_status(role)
        
        if not bot:
            raise HTTPException(status_code=404, detail=f"Bot not found: {role}")
        
        return {
            "success": True,
            "role": role,
            "bot": bot
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get bot status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting Surooh Core - Execution Brain")
    logger.info("📡 Listening on http://localhost:8000")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
