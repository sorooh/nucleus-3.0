/**
 * Official Mail Hub Core → Nucleus 2.0 Central Memory Core Connector
 * Following Surooh Technical Specification v1.0
 * 
 * Features:
 * - JWT + HMAC-SHA256 authentication
 * - JSON Envelope Schema
 * - Bidirectional communication
 */

const WebSocket = require('ws');
const https = require('https');
const crypto = require('crypto');

class MailHubConnector {
  constructor(config) {
    this.nucleusUrl = config.nucleusUrl || 'https://central.sorooh.ai';
    this.mailhubUrl = config.mailhubUrl || 'https://mailhub.sorooh.ai';
    this.wsUrl = config.wsUrl || 'wss://central.sorooh.ai/ws/nucleus';
    
    // Secrets
    this.jwtToken = config.jwtToken;
    this.centralHmacSecret = config.centralHmacSecret;
    this.mailhubHmacSecret = config.mailhubHmacSecret;
    
    this.platform = 'MAIL_HUB';
    this.ws = null;
    this.connected = false;
    this.syncInterval = config.syncInterval || 15; // minutes
    this.syncTimer = null;
    
    console.log('[MailHub→Nucleus] Initialized');
  }

  /**
   * Generate HMAC-SHA256 signature
   */
  signHmac(secret, body) {
    return crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
  }

  /**
   * Verify HMAC-SHA256 signature
   */
  verifyHmac(secret, body, signature) {
    const expected = this.signHmac(secret, body);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }

  /**
   * Connect to Nucleus via WebSocket
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        console.log('[MailHub→Nucleus] 🔌 WebSocket connected');
        
        // Send authentication with JWT
        this.ws.send(JSON.stringify({
          type: 'auth',
          platform: this.platform,
          token: this.jwtToken,
          timestamp: new Date().toISOString()
        }));
      });

      this.ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'ack' && msg.payload.message === 'Authentication successful') {
          this.connected = true;
          resolve();
        }
        
        this.handleMessage(msg);
      });

      this.ws.on('close', () => {
        console.log('[MailHub→Nucleus] WebSocket disconnected');
        this.connected = false;
        setTimeout(() => this.connectWebSocket(), 5000);
      });

      this.ws.on('error', (error) => {
        console.error('[MailHub→Nucleus] WebSocket error:', error.message);
        reject(error);
      });
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(message) {
    console.log('[MailHub→Nucleus] 📥 Received:', message.type);

    switch (message.type) {
      case 'ack':
        if (message.payload.message === 'Authentication successful') {
          console.log('[MailHub→Nucleus] ✅ Authenticated');
          this.startPeriodicSync();
        }
        break;

      case 'data':
        this.handleNucleusData(message.payload);
        break;

      case 'ping':
        this.ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;
    }
  }

  /**
   * Handle AI feedback from Nucleus
   */
  handleNucleusData(data) {
    console.log('[MailHub→Nucleus] 🧠 AI Feedback:', data);
    
    if (data.dataType === 'AI_FEEDBACK') {
      const { recommendedReply, confidence, modelVersion } = data.payload;
      console.log(`  → Reply: ${recommendedReply}`);
      console.log(`  → Confidence: ${confidence}`);
      console.log(`  → Model: ${modelVersion}`);
    }
  }

  /**
   * Export email summaries to Central Core (Official Spec)
   * POST /central/memory/mailhub/export
   * 
   * Requires:
   * - JWT Bearer token
   * - HMAC-SHA256 signature in X-Surooh-Signature
   */
  async exportToCentral(summaries) {
    try {
      // Build JSON Envelope
      const envelope = {
        source: 'MAIL_HUB_CORE',
        direction: 'OUTBOUND',
        timestamp: new Date().toISOString(),
        dataType: 'EMAIL_SUMMARIES',
        payload: {
          summaries
        },
        metadata: {
          schemaVersion: 'v1.0.0',
          authToken: this.jwtToken
        }
      };

      const body = JSON.stringify(envelope);
      const signature = this.signHmac(this.centralHmacSecret, body);

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.jwtToken}`,
          'X-Surooh-Signature': signature
        }
      };

      return new Promise((resolve, reject) => {
        const req = https.request(
          `${this.nucleusUrl}/central/memory/mailhub/export`,
          options,
          (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              console.log('[MailHub→Central] ✅ Export complete:', data);
              resolve(JSON.parse(data));
            });
          }
        );

        req.on('error', reject);
        req.write(body);
        req.end();
      });
    } catch (error) {
      console.error('[MailHub→Central] Export failed:', error.message);
      throw error;
    }
  }

  /**
   * Receive sync feedback from Central Core (Official Spec)
   * This simulates the /mailhub/core/sync endpoint that Mail Hub should expose
   */
  receiveSyncFeedback(req, res) {
    try {
      // Verify HMAC signature
      const signature = req.headers['x-surooh-signature'];
      if (!signature) {
        return res.status(401).json({ error: 'Missing X-Surooh-Signature' });
      }

      const rawBody = JSON.stringify(req.body);
      if (!this.verifyHmac(this.mailhubHmacSecret, rawBody, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Parse envelope
      const envelope = req.body;
      
      if (!envelope.source || !envelope.direction || !envelope.dataType) {
        return res.status(400).json({ error: 'Invalid envelope' });
      }

      console.log('[Central→MailHub] 📥 Feedback received:', envelope.dataType);
      
      // Process feedback
      this.handleNucleusData(envelope);

      res.json({ 
        success: true, 
        message: 'Feedback applied',
        dataType: envelope.dataType
      });
    } catch (error) {
      console.error('[Central→MailHub] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Start periodic sync (every 15 minutes)
   */
  startPeriodicSync() {
    if (this.syncTimer) clearInterval(this.syncTimer);

    console.log(`[MailHub→Nucleus] ⏰ Periodic sync: ${this.syncInterval} min`);

    this.syncTimer = setInterval(async () => {
      console.log('[MailHub→Nucleus] 🔄 Periodic sync triggered');
      
      // Collect summaries from Mail Hub local storage
      // const summaries = await getLocalSummaries();
      // await this.exportToCentral(summaries);
      
    }, this.syncInterval * 60 * 1000);
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.ws) this.ws.close();
    console.log('[MailHub→Nucleus] Disconnected');
  }
}

// ============= Example Usage =============

const connector = new MailHubConnector({
  nucleusUrl: 'https://central.sorooh.ai',
  mailhubUrl: 'https://mailhub.sorooh.ai',
  wsUrl: 'wss://central.sorooh.ai/ws/nucleus',
  jwtToken: 'YOUR_JWT_TOKEN',
  centralHmacSecret: process.env.CENTRAL_HMAC_SECRET,
  mailhubHmacSecret: process.env.MAILHUB_HMAC_SECRET,
  syncInterval: 15
});

// Connect WebSocket
connector.connectWebSocket().then(() => {
  console.log('✅ Connected and authenticated');
});

// Export email summaries
/*
connector.exportToCentral([
  {
    messageId: 'MH-1',
    sender: 'client@supplier.com',
    subject: 'New quotation',
    summary: 'Supplier sent quotation for 10k units',
    sentiment: 'positive'
  }
]).then(result => {
  console.log('Export result:', result);
});
*/

// Graceful shutdown
process.on('SIGINT', () => {
  connector.disconnect();
  process.exit(0);
});

module.exports = MailHubConnector;
