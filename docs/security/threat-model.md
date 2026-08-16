# Syarat Threat Model

## النطاق والهدف

هذا النموذج يغطي منصة Syarat ذات Shared Database وShared Schema، حيث يمثل كل معرض Tenant مستقلاً، وتوجد Public Marketplace وTenant Dashboard وPlatform Admin وAPI Modular Monolith. الهدف هو تحديد ما الذي يحاول المهاجم حماسه أو الوصول إليه، وما حدود الثقة، وما الضوابط التي تمنع الانتقال من سياق إلى آخر.

## الأصول

| الأصل | مستوى الحساسية | أمثلة |
|---|---|---|
| هويات المستخدمين والجلسات | حرج | JWT، Refresh Tokens، OTP challenges، session rows |
| ملكية Tenant | حرج | tenantId، memberships، branch scopes، platform grants |
| بيانات CRM | عالٍ | Leads، phoneHash، customerUserId، activities |
| بيانات المركبات | عالٍ | الأسعار، availability، publication، الصور، VIN/internal fields |
| الملفات | عالٍ | صور المركبات، import source files، error reports |
| صلاحيات المنصة | حرج | PlatformAdminGrant، role، permissions |
| سجل التدقيق | عالٍ | actor، action، entity، metadata، timestamps |
| الكتالوج العام | متوسط | Brands، Models، Cities، aliases |
| التوفر والبنية التشغيلية | عالٍ | PostgreSQL، Redis/BullMQ، S3، logs، environment secrets |

## الجهات المهددة

الجهات الأساسية هي عميل غير مسجل، Customer مسجل، Tenant Staff، SalesEmployee محدود الفروع، Platform Staff غير SuperAdmin، مستخدم داخلي مخترق، ومهاجم خارجي يحاول credential stuffing أو IDOR أو رفع ملف ضار. لا يُفترض الوثوق بأي tenantId أو membershipId أو branchId قادم من Body أو Query أو ملف.

## حدود الثقة

```text
Public Internet
    │  TLS / CORS / rate limits / DTO validation
    ▼
NestJS API
    ├── AccessTokenGuard ──> Session + User status
    ├── TenantContextGuard ──> trusted active membership + branch scope
    ├── PermissionGuard ──> tenant permission
    ├── PlatformAdminGuard + PermissionGuard ──> staff grant + platform permission
    ├── PostgreSQL ──> shared schema; every tenant resource predicate includes tenantId
    ├── Redis/BullMQ ──> job payload includes tenantId; worker reconstructs context
    └── S3-compatible storage ──> tenant-prefixed keys; ownership checked by caller service
```

## أهم سيناريوهات التهديد والضوابط

| السيناريو | مسار الهجوم | الضابط | الحالة |
|---|---|---|---|
| Cross-Tenant IDOR | تغيير `/tenant/leads/:id` أو membership header | TenantContext مشتق من session، وscoped queries بـtenantId وbranch scope | اختبارات ناجحة |
| Broken function authorization | Tenant Staff يستدعي Admin أو SalesEmployee يغير Lead خارج النطاق | Staff kind، Tenant PermissionGuard، PlatformAdminGrant وpermission metadata | محمي |
| JWT confusion | تعديل algorithm أو استخدام refresh Staff في سياق Customer | HS256 صريح، SessionPrincipalKind، مطابقة نوع JWT والجلسة | تم الإصلاح |
| OTP abuse | تكرار request/verify لمحاولة exhaustion أو guessing | Global throttling، route-specific throttling، max attempts، expiry، single-use، phone cooldown | تم الإصلاح |
| File polyglot / ZIP bomb | رفع ملف متنكر أو أرشيف متضخم | content checks، MIME + extension، decoder، byte/row/entry/uncompressed bounds، إعادة ترميز الصور | محمي |
| CSV Formula Injection | وضع `=`, `+`, `-`, `@` في تقرير خطأ أو input | رفض formula fields، وescape عند إنشاء XLSX error report | محمي |
| Queue confused deputy | إرسال importId أو tenantId مختلف للعامل | job يحمل tenantId، lookup tenant-scoped، واستعادة العضوية من ImportJob | محمي |
| Storage path traversal | تمرير key أو vehicle ownership من العميل | server-side key generation، tenant prefixes، ownership checks قبل key creation/delete | محمي caller-enforced |
| Sensitive logging | تسجيل token/password/OTP | لا توجد logging calls لهذه القيم؛ يلزم redaction deployment صريح | لا تسريب مثبت |
| Cache leakage | مشاركة نتيجة بين Tenants | لا يوجد Cache حالياً؛ policy مستقبلية تلزم tenantId في key | غير منطبق حالياً |
| SQL injection | إدخال search/filter إلى SQL خام | لا raw SQL في application code؛ Prisma filters وDTO validation | لا نتيجة |
| Public enumeration | تخمين internal IDs أو كشف staff/VIN | Public IDs وPublic DTO منفصل وmasking للهواتف | محمي جزئياً |

## الدفاعات المطلوبة في كل طبقة

تبدأ الحماية من Input Validation وRate Limiting عند الحافة، ثم Authentication وSession validation، ثم التفويض الوظيفي، ثم TenantContext، ثم query predicate، ثم تقليل المخرجات. لا يكفي أي دفاع منفرد؛ يجب أن تبقى `tenantId` في سجل قاعدة البيانات، ومسار الملف، وبيانات Job، وحقول التدقيق ذات الصلة عند تنفيذ العملية.

## المخاطر المتبقية وقبولها

يبقى Shared Schema بلا PostgreSQL RLS قراراً مقبولاً لـMVP لكنه يضع عبء العزل على طبقة التطبيق. كما أن Redis وS3 وSMS provider تحتاج TLS وACL وsecret rotation على مستوى التشغيل. لا توجد بيئة تكامل حية في sandbox، ولذلك يجب تنفيذ اختبارات integration وDAST قبل الإنتاج.

## References

[1]: https://owasp.org/Top10/2021/A00_2021_Introduction/ "OWASP Top 10:2021 Introduction"
[2]: https://owasp.org/API-Security/editions/2023/en/0x11-t10/ "OWASP API Security Top 10:2023"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html "OWASP Authentication Cheat Sheet"
[4]: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html "OWASP REST Security Cheat Sheet"
[5]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html "OWASP File Upload Cheat Sheet"
