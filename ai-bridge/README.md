# Surooh AI Provider Bridge (Adaptive Mode)
يوفّر هذا الجسر ربطًا احترافيًا بين نواة سُروح (Nucleus) ومزوّدي النماذج التالية:
**Llama 3.1 / Mistral / Falcon / Claude (+ أي مزوّد OpenAI-Compatible)**.

## لماذا "Adaptive"؟
- **Hybrid (افتراضي):** اختيار المزود تلقائيًا حسب نوع المهمة (تحليل/محادثة/تخطيط/تلخيص).
- **Committee (Fallback/Boost):** تشغيل تصويت جماعي عند انخفاض الثقة أو عند المهام الحسّاسة.
- **Auto-Distribution:** بثّ المعرفة عبر UKB/Distributor لكل المنصات.

## الملفات
- `bridge.py` — سكربت تشغيل الجسر (REST)
- `providers_config.json` — إعدادات المزوّدين والمفاتيح
- `routing_policies.yaml` — سياسات التوجيه والأوزان
- `README.md` — هذا الملف

## التشغيل السريع
1) عدّل `providers_config.json` وضع مفاتيحك وروابطك.
2) شغّل الجسر (بايثون 3.10+):
```bash
python3 bridge.py --mode adaptive --port 7010
```
3) اربط النواة بهذا الجسر:
```
NUCLEUS → http://localhost:7010/v1/chat/completions (OpenAI-compatible)
ومسار متخصص لأنثروبي:
NUCLEUS → http://localhost:7010/v1/anthropic/messages
```

## Health Check
```bash
curl -s http://localhost:7010/health
```

## ملاحظات
- الجسر لا يخزن أي مفاتيح في الكود؛ كلها في `providers_config.json` أو ENV.
- يدعم HMAC توقيع داخلي اختياري عبر `X-SRH-TS` و `X-SRH-SIGN` لو أردت.
- يعتمد ثلاثة أوضاع: `hybrid`, `committee`, `adaptive` (الافتراضي).
