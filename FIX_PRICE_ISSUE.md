# إصلاح مشكلة السعر (basePrice) في Field

## المشكلة 🔴

Flutter app بيعرض "—" بدل السعر لأن:

```dart
String _priceText(Field field) {
  final price = field.basePrice;
  if (price == null) return '—';
  return '${price.toStringAsFixed(0)} EGP/hr';
}
```

الـ `field.basePrice` كان `null` لأن:
1. ✅ Field model كان مفيهوش `basePrice` column في database
2. ✅ CreateFieldDto كان فيه `basePrice` لكن مش بيتحفظ
3. ✅ Service مكنش بيحفظ `basePrice` في database

## الحل ✅

تم إصلاح المشكلة بالخطوات التالية:

### 1. إضافة basePrice للـ Prisma Schema ✅

```prisma
model Field {
  // ... existing fields
  basePrice       Decimal?                   @db.Decimal(10, 2)  // ← تم الإضافة
  commissionRate  Decimal?                   @db.Decimal(5, 2)
  // ... rest of fields
}
```

### 2. تحديث fields.service.ts ✅

تم تعديل `createField` method عشان يحفظ `basePrice`:

```typescript
INSERT INTO "Field" (
  id, "ownerId", name, description, address, 
  location, latitude, longitude, "basePrice", "commissionRate",  // ← basePrice added
  "averageRating", "totalReviews", "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(), $1, $2, $3, $4,
  ST_GeogFromText($5), $6, $7, $8, $9,  // ← $8 is basePrice
  0, 0, NOW(), NOW()
)
```

### 3. CreateFieldDto already has basePrice ✅

```typescript
@ApiPropertyOptional({
  description: 'Base price per hour in EGP',
  example: 200.00,
  minimum: 0.01,
})
@IsOptional()
@IsNumber({ maxDecimalPlaces: 2 })
@Min(0.01)
@Type(() => Number)
basePrice?: number;
```

## الخطوات المطلوبة الآن

### Step 1: إنشاء Migration

```bash
npx prisma migrate dev --name add_base_price_to_field
```

هذا الأمر سيقوم بـ:
- إنشاء migration file جديد
- إضافة `basePrice` column للـ Field table
- تحديث Prisma Client

### Step 2: إعادة تشغيل السيرفر

```bash
npm run start:dev
```

### Step 3: اختبار الـ Endpoints

#### اختبار إنشاء field جديد مع basePrice:

```powershell
$token = "YOUR_JWT_TOKEN"
$headers = @{Authorization = "Bearer $token"}

$body = @{
  name = "Test Field"
  description = "Test field with base price"
  address = "123 Test Street, Cairo"
  latitude = 30.0444
  longitude = 31.2357
  basePrice = 400
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/fields" `
  -Method Post `
  -Headers $headers `
  -Body $body `
  -ContentType "application/json"
```

#### اختبار GET /fields:

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/fields" `
  -Method Get `
  -Headers $headers

# التحقق من basePrice
$response.data[0].basePrice
```

#### اختبار GET /fields/:id:

```powershell
$fieldId = $response.data[0].id
$fieldDetails = Invoke-RestMethod -Uri "http://localhost:3000/fields/$fieldId" `
  -Method Get `
  -Headers $headers

# التحقق من basePrice
$fieldDetails.data.basePrice
```

## Response المتوقع بعد الإصلاح

### GET /fields

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "name": "Champions Field",
      "nameAr": "ملعب الأبطال",
      "address": "123 Sports Street, Cairo",
      "addressAr": "123 شارع الرياضة، القاهرة",
      "latitude": 30.0444,
      "longitude": 31.2357,
      "basePrice": "400.00",           // ← السعر موجود الآن
      "commissionRate": "5.00",
      "averageRating": 4.5,
      "totalReviews": 10,
      "images": [
        {
          "id": "image-id",
          "url": "https://example.com/image.jpg",
          "isPrimary": true,
          "order": 1
        }
      ],
      "owner": {
        "id": "owner-id",
        "email": "owner@example.com",
        "phoneNumber": "+20123456789"
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "message": {
    "en": "Fields retrieved successfully",
    "ar": "تم استرجاع الملاعب بنجاح"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /fields/:id

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Champions Field",
    "nameAr": "ملعب الأبطال",
    "description": "Professional football field",
    "descriptionAr": "ملعب كرة قدم احترافي",
    "address": "123 Sports Street, Cairo",
    "addressAr": "123 شارع الرياضة، القاهرة",
    "latitude": 30.0444,
    "longitude": 31.2357,
    "basePrice": "400.00",           // ← السعر موجود
    "commissionRate": "5.00",
    "averageRating": 4.5,
    "totalReviews": 10,
    "images": [
      {
        "id": "image-id",
        "url": "https://example.com/image.jpg",
        "isPrimary": true,
        "order": 1
      }
    ],
    "owner": {
      "id": "owner-id",
      "email": "owner@example.com",
      "phoneNumber": "+20123456789"
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "message": {
    "en": "Field retrieved successfully",
    "ar": "تم استرجاع الملعب بنجاح"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Flutter App - النتيجة المتوقعة

بعد الإصلاح، Flutter app هيعرض السعر صح:

```dart
String _priceText(Field field) {
  final price = field.basePrice;
  if (price == null) return '—';
  return '${price.toStringAsFixed(0)} EGP/hr';
}

// Output: "400 EGP/hr" ✅
```

## تحديث الملاعب الموجودة

لو عندك ملاعب موجودة بدون basePrice، ممكن تحدثها:

### Option 1: من خلال API

```powershell
$fieldId = "existing-field-id"
$token = "YOUR_JWT_TOKEN"
$headers = @{Authorization = "Bearer $token"}

$body = @{
  basePrice = 400
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/fields/$fieldId" `
  -Method Patch `
  -Headers $headers `
  -Body $body `
  -ContentType "application/json"
```

### Option 2: من خلال Database

```sql
-- تحديث كل الملاعب بسعر افتراضي
UPDATE "Field" 
SET "basePrice" = 300.00 
WHERE "basePrice" IS NULL;

-- أو تحديث ملعب معين
UPDATE "Field" 
SET "basePrice" = 400.00 
WHERE id = 'field-uuid-here';
```

## ملاحظات مهمة

1. **basePrice هو سعر افتراضي/أساسي** - الأسعار الفعلية للحجز موجودة في TimeSlot
2. **basePrice اختياري (optional)** - يمكن أن يكون null
3. **Flutter app يعرض "—" لو basePrice = null** - هذا سلوك طبيعي
4. **لازم تحدد basePrice عند إنشاء field جديد** عشان يظهر السعر في Flutter

## الملفات المعدلة

- ✅ `prisma/schema.prisma` - إضافة basePrice column
- ✅ `src/modules/fields/fields.service.ts` - تحديث createField method
- ✅ `src/modules/fields/dto/create-field.dto.ts` - already has basePrice

## Next Steps

1. Run migration: `npx prisma migrate dev --name add_base_price_to_field`
2. Restart server: `npm run start:dev`
3. Test creating new field with basePrice
4. Update existing fields with basePrice (if needed)
5. Test Flutter app - السعر المفروض يظهر الآن ✅
