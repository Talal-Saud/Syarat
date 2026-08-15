# ADR-007: اعتماد Redis وBullMQ مع Outbox للأعمال غير المتزامنة

| البند | القيمة |
|---|---|
| الحالة | Accepted |
| التاريخ | 2026-08-15 |
| القرار | Redis للـcache/rate limiting وBullMQ، مع worker منفصل منطقيًا وoutbox للأحداث الناتجة عن معاملات الأعمال. |

## السياق

يحتاج النظام imports، معالجة الصور، إشعارات، إبطال cache، وانتقالات توفر دورية. لا يجب أن تحجب هذه الأعمال طلبات HTTP ولا أن تضيع آثارًا جانبية بعد بيع أو تغيير حالة ناجح.[1]

## القرار

تكتب use case التغيير التجاري وAudit/Outbox داخل PostgreSQL transaction. يلتقط publisher/worker outbox بعد commit ويرسل job يحمل `tenantId`, resource ID, event ID، وidempotency key. يعيد worker التحقق من حالة tenant والمورد، ويعالج retry/backoff/failed status. تنفصل queues بحسب نوع العمل وتراقب age/failure/depth.

## النتائج

يتحسن زمن استجابة API والموثوقية عند فشل مزود خارجي، لكن توجد eventual consistency محدودة للـnotifications/cache/media ويجب إظهار حالات `pending/processing` بوضوح. لا تغير job مكرر الحالة التجارية مرتين.

## البدائل المرفوضة

| البديل | سبب الرفض |
|---|---|
| side effects داخل HTTP transaction | latency/failure coupling وإعادة محاولة غير آمنة. |
| enqueue بعد commit بلا outbox | فجوة فشل قد تضيع notification/invalidation. |
| cron في Next.js/الواجهة | غير موثوق ولا يملك صلاحيات/عزل backend. |
| jobs بلا tenant/idempotency | خطر cross-tenant وعمليات متكررة. |

## التحقق

تختبر حالات commit ثم Redis outage، retry مكرر، job بعد تعليق tenant، وقياسات queue lag/failures.

## المراجع

[1]: ../../SRS_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx "SRS Baseline v1.0، availability, imports, observability and tenant isolation"
