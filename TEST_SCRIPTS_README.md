# 🧪 دليل استخدام Test Scripts

## 📋 الملفات المتوفرة

1. `test-auth-endpoints.ps1` - PowerShell script (Windows)
2. `test-auth-endpoints.sh` - Bash script (Linux/Mac)
3. `AUTH_DEBUGGING_GUIDE.md` - دليل شامل للتشخيص

---

## 🚀 كيفية الاستخدام

### على Windows (PowerShell):

```powershell
# 1. تعيين Railway URL
$env:RAILWAY_URL = "https://your-app.railway.app"

# 2. تشغيل السكريبت
.\test-auth-endpoints.ps1
```

### على Linux/Mac (Bash):

```bash
# 1. تعيين Railway URL
export RAILWAY_URL="https://your-app.railway.app"

# 2. إعطاء صلاحية التنفيذ
chmod +x test-auth-endpoints.sh

# 3. تشغيل السكريبت
./test-auth-endpoints.sh
```

---

## 📊 ما يفعله السكريبت

السكريبت يقوم بـ 4 اختبارات:

### Test 1: Register PLAYER
- يسجل مستخدم جديد بـ role = PLAYER
- Email: `testplayer@example.com`
- Password: `Password123!`

### Test 2: Register FIELD_OWNER
- يسجل مستخدم جديد بـ role = FIELD_OWNER
- Email: `testowner@example.com`
- Password: `Password123!`

### Test 3: Login
- يحاول تسجيل الدخول بالمستخدم الأول
- Email: `testplayer@example.com`
- Password: `Password123!`

### Test 4: Register without role
- يسجل مستخدم بدون تحديد role (يجب أن يكون PLAYER افتراضيًا)
- Email: `testdefault@example.com`
- Password: `Password123!`

---

## 📝 قراءة النتائج

### ✅ نجاح الاختبار:
```
HTTP Status: 201  (للتسجيل)
HTTP Status: 200  (للدخول)

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { ... }
  }
}
```

### ❌ فشل الاختبار:
```
HTTP Status: 400  (خطأ في البيانات)
HTTP Status: 409  (البريد موجود مسبقًا)
HTTP Status: 502  (خطأ في السيرفر)

Response:
{
  "success": false,
  "error": {
    "code": "...",
    "message": { ... }
  }
}
```

---

## 🔧 تخصيص الاختبارات

### تغيير Railway URL:

**PowerShell:**
```powershell
$env:RAILWAY_URL = "https://your-custom-url.railway.app"
```

**Bash:**
```bash
export RAILWAY_URL="https://your-custom-url.railway.app"
```

### تغيير البيانات المستخدمة:

افتح الملف وعدّل القيم:
```json
{
  "email": "your-email@example.com",
  "password": "YourPassword123!",
  "role": "PLAYER"
}
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: "Connection refused"
**الحل:**
- تأكد من أن Railway URL صحيح
- تأكد من أن السيرفر شغال على Railway

### المشكلة: "CORS error"
**الحل:**
- السكريبت لا يتأثر بـ CORS
- إذا كنت تختبر من المتصفح، استخدم السكريبت بدلاً من ذلك

### المشكلة: "Email already exists"
**الحل:**
- غيّر الـ email في السكريبت
- أو احذف المستخدمين من الـ database

### المشكلة: HTTP 502
**الحل:**
- افحص Railway logs
- راجع `AUTH_DEBUGGING_GUIDE.md`

---

## 📚 مصادر إضافية

- `AUTH_DEBUGGING_GUIDE.md` - دليل شامل للتشخيص
- Railway Dashboard - للوجات والـ environment variables
- Swagger Docs - `https://your-app.railway.app/api/docs`

---

## 💡 نصائح

1. **اختبر محليًا أولاً:**
   ```bash
   export RAILWAY_URL="http://localhost:3000"
   ./test-auth-endpoints.sh
   ```

2. **استخدم Postman/Insomnia:**
   - أسهل في التعديل والاختبار
   - يمكنك حفظ الـ requests

3. **راقب Railway Logs:**
   - شغّل اللوجات قبل تشغيل السكريبت
   - راقب الأخطاء في الوقت الفعلي

4. **اختبر كل endpoint على حدة:**
   - علّق الاختبارات الأخرى
   - ركز على الـ endpoint المشكل

---

## 🔐 ملاحظات أمنية

⚠️ **لا تستخدم بيانات حقيقية في الاختبارات!**

- استخدم emails وهمية للاختبار
- لا تشارك الـ tokens أو الـ passwords
- احذف المستخدمين التجريبيين بعد الانتهاء

---

## 📞 الدعم

إذا واجهت مشاكل:
1. راجع `AUTH_DEBUGGING_GUIDE.md`
2. افحص Railway logs
3. تأكد من Environment Variables
4. جرب الاختبار محليًا أولاً
