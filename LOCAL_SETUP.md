# 🏠 تشغيل السيرفر محليًا

## 1️⃣ تأكد من المتطلبات

```bash
# تأكد من Node.js
node --version  # يجب أن يكون >= 18

# تأكد من npm
npm --version
```

---

## 2️⃣ إنشاء ملف .env

انسخ `.env.example` لـ `.env`:

```bash
cp .env.example .env
```

**أو على Windows:**
```powershell
Copy-Item .env.example .env
```

---

## 3️⃣ تعديل .env (الحد الأدنى للتشغيل)

افتح `.env` وعدّل:

```env
# Application
NODE_ENV=development
PORT=3000
ENABLE_SWAGGER=true

# Database (استخدم الـ URL بتاعك)
DATABASE_URL="postgresql://user:password@localhost:5432/football_booking?schema=public"

# Redis (لو عندك Redis محلي)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (للتطوير فقط)
JWT_SECRET=dev-secret-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-production-min-32-chars

# Email (اختياري - لو مش موجود، Email هيفشل لكن Auth هينجح)
# SENDGRID_API_KEY=your-key
# SENDGRID_FROM_EMAIL=noreply@test.com
```

---

## 4️⃣ تثبيت Dependencies

```bash
npm install
```

---

## 5️⃣ تشغيل Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (اختياري) Seed database
npx prisma db seed
```

---

## 6️⃣ تشغيل السيرفر

```bash
npm run start:dev
```

**يجب أن تشوف:**
```
🚀 Server is running on http://0.0.0.0:3000
📚 Swagger: http://localhost:3000/api/docs
🌐 CORS allowed origins: [...]
```

---

## 7️⃣ اختبار الـ Endpoints

### من PowerShell:
```powershell
# Test Register
$body = @{
    email = "test@example.com"
    password = "Password123!"
    role = "PLAYER"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/register" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body
```

### من Bash/curl:
```bash
# Test Register
curl -X POST "http://localhost:3000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "role": "PLAYER"
  }'
```

### من Flutter:
غيّر الـ base URL في Flutter لـ:
```dart
static const String baseUrl = 'http://localhost:3000/api/v1';
// أو إذا بتختبر على جهاز حقيقي:
// static const String baseUrl = 'http://YOUR_LOCAL_IP:3000/api/v1';
```

---

## 8️⃣ مراقبة اللوجات

السيرفر هيطبع اللوجات مباشرة في الـ terminal:

```
========================================
📝 REGISTER REQUEST RECEIVED
========================================
Email: test@example.com
Role: PLAYER

🔄 Step 1: Creating user...
✅ User created successfully

🔄 Step 2: Generating auth tokens...
✅ Auth tokens generated

🔄 Step 3: Generating email verification token...
⚠️ Failed to send verification email: [error]

✅ REGISTRATION SUCCESS
```

---

## 🐛 حل المشاكل الشائعة

### مشكلة: Database connection failed
```bash
# تأكد من PostgreSQL شغال
# تأكد من DATABASE_URL صحيح
# جرب:
npx prisma db push
```

### مشكلة: Redis connection failed
```bash
# لو Redis مش مثبت:
# على Windows: استخدم Docker أو WSL
# على Mac: brew install redis && brew services start redis
# على Linux: sudo apt install redis-server && sudo systemctl start redis

# أو علّق Redis مؤقتًا في الكود
```

### مشكلة: Port 3000 already in use
```bash
# غيّر PORT في .env:
PORT=3001
```

### مشكلة: Email verification failed
```
⚠️ Failed to send verification email: [error]
✅ REGISTRATION SUCCESS  ← المهم: Auth نجح!
```
**ده طبيعي لو SENDGRID_API_KEY مش موجود**

---

## 📊 اختبار من Flutter

### 1. غيّر Base URL:
```dart
// للـ emulator:
static const String baseUrl = 'http://10.0.2.2:3000/api/v1';

// للجهاز حقيقي على نفس الشبكة:
static const String baseUrl = 'http://192.168.1.X:3000/api/v1';
// (استبدل X برقم IP بتاعك)
```

### 2. اعرف IP بتاعك:
```bash
# Windows:
ipconfig

# Mac/Linux:
ifconfig
# أو
ip addr show
```

### 3. جرب من Flutter:
- Register PLAYER
- Register FIELD_OWNER
- Login

---

## ✅ النتائج المتوقعة

### نجاح كامل:
```
✅ REGISTRATION SUCCESS
✅ LOGIN SUCCESS
```

### نجاح مع warnings (طبيعي):
```
⚠️ Failed to send verification email
✅ REGISTRATION SUCCESS
```

### فشل:
```
🔄 Step 1: Creating user...
[error details]
❌ REGISTRATION FAILED
```
→ اللوجات هتقولك المشكلة بالضبط

---

## 🎯 الخطوات التالية

1. ✅ شغّل السيرفر محليًا
2. ✅ اختبر من Postman/curl أولاً
3. ✅ غيّر Base URL في Flutter
4. ✅ اختبر من Flutter
5. ✅ ابعتلي اللوجات لو فيه مشكلة

**ابدأ الآن!** 🚀
