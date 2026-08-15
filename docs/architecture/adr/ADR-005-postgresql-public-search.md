# ADR-005: اعتماد PostgreSQL للبحث العام المنظم في الـMVP

| البند | القيمة |
|---|---|
| الحالة | Accepted |
| التاريخ | 2026-08-15 |
| القرار | تنفيذ search/filter/sort العام عبر PostgreSQL وفهارس موجهة بالقياس، مع cache محدود؛ لا OpenSearch/Elasticsearch في الـMVP. |

## السياق

احتياجات السوق المحددة هي فلاتر منظمة للمدينة، الحالة، الماركة/الموديل، السعر، السنة، الممشى، ناقل الحركة، الوقود، ونوع الهيكل، مع ترتيبات محددة. يستبعد PRD محركات البحث المستقلة من نطاق MVP.[1]

## القرار

تملك وحدة `search` query service عامة وDTOs منفصلة، وتطبق predicate مركزيًا لأهلية النشر. تستمد City عبر Branch، وتستخدم cursor pagination وفهارس PostgreSQL بعد `EXPLAIN`. تخزن فقط responses عامة قابلة للكاش بمفاتيح filter/sort versioned وTTL قصير. تقود تغيرات البيع/availability/tenant status invalidation أو visibility version ولا تثق cache وحده.

## النتائج

يحافظ القرار على بنية تشغيلية بسيطة واتساق transactional؛ وقد يحتاج تحسين فهارس/queries أو read replica عند النمو. يظل محرك بحث مستقل خيارًا مستقبليًا مشروطًا بمقاييس SLO وحاجات full-text/geo/relevance غير متاحة بوضوح في PostgreSQL.

## البدائل المرفوضة

| البديل | سبب الرفض |
|---|---|
| OpenSearch/Elasticsearch الآن | index pipeline وتشغيل وتوافق غير مبررة لفلترة Pilot المنظمة. |
| البحث من الواجهة/البيانات المخزنة محليًا | يكشف بيانات ويخالف مصدر الحقيقة وتحديث availability. |
| offset pagination غير المحدود | أداء وتكرار/تخطي غير مناسبين للقوائم العامة المتغيرة. |

## التحقق

تختبر City via Branch، filter composition، عدم ظهور Sold/Unconfirmed، cursor stability، وقياسات p95/cache/DB plan.

## المراجع

[1]: ../../PRD_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx "PRD Baseline v1.0، scope/search"
