"""
🧠 Surooh Core - Execution Brain
نواة التنفيذ - Smart Delegation + Core Dispatcher
"""

from .delegation import delegation, SmartDelegation
from .dispatcher import dispatcher, CoreDispatcher

__all__ = [
    'delegation',
    'SmartDelegation',
    'dispatcher',
    'CoreDispatcher'
]
