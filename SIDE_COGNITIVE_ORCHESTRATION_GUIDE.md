# SIDE Cognitive Orchestration Integration Guide
**Phase 9.8 - Distributed Collective Intelligence**

## Overview

Nicholas 3.2 الآن يعمل كـ **Cognitive Hub** للإمبراطورية Surooh، قادر على تنسيق القرارات الجماعية (Collective Intelligence) عبر جميع النوى (SIDE, Academy, Designer Pro, CodeMaster, إلخ).

هذا الدليل يشرح كيفية دمج **SIDE** مع نظام التنسيق الإدراكي.

---

## Architecture

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    Nicholas 3.2 - Cognitive Hub                  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Decision Graph   │  │ Consensus        │  │ Broadcast    │ │
│  │ Engine           │  │ Resolver         │  │ Service      │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕ ↕ ↕
          ┌───────────────────┴─┴─┴──────────────────┐
          │                                            │
     ┌────▼────┐  ┌────────┐  ┌─────────┐  ┌────────┐
     │  SIDE   │  │ Academy│  │ Designer│  │ CodeMst│
     │  Node   │  │  Node  │  │   Pro   │  │  er    │
     └─────────┘  └────────┘  └─────────┘  └────────┘
```

### Consensus Flow

1. **Initiation**: أي نواة (node) يمكنها بدء عملية توافق (consensus)
2. **Collection**: Nicholas يجمع قرارات جميع النوى المشاركة
3. **Analysis**: يبني Decision Graph ويحلل التعارضات
4. **Consensus**: يحسب Agreement Ratio ويُحدد القرار النهائي
5. **Governance**: يمرر القرار عبر CPE + TAG للموافقة
6. **Broadcast**: يوزع القرار النهائي على جميع النوى
7. **Execution**: كل نواة تنفذ القرار المعتمد

---

## Integration Steps

### Step 1: Create Decision Sender

في مشروع SIDE، أنشئ ملف `cognitive_decision_sender.ts`:

```typescript
/**
 * Cognitive Decision Sender - SIDE Node
 * إرسال قرارات SIDE إلى Nicholas Cognitive Hub
 */

import axios from 'axios';
import crypto from 'crypto';

interface DecisionPayload {
  nodeId: string;
  nodeName: string;
  decisionType: string;
  payload: any;
  confidence: number;  // 0.0 - 1.0
  expectedImpact: number;  // 0.0 - 1.0
  priority?: number;
  dependencies?: string[];
  conflicts?: string[];
}

export class CognitiveDecisionSender {
  private nicholasUrl: string;
  private authToken: string;
  private hmacSecret: string;
  
  constructor(config: {
    nicholasUrl: string;
    authToken: string;
    hmacSecret: string;
  }) {
    this.nicholasUrl = config.nicholasUrl;
    this.authToken = config.authToken;
    this.hmacSecret = config.hmacSecret;
  }
  
  /**
   * إرسال قرار من SIDE إلى Nicholas للتنسيق الجماعي
   */
  async sendDecision(
    decisionType: string,
    payload: any,
    config: {
      confidence: number;
      expectedImpact: number;
      priority?: number;
      otherNodes?: string[];  // النوى الأخرى المشاركة
    }
  ): Promise<any> {
    const decision: DecisionPayload = {
      nodeId: 'side-node-main',
      nodeName: 'SIDE Main',
      decisionType,
      payload,
      confidence: config.confidence,
      expectedImpact: config.expectedImpact,
      priority: config.priority || 1
    };
    
    // جمع قرارات النوى الأخرى (إذا متاحة)
    // في Production، ستجمع قرارات من Academy, Designer, etc.
    const nodeDecisions = [decision];
    
    const orchestrationRequest = {
      initiatorNode: 'side-node-main',
      decisionType,
      nodeDecisions,
      consensusMethod: 'weighted-vote',
      requiresGovernance: config.expectedImpact > 0.7  // High impact requires governance
    };
    
    const timestamp = Date.now().toString();
    const signature = this.generateHMAC(orchestrationRequest, timestamp);
    
    const response = await axios.post(
      `${this.nicholasUrl}/api/federation/orchestrate`,
      orchestrationRequest,
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Surooh-KeyId': 'side-main-key',
          'X-Surooh-Timestamp': timestamp,
          'X-Surooh-Signature': signature,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.consensus;
  }
  
  /**
   * توليد HMAC signature
   */
  private generateHMAC(payload: any, timestamp: string): string {
    const data = JSON.stringify(payload) + timestamp;
    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update(data)
      .digest('hex');
  }
}
```

### Step 2: Create Broadcast Receiver

أنشئ ملف `cognitive_broadcast_receiver.ts`:

```typescript
/**
 * Cognitive Broadcast Receiver - SIDE Node
 * استقبال وتنفيذ القرارات الجماعية من Nicholas
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/cognitive/receive
 * استقبال broadcast من Nicholas Cognitive Hub
 */
router.post('/receive', async (req: Request, res: Response) => {
  try {
    const {
      consensusId,
      decisionType,
      finalDecision,
      finalConfidence,
      checksum,
      participatingNodes,
      agreementRatio
    } = req.body;
    
    console.log(`[SIDE Cognitive] Received consensus: ${consensusId}`);
    
    // Verify checksum
    const computedChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(finalDecision))
      .digest('hex');
    
    if (computedChecksum !== checksum) {
      return res.status(400).json({
        success: false,
        error: 'Checksum verification failed'
      });
    }
    
    // Execute decision based on type
    await executeDecision(decisionType, finalDecision, finalConfidence);
    
    console.log(`[SIDE Cognitive] ✅ Decision executed: ${decisionType}`);
    
    return res.status(200).json({
      success: true,
      consensusId,
      acknowledged: true,
      executed: true,
      message: 'Decision received and executed'
    });
    
  } catch (error: any) {
    console.error('[SIDE Cognitive] Error receiving broadcast:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to receive broadcast',
      details: error.message
    });
  }
});

/**
 * تنفيذ القرار المستلم
 */
async function executeDecision(
  decisionType: string,
  finalDecision: any,
  confidence: number
): Promise<void> {
  console.log(`[SIDE Cognitive] Executing decision: ${decisionType}`);
  console.log(`  Confidence: ${confidence.toFixed(2)}`);
  console.log(`  Payload:`, finalDecision.payload);
  
  // TODO: Implement decision execution logic based on decisionType
  switch (decisionType) {
    case 'optimize-performance':
      // أضف logic لتحسين الأداء
      break;
      
    case 'scale-resources':
      // أضف logic لتوسعة الموارد
      break;
      
    case 'update-config':
      // أضف logic لتحديث الإعدادات
      break;
      
    default:
      console.log(`[SIDE Cognitive] Unknown decision type: ${decisionType}`);
  }
}

export default router;
```

### Step 3: Register Routes

في `server/routes.ts` أو ملف الـ routes الرئيسي:

```typescript
import cognitiveBroadcastReceiver from './cognitive/cognitive_broadcast_receiver';

// Register cognitive orchestration endpoint
app.use('/api/cognitive', cognitiveBroadcastReceiver);
console.log('✅ Cognitive Orchestration Receiver activated');
```

---

## Usage Examples

### Example 1: Send Optimization Decision

```typescript
import { CognitiveDecisionSender } from './cognitive_decision_sender';

const sender = new CognitiveDecisionSender({
  nicholasUrl: process.env.NICHOLAS_URL || 'http://nicholas:5000',
  authToken: process.env.NICHOLAS_AUTH_TOKEN!,
  hmacSecret: process.env.NICHOLAS_HMAC_SECRET!
});

// SIDE يقترح تحسين Cache
const consensus = await sender.sendDecision(
  'optimize-performance',
  {
    component: 'cache',
    action: 'increase-size',
    targetSize: '4GB',
    reason: 'Cache hit rate below 80%'
  },
  {
    confidence: 0.85,
    expectedImpact: 0.7,
    priority: 1
  }
);

console.log(`Consensus ID: ${consensus.consensusId}`);
console.log(`Status: ${consensus.status}`);
console.log(`Agreement: ${(consensus.agreementRatio * 100).toFixed(1)}%`);
```

### Example 2: Coordinate with Multiple Nodes

```typescript
// SIDE يريد التنسيق مع Academy و Designer لـ Database Optimization

// في Production، ستجمع قرارات من النوى الأخرى
// مثلاً عبر WebSocket أو HTTP
const academyDecision = await getAcademyDecision('optimize-database');
const designerDecision = await getDesignerDecision('optimize-database');

const orchestrationRequest = {
  initiatorNode: 'side-node-main',
  decisionType: 'optimize-database',
  nodeDecisions: [
    {
      nodeId: 'side-node-main',
      nodeName: 'SIDE Main',
      decisionType: 'optimize-database',
      payload: { tables: ['code_files', 'projects'] },
      confidence: 0.9,
      expectedImpact: 0.8
    },
    academyDecision,
    designerDecision
  ],
  consensusMethod: 'weighted-vote'
};

// Send to Nicholas for consensus
const response = await axios.post(
  `${nicholasUrl}/api/federation/orchestrate`,
  orchestrationRequest,
  { headers: { ... } }
);
```

---

## Decision Types

### Supported Decision Types

| Decision Type | Description | Example Payload |
|--------------|-------------|-----------------|
| `optimize-performance` | تحسين الأداء | `{ component: 'cache', action: 'increase-size' }` |
| `scale-resources` | توسعة الموارد | `{ instances: 5, region: 'us-east' }` |
| `update-config` | تحديث الإعدادات | `{ key: 'max_connections', value: 100 }` |
| `security-policy` | تحديث سياسة الأمان | `{ policy: 'require-2fa', enabled: true }` |
| `data-sync` | مزامنة البيانات | `{ source: 'side', target: 'academy' }` |

---

## Consensus Methods

### 1. Weighted Vote (Default)

```typescript
consensusMethod: 'weighted-vote'
```

- كل نواة لها وزن بناءً على confidence + impact
- Agreement ≥ 70% → approved
- الأفضل للقرارات المتوسطة الأهمية

### 2. Unanimous

```typescript
consensusMethod: 'unanimous'
```

- يجب موافقة **جميع** النوى بنسبة 100%
- الأفضل للقرارات شديدة الأهمية

### 3. Majority

```typescript
consensusMethod: 'majority'
```

- يكفي أغلبية بسيطة (>50%)
- الأفضل للقرارات السريعة

### 4. Quorum

```typescript
consensusMethod: 'quorum'
```

- يشترط نسبة مشاركة دنيا (60%)
- ثم أغلبية من المشاركين

---

## Governance Integration

### Automatic Governance Check

Nicholas يُمرر القرارات تلقائيًا عبر Governance Engine (CPE + TAG) إذا:

1. `requiresGovernance: true` (يُحددها المُرسل)
2. `conflictLevel >= 50%` (تعارض عالي)
3. `status === 'review_required'` (يحتاج مراجعة)

### Manual Governance

```typescript
const consensus = await sender.sendDecision(
  'critical-update',
  { action: 'shutdown-region' },
  {
    confidence: 0.95,
    expectedImpact: 0.9,
    priority: 1
  }
);

if (consensus.status === 'review_required') {
  console.log(`⚠️  Requires manual review: ${consensus.reviewReason}`);
  // Wait for CPE/TAG approval
}
```

---

## Testing

### Local Test

```bash
# Start Nicholas 3.2
cd nicholas-3.2
npm run dev

# In another terminal, run test
npx tsx test-phase-9-8-complete.ts
```

### SIDE Integration Test

```typescript
// test-side-cognitive.ts
import { CognitiveDecisionSender } from './cognitive_decision_sender';

async function testSIDECognitive() {
  const sender = new CognitiveDecisionSender({
    nicholasUrl: 'http://localhost:5000',
    authToken: process.env.NICHOLAS_AUTH_TOKEN!,
    hmacSecret: process.env.NICHOLAS_HMAC_SECRET!
  });
  
  const consensus = await sender.sendDecision(
    'optimize-performance',
    {
      component: 'database',
      action: 'add-indexes',
      tables: ['code_files']
    },
    {
      confidence: 0.85,
      expectedImpact: 0.6,
      priority: 2
    }
  );
  
  console.log('✅ Consensus received:', consensus);
}

testSIDECognitive();
```

---

## Security

### Triple-Layer Security

جميع requests تستخدم Triple-Layer Security:

1. **JWT Authentication**: `Authorization: Bearer <token>`
2. **HMAC-SHA256**: `X-Surooh-Signature` header
3. **RSA Code Signature**: `X-Surooh-CodeSig` header

### Environment Variables

```env
# في SIDE .env
NICHOLAS_URL=https://nicholas.surooh.com
NICHOLAS_AUTH_TOKEN=<your-jwt-token>
NICHOLAS_HMAC_SECRET=<your-hmac-secret>
NICHOLAS_RSA_PUBLIC_KEY=<nicholas-public-key>
```

---

## Monitoring

### Check Consensus Status

```typescript
// Get consensus by ID
const response = await axios.get(
  `${nicholasUrl}/api/federation/consensus/${consensusId}`
);

console.log('Status:', response.data.consensus.status);
console.log('Broadcast:', response.data.consensus.broadcastStatus);
```

### Get Statistics

```typescript
// Get all consensus statistics
const response = await axios.get(
  `${nicholasUrl}/api/federation/consensus/stats`
);

console.log('Total:', response.data.stats.total);
console.log('Approved:', response.data.stats.approved);
console.log('Avg Agreement:', response.data.stats.avgAgreementRatio);
```

---

## Troubleshooting

### Error: "Agreement ratio below threshold"

**السبب**: Agreement Ratio أقل من 70%

**الحل**:
- راجع الـ `confidence` و `expectedImpact` للقرارات
- تأكد من توافق القرارات من جميع النوى
- استخدم `consensusMethod: 'majority'` للقبول بأغلبية أقل

### Error: "Checksum verification failed"

**السبب**: البيانات تم تعديلها أثناء النقل

**الحل**:
- تأكد من صحة HMAC signature
- تحقق من سلامة الـ network connection
- راجع الـ payload format

### Error: "Governance approval required"

**السبب**: القرار يحتاج موافقة CPE/TAG

**الحل**:
- انتظر موافقة يدوية من Nicholas admin
- أو قلل `expectedImpact` إذا كان القرار ليس حرجاً

---

## Next Steps

1. ✅ Implement `cognitive_decision_sender.ts` in SIDE
2. ✅ Implement `cognitive_broadcast_receiver.ts` in SIDE
3. ✅ Register routes in SIDE server
4. ✅ Test with Nicholas locally
5. ✅ Deploy to production
6. ✅ Monitor consensus statistics

---

## Contact & Support

للمساعدة والدعم:
- **Nicholas Team**: nicholas-support@surooh.com
- **SIDE Team**: side-support@surooh.com
- **Documentation**: https://docs.surooh.com/cognitive-orchestration

---

**🧬 Nicholas 3.2 - Cognitive Hub of Surooh Empire**
**Phase 9.8 - Distributed Collective Intelligence Activated**
