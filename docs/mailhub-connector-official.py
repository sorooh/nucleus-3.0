"""
Official Mail Hub Core → Nucleus 2.0 Central Memory Core Connector
Following Surooh Technical Specification v1.0

Features:
- JWT + HMAC-SHA256 authentication
- JSON Envelope Schema
- Bidirectional communication
"""

import asyncio
import json
import hmac
import hashlib
import websockets
import aiohttp
from datetime import datetime
from typing import List, Dict, Optional

class MailHubConnector:
    def __init__(self, config: Dict):
        self.nucleus_url = config.get('nucleus_url', 'https://central.sorooh.ai')
        self.mailhub_url = config.get('mailhub_url', 'https://mailhub.sorooh.ai')
        self.ws_url = config.get('ws_url', 'wss://central.sorooh.ai/ws/nucleus')
        
        # Secrets
        self.jwt_token = config.get('jwt_token')
        self.central_hmac_secret = config.get('central_hmac_secret')
        self.mailhub_hmac_secret = config.get('mailhub_hmac_secret')
        
        self.platform = 'MAIL_HUB'
        self.ws = None
        self.connected = False
        self.sync_interval = config.get('sync_interval', 15)  # minutes
        
        print('[MailHub→Nucleus] Initialized')

    def sign_hmac(self, secret: str, body: str) -> str:
        """Generate HMAC-SHA256 signature"""
        return hmac.new(
            secret.encode(),
            body.encode(),
            hashlib.sha256
        ).hexdigest()

    def verify_hmac(self, secret: str, body: str, signature: str) -> bool:
        """Verify HMAC-SHA256 signature"""
        expected = self.sign_hmac(secret, body)
        return hmac.compare_digest(signature, expected)

    async def connect_websocket(self):
        """Connect to Nucleus via WebSocket"""
        try:
            self.ws = await websockets.connect(self.ws_url)
            print('[MailHub→Nucleus] 🔌 WebSocket connected')
            
            # Send authentication
            auth_msg = {
                'type': 'auth',
                'platform': self.platform,
                'token': self.jwt_token,
                'timestamp': datetime.now().isoformat()
            }
            await self.ws.send(json.dumps(auth_msg))
            
            # Wait for auth response
            response = await self.ws.recv()
            msg = json.loads(response)
            
            if msg['type'] == 'ack' and msg['payload']['message'] == 'Authentication successful':
                self.connected = True
                print('[MailHub→Nucleus] ✅ Authenticated')
                
                # Start message handler
                asyncio.create_task(self.handle_messages())
                
                # Start periodic sync
                asyncio.create_task(self.periodic_sync())
                
        except Exception as e:
            print(f'[MailHub→Nucleus] WebSocket error: {e}')
            await asyncio.sleep(5)
            await self.connect_websocket()

    async def handle_messages(self):
        """Handle incoming WebSocket messages"""
        try:
            async for message in self.ws:
                msg = json.loads(message)
                print(f'[MailHub→Nucleus] 📥 Received: {msg["type"]}')
                
                if msg['type'] == 'data':
                    await self.handle_nucleus_data(msg['payload'])
                elif msg['type'] == 'ping':
                    await self.ws.send(json.dumps({
                        'type': 'pong',
                        'timestamp': datetime.now().isoformat()
                    }))
        except Exception as e:
            print(f'[MailHub→Nucleus] Message handler error: {e}')

    async def handle_nucleus_data(self, data: Dict):
        """Handle AI feedback from Nucleus"""
        print(f'[MailHub→Nucleus] 🧠 AI Feedback: {data}')
        
        if data.get('dataType') == 'AI_FEEDBACK':
            payload = data.get('payload', {})
            print(f"  → Reply: {payload.get('recommendedReply')}")
            print(f"  → Confidence: {payload.get('confidence')}")
            print(f"  → Model: {payload.get('modelVersion')}")

    async def export_to_central(self, summaries: List[Dict]) -> Dict:
        """
        Export email summaries to Central Core (Official Spec)
        POST /central/memory/mailhub/export
        
        Requires:
        - JWT Bearer token
        - HMAC-SHA256 signature in X-Surooh-Signature
        """
        try:
            # Build JSON Envelope
            envelope = {
                'source': 'MAIL_HUB_CORE',
                'direction': 'OUTBOUND',
                'timestamp': datetime.now().isoformat(),
                'dataType': 'EMAIL_SUMMARIES',
                'payload': {
                    'summaries': summaries
                },
                'metadata': {
                    'schemaVersion': 'v1.0.0',
                    'authToken': self.jwt_token
                }
            }

            body = json.dumps(envelope)
            signature = self.sign_hmac(self.central_hmac_secret, body)

            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.jwt_token}',
                'X-Surooh-Signature': signature
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f'{self.nucleus_url}/central/memory/mailhub/export',
                    headers=headers,
                    data=body
                ) as response:
                    result = await response.json()
                    print(f'[MailHub→Central] ✅ Export complete: {result}')
                    return result

        except Exception as e:
            print(f'[MailHub→Central] Export failed: {e}')
            raise

    async def receive_sync_feedback(self, envelope: Dict) -> Dict:
        """
        Process sync feedback from Central Core
        This simulates the /mailhub/core/sync endpoint
        """
        try:
            body = json.dumps(envelope)
            
            # In production, this would be called by Central Core
            # For now, we just process the envelope
            print(f'[Central→MailHub] 📥 Feedback: {envelope.get("dataType")}')
            
            await self.handle_nucleus_data(envelope)
            
            return {
                'success': True,
                'message': 'Feedback applied',
                'dataType': envelope.get('dataType')
            }
        except Exception as e:
            print(f'[Central→MailHub] Error: {e}')
            raise

    async def periodic_sync(self):
        """Start periodic sync (every 15 minutes)"""
        print(f'[MailHub→Nucleus] ⏰ Periodic sync: {self.sync_interval} min')
        
        while self.connected:
            await asyncio.sleep(self.sync_interval * 60)
            print('[MailHub→Nucleus] 🔄 Periodic sync triggered')
            
            # Collect summaries from Mail Hub local storage
            # summaries = await get_local_summaries()
            # await self.export_to_central(summaries)

    async def disconnect(self):
        """Disconnect from Nucleus"""
        if self.ws:
            await self.ws.close()
        self.connected = False
        print('[MailHub→Nucleus] Disconnected')


# ============= Example Usage =============

async def main():
    connector = MailHubConnector({
        'nucleus_url': 'https://central.sorooh.ai',
        'mailhub_url': 'https://mailhub.sorooh.ai',
        'ws_url': 'wss://central.sorooh.ai/ws/nucleus',
        'jwt_token': 'YOUR_JWT_TOKEN',
        'central_hmac_secret': 'YOUR_CENTRAL_HMAC_SECRET',
        'mailhub_hmac_secret': 'YOUR_MAILHUB_HMAC_SECRET',
        'sync_interval': 15
    })

    # Connect WebSocket
    await connector.connect_websocket()
    
    # Export email summaries
    """
    result = await connector.export_to_central([
        {
            'messageId': 'MH-1',
            'sender': 'client@supplier.com',
            'subject': 'New quotation',
            'summary': 'Supplier sent quotation for 10k units',
            'sentiment': 'positive'
        }
    ])
    print(f'Export result: {result}')
    """
    
    # Keep running
    try:
        await asyncio.Future()  # run forever
    except KeyboardInterrupt:
        await connector.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
