# 👨‍💻 دليل المبرمج - تكامل منصة أبوشام للوثائق

## 📋 جدول المحتويات
1. [المتطلبات والإعداد](#المتطلبات-والإعداد)
2. [استخدام DocsAPIAdapter](#استخدام-docsapiadapter)
3. [استقبال Webhooks](#استقبال-webhooks)
4. [أمثلة عملية كاملة](#أمثلة-عملية-كاملة)
5. [معالجة الأخطاء](#معالجة-الأخطاء)

---

## 🔧 المتطلبات والإعداد

### 1. المتغيرات البيئية المطلوبة (Secrets):

```bash
# في Replit Secrets:
DOCS_API_KEY=your-api-key-here          # المفتاح العام للتحقق
DOCS_HMAC_SECRET=your-hmac-secret-here  # المفتاح المشترك للتوقيع
DOCS_BASE_URL=https://docs.abosham.com  # عنوان منصة الوثائق
```

### 2. استيراد المكونات:

```typescript
import { DocsAPIAdapter } from './server/integrations/docs/DocsAPIAdapter';
```

---

## 📤 استخدام DocsAPIAdapter

### إنشاء Instance:

```typescript
const docsAdapter = new DocsAPIAdapter();
```

---

### 1️⃣ إنشاء وثيقة جديدة

```typescript
async function createNewDocument() {
  try {
    const result = await docsAdapter.createDocument({
      title: "تقرير المبيعات الشهري",
      description: "تقرير شامل عن مبيعات شهر أكتوبر 2025",
      category: "reports",
      tags: ["sales", "monthly", "october"],
      metadata: {
        department: "Sales",
        author: "محمد أحمد",
        confidential: true
      }
    });

    console.log('✅ تم إنشاء الوثيقة:', result.docId);
    return result.docId;
  } catch (error) {
    console.error('❌ خطأ في إنشاء الوثيقة:', error.message);
  }
}
```

**Response Example:**
```json
{
  "success": true,
  "docId": "doc_abc123xyz",
  "message": "Document created successfully"
}
```

---

### 2️⃣ رفع ملف إلى وثيقة

```typescript
import fs from 'fs';

async function uploadFileToDocument(docId: string) {
  try {
    // قراءة الملف
    const fileBuffer = fs.readFileSync('./invoice.pdf');
    
    const result = await docsAdapter.uploadFile(
      docId,
      fileBuffer,
      'invoice-october-2025.pdf',
      'application/pdf'
    );

    console.log('✅ تم رفع الملف بنجاح:', result);
    return result;
  } catch (error) {
    console.error('❌ خطأ في رفع الملف:', error.message);
  }
}
```

**الملفات المدعومة:**
- ✅ PDF (`.pdf`)
- ✅ Word (`.docx`, `.doc`)
- ✅ Excel (`.xlsx`, `.xls`)
- ✅ صور (`.jpg`, `.png`, `.jpeg`)

---

### 3️⃣ تشغيل تحليل الوثيقة (OCR + AI)

```typescript
async function analyzeDocument(docId: string) {
  try {
    const result = await docsAdapter.analyzeDocument(docId);
    
    console.log('✅ بدأ التحليل:', result);
    // سيتم إرسال النتيجة عبر Webhook عند الانتهاء
  } catch (error) {
    console.error('❌ خطأ في تشغيل التحليل:', error.message);
  }
}
```

---

### 4️⃣ البحث في الوثائق

```typescript
async function searchDocuments() {
  try {
    const results = await docsAdapter.searchDocuments({
      query: 'تقرير مبيعات',
      category: 'reports',
      tags: ['monthly'],
      limit: 10
    });

    console.log(`✅ تم العثور على ${results.documents.length} وثيقة`);
    
    results.documents.forEach(doc => {
      console.log(`- ${doc.title} (${doc.docId})`);
    });
    
    return results;
  } catch (error) {
    console.error('❌ خطأ في البحث:', error.message);
  }
}
```

**Response Example:**
```json
{
  "success": true,
  "total": 15,
  "documents": [
    {
      "docId": "doc_abc123",
      "title": "تقرير المبيعات الشهري",
      "category": "reports",
      "tags": ["sales", "monthly"],
      "createdAt": "2025-10-01T10:00:00Z"
    }
  ]
}
```

---

### 5️⃣ الحصول على تفاصيل وثيقة

```typescript
async function getDocumentDetails(docId: string) {
  try {
    const document = await docsAdapter.getDocument(docId);
    
    console.log('📄 تفاصيل الوثيقة:');
    console.log('- العنوان:', document.title);
    console.log('- الفئة:', document.category);
    console.log('- عدد الملفات:', document.files?.length || 0);
    console.log('- حالة التحليل:', document.analysisStatus);
    
    return document;
  } catch (error) {
    console.error('❌ خطأ في جلب الوثيقة:', error.message);
  }
}
```

---

## 📥 استقبال Webhooks

Webhooks يتم استقبالها تلقائياً على:
```
POST https://your-nucleus.replit.app/api/webhooks/docs
```

### الأحداث المدعومة:

#### 1. **document.created** - عند إنشاء وثيقة
```json
{
  "event": "document.created",
  "timestamp": "2025-10-13T14:30:00Z",
  "data": {
    "docId": "doc_abc123",
    "title": "تقرير المبيعات",
    "category": "reports"
  }
}
```

#### 2. **document.analyzed** - عند انتهاء التحليل
```json
{
  "event": "document.analyzed",
  "timestamp": "2025-10-13T14:35:00Z",
  "data": {
    "docId": "doc_abc123",
    "extractedText": "محتوى الوثيقة...",
    "insights": {
      "category": "financial_report",
      "entities": ["Q3 2025", "Revenue", "Profit"],
      "sentiment": "positive"
    }
  }
}
```

#### 3. **file.uploaded** - عند رفع ملف
```json
{
  "event": "file.uploaded",
  "timestamp": "2025-10-13T14:32:00Z",
  "data": {
    "docId": "doc_abc123",
    "fileId": "file_xyz789",
    "filename": "invoice.pdf",
    "size": 2048576
  }
}
```

### التحقق من Webhooks:

جميع Webhooks يتم التحقق منها تلقائياً باستخدام HMAC-SHA256.  
لا تحتاج لأي إعداد إضافي - التحقق يتم داخلياً.

---

## 🔥 أمثلة عملية كاملة

### مثال 1: سير عمل كامل - من الإنشاء إلى التحليل

```typescript
async function fullDocumentWorkflow() {
  const docsAdapter = new DocsAPIAdapter();

  // 1. إنشاء وثيقة
  console.log('📝 الخطوة 1: إنشاء وثيقة...');
  const createResult = await docsAdapter.createDocument({
    title: "عقد توريد شهر أكتوبر",
    description: "عقد توريد مواد خام",
    category: "contracts",
    tags: ["supply", "october", "raw-materials"]
  });

  const docId = createResult.docId;
  console.log(`✅ تم إنشاء الوثيقة: ${docId}`);

  // 2. رفع ملف PDF
  console.log('\n📤 الخطوة 2: رفع الملف...');
  const fileBuffer = fs.readFileSync('./contract.pdf');
  await docsAdapter.uploadFile(
    docId,
    fileBuffer,
    'supply-contract-october.pdf',
    'application/pdf'
  );
  console.log('✅ تم رفع الملف بنجاح');

  // 3. تشغيل التحليل
  console.log('\n🔍 الخطوة 3: تشغيل التحليل...');
  await docsAdapter.analyzeDocument(docId);
  console.log('✅ بدأ التحليل (ستصل النتيجة عبر Webhook)');

  // 4. انتظار Webhook (سيتم تخزينه في Memory Hub تلقائياً)
  console.log('\n⏳ انتظار نتيجة التحليل عبر Webhook...');
  
  return docId;
}
```

---

### مثال 2: البحث والفلترة

```typescript
async function searchAndFilter() {
  const docsAdapter = new DocsAPIAdapter();

  // البحث عن جميع العقود في أكتوبر
  const contracts = await docsAdapter.searchDocuments({
    query: 'عقد',
    category: 'contracts',
    tags: ['october'],
    limit: 20
  });

  console.log(`📊 تم العثور على ${contracts.total} عقد`);

  // فلترة العقود حسب النوع
  const supplyContracts = contracts.documents.filter(doc => 
    doc.tags?.includes('supply')
  );

  console.log(`📦 عقود التوريد: ${supplyContracts.length}`);

  return supplyContracts;
}
```

---

### مثال 3: دمج مع Nucleus Core

```typescript
import { nucleusCore } from '../nucleus/core/nucleus';
import { memoryHub } from '../nucleus/core/memory-hub';

async function integrateWithNucleus(docId: string) {
  const docsAdapter = new DocsAPIAdapter();

  // 1. الحصول على تفاصيل الوثيقة
  const document = await docsAdapter.getDocument(docId);

  // 2. تخزين في Memory Hub
  await memoryHub.recordInsight(
    'document-retrieved',
    `📄 ${document.title}`,
    {
      docId: document.docId,
      category: document.category,
      tags: document.tags
    }
  );

  // 3. إرسال لـ Nucleus للتفكير والقرار
  const decision = await nucleusCore.think({
    type: 'document_analysis',
    data: {
      documentId: docId,
      title: document.title,
      insights: document.aiInsights
    }
  });

  console.log('🧠 قرار Nucleus:', decision);

  return decision;
}
```

---

## ⚠️ معالجة الأخطاء

### الأخطاء الشائعة:

#### 1. **خطأ في التوقيع (HMAC)**
```typescript
try {
  await docsAdapter.createDocument(data);
} catch (error) {
  if (error.message.includes('signature')) {
    console.error('❌ خطأ في HMAC - تحقق من DOCS_HMAC_SECRET');
  }
}
```

#### 2. **وثيقة غير موجودة**
```typescript
try {
  const doc = await docsAdapter.getDocument('invalid-id');
} catch (error) {
  if (error.response?.status === 404) {
    console.error('❌ الوثيقة غير موجودة');
  }
}
```

#### 3. **فشل رفع الملف**
```typescript
try {
  await docsAdapter.uploadFile(docId, buffer, filename);
} catch (error) {
  if (error.message.includes('size')) {
    console.error('❌ حجم الملف كبير جداً');
  }
}
```

### Best Practices للأخطاء:

```typescript
async function safeDocumentOperation(docId: string) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await docsAdapter.getDocument(docId);
      return result;
    } catch (error) {
      attempt++;
      console.error(`❌ محاولة ${attempt}/${maxRetries} فشلت:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`فشلت جميع المحاولات للوثيقة ${docId}`);
      }
      
      // انتظار قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

---

## 🔐 الأمان والتشفير

### كيف يعمل التوقيع:

1. **للطلبات الصادرة (Outbound)**:
   - جميع طلبات JSON يتم توقيعها بـ HMAC-SHA256
   - رفع الملفات (multipart) يستخدم X-Api-Key فقط
   - التوقيع يشمل: timestamp + payload

2. **للطلبات الواردة (Webhooks)**:
   - يتم التحقق من raw body
   - Timing-safe comparison لمنع timing attacks
   - رفض الطلبات القديمة (>5 دقائق)

### التحقق اليدوي (للمطورين المتقدمين):

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  // استخراج timestamp و signature
  const parts = signature.split(', ');
  const timestamp = parts[0].replace('t=', '');
  const receivedSig = parts[1].replace('v1=', '');

  // حساب التوقيع المتوقع
  const payload = `${timestamp}.${rawBody}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // مقارنة آمنة
  return crypto.timingSafeEqual(
    Buffer.from(receivedSig),
    Buffer.from(expectedSig)
  );
}
```

---

## 📊 مراقبة الأداء

### تتبع العمليات:

جميع العمليات يتم تسجيلها تلقائياً في:
- ✅ Memory Hub (للتعلم والذاكرة)
- ✅ Console Logs (للتطوير)

```typescript
// التحقق من السجلات
import { memoryHub } from '../nucleus/core/memory-hub';

async function checkDocumentHistory(docId: string) {
  const history = await memoryHub.recall('document-retrieved', {
    docId: docId
  });

  console.log(`📜 سجل الوثيقة ${docId}:`, history);
  return history;
}
```

---

## 🚀 النشر والإنتاج

### Checklist قبل النشر:

- [ ] إضافة `DOCS_API_KEY` في Secrets
- [ ] إضافة `DOCS_HMAC_SECRET` في Secrets  
- [ ] إضافة `DOCS_BASE_URL` في Secrets
- [ ] اختبار جميع العمليات (create, upload, analyze, search)
- [ ] التحقق من استقبال Webhooks
- [ ] مراقبة Logs للتأكد من عدم وجود أخطاء

### اختبار سريع:

```bash
# اختبار إنشاء وثيقة
curl -X POST https://your-nucleus.replit.app/api/integrations/docs/test \
  -H "Content-Type: application/json"

# التحقق من Webhook endpoint
curl -X POST https://your-nucleus.replit.app/api/webhooks/docs \
  -H "Content-Type: application/json" \
  -d '{"event":"test","data":{}}'
```

---

## 📞 الدعم والمساعدة

- 📄 **الوثائق الكاملة**: `ABOSHAM_DOCS_INTEGRATION.md`
- 🔧 **الكود المصدري**: `server/integrations/docs/`
- 💬 **للمشاكل**: تحقق من Console Logs والـ Memory Hub

---

## ✅ خلاصة سريعة

```typescript
// ✅ استيراد
import { DocsAPIAdapter } from './server/integrations/docs/DocsAPIAdapter';

// ✅ إنشاء instance
const docs = new DocsAPIAdapter();

// ✅ إنشاء وثيقة
const { docId } = await docs.createDocument({ title: "..." });

// ✅ رفع ملف
await docs.uploadFile(docId, buffer, 'file.pdf');

// ✅ تشغيل تحليل
await docs.analyzeDocument(docId);

// ✅ البحث
const results = await docs.searchDocuments({ query: "..." });

// ✅ الحصول على تفاصيل
const doc = await docs.getDocument(docId);

// ✅ Webhooks يتم استقبالها تلقائياً على /api/webhooks/docs
```

---

**🎉 مبروك! أصبحت الآن جاهز لاستخدام تكامل منصة أبوشام للوثائق!**
