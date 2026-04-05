# 🔍 دليل تشخيص مشاكل Auth في Railway

## 📋 ملخص المشكلة
- الـ Flutter app بيوصل للـ endpoints: `/api/v1/auth/login` و `/api/v1/auth/register`
- السيرفر بيرجع HTTP 502 من Railway
- محتاجين نشخص المشكلة ونصلحها

---

## 1️⃣ الـ Request Body المتوقع

### التسجيل (POST /api/v1/auth/register)
```json
{
  "email": "player@example.com",
  "password": "Password123!",
  "role": "PLAYER"
}
```

### الدخول (POST /api/v1/auth/login)
```json
{
  "email": "player@example.com",
  "password": "Password123!"
}
```

---

## 2️⃣ متطلبات الـ Password

يجب أن يحتوي الـ password على:
- ✅ على الأقل 8 أحرف
- ✅ حرف كبير واحد على الأقل (A-Z)
- ✅ حرف صغير واحد على الأقل (a-z)
- ✅ رقم واحد على الأقل (0-9)
- ✅ رمز خاص واحد على الأقل (@$!%*?&)

### أمثلة صحيحة:
- ✅ `Password123!`
- ✅ `MyPass@2024`
- ✅ `Secure$Pass1`

### أمثلة خاطئة:
- ❌ `password` (لا يحتوي على حرف كبير، رقم، أو رمز خاص)
- ❌ `PASSWORD123!` (لا يحتوي على حرف صغير)
- ❌ `Pass123` (أقل من 8 أحرف ولا يحتوي على رمز خاص)

---

## 3️⃣ قيم الـ Role المسموحة

القيم الصحيحة للـ `role` (من Prisma schema):

| Role | الوصف | الاستخدام |
|------|-------|----------|
| `PLAYER` | لاعب | المستخدم العادي (الافتراضي) |
| `FIELD_OWNER` | صاحب ملعب | يمكنه إضافة وإدارة الملاعب |
| `ADMIN` | مدير النظام | صلاحيات كاملة |

### ملاحظات مهمة:
- ⚠️ الـ role **اختياري** في التسجيل
- ⚠️ إذا لم يتم إرسال role، سيتم استخدام `PLAYER` كقيمة افتراضية
- ⚠️ القيم **حساسة لحالة الأحرف** (case-sensitive)
- ⚠️ يجب أن تكون القيمة بالأحرف الكبيرة بالكامل

### أمثلة صحيحة:
```json
{ "role": "PLAYER" }       ✅
{ "role": "FIELD_OWNER" }  ✅
{ "role": "ADMIN" }        ✅
{ }                        ✅ (سيتم استخدام PLAYER)
```

### أمثلة خاطئة:
```json
{ "role": "player" }       ❌ (أحرف صغيرة)
{ "role": "Player" }       ❌ (mixed case)
{ "role": "OWNER" }        ❌ (قيمة غير موجودة)
{ "role": "field_owner" }  ❌ (أحرف صغيرة)
```

---

## 4️⃣ الحقول الإجبارية

### للتسجيل:
- ✅ `email` (إجباري)
- ✅ `password` (إجباري)
- ⚠️ `role` (اختياري - الافتراضي: PLAYER)

### للدخول:
- ✅ `email` (إجباري)
- ✅ `password` (إجباري)

---

## 5️⃣ اختبار الـ Endpoints يدويًا

### استخدام PowerShell (Windows):
```powershell
# تعيين Railway URL
$env:RAILWAY_URL = "https://your-app.railway.app"

# تشغيل السكريبت
.\test-auth-endpoints.ps1
```

### استخدام Bash (Linux/Mac):
```bash
# تعيين Railway URL
export RAILWAY_URL="https://your-app.railway.app"

# تشغيل السكريبت
chmod +x test-auth-endpoints.sh
./test-auth-endpoints.sh
```

### استخدام cURL مباشرة:
```bash
# Test Register
curl -X POST "https://your-app.railway.app/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "role": "PLAYER"
  }'

# Test Login
curl -X POST "https://your-app.railway.app/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

---

## 6️⃣ فحص Railway Logs

### الخطوات:
1. افتح Railway Dashboard
2. اختر المشروع الخاص بك
3. اضغط على "View Logs"
4. جرب إرسال request من Flutter app
5. راقب اللوجات في الوقت الفعلي

### ما تبحث عنه في اللوجات:

#### ✅ لوجات التسجيل الناجح:
```
========================================
📝 REGISTER REQUEST RECEIVED
========================================
Email: test@example.com
Role: PLAYER
========================================

🔄 Step 1: Creating user...
✅ User created successfully
🔄 Step 2: Generating email verification token...
✅ Verification token generated
🔄 Step 3: Generating auth tokens...
✅ Auth tokens generated

========================================
✅ REGISTRATION SUCCESS
========================================
```

#### ❌ لوجات الفشل:
```
========================================
❌ REGISTRATION FAILED
========================================
Error Type: HttpException
Error Message: Email already exists
Error Code: EMAIL_ALREADY_EXISTS
========================================
```

---

## 7️⃣ الأخطاء الشائعة وحلولها

### خطأ: "Invalid role"
**السبب:** القيمة المرسلة للـ role غير صحيحة

**الحل:**
```dart
// ❌ خطأ
"role": "player"  // أحرف صغيرة

// ✅ صحيح
"role": "PLAYER"  // أحرف كبيرة
```

### خطأ: "Password must be at least 8 characters"
**السبب:** الـ password أقل من 8 أحرف أو لا يحتوي على المتطلبات

**الحل:**
```dart
// ❌ خطأ
"password": "pass123"

// ✅ صحيح
"password": "Password123!"
```

### خطأ: "Email already exists"
**السبب:** البريد الإلكتروني مسجل مسبقًا

**الحل:**
- استخدم بريد إلكتروني مختلف
- أو استخدم endpoint الدخول بدلاً من التسجيل

### خطأ: HTTP 502 Bad Gateway
**الأسباب المحتملة:**
1. ❌ Database connection فشل
2. ❌ Environment variables ناقصة
3. ❌ Redis connection فشل
4. ❌ Email service فشل
5. ❌ Application crash

**الحل:**
1. افحص Railway logs للتفاصيل
2. تأكد من Environment Variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `REDIS_HOST`
   - `REDIS_PORT`

---

## 8️⃣ فحص Environment Variables في Railway

### المتغيرات المطلوبة:

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password (optional)

# Email (optional for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### كيفية التحقق:
1. افتح Railway Dashboard
2. اختر المشروع
3. اضغط على "Variables"
4. تأكد من وجود جميع المتغيرات المطلوبة

---

## 9️⃣ اختبار Database Connection

### من Railway Dashboard:
1. افتح "Database" tab
2. اضغط على "Connect"
3. استخدم psql أو أي database client
4. جرب query بسيط:
```sql
SELECT * FROM "User" LIMIT 1;
```

---

## 🔟 Response Format المتوقع

### ✅ نجاح التسجيل:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "test@example.com",
      "role": "PLAYER",
      "isVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  },
  "message": "User registered successfully. Please check your email to verify your account."
}
```

### ✅ نجاح الدخول:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "test@example.com",
      "role": "PLAYER",
      "isVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  },
  "message": "Login successful"
}
```

### ❌ فشل (Validation Error):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": {
      "en": "Invalid input data",
      "ar": "بيانات إدخال غير صالحة"
    },
    "details": [
      {
        "field": "password",
        "message": {
          "en": "Password must be at least 8 characters long",
          "ar": "يجب أن تكون كلمة المرور 8 أحرف على الأقل"
        }
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### ❌ فشل (Email Already Exists):
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": {
      "en": "Email already exists",
      "ar": "البريد الإلكتروني موجود بالفعل"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 1️⃣1️⃣ التحسينات المضافة

### ✅ Logging محسّن:
- تم إضافة logging تفصيلي في كل خطوة
- يظهر timestamp لكل عملية
- يظهر تفاصيل الأخطاء بشكل واضح

### ✅ Error Handling محسّن:
- جميع الأخطاء يتم catch-ها بشكل صحيح
- لا يوجد unhandled exceptions
- الأخطاء يتم تحويلها لـ JSON واضح

### ✅ Validation محسّن:
- التحقق من صحة البيانات قبل المعالجة
- رسائل خطأ واضحة بالعربي والإنجليزي

---

## 1️⃣2️⃣ خطوات التشخيص الموصى بها

### الخطوة 1: اختبار الـ Endpoints محليًا
```bash
# تشغيل السيرفر محليًا
npm run start:dev

# اختبار التسجيل
curl -X POST "http://localhost:3000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","role":"PLAYER"}'
```

### الخطوة 2: فحص Railway Logs
- افتح Railway Dashboard
- شغل Flutter app
- اضغط على Register/Login
- راقب اللوجات في الوقت الفعلي

### الخطوة 3: فحص Database
- تأكد من أن الـ connection شغالة
- تأكد من أن الـ migrations تم تطبيقها
- تأكد من أن الـ User table موجودة

### الخطوة 4: فحص Environment Variables
- تأكد من وجود جميع المتغيرات المطلوبة
- تأكد من صحة القيم

### الخطوة 5: اختبار من Flutter
- استخدم Postman أو Insomnia لاختبار الـ API أولاً
- إذا نجح، جرب من Flutter app

---

## 1️⃣3️⃣ معلومات إضافية

### الـ API Base URL:
```
https://your-app.railway.app/api/v1
```

### الـ Endpoints:
- `POST /auth/register` - التسجيل
- `POST /auth/login` - الدخول
- `POST /auth/refresh` - تحديث الـ token
- `POST /auth/logout` - تسجيل الخروج
- `POST /auth/verify-email` - تأكيد البريد الإلكتروني
- `POST /auth/forgot-password` - نسيت كلمة المرور
- `POST /auth/reset-password` - إعادة تعيين كلمة المرور

### الـ Headers المطلوبة:
```
Content-Type: application/json
Accept-Language: en  (أو ar للعربية)
```

---

## 📞 الدعم

إذا استمرت المشكلة بعد اتباع هذا الدليل:
1. ابعت لي Railway logs الكاملة
2. ابعت لي الـ request body اللي بتبعته من Flutter
3. ابعت لي الـ response اللي راجع من السيرفر
4. ابعت لي screenshot من Railway environment variables (بدون القيم الحساسة)
