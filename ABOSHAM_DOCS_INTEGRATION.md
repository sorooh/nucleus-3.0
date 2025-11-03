# 📘 وثيقة ربط منصة "وثائق أبو شام" مع النواة المركزية (Surooh Core)

**النسخة:** 1.0  
**الجهة:** مشروع سُروح – قسم التطوير المركزي  
**إعداد:** Sam Borvat (أبو شام)  
**تاريخ:** 13-10-2025  

---

## 🎯 الهدف

الربط الكامل بين **النواة المركزية لسُروح (Surooh Core)** وبين **منصة وثائق أبو شام (Abosham Docs Platform)** عبر واجهة API آمنة ثنائية الاتجاه.

### الأهداف التشغيلية:
- إرسال وحفظ وثائق المستخدم والعائلة من داخل النواة.
- تحليل الوثائق تلقائيًا (OCR + تصنيف ذكاء صناعي).
- مراجعة واستدعاء الوثائق عند الطلب لأي وحدة داخل النظام (القانونية، المحاسبة، العائلة...).
- بث الأحداث بين النظامين بشكل فوري عبر Webhooks مؤمّنة.

---

## ⚙️ بنية الربط (Architecture Overview)

- **اتجاه الربط:** ثنائي (Two-way Integration)
  - النواة → منصة الوثائق: إنشاء، رفع، تحليل، استرجاع.
  - منصة الوثائق → النواة: إشعارات بالأحداث (document.created / analyzed / updated).
- **بروتوكول:** REST API + Webhooks
- **الأمان:** توقيع HMAC-SHA256 + مفتاح مشترك آمن `DOC_HMAC_SECRET`.
- **الاعتماد:** JSON على HTTPS فقط.

---

## 🧩 نقاط التكامل

### 1️⃣ من النواة إلى منصة الوثائق (Outbound API)

| العملية | الطريقة | المسار | الوصف |
|----------|----------|---------|--------|
| إنشاء وثيقة | `POST` | `/api/documents` | يرسل بيانات الوثيقة الأساسية |
| رفع ملف | `POST` | `/api/documents/:id/files` | رفع PDF أو صورة |
| تحليل الوثيقة | `POST` | `/api/documents/:id/analyze` | OCR + تصنيف بالذكاء الصناعي |
| البحث | `GET` | `/api/documents?query=...` | استدعاء حسب الكلمة أو الفئة |
| عرض وثيقة | `GET` | `/api/documents/:id` | بيانات الوثيقة الكاملة والتحليل |

**Headers المشتركة:**
```http
X-Surooh-Signature: <HMAC hash>
X-Api-Key: <DOCS_API_KEY>
Content-Type: application/json
```

**نموذج طلب إنشاء وثيقة:**
```json
POST /api/documents
{
  "externalId": "SUROOH-USER-123",
  "title": "Lease Contract 2025",
  "category": "housing",
  "source": "SuroohCore",
  "metadata": {
    "familyId": "FAM-001",
    "user": "Sam Borvat",
    "language": "nl"
  }
}
```

**الرد المتوقع:**
```json
{
  "success": true,
  "documentId": "DOC-78632",
  "status": "stored"
}
```

---

### 2️⃣ من منصة الوثائق إلى النواة (Inbound Webhooks)

المنصة تبعث إشعارات Webhook عند حدوث أحداث جديدة.

| الحدث | المسار في النواة | الوصف |
|-------|------------------|-------|
| `document.created` | `/api/webhooks/docs/created` | عند رفع وثيقة جديدة |
| `document.analyzed` | `/api/webhooks/docs/analyzed` | بعد التحليل والـOCR |
| `document.updated` | `/api/webhooks/docs/updated` | عند تعديل أو إعادة تحليل |

**نموذج Webhook JSON:**
```json
{
  "event": "document.analyzed",
  "timestamp": "2025-10-13T09:00:00Z",
  "data": {
    "documentId": "DOC-78632",
    "category": "address",
    "tags": ["herinschrijving", "gemeente", "lease"],
    "summary": "Lease contract verified, valid from 01-05-2025"
  }
}
```

**التوقيع الأمني:**
```
Header: X-Docs-Signature
Value: t=<timestamp>, v1=<HMAC_SHA256(body, DOC_HMAC_SECRET)>
```

**التحقق في النواة:**
```typescript
import crypto from "crypto";

function verifyDocsSignature(body: string, header: string, secret: string): boolean {
  const [tsPart, sigPart] = header.split(",").map(x => x.trim());
  const ts = tsPart.replace("t=", "");
  const v1 = sigPart.replace("v1=", "");
  
  const computed = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${body}`)
    .digest("hex");
    
  return crypto.timingSafeEqual(
    Buffer.from(v1), 
    Buffer.from(computed)
  );
}
```

---

## 🗄️ إعداد المفاتيح (Environment Variables)

أضف إلى إعدادات النواة المركزية (`.env`):

```env
DOCS_BASE_URL=https://docs.abosham.ai
DOCS_API_KEY=<your-docs-api-key>
DOC_HMAC_SECRET=<shared-secret-here>
```

> 🔐 المفتاح `DOC_HMAC_SECRET` يُستخدم في كلا الجهتين (النواة والمنصة) لتوقيع الطلبات والتحقق منها.

---

## 📬 سير العمل التشغيلي (Workflow)

1. وحدة في النواة (مثلاً Family أو Compliance) تطلب إنشاء عقد إيجار.
2. النواة ترسل طلب `POST /api/documents` إلى منصة الوثائق.
3. المنصة تحفظ الملف وتبدأ التحليل (OCR + AI).
4. عند انتهاء التحليل، ترسل Webhook `document.analyzed` إلى النواة.
5. النواة تحدّث حالة الوثيقة داخليًا وتنشر `DomainEvent` داخلي للاستخدام في باقي الوحدات.

---

## 🧱 التنفيذ في النواة المركزية

### 🧩 وحدة الإرسال (Outbound)

`server/integrations/docs/DocsAPIAdapter.ts`

```typescript
import axios from "axios";
import crypto from "crypto";

export class DocsAPIAdapter {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private secret: string
  ) {}

  private sign(body: string): string {
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto
      .createHmac("sha256", this.secret)
      .update(`${ts}.${body}`)
      .digest("hex");
    return `t=${ts}, v1=${sig}`;
  }

  async createDocument(payload: any) {
    const body = JSON.stringify(payload);
    const res = await axios.post(
      `${this.baseUrl}/api/documents`,
      body,
      {
        headers: {
          "X-Surooh-Signature": this.sign(body),
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json"
        }
      }
    );
    return res.data;
  }

  async uploadFile(
    docId: string,
    file: Buffer,
    mime: string,
    name: string
  ) {
    const FormData = require("form-data");
    const form = new FormData();
    form.append("file", file, name);
    
    const res = await axios.post(
      `${this.baseUrl}/api/documents/${docId}/files`,
      form,
      {
        headers: {
          "X-Api-Key": this.apiKey,
          ...form.getHeaders()
        }
      }
    );
    return res.data;
  }

  async analyzeDocument(id: string) {
    return axios.post(
      `${this.baseUrl}/api/documents/${id}/analyze`,
      null,
      {
        headers: { "X-Api-Key": this.apiKey }
      }
    );
  }

  async searchDocuments(query: string) {
    const res = await axios.get(
      `${this.baseUrl}/api/documents`,
      {
        params: { query },
        headers: { "X-Api-Key": this.apiKey }
      }
    );
    return res.data;
  }

  async getDocument(id: string) {
    const res = await axios.get(
      `${this.baseUrl}/api/documents/${id}`,
      {
        headers: { "X-Api-Key": this.apiKey }
      }
    );
    return res.data;
  }
}
```

---

### 🧩 وحدة استقبال الأحداث (Inbound)

`server/integrations/docs/DocsWebhookHandler.ts`

```typescript
import express from "express";
import crypto from "crypto";
import { EventBus } from "@/nucleus/core/event-bus";

const router = express.Router();

function verifyDocsSignature(
  body: string,
  header: string | undefined,
  secret: string
): boolean {
  if (!header) return false;
  
  try {
    const [tsPart, sigPart] = header.split(",").map(x => x.trim());
    const ts = tsPart.replace("t=", "");
    const v1 = sigPart.replace("v1=", "");
    
    const computed = crypto
      .createHmac("sha256", secret)
      .update(`${ts}.${body}`)
      .digest("hex");
      
    return crypto.timingSafeEqual(
      Buffer.from(v1),
      Buffer.from(computed)
    );
  } catch (err) {
    return false;
  }
}

router.post("/created", async (req, res) => {
  const secret = process.env.DOC_HMAC_SECRET!;
  const valid = verifyDocsSignature(
    JSON.stringify(req.body),
    req.header("X-Docs-Signature"),
    secret
  );
  
  if (!valid) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  await EventBus.publish("document.created", req.body.data);
  res.sendStatus(200);
});

router.post("/analyzed", async (req, res) => {
  const secret = process.env.DOC_HMAC_SECRET!;
  const valid = verifyDocsSignature(
    JSON.stringify(req.body),
    req.header("X-Docs-Signature"),
    secret
  );
  
  if (!valid) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  await EventBus.publish("document.analyzed", req.body.data);
  res.sendStatus(200);
});

router.post("/updated", async (req, res) => {
  const secret = process.env.DOC_HMAC_SECRET!;
  const valid = verifyDocsSignature(
    JSON.stringify(req.body),
    req.header("X-Docs-Signature"),
    secret
  );
  
  if (!valid) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  await EventBus.publish("document.updated", req.body.data);
  res.sendStatus(200);
});

export default router;
```

---

## 🔒 الأمن والامتثال

| بند | تفصيل |
|-----|-------|
| التوثيق | HMAC موقّع من الطرفين |
| التشفير | HTTPS + TLS 1.3 |
| إدارة المفاتيح | تخزين في Secrets Manager فقط |
| الوصول | صلاحيات RBAC على مستوى المستخدم والعائلة |
| الخصوصية | توافق كامل مع لائحة GDPR الأوروبية |
| السجلات | كل عملية تخزن في `audit_logs` مع التوقيع والـ IP |

---

## 📈 الاختبارات المتوقعة (Integration Tests)

| الاختبار | النتيجة المتوقعة |
|----------|------------------|
| `POST /api/documents` | إنشاء وثيقة جديدة وإرجاع `documentId` |
| Webhook `document.analyzed` | استلام الحدث وتحديث الحالة داخليًا |
| توقيع HMAC خاطئ | رفض الطلب `401 Unauthorized` |
| رفع ملف | نجاح + حفظ في التخزين |
| تحليل OCR | نتيجة مصنفة + كلمات مفتاحية محفوظة |
| Audit Log | تسجيل العملية بالتاريخ والتوقيع |

---

## 🧾 المهام المطلوبة من المبرمج

1. ✅ إنشاء وحدتين:
   - `DocsAPIAdapter.ts` (إرسال)
   - `DocsWebhookHandler.ts` (استقبال)

2. ✅ إعداد المتغيرات البيئية في `.env`:
   - `DOCS_BASE_URL`
   - `DOCS_API_KEY`
   - `DOC_HMAC_SECRET`

3. ✅ اختبار تكامل الإرسال والاستقبال بين النظامين.

4. ✅ تسجيل جميع العمليات في `audit_logs`.

5. ✅ توليد مستند "عقد إيجار" تجريبي ورفعُه لاختبار التحليل والـWebhook.

---

## 🧠 النتيجة النهائية

بعد تنفيذ الربط:

- ✅ النواة تستطيع إنشاء، تحليل، واسترجاع أي وثيقة تلقائيًا.
- ✅ المنصة تبث أحداثها إلى النواة عند أي تحديث.
- ✅ كل الوثائق القانونية والإدارية الخاصة بعائلة أبو شام محفوظة ومتصلة بالنواة المركزية.
- ✅ التكامل آمن، قابل للتوسع، ومهيأ للربط مع باقي وحدات الإمبراطورية (القانونية، المحاسبة، المشتريات).

---

© 2025 – Surooh Holding Group B.V  
**Author:** Sam Borvat  
**Project:** Surooh Intelligent Core  
**Version:** 1.0  
**Document ID:** SUROOH-DOCS-INTEGRATION-2025
