# 📡 Data Federation Sync Test - Nicholas ↔ SIDE

## ✅ Phase 1: Federation Handshake - **COMPLETED** 🎉

```
SIDE ←→ Nicholas Connection: ACTIVE ✅
Security: Triple-Layer (JWT + HMAC + RSA) ✅
Status: Ready for Data Sync
```

---

## 🎯 Phase 2: Data Federation Sync Test

### الهدف:
إنشاء نظام مزامنة بيانات ثنائي الاتجاه بين SIDE و Nicholas

### المكونات المطلوبة:

#### 1️⃣ **Sync Endpoints** (على Nicholas)

```typescript
// Nicholas endpoints للمزامنة
POST /api/federation/sync/push      // SIDE → Nicholas
POST /api/federation/sync/pull      // Nicholas → SIDE
GET  /api/federation/sync/status    // حالة المزامنة
POST /api/federation/sync/conflict  // حل التعارضات
```

#### 2️⃣ **Data Models للمزامنة**

**الأولوية الأولى** - Code Sync:
```typescript
interface CodeSyncPayload {
  nodeId: string;
  syncType: 'code:sync';
  data: {
    files: Array<{
      path: string;
      content: string;
      hash: string;
      lastModified: string;
    }>;
    metadata: {
      projectName: string;
      version: string;
      sideSignature: string;
    };
  };
  timestamp: number;
}
```

**الأولوية الثانية** - Knowledge Sync:
```typescript
interface KnowledgeSyncPayload {
  nodeId: string;
  syncType: 'knowledge:share';
  data: {
    insights: Array<{
      id: string;
      title: string;
      content: string;
      category: string;
      tags: string[];
      createdAt: string;
    }>;
    metadata: {
      source: string;
      confidence: number;
    };
  };
  timestamp: number;
}
```

#### 3️⃣ **Sync Direction Options**

```
1. SIDE → Nicholas (Push):
   - SIDE يدفع التحديثات إلى Nicholas
   - Nicholas يحفظها في federation_sync_logs

2. Nicholas → SIDE (Pull):
   - SIDE يطلب التحديثات من Nicholas
   - Nicholas يرسل البيانات المتغيرة

3. Bi-directional (Two-way):
   - كلا الطرفين يتبادلان التحديثات
   - نظام Conflict Resolution للتعارضات
```

---

## 🛠️ Technical Implementation

### Schema للمزامنة (Nicholas Side):

```typescript
// shared/schema.ts
export const federationSyncData = pgTable('federation_sync_data', {
  id: serial('id').primaryKey(),
  nodeId: varchar('node_id').notNull().references(() => federationNodes.nodeId),
  syncType: varchar('sync_type').notNull(), // 'code:sync', 'knowledge:share'
  dataHash: varchar('data_hash').notNull(), // SHA256 hash
  payload: jsonb('payload').notNull(),
  status: varchar('status').notNull().default('pending'), // pending, synced, failed
  conflictResolution: varchar('conflict_resolution'), // auto, manual, skip
  createdAt: timestamp('created_at').defaultNow().notNull(),
  syncedAt: timestamp('synced_at'),
});

export const federationSyncConflicts = pgTable('federation_sync_conflicts', {
  id: serial('id').primaryKey(),
  syncDataId: integer('sync_data_id').references(() => federationSyncData.id),
  nodeId: varchar('node_id').notNull(),
  conflictType: varchar('conflict_type').notNull(), // version, content, timestamp
  localData: jsonb('local_data').notNull(),
  remoteData: jsonb('remote_data').notNull(),
  resolution: varchar('resolution'), // keep_local, keep_remote, merge
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### API Endpoint (Nicholas):

```typescript
// server/federation-sync.ts
import { db } from './db';
import { federationSyncData } from '@shared/schema';

// SIDE → Nicholas (Push sync)
router.post('/api/federation/sync/push', 
  authenticateNode, // JWT + HMAC + RSA verification
  async (req, res) => {
    const { nodeId, syncType, data, timestamp } = req.body;
    
    // 1. التحقق من Node permissions
    const node = req.federationNode;
    if (!node.permissions.includes(syncType)) {
      return res.status(403).json({
        success: false,
        error: 'Node does not have permission for this sync type'
      });
    }
    
    // 2. حساب hash للبيانات
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    
    // 3. التحقق من Duplicate
    const existing = await db
      .select()
      .from(federationSyncData)
      .where(eq(federationSyncData.dataHash, dataHash))
      .limit(1);
    
    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Data already synced',
        syncId: existing[0].id,
        status: 'duplicate'
      });
    }
    
    // 4. حفظ البيانات
    const [sync] = await db
      .insert(federationSyncData)
      .values({
        nodeId,
        syncType,
        dataHash,
        payload: data,
        status: 'synced',
        syncedAt: new Date(),
      })
      .returning();
    
    // 5. تسجيل في Audit Log
    await logFederationEvent({
      eventType: 'sync_success',
      nodeId,
      endpoint: '/api/federation/sync/push',
      success: true,
      metadata: { syncType, dataHash, syncId: sync.id },
    });
    
    res.json({
      success: true,
      message: 'Sync completed',
      syncId: sync.id,
      dataHash,
    });
  }
);

// Nicholas → SIDE (Pull sync)
router.post('/api/federation/sync/pull',
  authenticateNode,
  async (req, res) => {
    const { nodeId, syncType, since } = req.body;
    
    // جلب البيانات الجديدة منذ timestamp معين
    const updates = await db
      .select()
      .from(federationSyncData)
      .where(
        and(
          eq(federationSyncData.syncType, syncType),
          since ? gte(federationSyncData.createdAt, new Date(since)) : undefined
        )
      )
      .orderBy(desc(federationSyncData.createdAt))
      .limit(100);
    
    res.json({
      success: true,
      updates: updates.map(u => ({
        syncId: u.id,
        dataHash: u.dataHash,
        payload: u.payload,
        timestamp: u.createdAt,
      })),
      count: updates.length,
    });
  }
);
```

---

## 🧪 Testing Plan

### Test 1: Simple Code Sync (SIDE → Nicholas)

**SIDE يرسل**:
```json
{
  "nodeId": "side-node-main-test",
  "syncType": "code:sync",
  "data": {
    "files": [
      {
        "path": "server/test.ts",
        "content": "console.log('Hello from SIDE');",
        "hash": "abc123...",
        "lastModified": "2025-10-26T22:30:00Z"
      }
    ],
    "metadata": {
      "projectName": "SIDE-Test",
      "version": "1.0.0",
      "sideSignature": "sha256:..."
    }
  },
  "timestamp": 1761517800000
}
```

**Nicholas يستجيب**:
```json
{
  "success": true,
  "message": "Sync completed",
  "syncId": 1,
  "dataHash": "def456..."
}
```

**التحقق**:
```sql
SELECT * FROM federation_sync_data 
WHERE node_id = 'side-node-main-test' 
  AND sync_type = 'code:sync'
ORDER BY created_at DESC;
```

---

### Test 2: Knowledge Sync (Nicholas → SIDE)

**SIDE يطلب**:
```bash
curl -X POST https://nicholas-url/api/federation/sync/pull \
  -H "Authorization: Bearer {JWT}" \
  -H "X-Surooh-KeyId: {kid}" \
  -H "X-Surooh-Timestamp: {timestamp}" \
  -H "X-Surooh-Signature: v1={hmac}" \
  -H "X-Surooh-CodeSig: {rsa}" \
  -d '{
    "nodeId": "side-node-main-test",
    "syncType": "knowledge:share",
    "since": 1761516000000
  }'
```

**Nicholas يرسل**:
```json
{
  "success": true,
  "updates": [
    {
      "syncId": 10,
      "dataHash": "xyz789...",
      "payload": {
        "insights": [
          {
            "id": "insight-1",
            "title": "Market Trend Analysis",
            "content": "...",
            "category": "financial",
            "tags": ["crypto", "market"],
            "createdAt": "2025-10-26T22:00:00Z"
          }
        ]
      },
      "timestamp": "2025-10-26T22:05:00Z"
    }
  ],
  "count": 1
}
```

---

### Test 3: Conflict Detection

**السيناريو**: كلا الطرفين عدّل نفس الملف

**SIDE**: `server/config.ts` → version 2
**Nicholas**: `server/config.ts` → version 2 (مختلف)

**Nicholas يكتشف**:
```typescript
{
  conflictType: 'content',
  localHash: 'aaa111',
  remoteHash: 'bbb222',
  resolution: 'manual' // يحتاج تدخل يدوي
}
```

**Nicholas يحفظ في**:
```sql
INSERT INTO federation_sync_conflicts 
VALUES (conflict_data);
```

---

## 📋 Success Criteria

### للانتقال من Test Phase إلى Production:

- [ ] ✅ SIDE يرسل code sync بنجاح
- [ ] ✅ Nicholas يحفظ البيانات في database
- [ ] ✅ Nicholas يرسل knowledge sync لـ SIDE
- [ ] ✅ SIDE يستقبل ويحفظ البيانات
- [ ] ✅ Conflict detection يعمل
- [ ] ✅ Hash verification يعمل
- [ ] ✅ Audit logging كامل
- [ ] ✅ Performance: < 500ms per sync

---

## 🎯 الخطوة التالية المباشرة

### للمطور SIDE:

**1. أنشئ endpoint للاستقبال**:
```typescript
// SIDE: server/federation/nicholas_sync.ts
app.post('/api/federation/receive-sync', async (req, res) => {
  const { syncType, data } = req.body;
  
  // حفظ البيانات من Nicholas
  console.log('Received from Nicholas:', syncType, data);
  
  res.json({ success: true, received: true });
});
```

**2. اختبر Push Sync**:
```typescript
// SIDE: اختبار إرسال بيانات إلى Nicholas
const syncData = {
  nodeId: 'side-node-main-test',
  syncType: 'code:sync',
  data: {
    files: [{
      path: 'test.ts',
      content: 'console.log("sync test")',
      hash: crypto.createHash('sha256').update('test').digest('hex'),
      lastModified: new Date().toISOString()
    }],
    metadata: {
      projectName: 'SIDE-Test',
      version: '1.0.0',
      sideSignature: 'test-sig'
    }
  },
  timestamp: Date.now()
};

// إرسال مع Security Headers (نفس طريقة Heartbeat)
await sendToNicholas('/api/federation/sync/push', syncData);
```

---

### للمطور Nicholas:

**1. إضافة Schema للمزامنة**:
- أضف `federationSyncData` table
- أضف `federationSyncConflicts` table

**2. إنشاء Sync Endpoints**:
- `/api/federation/sync/push`
- `/api/federation/sync/pull`
- `/api/federation/sync/status`

**3. اختبار الاستقبال**:
- انتظر sync request من SIDE
- تحقق من البيانات في database

---

## 🏆 Expected Outcome

```
📊 Data Sync Success Report:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIDE → Nicholas:
  ✅ Files synced: 5
  ✅ Data hash verified: ✓
  ✅ Stored in DB: ✓
  
Nicholas → SIDE:
  ✅ Knowledge items sent: 10
  ✅ Received by SIDE: ✓
  ✅ Hash verification: ✓

Bi-directional Sync:
  ✅ Working perfectly
  ✅ No conflicts detected
  ✅ Audit trail complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

**Nicholas 3.2 - Ready for Data Federation** 🚀
