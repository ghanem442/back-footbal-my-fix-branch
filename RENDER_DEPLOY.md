# 🚀 Render Deployment Guide

## خطوات النشر على Render

### 1️⃣ تجهيز GitHub Repository

```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

---

### 2️⃣ إنشاء PostgreSQL Database

1. روح https://dashboard.render.com
2. اضغط **"New +"** → **"PostgreSQL"**
3. املأ البيانات:
   - **Name**: `football-booking-db`
   - **Database**: `football_booking`
   - **User**: (auto-generated)
   - **Region**: Frankfurt (أقرب ليك)
   - **Plan**: Free (90 days free)
4. اضغط **"Create Database"**
5. استنى 2-3 دقائق

#### تفعيل PostGIS (مهم جداً!)

1. في الـ Database dashboard، اضغط **"Shell"**
2. شغل الأمر ده:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```
3. تأكد بالأمر ده:
```sql
SELECT PostGIS_version();
```

---

### 3️⃣ إنشاء Redis (External - Upstash)

**Render مافيهاش Redis مجاني، استخدم Upstash:**

1. روح https://upstash.com
2. سجل دخول بـ GitHub
3. اضغط **"Create Database"**
4. اختار:
   - **Type**: Redis
   - **Name**: `football-booking-redis`
   - **Region**: EU-West-1 (Ireland)
   - **Plan**: Free (10,000 commands/day)
5. احفظ الـ credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

### 4️⃣ إنشاء Web Service

1. في Render Dashboard، اضغط **"New +"** → **"Web Service"**
2. اختار الـ GitHub repo بتاعك
3. املأ البيانات:
   - **Name**: `football-booking-api`
   - **Region**: Frankfurt
   - **Branch**: `main`
   - **Root Directory**: (leave empty)
   - **Runtime**: Node
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**:
     ```bash
     npx prisma migrate deploy && node dist/src/main.js
     ```
   - **Plan**: Free (or Starter $7/month for better performance)

---

### 5️⃣ ضبط Environment Variables

في الـ Web Service → **Environment** → **Add Environment Variable**:

```bash
# Application
NODE_ENV=production
PORT=10000

# Database (Auto-filled from PostgreSQL service)
DATABASE_URL=<copy from PostgreSQL service → Internal Database URL>

# Redis (From Upstash)
REDIS_HOST=<your-redis>.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=<your-upstash-password>
REDIS_DB=0
REDIS_CACHE_DB=0
REDIS_THROTTLE_DB=1
REDIS_QUEUE_DB=2

# JWT Secrets (Generate new ones!)
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<generate-64-char-random-string>
JWT_REFRESH_SECRET=<generate-another-64-char-random-string>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=my01281105973@gmail.com
SMTP_PASS=mqmqupguqwvisgjr
SMTP_FROM_EMAIL=my01281105973@gmail.com
SMTP_FROM_NAME=Football Booking

# Frontend URL (Update after deploying frontend)
FRONTEND_URL=https://your-frontend.vercel.app

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

# Storage
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads
STORAGE_LOCAL_BASE_URL=https://your-app.onrender.com/uploads

# CORS (Update with your frontend domain)
CORS_ORIGINS=https://your-frontend.vercel.app
ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Rate Limiting
RATE_LIMIT_TTL=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_TTL=900000
AUTH_RATE_LIMIT_MAX=5

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Swagger
ENABLE_SWAGGER=true
```

---

### 6️⃣ Deploy!

1. اضغط **"Create Web Service"**
2. Render هيبدأ الـ build تلقائي
3. استنى 5-10 دقائق
4. لو نجح، هتشوف **"Live"** 🟢

---

### 7️⃣ Run Database Seed (أول مرة بس)

1. في الـ Web Service → **Shell**
2. شغل:
```bash
npx ts-node prisma/seed.ts
```

---

### 8️⃣ احصل على الـ URL

الـ URL هيكون:
```
https://football-booking-api.onrender.com
```

---

### 9️⃣ Test الـ API

```bash
# Health check
curl https://football-booking-api.onrender.com/health

# Swagger docs
https://football-booking-api.onrender.com/api/docs

# Login test
curl -X POST https://football-booking-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@footballbooking.com","password":"ZXzx@442004"}'
```

---

## ⚠️ مهم جداً!

### Free Plan Limitations:
- ⏰ **Sleep after 15 min inactivity** (first request takes 30-60 seconds)
- 💾 **750 hours/month** (enough for testing)
- 🗄️ **PostgreSQL free for 90 days** then $7/month
- 🚫 **No Redis** (use Upstash free tier)

### Upgrade to Starter ($7/month):
- ✅ No sleep
- ✅ Better performance
- ✅ More resources

---

## 🔧 Troubleshooting

### مشكلة: Build failed
```bash
# Check logs in Render Dashboard → Logs
# Common issues:
# 1. Missing dependencies → check package.json
# 2. TypeScript errors → run npm run build locally first
# 3. Prisma errors → check DATABASE_URL
```

### مشكلة: Database connection failed
```bash
# 1. Check DATABASE_URL is correct
# 2. Make sure PostGIS is enabled:
CREATE EXTENSION IF NOT EXISTS postgis;
```

### مشكلة: Redis connection failed
```bash
# 1. Check Upstash credentials
# 2. Make sure REDIS_HOST, REDIS_PORT, REDIS_PASSWORD are correct
```

---

## 📊 Monitoring

- **Logs**: Render Dashboard → Service → Logs
- **Metrics**: Render Dashboard → Service → Metrics
- **Database**: Render Dashboard → PostgreSQL → Metrics

---

## 💰 التكلفة المتوقعة

### Free Plan:
- Web Service: Free (with sleep)
- PostgreSQL: Free for 90 days
- Redis (Upstash): Free (10k commands/day)
- **Total**: $0 for 90 days

### After 90 days:
- Web Service: $7/month (Starter)
- PostgreSQL: $7/month
- Redis (Upstash): Free or $10/month
- **Total**: ~$14-24/month

---

## 🚀 Next Steps

1. ✅ Deploy backend على Render
2. ✅ Deploy frontend على Vercel
3. ✅ Update FRONTEND_URL و CORS_ORIGINS
4. ✅ Update Paymob webhook URL
5. ✅ Test all endpoints
6. ✅ Setup custom domain (optional)

---

تم! 🎉
