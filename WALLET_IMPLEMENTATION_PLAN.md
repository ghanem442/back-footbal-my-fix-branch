# Wallet Implementation Plan

## Current State Analysis

### ✅ Already Implemented:
1. Wallet model with balance
2. WalletTransaction model with types
3. Booking confirmation service with owner wallet credit
4. Commission calculation and deduction
5. Transaction recording for owner credits
6. GET /wallet endpoint
7. GET /wallet/transactions endpoint
8. POST /wallet/withdraw endpoint

### ❌ Missing:
1. Player wallet topup endpoints
2. Player booking payment from wallet
3. Owner wallet pending/available balance
4. Refund logic
5. Withdrawal confirmation
6. Admin topup endpoint (for testing)

---

## Implementation Plan

### Phase 1: Player Wallet Topup (Priority: HIGH)

#### 1.1 Create DTOs
```typescript
// src/modules/wallet/dto/topup-initiate.dto.ts
export class TopupInitiateDto {
  @IsNumber()
  @Min(10)
  @Max(10000)
  amount: number;

  @IsEnum(PaymentGateway)
  @IsOptional()
  gateway?: PaymentGateway; // Default: WALLET for testing
}

// src/modules/wallet/dto/topup-confirm.dto.ts
export class TopupConfirmDto {
  @IsString()
  transactionId: string;

  @IsString()
  @IsOptional()
  paymentReference?: string;
}
```

#### 1.2 Add Endpoints
```typescript
// POST /wallet/topup/initiate
// POST /wallet/topup/confirm
// POST /admin/wallet/topup (for testing)
```

### Phase 2: Booking Payment from Wallet (Priority: HIGH)

#### 2.1 Modify Booking Creation
- Check wallet balance before creating booking
- Deduct deposit amount from player wallet
- Create wallet transaction (BOOKING_PAYMENT)
- Auto-confirm booking if wallet payment succeeds

#### 2.2 Add Payment Method
```typescript
// In CreateBookingDto
paymentMethod: 'WALLET' | 'EXTERNAL'
```

### Phase 3: Owner Wallet Enhancement (Priority: MEDIUM)

#### 3.1 Add Pending Balance
```sql
ALTER TABLE "Wallet" ADD COLUMN "pendingBalance" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "Wallet" ADD COLUMN "availableBalance" DECIMAL(10,2) DEFAULT 0;
```

#### 3.2 Update Credit Logic
- On booking confirmation: credit to pendingBalance
- On booking completion: move to availableBalance
- Withdrawal only from availableBalance

#### 3.3 Add Endpoints
```typescript
// GET /owner/wallet (with pending/available breakdown)
// GET /owner/wallet/transactions
```

### Phase 4: Refund Logic (Priority: HIGH)

#### 4.1 Cancellation Policy
```typescript
interface CancellationPolicy {
  hoursBeforeStart: number;
  refundPercentage: number;
}

// Default policy from AppSettings:
// - 24+ hours: 100% refund
// - 12-24 hours: 50% refund
// - <12 hours: 0% refund
```

#### 4.2 Refund Flow
1. Calculate refund amount based on policy
2. Deduct from owner wallet (if already credited)
3. Credit to player wallet
4. Create refund transactions
5. Update booking status to CANCELLED

### Phase 5: Withdrawal Confirmation (Priority: MEDIUM)

#### 5.1 Withdrawal States
```typescript
enum WithdrawalStatus {
  PENDING,
  PROCESSING,
  COMPLETED,
  REJECTED
}
```

#### 5.2 Add Endpoints
```typescript
// POST /wallet/withdraw (existing, update)
// GET /wallet/withdrawals
// PATCH /admin/withdrawals/:id/process (admin only)
```

---

## Database Schema Updates

### 1. Wallet Table
```sql
ALTER TABLE "Wallet" 
ADD COLUMN "pendingBalance" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN "availableBalance" DECIMAL(10,2) DEFAULT 0;

-- Migrate existing balance to availableBalance
UPDATE "Wallet" SET "availableBalance" = balance;
```

### 2. Withdrawal Table (if not exists)
```sql
CREATE TABLE "Withdrawal" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletId" UUID NOT NULL REFERENCES "Wallet"(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  method VARCHAR(50) NOT NULL,
  "accountDetails" JSONB,
  "processedAt" TIMESTAMP,
  "processedBy" UUID REFERENCES "User"(id),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

### 3. TopupTransaction Table (optional)
```sql
CREATE TABLE "TopupTransaction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletId" UUID NOT NULL REFERENCES "Wallet"(id),
  amount DECIMAL(10,2) NOT NULL,
  gateway VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  "externalReference" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "completedAt" TIMESTAMP
);
```

---

## API Endpoints Summary

### Player Endpoints

#### GET /wallet
```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "balance": "1000.00",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-03-13T05:00:00Z"
  }
}
```

#### GET /wallet/transactions
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx-uuid",
        "type": "DEPOSIT",
        "amount": "500.00",
        "balanceBefore": "500.00",
        "balanceAfter": "1000.00",
        "description": "Wallet topup",
        "createdAt": "2026-03-13T05:00:00Z"
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

#### POST /wallet/topup/initiate
```json
// Request
{
  "amount": 500,
  "gateway": "WALLET"
}

// Response
{
  "success": true,
  "data": {
    "transactionId": "topup-uuid",
    "amount": "500.00",
    "status": "PENDING",
    "paymentUrl": null // For external gateways
  },
  "message": {
    "en": "Topup initiated successfully",
    "ar": "تم بدء عملية الشحن بنجاح"
  }
}
```

#### POST /wallet/topup/confirm
```json
// Request
{
  "transactionId": "topup-uuid",
  "paymentReference": "ext-ref-123"
}

// Response
{
  "success": true,
  "data": {
    "transactionId": "topup-uuid",
    "amount": "500.00",
    "status": "COMPLETED",
    "newBalance": "1500.00"
  },
  "message": {
    "en": "Topup completed successfully",
    "ar": "تم إتمام عملية الشحن بنجاح"
  }
}
```

### Owner Endpoints

#### GET /owner/wallet
```json
{
  "success": true,
  "data": {
    "id": "wallet-uuid",
    "balance": "5000.00",
    "availableBalance": "4000.00",
    "pendingBalance": "1000.00",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-03-13T05:00:00Z"
  }
}
```

#### GET /owner/wallet/transactions
Same as player transactions

#### POST /wallet/withdraw
```json
// Request
{
  "amount": 1000,
  "method": "BANK_TRANSFER",
  "accountDetails": {
    "bankName": "Bank Name",
    "accountNumber": "1234567890",
    "accountName": "Owner Name"
  }
}

// Response
{
  "success": true,
  "data": {
    "withdrawalId": "withdrawal-uuid",
    "amount": "1000.00",
    "status": "PENDING",
    "estimatedProcessingTime": "1-3 business days"
  },
  "message": {
    "en": "Withdrawal request submitted successfully",
    "ar": "تم تقديم طلب السحب بنجاح"
  }
}
```

#### GET /wallet/withdrawals
```json
{
  "success": true,
  "data": {
    "withdrawals": [
      {
        "id": "withdrawal-uuid",
        "amount": "1000.00",
        "status": "PENDING",
        "method": "BANK_TRANSFER",
        "createdAt": "2026-03-13T05:00:00Z",
        "processedAt": null
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

### Admin Endpoints

#### POST /admin/wallet/topup
```json
// Request
{
  "userId": "user-uuid",
  "amount": 1000,
  "description": "Manual topup for testing"
}

// Response
{
  "success": true,
  "data": {
    "transactionId": "tx-uuid",
    "userId": "user-uuid",
    "amount": "1000.00",
    "newBalance": "2000.00"
  },
  "message": {
    "en": "Wallet topped up successfully",
    "ar": "تم شحن المحفظة بنجاح"
  }
}
```

#### PATCH /admin/withdrawals/:id/process
```json
// Request
{
  "status": "COMPLETED", // or "REJECTED"
  "rejectionReason": "Invalid account details" // if rejected
}

// Response
{
  "success": true,
  "data": {
    "withdrawalId": "withdrawal-uuid",
    "status": "COMPLETED",
    "processedAt": "2026-03-13T05:00:00Z"
  },
  "message": {
    "en": "Withdrawal processed successfully",
    "ar": "تم معالجة طلب السحب بنجاح"
  }
}
```

---

## Money Flow

### Booking Creation & Payment

```
Player creates booking
  ↓
Status: PENDING_PAYMENT (15 min deadline)
  ↓
Player pays from wallet
  ↓
Deduct from player wallet: depositAmount
  ↓
Create transaction: BOOKING_PAYMENT
  ↓
Status: CONFIRMED
  ↓
Calculate commission: totalPrice * commissionRate
  ↓
Net amount: depositAmount - commission
  ↓
Credit owner pendingBalance: netAmount
  ↓
Create transaction: CREDIT
  ↓
Generate QR code
```

### Booking Completion

```
Booking time ends
  ↓
Status: COMPLETED
  ↓
Move from pendingBalance to availableBalance
  ↓
Owner can now withdraw
```

### Booking Cancellation

```
Player cancels booking
  ↓
Check cancellation policy
  ↓
Calculate refund: depositAmount * refundPercentage
  ↓
If owner already credited:
  - Deduct from owner pendingBalance
  ↓
Credit player wallet: refundAmount
  ↓
Create transactions: REFUND
  ↓
Status: CANCELLED
```

---

## Commission Calculation

```typescript
// From AppSettings
const globalCommissionRate = 10; // 10%

// Field can override
const fieldCommissionRate = field.commissionRate || globalCommissionRate;

// Calculate
const commissionAmount = totalPrice * (fieldCommissionRate / 100);
const netAmount = depositAmount - commissionAmount;

// Example:
// totalPrice = 200 EGP
// depositAmount = 40 EGP (20%)
// commissionRate = 10%
// commissionAmount = 200 * 0.10 = 20 EGP
// netAmount = 40 - 20 = 20 EGP (to owner wallet)
// Cash at field = 200 - 40 = 160 EGP
```

---

## Refund Policy

From AppSettings:
- `cancellation_policy_hours`: 24
- `cancellation_refund_percentage`: 100

```typescript
const hoursUntilStart = (scheduledDateTime - now) / (1000 * 60 * 60);

if (hoursUntilStart >= 24) {
  refundPercentage = 100;
} else if (hoursUntilStart >= 12) {
  refundPercentage = 50;
} else {
  refundPercentage = 0;
}

const refundAmount = depositAmount * (refundPercentage / 100);
```

---

## Implementation Priority

1. ✅ **Phase 1**: Admin topup endpoint (for testing)
2. ✅ **Phase 2**: Player booking payment from wallet
3. ⏳ **Phase 3**: Refund logic
4. ⏳ **Phase 4**: Owner pending/available balance
5. ⏳ **Phase 5**: Withdrawal confirmation
6. ⏳ **Phase 6**: External payment gateway integration

---

## Testing Checklist

- [ ] Player can topup wallet (admin endpoint)
- [ ] Player can view wallet balance
- [ ] Player can view transactions
- [ ] Player can create booking and pay from wallet
- [ ] Owner receives credit after booking confirmation
- [ ] Commission is calculated correctly
- [ ] Player can cancel and receive refund
- [ ] Owner balance is deducted on refund
- [ ] Owner can view pending/available balance
- [ ] Owner can request withdrawal
- [ ] Admin can process withdrawal
- [ ] All transactions are recorded correctly
