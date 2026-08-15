# ADR-002: اعتماد قاعدة مشتركة ومخطط مشترك مع عزل Tenant متعدد الطبقات

| البند | القيمة |
|---|---|
| الحالة | Accepted |
| التاريخ | 2026-08-15 |
| القرار | PostgreSQL مشترك، Shared Schema، و`tenant_id` إلزامي في كل مورد تابع للمعرض. |

## السياق

الـMVP/Pilot يحتاج تشغيل معارض متعددة بكلفة وإدارة معتدلة، مع منع صريح للوصول Cross-Tenant. تشترط المتطلبات Shared Database + Shared Schema + TenantId، وتطلب إبقاء مسار للفصل المستقبلي إلى Dedicated Database.[1] [2]

## القرار

تحتوي جداول Tenant-scoped على `tenant_id`، وتستخدم UUID/UUIDv7، وقيودًا علائقية مركبة مثل توافق Vehicle/Branch داخل tenant نفسه، و`UNIQUE(tenant_id, stock_number)`. يفرض الـAPI `TenantContext`، وتمنع repositories lookup غير المقيد. تفحص RLS كدفاع إضافي للجداول الحساسة بعد تثبيت abstraction الوصول للبيانات، ولا تكون بديلًا عن التطبيق أو القيود.

## النتائج

يحسن هذا القرار سرعة الإطلاق والعمليات والـcross-tenant search العام، لكنه يفرض انضباطًا شديدًا في كل query/cache/job/storage key واختبارات IDOR. لا يجوز وصل Prisma model مباشرة بالـcontrollers أو الوحدات الأخرى.

## البدائل المرفوضة

| البديل | سبب الرفض |
|---|---|
| Database لكل Tenant افتراضيًا | كلفة provisioning/migrations/operations أكبر من حاجة الـPilot. |
| Schema لكل Tenant | يضاعف migrations والتشغيل ولا يقدم مسارًا أبسط للمطلوب. |
| تطبيق العزل بالـfrontend أو JWT فقط | غير كافٍ ضد IDOR أو jobs أو استعلامات خاطئة. |

## التحقق

تختبر كل resource tenant-scoped سيناريوهات Tenant A لا يقرأ/يعدّل Tenant B، وتتحقق migration tests من قيود Branch/Vehicle والـstock number.

## المراجع

[1]: ../../PRD_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx "PRD Baseline v1.0"
[2]: ../../SRS_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx "SRS Baseline v1.0"
