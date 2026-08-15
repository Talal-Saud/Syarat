# ADR-004: اعتماد OTP للعملاء وجلسات موظف آمنة مع Refresh Rotation

| البند | القيمة |
|---|---|
| الحالة | Accepted |
| التاريخ | 2026-08-15 |
| القرار | OTP للهاتف السعودي عند أفعال العميل المقيدة؛ بيانات اعتماد مخصصة للموظفين؛ access tokens قصيرة العمر وrefresh tokens opaque مدوّرة وقابلة للإبطال. |

## السياق

التصفح العام لا يحتاج تسجيلًا، لكن طلب عرض سعر والمفضلة يحتاجان هوية عميل موثقة. يطلب SRS تطبيع رقم الجوال، عدم تخزين OTP صريحًا، والانتهاء/حد المحاولات. كما يتطلب login آمنًا لموظفي المعرض.[1]

## القرار

تفصل الهوية عن التفويض. تخزن بيانات OTP بصورة digest/HMAC أو KDF، مع TTL وsingle-use وrate limits للهاتف/IP/device. تستخدم credentials الموظفين KDF حديثًا مثل Argon2id. تصدر الجلسة access JWT قصير العمر للذاكرة وrefresh token عشوائيًا HttpOnly/Secure مع rotation/reuse detection. تتحقق Tenant/Admin context لاحقًا من membership/grant في الخادم، ولا يعد access token صالحًا سلطة tenant دائمة.

## النتائج

يحمي التصميم من replay وtoken theft وتقادم roles، لكنه يتطلب store للجلسات، إدارة cookies/CORS/CSRF متعمدة، adapter SMS، وتشغيل rate limits ومراقبة security events.

## البدائل المرفوضة

| البديل | سبب الرفض |
|---|---|
| OTP نص صريح أو بلا محاولة/expiry | يخالف SRS ويزيد خطر التسريب/replay. |
| JWT طويل العمر بلا refresh state | يصعب الإبطال عند تغيير password/membership. |
| تخزين access token في LocalStorage | يزيد أثر XSS. |
| اعتبار login الموظف = وصول Tenant | الدور والعضوية والـscope مستقلة ومتغيرة. |

## التحقق

تغطي الاختبارات OTP منتهٍ/مستهلك، rate limits، refresh reuse، redaction، ورفض tenant/admin endpoints دون context مناسب.

## المراجع

[1]: ../../SRS_MVP_Automotive_Marketplace_SaaS_Saudi_v1.0.docx "SRS Baseline v1.0، FR-AUTH وNFR-SEC"
