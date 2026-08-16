# Syarat Security Review

**النطاق.** تمت مراجعة API وAuthentication وTenantContext وDatabase وStorage وVehicle Images وExcel/CSV Imports وBullMQ وPublic Marketplace وLeads وPlatform Admin وواجهات التصنيف والسجلات، مع مطابقة الضوابط مع OWASP Top 10:2021 وOWASP API Security Top 10:2023 [1] [2]. لم تُضف Business Features؛ التغييرات محصورة في إصلاحات أمنية واختبارات وتوثيق.

## ملخص تنفيذي

لم يُثبت وجود مسار Critical قابل للاستغلال في الاختبارات الحالية. تم إصلاح جميع الملاحظات المصنفة High التي ظهرت أثناء المراجعة: حفظ سياق Staff/Customer داخل الجلسة أثناء تدوير Refresh Token، تخفيض إساءة استخدام OTP عبر throttling وcooldown لكل رقم، تقييد JWT إلى HS256، وحماية مسارات إدارة الكتالوج القديمة بصلاحية Platform Admin دقيقة. أُضيفت اختبارات صريحة لمحاولات Cross-Tenant على TenantContext وLeads.

| التصنيف | العدد الأولي | الحالة |
|---|---:|---|
| Critical | 0 | لا توجد نتيجة مثبتة |
| High | 4 | تم الإصلاح |
| Medium | 6 | موثقة وتحتاج hardening أو قراراً تشغيلياً لاحقاً |
| Low | 4 | موثقة للمتابعة |

## High findings والإصلاحات

| المعرّف | المجال | الأثر | الإصلاح |
|---|---|---|---|
| SEC-H01 | Refresh Token / Broken Authentication | كان `refresh()` يعيد إصدار جلسة Customer دائماً، ما يفقد Staff context ويخلق خطراً في نمذجة الصلاحيات | أُضيف `SessionPrincipalKind` إلى Session، ويُحفظ النوع عند الإنشاء ويُورث أثناء rotation، كما يطابق AccessTokenGuard نوع JWT مع نوع الجلسة |
| SEC-H02 | OTP abuse / API2 | كان المعدل العام 60 طلباً في الدقيقة غير كافٍ لنقطة OTP الحساسة، ولا يوجد cooldown لكل رقم | أُضيفت حدود خاصة لـrequest OTP وverify OTP وstaff login وrefresh، مع cooldown مدته 60 ثانية لكل `phoneHash + purpose` |
| SEC-H03 | JWT verification | لم تكن الخوارزمية مقيدة صراحة في الإصدار والتحقق | تم تقييد الإصدار والتحقق إلى HS256 صراحةً |
| SEC-H04 | Platform authorization | متحكم الكتالوج الإداري القديم كان يتحقق من وجود Platform Admin دون permission metadata دقيقة | أُضيف PlatformAdminPermissionGuard و`catalog.manage` إلى المتحكم القديم، مع أدوار وصلاحيات منفصلة وعدم منح SuperAdmin افتراضياً |

## مراجعة عزل الـTenant وIDOR

المسار الموثوق يبدأ من AccessToken ثم TenantContextService. لا يُقبل `tenantId` من Body أو Query أو Route كمصدر ملكية؛ ويُستخدم `x-membership-id` فقط كمحدد لعضوية موجودة ضمن العضويات النشطة للمستخدم. لا يمكن اختيار membership تخص مستخدماً آخر أو Tenant آخر لأن query العضويات مقيدة بـ`userId`، وبحالة العضوية والمعرض.

خدمات Vehicles وInventory وVehicleImages وLeads وImports تستخدم tenant-scoped predicates قبل القراءة أو التعديل أو حذف الملفات. Lead queries تقيد `tenantId` وbranch scope، وImportJob queries تقيد `tenantId`، كما تتحقق Jobs من العضوية والصلاحيات قبل إنشاء مركبة.

| الاختبار | النتيجة |
|---|---|
| Tenant A يقرأ Lead من Tenant B | مرفوض، يعاد `LEAD_NOT_FOUND` |
| Tenant A يعدل Lead من Tenant B | مرفوض عبر نفس tenant-scoped lookup |
| تبديل membership إلى عضوية غير مملوكة | مرفوض بـ`TENANT_MEMBERSHIP_INVALID` |
| SalesEmployee خارج branch scope | مرفوض عبر branch predicate |
| ImportJob من Tenant B مع سياق Tenant A | مرفوض لأن lookup وworker projection يتطلبان Tenant B الصحيح |
| Vehicle image من Tenant آخر | مرفوض قبل توليد أو حذف أي storage key |

## مراجعة الموارد

| المورد | الضابط الحالي | التقييم |
|---|---|---|
| API | Global validation pipe مع whitelist وforbidNonWhitelisted، Guards للـTenant وpermission، وPublic DTO منفصل | سليم مع الحاجة لاختبارات تكامل DB فعلية قبل الإنتاج |
| Database | Shared Schema مع tenant predicates وفهارس partial للحجوزات | سليم تطبيقياً؛ لا توجد PostgreSQL RLS كطبقة دفاع إضافية |
| Cache | لا توجد طبقة Cache مستخدمة حالياً | لا يوجد تسريب مثبت؛ عند الإضافة يجب أن تتضمن المفاتيح tenantId ونسخة schema |
| Files | المسارات `tenants/{tenantId}/vehicles/...` و`tenants/{tenantId}/imports/...`، والتحقق يتم قبل القراءة أو الحذف | سليم caller-enforced، ويجب إبقاء storage wrapper غير متاح مباشرة للـpublic controllers |
| Jobs | BullMQ data تحتوي `importId` و`tenantId`، والعامل يعيد بناء السياق من ImportJob | سليم من ناحية العزل، مع ضرورة إبقاء Redis ACL/TLS قراراً تشغيلياً |
| Exports | Error reports تحت Tenant import prefix، ولا تُعاد إلا بعد tenant-scoped job lookup | سليم |
| Audit Logs | Platform actions تسجل actor/action/entity/metadata؛ TenantContext وcorrelationId متاحان في العمليات الداخلية | جيد، ويجب استكمال tenantId الصريح عند الحاجة إلى تقارير تدقيق متعددة المعارض |

## OWASP Top 10 وAPI Security Top 10

| المجال | المراجعة | النتيجة |
|---|---|---|
| Broken Access Control / API1 BOLA | فحص الموارد بالـTenant والفرع والـpublicId، واختبارات cross-tenant | لا High مثبت؛ ضوابط أساسية موجودة |
| Broken Authentication / API2 | JWT، sessions، refresh rotation، OTP، staff/customer kinds | High تم إصلاحه؛ تبقى ملاحظات تشغيلية متوسطة |
| Broken Object Property Authorization / API3 | DTOs وValidationPipe تمنع الحقول غير المسموحة؛ Public DTO لا يعرض internal IDs أو staff IDs أو VIN | سليم في المسارات المراجعة |
| Unrestricted Resource Consumption / API4 | multipart limits، 10MiB imports، 5,000 rows، ZIP entry/uncompressed limits، BullMQ concurrency، route throttles | جيد؛ يلزم مراقبة Redis وS3 quotas تشغيلياً |
| Broken Function Level Authorization / API5 | PermissionGuard للـTenant وPlatformAdminPermissionGuard للمنصة | High قديم في Admin Catalog تم إصلاحه |
| Unrestricted Access to Sensitive Business Flows / API6 | OTP وlogin وrefresh أصبحت ذات حدود خاصة؛ quote deduplication 24 ساعة | جيد مع الحاجة لمزود SMS وanti-abuse production telemetry |
| SSRF / API7 | لا يوجد URL fetcher من مدخل المستخدم في المسارات المراجعة | لا نتيجة |
| Security Misconfiguration / API8 | Helmet وCORS وValidation مفعلة؛ Swagger ظاهر دون شرط بيئة | Medium موثق |
| Improper Inventory Management / API9 | OpenAPI وroute inventory موجودان ضمن Nest modules | Medium تشغيلي: يلزم policy لإغلاق docs في production أو حمايتها |
| Unsafe Consumption / API10 | لا توجد external API consumers داخل المسارات الحساسة | لا نتيجة مثبتة |
| Injection | لا توجد raw SQL calls في كود التطبيق؛ Prisma filters وDTO validation مستخدمة؛ CSV formula escaping موجود | لا High مثبت |
| XSS | لا يوجد HTML rendering أو dangerouslySetInnerHTML في API؛ الواجهات React escaping افتراضياً | لا نتيجة مثبتة، مع ضرورة الحفاظ على escaping عند ربط API بالواجهات |
| Sensitive Logging | لم يعثر الفحص على تسجيل access/refresh tokens أو passwords أو OTP plaintext في كود التطبيق | Medium: ينبغي تفعيل redaction صريح في logger للـauthorization وcookies والحقول الحساسة |

## Medium findings

| المعرّف | الملاحظة | التوصية |
|---|---|---|
| SEC-M01 | Swagger/OpenAPI endpoint ظاهر دون شرط production | قصر Swagger على development/staging أو حمايته بـPlatform Staff |
| SEC-M02 | CSP معطل في API bootstrap | إن وُجدت واجهة HTML ضمن نفس النطاق، فعّل CSP مناسبة لها؛ لا تعتمد على API Helmet وحده |
| SEC-M03 | Shared Schema لا يستخدم PostgreSQL RLS | دراسة RLS كطبقة دفاع إضافية، مع إبقاء service predicates المصدر الحالي |
| SEC-M04 | StorageService لا يعيد التحقق من ownership بذاته | أبقِ الخدمة غير مكشوفة للمتحكمات العامة، وأضف typed tenant-bound key object إذا زاد عدد المستهلكين |
| SEC-M05 | OTP challenge يُنشأ قبل توفر notification adapter | ربط adapter موثوق، وتنظيف challenges المنتهية، ومراقبة نمو الجدول |
| SEC-M06 | Redis/BullMQ وS3 يحتاجان إعدادات TLS/ACL وrotation خارج الكود | فرضها في production deployment policy واختبارها في CI/CD |

## Low findings

توجد ملاحظات منخفضة الأثر تتعلق بغياب threat telemetry مخصص لمحاولات IDOR، وعدم وجود DAST/امتثال فعلي بقاعدة بيانات PostgreSQL في البيئة الحالية، وعدم وجود automated secret scanning في بوابة Git، والحاجة إلى توثيق retention وdeletion لسجلات التدقيق. لا تُعد هذه النتائج تجاوزات حالية لكنها تقلل قدرة الكشف والاستجابة.

## حدود المراجعة

الاختبارات الحالية unit/service-level ولا تتصل بقاعدة PostgreSQL أو Redis أو S3 حية في بيئة التنفيذ. لذلك تثبت predicates والعقود وسلوك الحراس، لكنها لا تثبت إعدادات الشبكة أو ACL أو RLS أو سياسات التخزين الفعلية. يلزم قبل الإنتاج تنفيذ integration tests بقاعدة حقيقية، Redis TLS/ACL، S3 policy، وفحص DAST على بيئة staging.

## References

[1]: https://owasp.org/Top10/2021/A00_2021_Introduction/ "OWASP Top 10:2021 Introduction"
[2]: https://owasp.org/API-Security/editions/2023/en/0x11-t10/ "OWASP API Security Top 10:2023"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html "OWASP Authentication Cheat Sheet"
[4]: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html "OWASP REST Security Cheat Sheet"
[5]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html "OWASP File Upload Cheat Sheet"
