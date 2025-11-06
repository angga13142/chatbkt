# Dynamic Payment Menu Implementation

**Date:** November 6, 2025  
**Status:** ✅ Complete  
**Commit:** (pending)

## Objective

Auto-hide payment methods without credentials from payment menu based on .env configuration.

## Changes Made

### 1. Enhanced Payment Config (`src/config/payment.config.js`)

**Before:** Static enabled flags, defaulting to `true`
**After:** Dynamic detection requiring BOTH `enabled=true` AND credentials

```javascript
// OLD
enabled: process.env.DANA_ENABLED !== "false";

// NEW
enabled: process.env.DANA_ENABLED === "true" && !!process.env.DANA_NUMBER;
```

**New Methods:**

- `getAvailablePayments()` - Returns only enabled payment methods
- `getAvailableBanks()` - Returns only enabled banks
- Xendit enabled check based on `XENDIT_SECRET_KEY`

### 2. Dynamic Payment Menu (`lib/paymentMessages.js`)

**Before:** Hardcoded 6 payment options (1-6)
**After:** Dynamic menu based on .env configuration

```javascript
// Generates menu dynamically
paymentMethodSelection(orderId) {
  const available = paymentConfig.getAvailablePayments();
  // Builds menu with 1, 2, 3... based on available only
}
```

**New Helper Methods:**

- `getPaymentMethodByIndex(index)` - Get payment by user input
- `getBankByIndex(index)` - Get bank by user input
- `getPaymentMethodCount()` - Total available payments
- `getBankCount()` - Total available banks

### 3. Dynamic Payment Handler (`lib/paymentHandlers.js`)

**Before:** Switch case with hardcoded numbers 1-6
**After:** Dynamic routing based on payment method ID

```javascript
// OLD
case "1": return handleQRISPayment();
case "2": return handleEWalletPayment("DANA");

// NEW
const paymentMethod = PaymentMessages.getPaymentMethodByIndex(choice);
switch (paymentMethod.id) {
  case "qris": return handleQRISPayment();
  case "dana": return handleEWalletPayment("DANA");
}
```

**Benefits:**

- Validates against actual available count
- Error message shows correct range (1-2, 1-3, etc.)
- No hardcoded bank mappings

### 4. Tests

**Updated:**

- `tests/unit/lib/PaymentMessages.test.js` - Dynamic bank test

**New:**

- `tests/unit/lib/DynamicPayment.test.js` - 13 comprehensive tests
  - Payment config validation
  - Dynamic menu generation
  - Edge cases (missing env, invalid index)

## Current Configuration (.env)

Based on `.env` file:

✅ **Enabled:**

- QRIS (Xendit configured)
- DANA (credentials provided)
- GOPAY (credentials provided)

❌ **Disabled (no credentials):**

- OVO
- ShopeePay
- All banks (BCA, BNI, BRI, Mandiri)

## User Experience

### Before

```
💳 PILIH METODE PEMBAYARAN

1️⃣ QRIS
2️⃣ DANA
3️⃣ GoPay
4️⃣ OVO          ← Not configured!
5️⃣ ShopeePay    ← Not configured!
6️⃣ Transfer Bank ← No banks configured!

Ketik nomor 1-6
```

### After

```
💳 PILIH METODE PEMBAYARAN

1️⃣ 📱 QRIS - Universal QR
2️⃣ 💳 Dana - E-Wallet DANA
3️⃣ 💳 Gopay - E-Wallet GOPAY

Ketik nomor 1-3  ← Dynamic range!
```

## Technical Details

### Payment Detection Logic

1. **QRIS:** Enabled if `XENDIT_SECRET_KEY` exists
2. **E-Wallets:** Enabled if `{WALLET}_ENABLED=true` AND `{WALLET}_NUMBER` exists
3. **Banks:** Enabled if `{BANK}_ENABLED=true` AND `{BANK}_ACCOUNT` exists

### Example Scenarios

**Scenario 1: Only QRIS**

```env
XENDIT_SECRET_KEY=xnd_...
DANA_ENABLED=false
```

Result: Shows only 1 payment option (QRIS)

**Scenario 2: No Payment Methods**

```env
# All empty or false
```

Result: Shows "PAYMENT NOT CONFIGURED" message

**Scenario 3: All Enabled**

```env
XENDIT_SECRET_KEY=xnd_...
DANA_ENABLED=true
DANA_NUMBER=08123...
GOPAY_ENABLED=true
GOPAY_NUMBER=08123...
BCA_ENABLED=true
BCA_ACCOUNT=12345...
```

Result: Shows QRIS + DANA + GOPAY + Transfer Bank (1-4)

## Files Modified

| File                                     | Lines Changed | Status   |
| ---------------------------------------- | ------------- | -------- |
| `src/config/payment.config.js`           | +63           | Enhanced |
| `lib/paymentMessages.js`                 | +50           | Updated  |
| `lib/paymentHandlers.js`                 | +30           | Updated  |
| `tests/unit/lib/PaymentMessages.test.js` | -4            | Fixed    |
| `tests/unit/lib/DynamicPayment.test.js`  | +127          | NEW      |

## Testing Results

✅ **13 new tests passing**

- Payment config validation (5 tests)
- Dynamic menu generation (5 tests)
- Edge cases (3 tests)

✅ **All existing tests passing**

- 0 lint errors
- No breaking changes

## Migration Guide

### For Developers

**No code changes needed!** Payment handlers automatically adapt.

### For Deployment

1. Check `.env` file
2. Set `{METHOD}_ENABLED=true` for desired methods
3. Provide credentials (`{METHOD}_NUMBER` or `{BANK}_ACCOUNT`)
4. Restart bot
5. Test with `/checkout`

### Example .env Setup

```env
# Enable QRIS
XENDIT_SECRET_KEY=xnd_production_...

# Enable DANA
DANA_ENABLED=true
DANA_NUMBER=081234567890
DANA_NAME=My Shop

# Disable OVO (no credentials)
OVO_ENABLED=false

# Enable BCA
BCA_ENABLED=true
BCA_ACCOUNT=1234567890
BCA_NAME=PT My Company
```

## Benefits

✅ **Auto-adaptive:** Menu changes with .env
✅ **User-friendly:** No disabled options shown
✅ **Admin-friendly:** Just edit .env, no code needed
✅ **Production-ready:** Error handling for missing config
✅ **Tested:** 13 comprehensive tests

## Future Enhancements

- [ ] Admin command to check enabled payments (`/payments`)
- [ ] Auto-detect payment method availability
- [ ] Cache payment config (no need, already fast)
- [ ] Payment method icons from config

## Notes

- Config is loaded at startup (restart needed after .env changes)
- Payment method order: QRIS, E-Wallets (alpha), Banks
- Bank selection only shown if at least 1 bank enabled
- Invalid selection shows dynamic error (e.g., "1-3" not "1-6")
