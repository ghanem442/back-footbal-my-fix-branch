# 🚀 Railway Deployment Guide

## خطوات النشر على Railway

### 1️⃣ تجهيز GitHub Repository

```bash
# تأكد إن المشروع على GitHub
git add .
git commit -m "Ready for production deployment"
git push origin main
```

---

### 2️⃣ إنشاء Project على Railway

1. روح https://railway.app
2. سجل دخول بـ GitHub
3. اضغط **"New Project"**
4. اختار **"Deploy from GitHub repo"**
5. اختار الـ repo بتاعك

---

### 3️⃣ إضافة PostgreSQL

1. في الـ Project، اضغط **"+ New"**
2. اختار **"Database"** → **"Add PostgreSQL"**
3. استنى لحد ما يتعمل

#### تفعيل PostGIS (مهم جداً!)

```bash
# في Railway Dashboard
1. اضغط على PostgreSQL service
2. اضغط "Connect"
3. اختار "psql"
4. شغل الأمر ده:
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

### 4️⃣ إضافة Redis

1. اضغط **"+ New"** تاني
2. اختار **"Database"** → **"Add Redis"**

---

### 5️⃣ ضبط Environment Variables

اضغط على الـ **backend service** → **Variables** → **Raw Editor**

انسخ والصق:

```bash
NODE_ENV=production
PORT=3000

# Database (Railway auto-fills this)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (Railway auto-fills these)
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
REDIS_DB=0

# JWT Secrets (Generate new ones!)
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=GENERATE_A_RANDOM_64_CHAR_STRING_HERE
JWT_REFRESH_SECRET=GENERATE_ANOTHER_RANDOM_64_CHAR_STRING_HERE
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Email SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=my01281105973@gmail.com
SMTP_PASS=mqmqupguqwvisgjr
SMTP_FROM_EMAIL=my01281105973@gmail.com
SMTP_FROM_NAME=Football Booking

# Frontend URL (Update after deploying frontend)
FRONTEND_URL=https://your-frontend-url.vercel.app

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json

# Paymob
PAYMOB_API_KEY=ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TVRFME5qRTBOU3dpYm1GdFpTSTZJbWx1YVhScFlXd2lmUS55VEMyMXZJYTMxajR1WVN6NWszd0JleUZCdFlNd1dsMmc5ZktoT1VjU1U0cWFGcGZJbXZMbVNfOHhrbl8wZjRaYW9kaE1ydXp5aUs1bHVPbEhVWHJ4Zw==
PAYMOB_INTEGRATION_ID=5592196
PAYMOB_IFRAME_ID=1022725

# System Settings
DEPOSIT_PERCENTAGE=20
GLOBAL_COMMISSION_RATE=50
BOOKING_TIMEOUT_MINUTES=15
NO_SHOW_THRESHOLD=3
SUSPENSION_DAYS=30
REMINDER_HOURS_BEFORE=2

# Storage (Local for now, change to S3 later)
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads
STORAGE_LOCAL_BASE_URL=${{RAILWAY_PUBLIC_DOMAIN}}/uploads

# CORS (Update with your frontend domain)
CORS_ORIGINS=https://your-frontend-url.vercel.app,https://your-domain.com
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,https://your-domain.com

# Rate Limiting
RATE_LIMIT_TTL=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_TTL=900000
AUTH_RATE_LIMIT_MAX=5

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Swagger (Enable for testing, disable later)
ENABLE_SWAGGER=true
```

---

### 6️⃣ Generate JWT Secrets

على جهازك المحلي، شغل:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

شغله مرتين وحط القيم في `JWT_SECRET` و `JWT_REFRESH_SECRET`

---

### 7️⃣ Deploy!

Railway هيعمل deploy تلقائي. استنى 3-5 دقايق.

---

### 8️⃣ Run Database Seed (أول مرة بس)

بعد الـ deploy الأول:

1. اضغط على الـ backend service
2. روح **Deployments** → اختار آخر deployment
3. اضغط **"View Logs"**
4. لو شغال تمام، روح **Settings** → **Deploy**
5. في **Custom Start Command** حط:
```bash
npx prisma migrate deploy && npx ts-node prisma/seed.ts && node dist/src/main.js
```
6. اضغط **"Redeploy"**
7. بعد ما يخلص، ارجع الـ command للعادي:
```bash
npx prisma migrate deploy && node dist/src/main.js
```

---

### 9️⃣ احصل على الـ URL

1. اضغط على الـ backend service
2. روح **Settings** → **Networking**
3. اضغط **"Generate Domain"**
4. هتاخد URL زي: `https://your-app.up.railway.app`

---

### 🔟 Test الـ API

```bash
# Health check
curl https://your-app.up.railway.app/health

# Swagger docs
https://your-app.up.railway.app/api/docs

# Login test
curl -X POST https://your-app.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@footballbooking.com","password":"ZXzx@442004"}'
```

---

## ✅ الحسابات المتاحة بعد الـ Seed

- **Admin**: admin@footballbooking.com / ZXzx@442004
- **Owner**: owner@footballbooking.com / ZXzx@442004
- **Player**: player@test.com / Test@123
- **Player**: my01281105973@gmail.com / ZXzx@442004

---

## 🔧 Troubleshooting

### مشكلة: Database connection failed
```bash
# تأكد إن PostGIS متفعل
railway connect postgres
CREATE EXTENSION IF NOT EXISTS postgis;
```

### مشكلة: Redis connection failed
```bash
# تأكد إن Redis variables صح
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
```

### مشكلة: Migration failed
```bash
# شغل migrations يدوي
railway run npx prisma migrate deploy
```

---

## 📊 Monitoring

- **Logs**: Railway Dashboard → Service → Logs
- **Metrics**: Railway Dashboard → Service → Metrics
- **Database**: Railway Dashboard → PostgreSQL → Data

---

## 🔒 Security Checklist

- ✅ JWT secrets generated (64 chars)
- ✅ CORS configured with frontend domain
- ✅ Swagger disabled in production (set ENABLE_SWAGGER=false)
- ✅ Rate limiting enabled
- ✅ Helmet security headers enabled
- ✅ Environment variables not committed to Git

---

## 💰 التكلفة المتوقعة

- **Hobby Plan**: $5/شهر
  - PostgreSQL: Included
  - Redis: Included
  - Backend: Included
  - 500 GB bandwidth

---

## 🚀 Next Steps

1. Deploy frontend على Vercel
2. Update FRONTEND_URL و CORS_ORIGINS
3. Update Paymob webhook URL
4. Setup custom domain (optional)
5. Enable Sentry for error tracking (optional)
6. Migrate to S3/Cloudinary for file storage (recommended)

---

تم! 🎉
