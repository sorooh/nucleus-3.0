"""
🔐 Surooh Core - Smart Delegation System
نظام التفويض الذكي - تحميل الصلاحيات والتحقق من السماح أو المنع
"""

import yaml
from pathlib import Path
from typing import Dict, List, Optional
from loguru import logger
import os

class SmartDelegation:
    """نظام التفويض الذكي - يتحكم في صلاحيات البوتات"""
    
    def __init__(self, policies_path: Optional[str] = None):
        if policies_path is None:
            base_dir = Path(__file__).parent
            self.policies_path = base_dir / "policies" / "delegation.yaml"
        else:
            self.policies_path = Path(policies_path)
        self.policies: Dict = {}
        self.roles: Dict = {}
        self.restricted_tasks: List[str] = []
        self.settings: Dict = {}
        
        self._load_policies()
    
    def _load_policies(self):
        """تحميل سياسات التفويض من ملف YAML"""
        try:
            if not self.policies_path.exists():
                logger.error(f"❌ Delegation policies file not found: {self.policies_path}")
                return
            
            with open(self.policies_path, 'r', encoding='utf-8') as f:
                self.policies = yaml.safe_load(f)
            
            self.roles = self.policies.get('roles', {})
            self.restricted_tasks = self.policies.get('restricted_tasks', [])
            self.settings = self.policies.get('settings', {})
            
            logger.info(f"✅ Delegation policies loaded: {len(self.roles)} roles, {len(self.restricted_tasks)} restricted tasks")
        
        except Exception as e:
            logger.error(f"❌ Failed to load delegation policies: {e}")
    
    def check_permission(self, role: str, task: str) -> Dict:
        """
        التحقق من صلاحية دور معين لتنفيذ مهمة
        
        Returns:
            Dict: {
                "allowed": bool,
                "reason": str,
                "requires_approval": bool
            }
        """
        
        # التحقق من وجود الدور
        if role not in self.roles:
            return {
                "allowed": False,
                "reason": f"دور غير معروف: {role}",
                "requires_approval": False
            }
        
        role_config = self.roles[role]
        allowed_tasks = role_config.get('allowed_tasks', [])
        
        # التحقق من المهام المحظورة
        if task in self.restricted_tasks:
            requires_approval = self.settings.get('require_approval_for_restricted', True)
            return {
                "allowed": False,
                "reason": f"مهمة محظورة: {task}",
                "requires_approval": requires_approval
            }
        
        # التحقق من صلاحية المهمة للدور
        if task in allowed_tasks:
            return {
                "allowed": True,
                "reason": f"مسموح للدور {role_config['name']} بتنفيذ {task}",
                "requires_approval": False
            }
        
        return {
            "allowed": False,
            "reason": f"المهمة {task} غير مسموحة للدور {role_config['name']}",
            "requires_approval": False
        }
    
    def get_role_permissions(self, role: str) -> Optional[List[str]]:
        """الحصول على قائمة الصلاحيات لدور معين"""
        if role in self.roles:
            return self.roles[role].get('permissions', [])
        return None
    
    def suggest_role_for_task(self, task: str) -> Optional[str]:
        """اقتراح الدور المناسب لمهمة معينة"""
        for role, config in self.roles.items():
            if task in config.get('allowed_tasks', []):
                return role
        return None
    
    def get_all_roles(self) -> List[str]:
        """الحصول على قائمة جميع الأدوار المتاحة"""
        return list(self.roles.keys())
    
    def is_task_restricted(self, task: str) -> bool:
        """التحقق من كون المهمة محظورة"""
        return task in self.restricted_tasks


# 🌍 نسخة واحدة عالمية
delegation = SmartDelegation()
