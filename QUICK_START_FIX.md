# Quick Fix - basePrice Issue

## Problem
Flutter shows "—" instead of price because `field.basePrice` is null

## Solution (3 Commands)

```bash
# 1. Run migration
npx prisma migrate dev --name add_base_price_to_field

# 2. Update existing fields (choose one):
# Option A: Set 300 EGP for all fields
npx prisma db execute --file update-existing-fields.sql

# Option B: Or run SQL manually in your DB client:
# UPDATE "Field" SET "basePrice" = 300.00 WHERE "basePrice" IS NULL;

# 3. Restart server
npm run start:dev
```

## Flutter App
1. Logout & Login (or Hot Restart)
2. Pull to refresh home page
3. Open field details
4. Price should show: "400 EGP/hr" ✅

## Test
```powershell
.\test-fields-with-auth.ps1
```

Look for: `"basePrice": "400.00"` in response
