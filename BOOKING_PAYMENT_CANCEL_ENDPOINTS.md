# Booking Payment & Cancellation Endpoints - Official Documentation

## 1. Payment Endpoint ✅

### POST /payments/initiate

**الـ endpoint الرسمي للدفع**

#### Request

```http
POST /api/v1/payments/initiate
Authorization: Bearer <PLAYER_JWT_TOKEN>
Content-Type: application/json

{
  "bookingId": "booking-uuid",
  "gateway": "wallet",
  "metadata": {
    "note": "Optional metadata"
  }
}
```

#### Request Body Fields

```typescript
{
  bookingId: string;        // Required - UUID of the booking
  gateway: string;          // Required - Payment gateway
  metadata?: object;        // Optional - Additional metadata
}
```

#### Supported Gateways

- `"wallet"` - Pay from user wallet (instant)
- `"stripe"` - Stripe payment gateway
- `"fawry"` - Fawry payment gateway
- `"vodafone_cash"` - Vodafone Cash
- `"instapay"` - InstaPay

#### Response (Success - Wallet)

```json
{
  "success": true,
  "data": {
    "paymentId": "payment-uuid",
    "transactionId": "tx-uuid",
    "status": "SUCCESS",
    "redirectUrl": null,
    "amount": "40.00",
    "currency": "EGP"
  }
}
```

#### Response (Success - External Gateway)

```json
{
  "success": true,
  "data": {
    "paymentId": "payment-uuid",
    "transactionId": "tx-uuid",
    "status": "PENDING",
    "redirectUrl": "https://payment-gateway.com/pay/...",
    "amount": "40.00",
    "currency": "EGP"
  }
}
```

#### Response (Error - Insufficient Balance)

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": {
      "en": "Insufficient wallet balance",
      "ar": "رصيد المحفظة غير كافٍ"
    },
    "currentBalance": "20.00",
    "requiredAmount": "40.00",
    "shortage": "20.00"
  }
}
```

#### Response (Error - Email Not Verified)

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": {
      "en": "Please verify your email before making payments",
      "ar": "يرجى التحقق من بريدك الإلكتروني قبل إجراء الدفع"
    },
    "email": "player@example.com"
  }
}
```

#### Response (Error - Invalid Booking Status)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_BOOKING_STATUS",
    "message": {
      "en": "Booking is not in PENDING_PAYMENT status",
      "ar": "الحجز ليس في حالة انتظار الدفع"
    },
    "currentStatus": "CONFIRMED",
    "requiredStatus": "PENDING_PAYMENT"
  }
}
```

#### Response (Error - Payment Deadline Expired)

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_DEADLINE_EXPIRED",
    "message": {
      "en": "Payment deadline has expired",
      "ar": "انتهى الموعد النهائي للدفع"
    },
    "deadline": "2026-03-13T05:00:00.000Z",
    "now": "2026-03-13T05:15:00.000Z"
  }
}
```

#### Validations

1. ✅ User must be authenticated (JWT token)
2. ✅ Email must be verified
3. ✅ Booking must exist
4. ✅ Booking must belong to authenticated user
5. ✅ Booking status must be `PENDING_PAYMENT`
6. ✅ Payment deadline must not be expired (15 minutes)
7. ✅ For wallet: sufficient balance required

#### Payment Flow

```
1. Player creates booking → Status: PENDING_PAYMENT
2. Player calls POST /payments/initiate with gateway="wallet"
3. System validates all conditions
4. System deducts from player wallet
5. System creates wallet transaction (BOOKING_PAYMENT)
6. System updates booking → Status: CONFIRMED
7. System calculates commission
8. System credits field owner wallet (net amount)
9. System generates QR code
10. Response returned with payment details
```

#### Idempotency

- If payment already exists for booking:
  - Status COMPLETED → Returns existing payment
  - Status PENDING → Returns existing payment with redirect URL
  - Status FAILED → Allows retry

---

## 2. Cancel Booking Endpoint ✅

### PATCH /bookings/:id/cancel

**الـ endpoint الرسمي لإلغاء الحجز**

#### Request

```http
PATCH /api/v1/bookings/{bookingId}/cancel
Authorization: Bearer <PLAYER_JWT_TOKEN>
Content-Type: application/json

{
  "reason": "Weather conditions"
}
```

#### Request Body Fields

```typescript
{
  reason?: string;  // Optional - Reason for cancellation (max 500 chars)
}
```

#### Response (Success)

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "bk_123abc",
      "status": "CANCELLED",
      "scheduledDate": "2026-03-15",
      "scheduledStartTime": "14:00:00",
      "scheduledEndTime": "16:00:00"
    },
    "refund": {
      "refundAmount": "20.00",
      "refundPercentage": 50,
      "originalAmount": "40.00"
    }
  },
  "message": {
    "en": "Booking cancelled successfully. Refund: 50%",
    "ar": "تم إلغاء الحجز بنجاح. المبلغ المسترد: 50%"
  }
}
```

#### Response (Error - Cannot Cancel)

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": {
      "en": "Cannot cancel booking with status COMPLETED",
      "ar": "لا يمكن إلغاء الحجز بحالة مكتمل"
    }
  }
}
```

#### Response (Error - Not Authorized)

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": {
      "en": "Only the player or field owner can cancel this booking",
      "ar": "يمكن للاعب أو صاحب الملعب فقط إلغاء هذا الحجز"
    }
  }
}
```

#### Validations

1. ✅ User must be authenticated
2. ✅ Email must be verified
3. ✅ Booking must exist
4. ✅ User must be player OR field owner
5. ✅ Booking status must be `PENDING_PAYMENT` or `CONFIRMED`
6. ✅ Cannot cancel if status is `COMPLETED`, `CANCELLED`, `NO_SHOW`, or `PAYMENT_FAILED`

#### Cancellation Policy

##### Player Cancellation

Based on time before scheduled start:

| Time Before Start | Refund Percentage |
|-------------------|-------------------|
| ≥ 24 hours        | 100%              |
| 12-24 hours       | 50%               |
| < 12 hours        | 0%                |

##### Field Owner Cancellation

- **Always 100% refund** to player
- Field owner loses their commission

#### Cancellation Flow

```
1. Player/Owner calls PATCH /bookings/:id/cancel
2. System validates permissions
3. System calculates refund based on policy
4. System updates booking → Status: CANCELLED
5. System releases time slot → Status: AVAILABLE
6. System processes refund:
   a. Credit player wallet (refund amount)
   b. Debit owner wallet (if already credited)
7. System creates wallet transactions
8. System sends notifications to both parties
9. Response returned with refund details
```

#### Wallet Transactions on Cancellation

**Player Wallet:**
```
Type: REFUND
Amount: depositAmount * refundPercentage
Description: "Refund for cancelled booking {bookingId} (50%)"
```

**Owner Wallet (if booking was CONFIRMED):**
```
Type: DEBIT
Amount: netAmount (that was credited)
Description: "Reversal for cancelled booking {bookingId}"
```

---

## 3. Complete Booking Flow Example

### Scenario: Player books and pays from wallet

```bash
# Step 1: Create booking
POST /api/v1/bookings
{
  "timeSlotId": "timeslot-uuid"
}

# Response:
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "status": "PENDING_PAYMENT",
    "depositAmount": "40.00",
    "paymentDeadline": "2026-03-13T05:15:00Z"
  }
}

# Step 2: Pay from wallet
POST /api/v1/payments/initiate
{
  "bookingId": "booking-uuid",
  "gateway": "wallet"
}

# Response:
{
  "success": true,
  "data": {
    "paymentId": "payment-uuid",
    "transactionId": "tx-uuid",
    "status": "SUCCESS",
    "amount": "40.00"
  }
}

# Booking is now CONFIRMED
# QR code is generated
# Owner wallet is credited

# Step 3: Get QR code
GET /api/v1/bookings/booking-uuid/qr

# Response:
{
  "success": true,
  "data": {
    "qrToken": "qr_abc123",
    "imageUrl": "http://localhost:3000/uploads/qr/qr_abc123.png",
    "isUsed": false
  }
}

# Step 4: Cancel booking (if needed)
PATCH /api/v1/bookings/booking-uuid/cancel
{
  "reason": "Change of plans"
}

# Response:
{
  "success": true,
  "data": {
    "booking": {
      "status": "CANCELLED"
    },
    "refund": {
      "refundAmount": "20.00",
      "refundPercentage": 50
    }
  }
}
```

---

## 4. Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `EMAIL_NOT_VERIFIED` | User email not verified | 400 |
| `INSUFFICIENT_BALANCE` | Wallet balance too low | 400 |
| `INVALID_BOOKING_STATUS` | Booking not in correct status | 400 |
| `PAYMENT_DEADLINE_EXPIRED` | 15-minute deadline passed | 400 |
| `BOOKING_NOT_FOUND` | Booking doesn't exist | 404 |
| `FORBIDDEN` | Not authorized for this action | 403 |

---

## 5. Testing Scripts

### Test Payment from Wallet

```powershell
# 1. Login as player
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
  -Method Post `
  -Body (@{email="player@test.com"; password="Test@123"} | ConvertTo-Json) `
  -ContentType "application/json"

$token = $login.data.accessToken

# 2. Create booking (get bookingId from response)
$booking = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/bookings" `
  -Method Post `
  -Headers @{Authorization = "Bearer $token"} `
  -Body (@{timeSlotId="timeslot-uuid"} | ConvertTo-Json) `
  -ContentType "application/json"

$bookingId = $booking.data.id

# 3. Pay from wallet
$payment = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/payments/initiate" `
  -Method Post `
  -Headers @{Authorization = "Bearer $token"} `
  -Body (@{bookingId=$bookingId; gateway="wallet"} | ConvertTo-Json) `
  -ContentType "application/json"

Write-Host "Payment Status: $($payment.data.status)"
```

### Test Cancellation

```powershell
# Cancel booking
$cancel = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/bookings/$bookingId/cancel" `
  -Method Patch `
  -Headers @{Authorization = "Bearer $token"} `
  -Body (@{reason="Test cancellation"} | ConvertTo-Json) `
  -ContentType "application/json"

Write-Host "Refund Amount: $($cancel.data.refund.refundAmount)"
Write-Host "Refund Percentage: $($cancel.data.refund.refundPercentage)%"
```

---

## 6. Key Takeaways

✅ **Payment Endpoint:**
- `POST /payments/initiate`
- Body: `{bookingId, gateway}`
- Gateway: `"wallet"` for instant payment
- Validates email verification
- Checks wallet balance
- Auto-confirms booking on success

✅ **Cancel Endpoint:**
- `PATCH /bookings/:id/cancel`
- Body: `{reason}` (optional)
- Calculates refund based on policy
- Processes wallet transactions
- Sends notifications

✅ **Important Notes:**
- Payment deadline: 15 minutes
- Wallet payment is instant (no webhook)
- External gateways use webhooks
- Cancellation policy: 100% / 50% / 0%
- Owner cancellation: always 100% refund
- Email verification required for both
