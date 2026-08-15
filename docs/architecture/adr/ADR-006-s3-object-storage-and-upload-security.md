# ADR-006: اعتماد S3-compatible Object Storage مع Upload مؤقت ومقيد

| البند | القيمة |
|---|---|
| الحالة | Accepted |
| التاريخ | 2026-08-15 |
| القرار | حفظ صور السيارات وملفات الاستيراد في تخزين كائني؛ يصدر API presigned URLs قصيرة بعد تفويض الخادم، ويعتمد الأصول فقط بعد finalize والتحقق. |

## السياق

يتطلب MVP صور مركبات متعددة وصورة رئيسية واستيراد Excel/CSV، مع فحص نوع وحجم الملفات. لا يناسب حفظ البيانات الثنائية في PostgreSQL ولا تمرير ملفات كبيرة خلال transaction API طويل.[1] [2]

## القرار

ينشئ API `Asset` tenant-scoped وstorage key مولدًا بالخادم يتضمن `tenantId`. تكون uploads إلى private staging، ثم يتحقق finalize/worker من ownership والحجم/MIME/magic bytes والصلاحية وينتج asset `READY`. تخدم public pages variants approved فقط؛ تبقى imports وstaging private، وتستخدم presigned reads قصيرة بعد `TenantContext`.

## النتائج

يقل تحميل API وتتحسن قابلية توسع الصور، لكن يلزم lifecycle/reconciliation للأصول اليتيمة، workers لمعالجة media/import، وسياسات IAM/prefix دقيقة. لا تمنح معرفة object key صلاحية قراءة أو كتابة.

## البدائل المرفوضة

| البديل | سبب الرفض |
|---|---|
| حفظ blobs في PostgreSQL | يرفع حجم النسخ الاحتياطي ويضعف أداء المعاملات. |
| رفع عبر API فقط | لا يلائم الصور/imports وقابلية التوسع. |
| bucket عام لجميع الكائنات | يعرض imports/staging ويفقد التحكم الدقيق. |
| client-chosen storage key | يمكّن traversal/overwrite/cross-tenant paths. |

## التحقق

تختبر CI العزل بين Asset tenants، limits، رفض MIME مزيف، عدم نشر asset غير READY، وidempotency معالجة imports/variants.

## المراجع

[1]: ../../PRD_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx "PRD Baseline v1.0، images/import"
[2]: ../../SRS_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx "SRS Baseline v1.0، file validation"
