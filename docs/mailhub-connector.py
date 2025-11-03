"""
Mail Hub Core → Nucleus 2.0 Central Memory Core Connector (Python)
Built from absolute zero for Surooh Empire

This is a simple Python client that Mail Hub can use to connect
with Nucleus 2.0 Central Memory Core via WebSocket and REST APIs
"""

import asyncio
import websockets
import json
import requests
from datetime import datetime
from typing import Dict, Any, Optional

class MailHubConnector:
    def __init__(self, config: Dict[str, Any]):
        self.nucleus_url = config.get('nucleus_url', 'https://nucleus.surooh.com')
        self.ws_url = config.get('ws_url', 'wss://nucleus.surooh.com/ws/nucleus')
        self.jwt_token = config['jwt_token']  # Required: JWT token for authentication
        self.platform = 'MAIL_HUB'
        
        self.ws = None
        self.connected = False
        self.sync_interval = config.get('sync_interval', 15)  # minutes
        
        print(f'[MailHubConnector] Initialized for {self.nucleus_url}')

    async def connect_websocket(self):
        """Connect to Nucleus via WebSocket for real-time communication"""
        try:
            self.ws = await websockets.connect(self.ws_url)
            print('[MailHubConnector] 🔌 WebSocket connected to Nucleus')
            
            # Send authentication
            await self.ws.send(json.dumps({
                'type': 'auth',
                'platform': self.platform,
                'token': self.jwt_token,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }))
            
            # Start listening for messages
            await self.listen_messages()
            
        except Exception as e:
            print(f'[MailHubConnector] WebSocket error: {e}')
            # Reconnect after 5 seconds
            await asyncio.sleep(5)
            await self.connect_websocket()

    async def listen_messages(self):
        """Listen for incoming WebSocket messages"""
        try:
            async for message in self.ws:
                data = json.loads(message)
                await self.handle_message(data)
        except websockets.exceptions.ConnectionClosed:
            print('[MailHubConnector] WebSocket disconnected')
            self.connected = False
            # Reconnect
            await asyncio.sleep(5)
            await self.connect_websocket()

    async def handle_message(self, message: Dict[str, Any]):
        """Handle incoming WebSocket message"""
        print(f"[MailHubConnector] 📥 Received: {message.get('type')}")
        
        msg_type = message.get('type')
        
        if msg_type == 'ack':
            if message.get('payload', {}).get('message') == 'Authentication successful':
                self.connected = True
                print(f'[MailHubConnector] ✅ Authenticated as {self.platform}')
                
                # Start periodic sync
                asyncio.create_task(self.start_periodic_sync())
                
        elif msg_type == 'data':
            # Handle data from Nucleus (AI feedback, models, etc.)
            await self.handle_nucleus_data(message.get('payload'))
            
        elif msg_type == 'ping':
            # Respond to ping
            await self.ws.send(json.dumps({
                'type': 'pong',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }))

    async def handle_nucleus_data(self, data: Dict[str, Any]):
        """Handle incoming data from Nucleus"""
        print(f'[MailHubConnector] 🧠 AI Feedback from Nucleus: {data}')
        
        # Example: Handle AI feedback for email processing
        if data.get('dataType') == 'AI_FEEDBACK':
            payload = data.get('payload', {})
            recommended_reply = payload.get('recommendedReply')
            confidence = payload.get('confidence')
            model_version = payload.get('modelVersion')
            
            print(f'  → Recommended Reply: {recommended_reply}')
            print(f'  → Confidence: {confidence}')
            print(f'  → Model: {model_version}')
            
            # Your Mail Hub logic here
            # e.g., update local database, trigger auto-reply, etc.

    async def send_email_summary(self, email_data: Dict[str, Any]):
        """Send email summary to Nucleus via WebSocket"""
        if not self.connected:
            print('[MailHubConnector] Not connected - queuing message')
            # In production, implement a queue system
            return
        
        message = {
            'type': 'data',
            'platform': self.platform,
            'messageId': f"MH-{int(datetime.utcnow().timestamp() * 1000)}",
            'payload': {
                'platform': self.platform,
                'direction': 'OUTBOUND',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'dataType': 'EMAIL_SUMMARY',
                'payload': {
                    'messageId': email_data['messageId'],
                    'sender': email_data['sender'],
                    'subject': email_data['subject'],
                    'summary': email_data['summary'],
                    'sentiment': email_data.get('sentiment', 'neutral'),
                    'category': email_data.get('category', 'general')
                },
                'metadata': {
                    'source': 'MAIL_HUB_CORE',
                    'priority': email_data.get('priority', 'MEDIUM'),
                    'schemaVersion': 'v1.0.0',
                    'authToken': self.jwt_token
                }
            },
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        
        await self.ws.send(json.dumps(message))
        print(f"[MailHubConnector] 📤 Sent email summary: {email_data['subject']}")

    async def send_batch_sync(self, summaries: list):
        """Send batch sync via REST API (every 15 minutes)"""
        try:
            data = {
                'platform': self.platform,
                'direction': 'OUTBOUND',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'dataType': 'EMAIL_SUMMARY',
                'payload': {
                    'summary': f'Batch sync: {len(summaries)} emails processed',
                    'details': summaries
                },
                'metadata': {
                    'source': 'MAIL_HUB_CORE',
                    'priority': 'MEDIUM',
                    'schemaVersion': 'v1.0.0',
                    'authToken': self.jwt_token
                }
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.jwt_token}'
            }
            
            response = requests.post(
                f'{self.nucleus_url}/api/v1/mailhub/sync',
                json=data,
                headers=headers
            )
            
            print(f'[MailHubConnector] ✅ Batch sync completed: {response.text}')
            
        except Exception as e:
            print(f'[MailHubConnector] Batch sync error: {e}')

    async def start_periodic_sync(self):
        """Start periodic sync (every 15 minutes as per spec)"""
        print(f'[MailHubConnector] ⏰ Starting periodic sync every {self.sync_interval} minutes')
        
        while self.connected:
            await asyncio.sleep(self.sync_interval * 60)  # Convert to seconds
            
            print('[MailHubConnector] 🔄 Periodic sync triggered')
            
            # Collect summaries from Mail Hub local storage
            # summaries = get_local_summaries()  # Your implementation
            # await self.send_batch_sync(summaries)

    async def disconnect(self):
        """Disconnect from Nucleus"""
        if self.ws:
            await self.ws.close()
        
        self.connected = False
        print('[MailHubConnector] Disconnected from Nucleus')


# ============= Example Usage =============

async def main():
    # Initialize connector
    connector = MailHubConnector({
        'nucleus_url': 'https://nucleus.surooh.com',
        'ws_url': 'wss://nucleus.surooh.com/ws/nucleus',
        'jwt_token': 'YOUR_JWT_TOKEN_HERE',  # Get this from Nucleus auth
        'sync_interval': 15  # minutes
    })
    
    # Connect to Nucleus
    await connector.connect_websocket()
    
    # Example: Send email summary when email is processed
    """
    await connector.send_email_summary({
        'messageId': 'MH-12345',
        'sender': 'client@supplier.com',
        'subject': 'New quotation for packaging',
        'summary': 'Supplier sent updated quotation for 10k units with delivery timeline.',
        'sentiment': 'positive',
        'category': 'business',
        'priority': 'HIGH'
    })
    """

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('[MailHubConnector] Shutting down...')
