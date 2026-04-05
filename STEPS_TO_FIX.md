# خطوات إصلاح مشكلة السعر (basePrice)

## الخطوات على Backend

### 1. تشغيل Migration
```bash
npx prisma migrate dev --name add_base_price_to_field
```

### 2. تحديث الملاعب القديمة
```bash
# Option A: Using SQL file
npx prisma db execute --file update-existing-fields.sql --schema prisma/schema.prisma

# Option B: Run SQL directly in database client
# UPDATE "Field" SET "basePrice" = 300.00 WHERE "basePrice" IS NULL;
```

### 3. إعادة تشغيل السيرفر
```bash
npm run start:dev
```

## الخطوات على Flutter

### 1. Logout & Login
أو Hot Restart (Ctrl+Shift+F5)

### 2. Pull to Refresh
اسحب الصفحة لأسفل في Home page

### 3. افتح تفاصيل الملعب
المفروض السعر يظهر الآن: "400 EGP/hr" بدل "—"

## التحقق من النجاح

### Test Backend:
```powershell
.\test-fields-with-auth.ps1
```

### Expected Response:
```json
{
  "data": [{
    "id": "...",
    "name": "Field Name",
    "basePrice": "400.00"  // ← يجب أن يكون موجود
  }]
}
```
