# ADR-003: فرض TenantContext وTenant-Aware Data Access

| البند | القيمة |
|---|---|
| الحالة | Accepted |
| التاريخ | 2026-08-15 |
| القرار | جميع أوامر/استعلامات Tenant الداخلية تستقبل TenantContext مشتقًا من session وmembership؛ repositories فقط تنفذ Prisma queries المقيدة. |

## السياق

يحظر SRS الثقة في `tenantId` القادم من body/query ويشترط عزل API والتطبيق والبيانات. المورد قد يملك ID صحيحًا لكنه يتبع Tenant آخر؛ لذا لا يكفي authorization على مستوى route أو `findUnique(id)`.[1]

## القرار

ينشئ guard/resolver `TenantContext` من user/session والعضوية النشطة وroles/permissions وbranch scope وحالة tenant. تمرر use cases السياق صراحةً، بينما تقبل repository operations context ومورد ID أو criteria ولا تصدّر `findUnique` غير مقيد لموارد tenant. تفرض database FKs مركبة للروابط الحساسة. تحمل Redis keys، file paths، jobs، audit، وtraces `tenantId` إن كانت تخص Tenant.

## النتائج

يرتفع وضوح السياسات واحتمال اكتشاف query خاطئ، لكن يوجد boilerplate منظم وتكلفة بسيطة لحل/تخزين membership. يقبل ذلك مقابل الحد من خطر تسرب البيانات، وهو خطر رئيسي للمنتج.

## البدائل المرفوضة

| البديل | سبب الرفض |
|---|---|
| تمرير `tenantId` في كل request | قابل للتلاعب ويزيد خطأ النسيان. |
| filter في controllers فقط | لا يحمي services/jobs أو استدعاءات جديدة. |
| RLS فقط | لا يغطي authorization أو roles/branch scope أو عمليات storage/cache. |

## التحقق

تختبر CI عزل Vehicle وLead وBranch وAsset وImport، وتمنع static architecture checks استعمال Prisma client خارج repository layer.

## المراجع

[1]: ../../SRS_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx "SRS Baseline v1.0، tenancy/security requirements"
