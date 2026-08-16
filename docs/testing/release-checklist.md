# Release Checklist — Syarat MVP

## بوابة الجودة البرمجية

| البند | شرط النجاح | الحالة الحالية |
|---|---|---|
| PRD/SRS reviewed | كل AC-01 إلى AC-14 ممثلة في Test Matrix | PASS جزئياً؛ المصفوفة تحفظ BLOCKED للحالات غير المنفذة |
| Typecheck | جميع الحزم بدون أخطاء TypeScript | PASS في آخر تشغيل كامل |
| Lint | لا مخالفات lint | PASS في آخر تشغيل كامل |
| Unit tests | لا فشل، وتغطية المنطق الحرج | PASS — 40 اختباراً |
| Build | API وweb وtenant-dashboard وadmin تبنى بنجاح | PASS في آخر تشغيل كامل قبل اختبار race الأخير؛ أعد التشغيل قبل release |

## بوابة الأمان والعزل

| البند | شرط النجاح | الحالة الحالية |
|---|---|---|
| Tenant A → Tenant B | فشل القراءة والتعديل لكل Vehicle/Lead/Employee/Branch/File/Import | Unit PASS، Integration BLOCKED |
| Platform permissions | لا يحصل كل Admin على SuperAdmin | PASS على مستوى الخدمة والحارس |
| JWT/Refresh | rotation، reuse detection، principal kind، algorithm restriction | PASS Unit |
| OTP | expiry، max attempts، resend throttling، SMS integration | Unit/Pipeline PASS جزئياً، SMS Integration BLOCKED |
| File upload | MIME/content/size/dimensions/EXIF/ZIP bounds | PASS Unit |
| Import | formula injection، partial success، report isolation، worker tenant context | PASS Unit، Redis/S3 Integration BLOCKED |
| Sensitive logging | لا secrets أو tokens أو OTP في logs | PASS static review؛ يلزم production log redaction verification |

## بوابة البيانات والبنية

يجب تشغيل PostgreSQL test database وتطبيق كل migrations من الصفر، ثم تنفيذ foreign keys وpartial unique index وTenant predicates. يجب تشغيل Redis مع ACL/TLS واختبار BullMQ retries وduplicate jobs، وتشغيل MinIO/S3 مع policies تمنع الوصول المباشر وتثبت paths الخاصة بكل Tenant. يجب ربط SMS provider تجريبي مع رقم/حساب اختبار وعدم استخدام OTP حقيقي في CI.

## بوابة السلوك التجاري

يجب إثبات أن Sold Vehicle لا تعود إلى Search ولا تستقبل Quote Request، وأن المركبة غير المؤكدة تُخفى بعد grace policy، وأن السيارة المحجوزة تبقى مستقلة عن Sold. يجب تشغيل سباق حجز حقيقي بمستخدمين متزامنين والتحقق من فوز حجز واحد فقط، مع فشل المحاولة الأخرى دون فساد حالة Vehicle.

## بوابة E2E وMobile

يجب تنفيذ Visitor search/filter/detail، Customer OTP/quote request، Tenant Owner inventory/availability/import، Tenant Sales lead workflow، Platform Admin approve/moderate، وMobile flows على viewportات 360 و390 و768 و1280. يجب التحقق من RTL، keyboard accessibility، pagination، drawer، bottom CTA، وعدم كشف Public DTO لبيانات داخلية.

## قرار الإصدار

الحكم الآلي الحالي: **NO-GO** حتى تُرفع كل حالات BLOCKED إلى PASS في staging. يمنع الإصدار وجود Critical أو High defect، كما يمنع الإصدار اعتبار اختبار لم يُشغّل بسبب غياب PostgreSQL أو Redis أو S3 أو E2E runner اختباراً ناجحاً.

## توقيع الخروج

| الدور | الاسم | التوقيع/التاريخ |
|---|---|---|
| QA Owner | — | — |
| Security Owner | — | — |
| Backend Owner | — | — |
| Product Owner | — | — |
