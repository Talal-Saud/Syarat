# ADR-008: اعتماد Observability موحد وعقد أخطاء REST آمن

| البند | القيمة |
|---|---|
| الحالة | Accepted |
| التاريخ | 2026-08-15 |
| القرار | structured JSON logs مع correlation/tracing، metrics منخفضة cardinality، health/readiness checks، وglobal REST error envelope مع redaction. |

## السياق

يتطلب SRS structured logging وCorrelation ID وhealth checks، ويحظر تسجيل secrets/OTP/tokens/بيانات حساسة. يحتاج النظام أيضًا تشغيل workers وrate limits ومزودي storage/SMS دون كشف التفاصيل للمستخدم.[1]

## القرار

تنشئ API/worker `correlationId` وتضيفه للـlogs/traces/jobs. تستخدم global exception filter لتصنيف validation/authz/domain/dependency/unexpected errors إلى HTTP status/code ثابتين مع رسالة آمنة وcorrelation ID. تفصل `/health/live` عن `/health/ready` وworker health. تراقب dashboards/alerts HTTP وDB وRedis وqueues والـauth/search/storage دون وضع tenant/user/resource IDs كmetric labels.

## النتائج

تتحسن سرعة التحقيق والدعم وقياس SLO، لكنها تتطلب pipeline logs/traces محميًا وسياسات redaction/retention وrunbooks وتنبيهات قابلة للتنفيذ. لا تكون observability ذريعة لجمع PII أو تسجيل أجسام الطلبات.

## البدائل المرفوضة

| البديل | سبب الرفض |
|---|---|
| logs نصية غير منظمة | صعبة الربط والبحث والتشغيل متعدد التطبيقات/workers. |
| إرجاع stack/SQL للعميل | يسرب تفاصيل ويزيد سطح الهجوم. |
| log كامل للطلبات للتصحيح | يخالف منع PII/secrets وقد يكشف OTP/imports. |
| health endpoint واحد | لا يميز عملية حية عن instance جاهز للـtraffic. |

## التحقق

تختبر redaction وcorrelation API→worker وerror envelope وdependency readiness وتنبيه queue/API أساسي.

## المراجع

[1]: ../../SRS_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx "SRS Baseline v1.0، NFR-SEC/NFR-REL/NFR-OBS"
