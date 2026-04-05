# دليل إنشاء حساب Admin

## الطريقة الأولى: باستخدام npm script (الأسهل) ✅

```bash
npm run create-admin
```

هيعمل حساب admin بالبيانات دي:
- **Email**: admin@fieldbook.com
- **Password**: Admin@123456
- **Role**: ADMIN
- **Verified**: true

---

## الطريقة الثانية: باستخدام PowerShell Script

```powershell
.\create-admin-user.ps1
```

الـ script ده هيعمل:
1. Register user عن طريق الـ API
2. Login وياخد الـ token
3. يتأكد إن الـ user عنده ADMIN role
4. يحفظ الـ token في ملف `admin-token.txt`

---

## الطريقة الثالثة: مباشرة من Database

لو عندك مشكلة في الطرق اللي فوق، استخدم SQL:

```sql
-- Option 1: Upgrade existing user to admin
UPDATE "User" 
SET 
    role = 'ADMIN',
    "isVerified" = true,
    "emailVerifiedAt" = NOW()
WHERE email = 'your-email@example.com';

-- Option 2: Check all admins
SELECT id, email, name, role, "isVerified"
FROM "User"
WHERE role = 'ADMIN';
```

---

## بعد إنشاء الـ Admin

### 1. Login
```powershell
$loginBody = @{
    email = "admin@fieldbook.com"
    password = "Admin@123456"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $loginBody

$token = $response.data.accessToken
Write-Host "Token: $token"
```

### 2. Test Admin Access
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

# Get dashboard
Invoke-RestMethod -Uri "http://localhost:3000/admin/dashboard" `
    -Method GET -Headers $headers

# Get bookings
Invoke-RestMethod -Uri "http://localhost:3000/admin/bookings?page=1&limit=10" `
    -Method GET -Headers $headers

# Get fields
Invoke-RestMethod -Uri "http://localhost:3000/admin/fields?page=1&limit=10" `
    -Method GET -Headers $headers
```

### 3. استخدم الـ Test Script
```powershell
# عدّل الـ token في الملف
# ثم شغّل
.\test-admin-endpoints.ps1
```

---

## Troubleshooting

### المشكلة: User already exists
**الحل**: استخدم SQL لتحديث الـ role:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@fieldbook.com';
```

### المشكلة: Email verification required
**الحل**: شوف الـ console logs للـ verification code، أو استخدم SQL:
```sql
UPDATE "User" 
SET "isVerified" = true, "emailVerifiedAt" = NOW() 
WHERE email = 'admin@fieldbook.com';
```

### المشكلة: 403 Forbidden عند الدخول على admin endpoints
**الحل**: تأكد إن الـ role = 'ADMIN':
```sql
SELECT email, role FROM "User" WHERE email = 'admin@fieldbook.com';
```

---

## Default Admin Credentials

بعد تشغيل أي من الطرق اللي فوق:

```
Email: admin@fieldbook.com
Password: Admin@123456
```

**⚠️ مهم**: غيّر الـ password بعد أول login!

---

## Admin Endpoints المتاحة

بعد ما تعمل login كـ admin، تقدر تستخدم:

### Bookings
- `GET /admin/bookings` - قائمة الحجوزات
- `GET /admin/bookings?status=CONFIRMED` - filter by status
- `GET /admin/bookings?search=email@test.com` - search

### Fields
- `GET /admin/fields` - قائمة الملاعب
- `POST /admin/fields` - إنشاء ملعب
- `PATCH /admin/fields/:id` - تحديث ملعب
- `DELETE /admin/fields/:id` - حذف ملعب

### Users
- `GET /admin/users` - قائمة المستخدمين
- `GET /admin/users?role=PLAYER` - filter by role
- `PATCH /admin/users/:id/suspend` - suspend user

### Settings
- `GET /admin/system-settings` - الإعدادات
- `PATCH /admin/system-settings` - تحديث الإعدادات

### Dashboard & Reports
- `GET /admin/dashboard` - Dashboard metrics
- `GET /admin/reports/revenue` - Revenue report
- `GET /admin/reports/bookings` - Booking statistics

شوف `ADMIN_ENDPOINTS_COMPLETE.md` للتفاصيل الكاملة!
