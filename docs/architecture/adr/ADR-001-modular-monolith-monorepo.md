# ADR-001: اعتماد Monorepo وModular Monolith للـMVP

| البند | القيمة |
|---|---|
| الحالة | Accepted |
| التاريخ | 2026-08-15 |
| أصحاب القرار | Architecture Review |
| القرار | تطبيقات Next.js متعددة وخدمة NestJS واحدة معيارية داخل Monorepo بـpnpm/Turborepo. |

## السياق

يتطلب المنتج سوقًا عامًا ولوحة معرض ولوحة إدارة مع مشاركة عقود وأنواع وتحقيق ومكوّنات، ويتطلب معاملات متماسكة للمخزون والتوفر وLeads. كما أن PRD/SRS يستبعدان Microservices من نطاق MVP.[1] [2]

## القرار

نعتمد `apps/web`, `apps/tenant-dashboard`, `apps/admin`, و`apps/api`، مع packages مشتركة محددة. يكون NestJS API Modular Monolith بحدود وحدات صريحة وports/events داخلية. يمكن تشغيل worker من codebase نفسه بصورة مستقلة عن HTTP API.

## النتائج

ينخفض العبء التشغيلي وتبقى المعاملات علائقية سهلة؛ في المقابل يلزم ضبط imports والحدود واختبارات معمارية لمنع تحوله إلى monolith متشابك. لا يعتمد هذا القرار على قابلية فصل الخدمة فورًا، بل على الحفاظ على boundaries قابلة للاستخراج عند ظهور دليل حاجة.

## البدائل المرفوضة

| البديل | سبب الرفض في الـMVP |
|---|---|
| Microservices | كلفة deploy/observability/network consistency لا تبررها سعة الـPilot. |
| تطبيق Next.js واحد لكل ما سبق | يخلط نماذج الأمن وتجارب public/tenant/admin ويصعّب الفصل. |
| Monorepo بلا boundaries | يشجع اعتمادًا عابرًا وغير مملوك بين المجال والواجهة والبيانات. |

## التحقق

يفرض dependency graph بلا cycles، ولا يسمح باستيراد Prisma خارج repositories، وتوجد اختبارات تكامل للحدود الحرجة.

## المراجع

[1]: ../../PRD_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx "PRD Baseline v1.0"
[2]: ../../SRS_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx "SRS Baseline v1.0"
