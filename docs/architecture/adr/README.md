# سجل القرارات المعمارية (ADR)

> جميع القرارات أدناه **Accepted للتصميم**، لكنها لا تعني أن أيًا منها منفذ في المستودع؛ لم يتوفر مستودع أو تقارير تحليل الحالة أثناء هذه المراجعة. يبدأ التنفيذ فقط بعد مراجعة الفجوات وربط كل ADR بالعمل الفعلي والاختبارات.

| ADR | القرار | بوابة التحقق قبل اعتماد التنفيذ |
|---|---|---|
| [ADR-001](ADR-001-modular-monolith-monorepo.md) | Monorepo + Modular Monolith | dependency graph، boundaries packages/apps، build/typecheck. |
| [ADR-002](ADR-002-shared-schema-tenant-isolation.md) | Shared DB/Schema + `tenant_id` | migrations/constraints وcross-tenant integration tests. |
| [ADR-003](ADR-003-tenant-context-and-data-access.md) | TenantContext + repositories scoped | guard/resolver/repository architecture tests وIDOR suite. |
| [ADR-004](ADR-004-authentication-and-session-security.md) | OTP + staff sessions + rotation | OTP/token/redaction/rate-limit security tests. |
| [ADR-005](ADR-005-postgresql-public-search.md) | PostgreSQL structured public search | query plans، filters، cursor، eligibility/public DTO tests. |
| [ADR-006](ADR-006-s3-object-storage-and-upload-security.md) | S3 storage + presigned secured uploads | tenant asset isolation، type/size/finalize/job tests. |
| [ADR-007](ADR-007-redis-bullmq-and-outbox.md) | Redis/BullMQ + outbox | idempotency، retry، queue lag، post-commit publishing tests. |
| [ADR-008](ADR-008-observability-and-error-contract.md) | logs/traces/metrics/health/errors | redaction، correlation، readiness، alert drill. |

تُراجع هذه القرارات مع مالك المنتج والأمن والتشغيل قبل الإنتاج، خصوصًا مدد الاحتفاظ بالبيانات، إعدادات OTP، سياسة ظهور المركبة المحجوزة، واختيار مزودي الرسائل/التخزين.
