# Test Strategy وTest Matrix — Syarat MVP

## المرجعية والنطاق

تعتمد هذه الاستراتيجية على PRD وSRS v1.0 الموجودين في `docs/reference/`، وخصوصاً AC-01 إلى AC-14، ومتطلبات FR وNFR الخاصة بالهوية والعزل والمخزون والبحث والـLeads والإدارة. لا تضيف الاستراتيجية Features؛ هدفها إثبات السلوك المطلوب أو إظهار فجوة تمنع الإصدار.

## Personas وبيانات الاختبار

| المعرّف | الشخصية | النطاق المتوقع |
|---|---|---|
| TA-OWNER | Tenant A Owner | كل موارد Tenant A وصلاحيات الإدارة داخله |
| TA-SALES | Tenant A Sales | Leads المسموح بها ضمن branch scope، دون إدارة موظفين أو موارد Tenant B |
| TB-OWNER | Tenant B Owner | موارد Tenant B فقط |
| CUSTOMER | Customer | OTP، جلسة العميل، Quote Request، التصفح العام |
| VISITOR | Visitor | Marketplace والتصفح والبحث دون تسجيل |
| PLATFORM-ADMIN | Platform Staff Admin | الاعتماد والإشراف والكتالوج والإحصاءات والتدقيق حسب grant، وليس Tenant role |

## قواعد الخروج

لا يعتبر الإصدار جاهزاً إذا وُجدت نتيجة Critical أو High، أو فشل أي اختبار عزل، أو فشل race condition للحجز، أو فشل إخفاء المركبة المباعة/غير المؤكدة حسب السياسة، أو تعذر تنفيذ طبقات الاختبار المطلوبة في بيئة staging حقيقية.

## Test Matrix

| ID | المجال | السيناريو | الطبقة | الأولوية | الحالة |
|---|---|---|---|---|---|
| AUTH-01 | Authentication | تطبيع 0551234567 إلى E.164 | Unit | High | PASS |
| AUTH-02 | Authentication | OTP hashed ولا يعاد plaintext | Unit | Critical | PASS |
| AUTH-03 | Authentication | OTP expired / max attempts / reuse | Unit | Critical | PASS |
| AUTH-04 | Authentication | OTP resend cooldown وroute throttle | Unit/API | High | PASS |
| AUTH-05 | Authentication | Staff login invalid credentials لا يكشف enumeration | Unit | High | PASS |
| AUTH-06 | Authentication | Refresh rotation وreuse revocation | Unit | Critical | PASS |
| AUTH-07 | Authentication | Staff refresh يحتفظ بـStaff principal kind | Unit | Critical | PASS بعد الإصلاح |
| AUTH-08 | Authentication | JWT algorithm غير المسموح مرفوض | API | High | PASS بعد الإصلاح |
| TEN-01 | Authorization | Tenant A يقرأ Vehicle B | Unit/Authorization | Critical | PASS |
| TEN-02 | Authorization | Tenant A يعدل Vehicle B | Unit/Authorization | Critical | PASS |
| TEN-03 | Authorization | tenantId في Body لا يغير السياق | Unit | Critical | PASS |
| TEN-04 | Authorization | id في URL لا يتجاوز tenant predicate | Unit | Critical | PASS |
| TEN-05 | Authorization | Tenant A يقرأ Lead B | Security Test | Critical | PASS |
| TEN-06 | Authorization | Tenant A يعدل Lead B | Unit | Critical | PASS |
| TEN-07 | Authorization | Tenant A يقرأ Employee/Branch B | Integration | Critical | BLOCKED: لا DB حية |
| TEN-08 | Authorization | Sales يرى Leads ضمن branch scope فقط | Unit | High | PASS |
| TEN-09 | Authorization | membership selector لعضوية أخرى | Security Test | Critical | PASS |
| TEN-10 | Authorization | Platform Admin غير active يرفض | Unit/API | Critical | PASS |
| VEH-01 | Inventory | إنشاء Vehicle بفرع من Tenant آخر | Integration | Critical | BLOCKED: لا DB حية |
| VEH-02 | Inventory | StockNumber uniqueness داخل Tenant | Unit/DB | High | PASS/DB integration pending |
| VEH-03 | Inventory | Draft لا يظهر Public | Unit | High | PASS |
| VEH-04 | Inventory | Sold لا يظهر Search | Unit | Critical | PASS |
| VEH-05 | Inventory | Unavailable لا يظهر Search | Unit | High | PASS |
| VEH-06 | Availability | Unconfirmed vehicle hidden after grace policy | Integration | High | BLOCKED: scheduler/DB غير متاح |
| VEH-07 | Availability | Bulk confirm updates only Tenant vehicles | Unit | Critical | PASS |
| VEH-08 | Reservation | two concurrent reserve requests produce one ACTIVE reservation | DB concurrency | Critical | BLOCKED: لا PostgreSQL حية |
| VEH-09 | Reservation | Sold closes/blocks reservation and quote flow | Unit | Critical | PASS |
| IMG-01 | Files | MIME/content mismatch rejected | Unit | High | PASS |
| IMG-02 | Files | Oversized image rejected | Unit | High | PASS |
| IMG-03 | Files | EXIF removed and derivatives generated | Unit | High | PASS |
| IMG-04 | Files | Tenant A cannot list/delete Image B | Unit/Integration | Critical | PASS unit; DB E2E pending |
| IMP-01 | Import | CSV formula cells rejected | Unit | High | PASS |
| IMP-02 | Import | Error report escapes spreadsheet formulas | Unit | High | PASS |
| IMP-03 | Import | malformed XLSX / ZIP64 / archive limits rejected | Unit | High | PASS |
| IMP-04 | Import | Tenant A cannot read/import Job B | Unit | Critical | PASS |
| IMP-05 | Import | Job payload carries tenantId and worker rebuilds context | Unit | Critical | PASS |
| IMP-06 | Import | partial success creates valid rows and error report | Unit | High | PASS |
| SEARCH-01 | Search | Arabic aliases Brand/Model/City | Unit | High | PASS |
| SEARCH-02 | Search | all filters combine without leakage | Unit | High | PASS |
| SEARCH-03 | Search | Sold/Unavailable/Unverified excluded | Unit | Critical | PASS |
| SEARCH-04 | Search | pagination/sorting stable | Unit | Medium | PASS |
| LEAD-01 | Leads | OTP-authenticated Customer creates Lead in vehicle Tenant | Unit | Critical | PASS |
| LEAD-02 | Leads | Sold Vehicle rejects new Quote Request | Unit | Critical | PASS |
| LEAD-03 | Leads | duplicate request within 24h deduplicates | Unit | High | PASS |
| LEAD-04 | Leads | status transition writes Timeline Activity | Unit | High | PASS |
| LEAD-05 | Leads | Sales cannot assign outside Tenant | Unit | Critical | PASS |
| ADM-01 | Admin | approve/reject/suspend/reactivate Tenant | Unit/API | High | PASS |
| ADM-02 | Admin | Platform permissions do not grant all Admins SuperAdmin | Unit | Critical | PASS |
| ADM-03 | Admin | vehicle moderation writes Audit Log | Unit | High | PASS |
| ADM-04 | Admin | manual plan validates future ExpiresAt | Unit | Medium | PASS |
| ADM-05 | Admin | catalog writes require catalog.manage | API | High | PASS |
| UI-01 | Mobile | Public home/search/detail Quote CTA at mobile width | Smoke/E2E | High | BLOCKED: no browser E2E runner configured |
| UI-02 | Mobile | Tenant Dashboard mobile nav/inventory/leads | Smoke/E2E | High | BLOCKED: no browser E2E runner configured |
| UI-03 | Mobile | Admin RTL navigation and moderation screens | Smoke/E2E | Medium | BLOCKED: no browser E2E runner configured |
| NFR-01 | Observability | no token/password/OTP sensitive logging | Static review | High | PASS review |
| NFR-02 | API | DTO whitelist and forbidden properties | Unit/API | High | PASS |
| NFR-03 | Build | lint/typecheck/build | CI | High | PASS |

## التغطية حسب الطبقة

تمثل اختبارات Vitest الحالية طبقة Unit/Service وتغطي 39 اختباراً. أما Integration وE2E الحقيقية فتتطلب PostgreSQL وRedis وS3 وSMS provider وbrowser runner؛ البيئة الحالية لا تحتوي قاعدة PostgreSQL اختبارية أو إعداد E2E، ولذلك تُسجل الحالات في المصفوفة كـBLOCKED بدلاً من اعتبارها PASS.

## References

المرجع الداخلي الأساسي هو `docs/reference/PRD_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx` و`docs/reference/SRS_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx`.
