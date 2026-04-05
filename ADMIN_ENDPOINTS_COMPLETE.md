# Admin Endpoints - Complete Documentation

## ✅ Priority 1 - IMPLEMENTED

### 1. GET /admin/bookings
**الوصف**: استرجاع قائمة الحجوزات مع filters و pagination

**Query Parameters**:
- `page` (optional): رقم الصفحة (default: 1)
- `limit` (optional): عدد العناصر في الصفحة (default: 10)
- `status` (optional): حالة الحجز (PENDING_PAYMENT, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, NO_SHOW, PAYMENT_FAILED)
- `fieldId` (optional): ID الملعب
- `ownerId` (optional): ID صاحب الملعب
- `search` (optional): البحث بـ booking ID, player email, أو phone
- `startDate` (optional): تاريخ البداية (YYYY-MM-DD)
- `endDate` (optional): تاريخ النهاية (YYYY-MM-DD)

**Response Example**:
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "bk_123",
        "bookingCode": "BK-15008",
        "player": {
          "id": "u1",
          "name": "Ahmed Ali",
          "email": "ahmed@test.com",
          "phone": "01000000000"
        },
        "field": {
          "id": "f1",
          "name": "Stadium A"
        },
        "owner": {
          "id": "o1",
          "name": "Owner Name",
          "email": "owner@test.com"
        },
        "date": "2026-03-20",
        "startTime": "18:00:00",
        "endTime": "19:00:00",
        "status": "CONFIRMED",
        "totalPrice": 1000,
        "depositAmount": 200,
        "remainingAmount": 800,
        "paymentStatus": "PARTIAL",
        "createdAt": "2026-03-19T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 120,
      "totalPages": 12
    }
  }
}
```

---

### 2. GET /admin/fields
**الوصف**: استرجاع قائمة الملاعب مع filters و pagination

**Query Parameters**:
- `page` (optional): رقم الصفحة (default: 1)
- `limit` (optional): عدد العناصر في الصفحة (default: 10)
- `search` (optional): البحث بالاسم أو العنوان
- `status` (optional): حالة الملعب
- `ownerId` (optional): ID صاحب الملعب

**Response Example**:
```json
{
  "success": true,
  "data": {
    "fields": [
      {
        "id": "f1",
        "name": "Stadium A",
        "location": "Cairo - Nasr City",
        "owner": {
          "id": "o1",
          "name": "Omar Khaled",
          "email": "owner@test.com"
        },
        "pricePerHour": 1200,
        "status": "ACTIVE",
        "commissionPercentage": 10,
        "isCustomCommission": false,
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

### 3. POST /admin/fields
**الوصف**: إنشاء ملعب جديد

**Request Body**:
```json
{
  "ownerId": "uuid",
  "name": "Stadium Name",
  "nameAr": "اسم الملعب",
  "description": "Description",
  "descriptionAr": "الوصف",
  "address": "Address",
  "addressAr": "العنوان",
  "latitude": 30.0444,
  "longitude": 31.2357,
  "basePrice": 1000,
  "commissionRate": 10
}
```

---

### 4. PATCH /admin/fields/:fieldId
**الوصف**: تحديث بيانات ملعب

**Request Body** (all optional):
```json
{
  "name": "New Name",
  "address": "New Address",
  "basePrice": 1200,
  "commissionRate": 12
}
```

---

### 5. DELETE /admin/fields/:fieldId
**الوصف**: حذف ملعب (soft delete)

**Note**: لا يمكن حذف ملعب له حجوزات نشطة

---

### 6. PATCH /admin/fields/:fieldId/status
**الوصف**: تحديث حالة الملعب

**Request Body**:
```json
{
  "status": "ACTIVE" // or INACTIVE, HIDDEN, DISABLED, PENDING_APPROVAL, REJECTED
}
```

**Note**: هذا الـ endpoint جاهز لكن يحتاج إضافة status field للـ Field model في المستقبل

---

### 7. GET /admin/users (Enhanced)
**الوصف**: استرجاع قائمة المستخدمين مع filters محسّنة

**Query Parameters**:
- `page` (optional): رقم الصفحة
- `limit` (optional): عدد العناصر
- `email` (optional): البحث بالبريد الإلكتروني
- `role` (optional): PLAYER, FIELD_OWNER, ADMIN
- `isVerified` (optional): true/false
- `isSuspended` (optional): true/false

---

### 8. GET /admin/system-settings
**الوصف**: استرجاع إعدادات النظام

**Response Example**:
```json
{
  "success": true,
  "data": {
    "globalCommissionPercentage": 10,
    "depositPercentage": 20,
    "cancellationRefundWindowHours": 3
  }
}
```

---

### 9. PATCH /admin/system-settings
**الوصف**: تحديث إعدادات النظام

**Request Body** (all optional):
```json
{
  "globalCommissionPercentage": 12,
  "depositPercentage": 25,
  "cancellationRefundWindowHours": 4
}
```

---

### 10. GET /admin/wallet/transactions
**الوصف**: استرجاع تاريخ معاملات المحفظة

**Query Parameters**:
- `page` (optional)
- `limit` (optional)
- `userId` (optional): filter by user
- `type` (optional): DEPOSIT, WITHDRAWAL, REFUND, etc.
- `startDate` (optional)
- `endDate` (optional)

**Response Example**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_123",
        "user": {
          "id": "u1",
          "email": "user@test.com",
          "name": "User Name"
        },
        "type": "DEPOSIT",
        "amount": 1000,
        "balanceBefore": 500,
        "balanceAfter": 1500,
        "description": "Admin topup",
        "reference": "admin-topup-123",
        "createdAt": "2026-03-16T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

## 📋 Existing Endpoints (Already Implemented)

### Commission Management
- `GET /admin/commission/global` - Get global commission rate
- `PATCH /admin/commission/global` - Update global commission rate
- `GET /admin/fields/:fieldId/commission` - Get field commission rate
- `PATCH /admin/fields/:fieldId/commission` - Update field commission rate

### Dashboard & Reports
- `GET /admin/dashboard` - Dashboard metrics
- `GET /admin/reports/revenue` - Revenue report
- `GET /admin/reports/bookings` - Booking statistics
- `GET /admin/reports/users` - User statistics
- `GET /admin/reports/fields` - Field statistics
- `POST /admin/reports/export` - Export reports as CSV

### User Management
- `PATCH /admin/users/:id/suspend` - Suspend/unsuspend user
- `POST /admin/wallet/topup` - Topup user wallet

### Settings
- `GET /admin/settings` - Get all settings
- `GET /admin/settings/:key` - Get specific setting
- `PATCH /admin/settings/:key` - Update setting

### Reviews
- `DELETE /admin/reviews/:id` - Delete review

---

## 🔄 Testing Commands

### Test Bookings List
```powershell
$token = "YOUR_ADMIN_TOKEN"
Invoke-RestMethod -Uri "http://localhost:3000/admin/bookings?page=1&limit=10&status=CONFIRMED" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $token" }
```

### Test Fields List
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/fields?page=1&limit=10" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $token" }
```

### Test Create Field
```powershell
$body = @{
  ownerId = "owner-uuid"
  name = "Test Stadium"
  address = "Cairo"
  basePrice = 1000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/admin/fields" `
  -Method POST `
  -Headers @{ 
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body $body
```

### Test System Settings
```powershell
# Get settings
Invoke-RestMethod -Uri "http://localhost:3000/admin/system-settings" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $token" }

# Update settings
$body = @{
  globalCommissionPercentage = 12
  depositPercentage = 25
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/admin/system-settings" `
  -Method PATCH `
  -Headers @{ 
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body $body
```

---

## 📝 Notes

1. **Authentication**: جميع الـ endpoints تحتاج JWT token مع role ADMIN
2. **Pagination**: الـ default هو page=1, limit=10
3. **Field Status**: حاليًا نستخدم deletedAt للـ status، في المستقبل يمكن إضافة status field
4. **Soft Delete**: الـ fields يتم حذفها soft delete (deletedAt)
5. **Active Bookings**: لا يمكن حذف field له حجوزات نشطة

---

## 🚀 Next Steps (Priority 2)

1. **Withdrawal/Approval Flow**: إدارة طلبات السحب من المحافظ
2. **Field Status Lifecycle**: إضافة status field للـ Field model
3. **Booking Actions**: إضافة actions للحجوزات (cancel, refund, etc.)
4. **Notifications**: إرسال إشعارات للمستخدمين عند التغييرات
5. **Audit Log**: تسجيل جميع العمليات الإدارية

تم تنفيذ جميع الـ endpoints المطلوبة في الأولوية الأولى! ✅
