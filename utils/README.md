# Surooh Academy - Integration Test Utilities

## 📋 الملفات

### 1. `integration_test.py`
سكريبت اختبار تكامل شامل لـ Nucleus 2.0 / Surooh Academy

**الاختبارات:**
- ✅ Health Check (Core + Academy)
- ✅ Tenant Creation
- ✅ Knowledge Upload
- ✅ Bot Creation
- ✅ Training Start

### 2. `sign_request.py`
أداة مساعدة لتوقيع الطلبات بـ HMAC-SHA256

---

## 🚀 الاستخدام

### الإعداد السريع

```bash
# 1. تعيين المتغيرات
export BASE_URL="https://api.sorooh.ai"
export JWT_TOKEN="your_jwt_token_here"
export HMAC_SECRET="your_hmac_secret_here"

# 2. التشغيل
python utils/integration_test.py
```

### الإعداد الكامل (لـ Nucleus الحالي)

```bash
# استخدام المتغيرات من Replit
export BASE_URL="http://localhost:5000"
export JWT_TOKEN="$NUCLEUS_JWT_SECRET"
export HMAC_SECRET="$SRH_HMAC_SECRET"

python utils/integration_test.py
```

---

## 🔐 الأمان

يستخدم السكريبت طبقتين من الأمان:

1. **JWT Bearer Token**
   ```
   Authorization: Bearer <TOKEN>
   ```

2. **HMAC-SHA256 Signature**
   ```
   X-SRH-SIGNATURE: <HMAC(payload, secret)>
   ```

---

## 🛠️ أداة التوقيع

لتوقيع طلب يدوياً:

```bash
python utils/sign_request.py '{"key":"value"}' "YOUR_SECRET"
```

---

## 📊 النتائج

السكريبت يعرض نتائج احترافية مع:
- ✅ / ❌ حالة كل اختبار
- ⏱️ الوقت المستغرق
- 📋 تفاصيل كل خطوة
- 📈 ملخص شامل

---

## 🔧 المتطلبات

يتم تثبيت الاعتماديات تلقائياً:
- `requests` - HTTP client
- `colorama` - ألوان Terminal
- `tabulate` - جداول منسقة
