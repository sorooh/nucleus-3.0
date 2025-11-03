# 🔗 معلومات Nicholas للاتصال من تطبيق سروح

## 📍 Nicholas URL

Nicholas يعمل على الرابط التالي:

```
https://[REPLIT-WORKSPACE-URL]
```

**كيف تحصل على الرابط الصحيح:**

### طريقة 1: من المتصفح
1. افتح هذا المشروع (Nicholas) في Replit
2. انسخ الرابط من شريط العنوان في المتصفح
3. مثال: `https://12345678-9abc-def0-1234-567890abcdef.replit.dev`

### طريقة 2: من Console
شغّل هذا الأمر في Terminal:
```bash
echo "Nicholas URL: https://$(echo $REPL_SLUG).$(echo $REPL_OWNER).replit.dev"
```

### طريقة 3: من Environment Variable
Nicholas URL هو:
```bash
echo $REPLIT_DOMAINS
```

---

## 🔐 CHAT_HMAC_SECRET

للحصول على القيمة:
1. في مشروع Nicholas (هذا المشروع)
2. افتح **Tools** → **Secrets**
3. ابحث عن `CHAT_HMAC_SECRET`
4. انسخ القيمة

---

## 🔑 JWT_SECRET

للحصول على القيمة:
1. في مشروع Nicholas (هذا المشروع)
2. افتح **Tools** → **Secrets**
3. ابحث عن `JWT_SECRET`
4. انسخ القيمة

---

## ✅ Checklist للإعداد

عند إعداد تطبيق سروح، تأكد من:

- [ ] `CENTRAL_BASE_URL` = Nicholas URL (بدون `/` في النهاية)
- [ ] `CHAT_HMAC_SECRET` = نفس القيمة من Nicholas
- [ ] `JWT_SECRET` = نفس القيمة من Nicholas
- [ ] `CENTRAL_HMAC_SECRET` = نفس القيمة من Nicholas (اختياري)
- [ ] `SRH_ROOT_SIGNATURE` = نفس القيمة من Nicholas (اختياري)
- [ ] `JWT_ISSUER` = `surooh.auth` (اختياري)
- [ ] `JWT_AUDIENCE` = `surooh.platforms` (اختياري)

---

## 🧪 اختبار الاتصال

بعد الإعداد، اختبر الاتصال:

### Test 1: من تطبيق سروح
```bash
curl -X GET https://[NICHOLAS-URL]/api/scp/ping
```

يجب أن يرجع:
```json
{
  "message": "SCP Bridge responding successfully 🚀"
}
```

### Test 2: إرسال رسالة تجريبية
في Console تطبيق سروح، راقب الـ logs بعد إرسال رسالة.

يجب أن تظهر:
```
[Nucleus] Response received successfully
```

### Test 3: Nicholas Logs
في Console مشروع Nicholas، يجب أن تظهر:
```
📨 [SCP/SEND] NEW MESSAGE FROM SUROOH CHAT
✅ [SCP/SEND] Response sent with AI reply
```

---

## 📊 SCP Endpoints المتاحة

Nicholas يوفر:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scp/status` | GET | حالة SCP (عام) |
| `/api/scp/ping` | GET | اختبار الاتصال (عام) |
| `/api/scp/send` | POST | إرسال رسالة (محمي بـ HMAC) |
| `/api/scp/search` | POST | بحث في الذاكرة (محمي بـ HMAC) |
| `/api/scp/execute` | POST | تنفيذ أوامر (محمي بـ HMAC) |

---

## 🎯 خلاصة سريعة

**ما تحتاجه:**
1. ✅ Nicholas URL من المتصفح
2. ✅ `CHAT_HMAC_SECRET` من Secrets
3. ✅ `JWT_SECRET` من Secrets

**أضفها في:**
- تطبيق سروح الدردشة → Tools → Secrets

**ثم:**
- أعد تشغيل التطبيق
- اختبر بإرسال رسالة!

---

**Nicholas جاهز وينتظر! 🚀**
