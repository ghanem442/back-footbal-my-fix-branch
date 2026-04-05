# Booking & Wallet Complete Guide

## 1. Wallet - إضافة رصيد للاختبار

### ❌ لا يوجد endpoint مباشر للشحن!

الـ wallet endpoints الموجودة:
- `GET /wallet` - عرض الرصيد
- `GET /wallet/transactions` - عرض المعاملات
- `POST /wallet/withdraw` - سحب رصيد (للـ field owners)

### ✅ الحلول للاختبار:

#### Option 1: SQL مباشر (الأسرع للتست)

```sql
-- إضافة 1000 جنيه لمستخدم معين
UPDATE "Wallet" 
SET balance = balance + 1000 
WHERE "userId" = 'user-uuid-here';

-- مثال: إضافة رصيد للـ player
UPDATE "Wallet" 
SET balance = 1000 
WHERE "userId" = (
  SELECT id FROM "User" WHERE email = 'player@test.com'
);
```

#### Option 2: من خلال Prisma Studio

```bash
npx prisma studio
```

1. افتح Wallet table
2. ابحث عن الـ user
3. عدل الـ balance field
4. احفظ

#### Option 3: إنشاء Admin Endpoint (للتطوير فقط)

يمكن إضافة endpoint في admin controller:

```typescript
@Post('wallet/add-balance')
@Roles(Role.ADMIN)
async addBalance(
  @Body() dto: { userId: string; amount: number }
) {
  await this.prisma.wallet.update({
    where: { userId: dto.userId },
    data: { balance: { increment: dto.amount } }
  });
  
  return { success: true };
}
```

---

## 2. POST /bookings - إنشاء حجز

### Request

```http
POST /api/v1/bookings
Authorization: Bearer <PLAYER_JWT_TOKEN>
Content-Type: application/json

{
  "timeSlotId": "uuid-of-timeslot"
}
```

### Required Fields
- ✅ `timeSlotId` فقط!
- ❌ لا يوجد `fieldId` (يُستخرج من TimeSlot)
- ❌ لا يوجد `paymentMethod` (الدفع من الـ wallet تلقائياً)
- ❌ لا يوجد `playerId` (يُستخرج من JWT)

### Response

```json
{
  "success": true,
  "data": {
    "id": "bk_123abc",
    "playerId": "player-uuid",
    "fieldId": "field-uuid",
    "timeSlotId": "timeslot-uuid",
    "status": "PENDING_PAYMENT",
    "totalPrice": "200.00",
    "depositAmount": "40.00",
    "remainingAmount": "160.00",
    "paymentDeadline": "2026-03-13T05:00:00.000Z",
    "scheduledDate": "2026-03-15",
    "scheduledStartTime": "14:00:00",
    "scheduledEndTime": "16:00:00",
    "createdAt": "2026-03-13T04:45:00.000Z"
  },
  "message": {
    "en": "Booking created successfully. Please complete payment within 15 minutes.",
    "ar": "تم إنشاء الحجز بنجاح. يرجى إتمام الدفع خلال 15 دقيقة."
  }
}
```

### Booking Flow

1. **PENDING_PAYMENT** (15 دقيقة)
   - يتم إنشاء الحجز
   - TimeSlot يصبح RESERVED
   - لازم يدفع خلال 15 دقيقة

2. **CONFIRMED** (بعد الدفع)
   - يتم خصم المبلغ من الـ wallet
   - يتم إنشاء QR code تلقائياً
   - TimeSlot يصبح BOOKED

3. **CHECKED_IN** (عند المسح)
   - صاحب الملعب يمسح الـ QR
   - الحجز يصبح نشط

4. **COMPLETED** (بعد الانتهاء)
   - تلقائياً بعد وقت الحجز

---

## 3. QR Code - الحصول على الـ QR

### GET /bookings/:id/qr

```http
GET /api/v1/bookings/{bookingId}/qr
Authorization: Bearer <PLAYER_JWT_TOKEN>
```

### Response

```json
{
  "success": true,
  "data": {
    "qrToken": "qr_abc123xyz789",
    "imageUrl": "http://localhost:3000/uploads/qr/qr_abc123xyz789.png",
    "isUsed": false,
    "usedAt": null
  }
}
```

### متى يتم إنشاء الـ QR؟
- ✅ تلقائياً عند تأكيد الحجز (CONFIRMED status)
- ✅ يتم حفظ صورة الـ QR في `/uploads/qr/`
- ✅ كل booking له QR code واحد فقط

---

## 4. QR Validation - المسح من صاحب الملعب

### POST /qr/validate

```http
POST /api/v1/qr/validate
Authorization: Bearer <FIELD_OWNER_JWT_TOKEN>
Content-Type: application/json

{
  "qrToken": "qr_abc123xyz789"
}
```

### Response (Success)

```json
{
  "success": true,
  "message": "Booking validated successfully",
  "data": {
    "bookingId": "bk_123abc",
    "status": "CHECKED_IN",
    "playerName": "player@test.com",
    "fieldName": "Champions Field",
    "scheduledStartTime": "14:00:00",
    "scheduledEndTime": "16:00:00"
  }
}
```

### Response (Errors)

```json
// QR already used
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": {
      "en": "QR code has already been used",
      "ar": "تم استخدام رمز الاستجابة السريعة بالفعل"
    }
  }
}

// Not today
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": {
      "en": "Booking is not scheduled for today",
      "ar": "الحجز ليس مجدولاً لليوم"
    }
  }
}

// Wrong field owner
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": {
      "en": "You do not have permission to validate this booking",
      "ar": "ليس لديك إذن للتحقق من هذا الحجز"
    }
  }
}
```

---

## 5. Manual Verification - التحقق اليدوي

### POST /qr/verify-booking-id

للحالات اللي الـ QR مش شغال فيها:

```http
POST /api/v1/qr/verify-booking-id
Authorization: Bearer <FIELD_OWNER_JWT_TOKEN>
Content-Type: application/json

{
  "bookingId": "bk_123abc"
}
```

### Response

نفس response الـ `/qr/validate`

---

## 6. شروط نجاح الـ QR Validation

### ✅ الشروط المطلوبة:

1. **Booking Status = CONFIRMED**
   - ❌ لو PENDING_PAYMENT → لازم يدفع الأول
   - ❌ لو CANCELLED → الحجز ملغي
   - ❌ لو CHECKED_IN → تم المسح already

2. **Scheduled Date = Today**
   - ❌ لو الحجز بكرة → مينفعش يمسح النهاردة
   - ❌ لو الحجز امبارح → expired

3. **Field Owner Match**
   - ❌ لو صاحب ملعب تاني → مينفعش يمسح
   - ✅ لازم يكون صاحب الملعب نفسه

4. **QR Not Used**
   - ❌ لو تم المسح قبل كده → مينفعش يمسح تاني
   - ✅ QR يُستخدم مرة واحدة فقط

### ⏰ Timing:

- ❌ **لا يوجد** تحقق من وقت البداية
  - يعني ممكن يمسح قبل وقت الحجز
  - يعني ممكن يمسح بعد وقت الحجز
  - المهم يكون نفس اليوم فقط

- ❌ **لا يوجد** expiry للـ QR
  - الـ QR صالح طول اليوم
  - بس لازم يكون نفس يوم الحجز

### 🔄 Single Use:

- ✅ الـ QR يُستخدم **مرة واحدة فقط**
- بعد المسح: `isUsed = true`, `usedAt = timestamp`
- لو حاول يمسح تاني → Error: "QR code has already been used"

---

## 7. Complete Booking Flow Example

### Step 1: Player creates booking

```bash
# Login as player
POST /auth/login
{
  "email": "player@test.com",
  "password": "Test@123"
}

# Create booking
POST /bookings
{
  "timeSlotId": "timeslot-uuid"
}

# Response: status = PENDING_PAYMENT
```

### Step 2: Payment (automatic from wallet)

```bash
# System automatically:
# 1. Checks wallet balance
# 2. Deducts deposit amount
# 3. Updates booking status to CONFIRMED
# 4. Generates QR code
# 5. Updates TimeSlot status to BOOKED
```

### Step 3: Player gets QR code

```bash
GET /bookings/{bookingId}/qr

# Response:
{
  "qrToken": "qr_abc123",
  "imageUrl": "http://localhost:3000/uploads/qr/qr_abc123.png",
  "isUsed": false
}
```

### Step 4: Field owner scans QR (on booking day)

```bash
# Login as field owner
POST /auth/login
{
  "email": "owner@test.com",
  "password": "Test@123"
}

# Validate QR
POST /qr/validate
{
  "qrToken": "qr_abc123"
}

# Response: status = CHECKED_IN
```

### Step 5: Booking completes automatically

```bash
# System automatically marks as COMPLETED
# after scheduled end time
```

---

## 8. Testing Script

```powershell
# 1. Add balance to player wallet (SQL)
# UPDATE "Wallet" SET balance = 1000 WHERE "userId" = 'player-uuid';

# 2. Login as player
$playerLogin = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
  -Method Post `
  -Body (@{email="player@test.com"; password="Test@123"} | ConvertTo-Json) `
  -ContentType "application/json"

$playerToken = $playerLogin.data.accessToken

# 3. Get available time slots
$fields = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/fields" -Method Get
$fieldId = $fields.data[0].id

# 4. Create booking
$booking = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/bookings" `
  -Method Post `
  -Headers @{Authorization = "Bearer $playerToken"} `
  -Body (@{timeSlotId="timeslot-uuid"} | ConvertTo-Json) `
  -ContentType "application/json"

Write-Host "Booking ID: $($booking.data.id)"
Write-Host "Status: $($booking.data.status)"

# 5. Get QR code
$qr = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/bookings/$($booking.data.id)/qr" `
  -Method Get `
  -Headers @{Authorization = "Bearer $playerToken"}

Write-Host "QR Token: $($qr.data.qrToken)"
Write-Host "QR Image: $($qr.data.imageUrl)"

# 6. Login as field owner
$ownerLogin = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
  -Method Post `
  -Body (@{email="owner@test.com"; password="Test@123"} | ConvertTo-Json) `
  -ContentType "application/json"

$ownerToken = $ownerLogin.data.accessToken

# 7. Validate QR (on booking day only!)
$validate = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/qr/validate" `
  -Method Post `
  -Headers @{Authorization = "Bearer $ownerToken"} `
  -Body (@{qrToken=$qr.data.qrToken} | ConvertTo-Json) `
  -ContentType "application/json"

Write-Host "Validation: $($validate.message)"
Write-Host "New Status: $($validate.data.status)"
```

---

## 9. Common Issues

### Issue 1: "Insufficient wallet balance"
**Solution:** Add balance using SQL:
```sql
UPDATE "Wallet" SET balance = 1000 WHERE "userId" = 'player-uuid';
```

### Issue 2: "Booking is not scheduled for today"
**Solution:** 
- QR can only be scanned on the booking date
- Check `scheduledDate` in booking
- For testing, create booking for today

### Issue 3: "QR code has already been used"
**Solution:**
- QR is single-use only
- Create new booking for testing
- Or reset QR in database:
```sql
UPDATE "QrCode" SET "isUsed" = false, "usedAt" = NULL WHERE "qrToken" = 'qr_token_here';
```

### Issue 4: "Time slot not available"
**Solution:**
- Check TimeSlot status is AVAILABLE
- Check TimeSlot date is in the future
- Create new TimeSlot for testing

---

## 10. Key Takeaways

✅ **Wallet:**
- No direct deposit endpoint
- Use SQL for testing
- Balance checked automatically during booking

✅ **Booking:**
- Only needs `timeSlotId`
- Payment from wallet is automatic
- QR generated automatically on CONFIRMED

✅ **QR Code:**
- Get from `GET /bookings/:id/qr`
- Validate with `POST /qr/validate`
- Single-use, same-day only

✅ **Validation Rules:**
- Must be CONFIRMED status
- Must be today's date
- Must be correct field owner
- QR not used before
