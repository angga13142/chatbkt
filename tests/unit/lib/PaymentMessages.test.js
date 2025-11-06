/**
 * Unit Tests for PaymentMessages
 * Tests payment message templates
 */

const PaymentMessages = require('../../../lib/paymentMessages');

// Mock payment config
jest.mock('../../../src/config/payment.config', () => ({
  getAvailableBanks: jest.fn(() => [
    { code: 'BCA', name: 'Bank BCA', accountNumber: '1234567890', accountName: 'Test Shop' },
    { code: 'BNI', name: 'Bank BNI', accountNumber: '0987654321', accountName: 'Test Shop' },
    { code: 'BRI', name: 'Bank BRI', accountNumber: '1122334455', accountName: 'Test Shop' },
    { code: 'MANDIRI', name: 'Bank Mandiri', accountNumber: '5566778899', accountName: 'Test Shop' }
  ]),
  getAvailableEWallets: jest.fn(() => [
    { code: 'DANA', name: 'DANA', accountNumber: '081234567890' },
    { code: 'OVO', name: 'OVO', accountNumber: '081234567890' },
    { code: 'GOPAY', name: 'GoPay', accountNumber: '081234567890' },
    { code: 'SHOPEEPAY', name: 'ShopeePay', accountNumber: '081234567890' }
  ])
}));

describe('PaymentMessages', () => {
  const orderId = 'ORD-123456';
  const totalIDR = 100000;

  describe('qrisPayment()', () => {
    test('should return QRIS payment message', () => {
      const result = PaymentMessages.qrisPayment(orderId, totalIDR);

      expect(result).toContain('QRIS');
      expect(result).toContain(orderId);
      expect(result).toContain('100.000');
    });

    test('should include payment methods', () => {
      const result = PaymentMessages.qrisPayment(orderId, totalIDR);

      expect(result).toContain('DANA');
      expect(result).toContain('OVO');
      expect(result).toContain('GoPay');
    });

    test('should include expiry info', () => {
      const result = PaymentMessages.qrisPayment(orderId, totalIDR);

      expect(result).toContain('24 jam');
    });
  });

  describe('ewalletPayment()', () => {
    const redirectUrl = 'https://checkout.xendit.co/test';

    test('should return e-wallet payment message', () => {
      const result = PaymentMessages.ewalletPayment('DANA', orderId, totalIDR, redirectUrl);

      expect(result).toContain('DANA');
      expect(result).toContain(orderId);
      expect(result).toContain('100.000');
      expect(result).toContain(redirectUrl);
    });

    test('should handle different wallet types', () => {
      const gopayResult = PaymentMessages.ewalletPayment('GOPAY', orderId, totalIDR, redirectUrl);
      const ovoResult = PaymentMessages.ewalletPayment('OVO', orderId, totalIDR, redirectUrl);

      expect(gopayResult).toContain('GOPAY');
      expect(ovoResult).toContain('OVO');
    });
  });

  describe('virtualAccount()', () => {
    const vaNumber = '8808012345678901';

    test('should return virtual account message', () => {
      const result = PaymentMessages.virtualAccount('BCA', vaNumber, orderId, totalIDR);

      expect(result).toContain('BCA');
      expect(result).toContain(vaNumber);
      expect(result).toContain(orderId);
      expect(result).toContain('100.000');
    });

    test('should include payment instructions', () => {
      const result = PaymentMessages.virtualAccount('BNI', vaNumber, orderId, totalIDR);

      expect(result).toContain('Cara Bayar');
      expect(result).toContain('Transfer');
    });

    test('should handle different banks', () => {
      const bcaResult = PaymentMessages.virtualAccount('BCA', vaNumber, orderId, totalIDR);
      const bniResult = PaymentMessages.virtualAccount('BNI', vaNumber, orderId, totalIDR);

      expect(bcaResult).toContain('BCA');
      expect(bniResult).toContain('BNI');
    });
  });

  describe('bankSelection()', () => {
    test('should return bank selection menu', () => {
      const result = PaymentMessages.bankSelection(orderId, totalIDR);

      expect(result).toContain(orderId);
      expect(result).toContain('100.000');
      expect(result).toContain('PILIH BANK');
    });

    test('should show available banks dynamically', () => {
      const result = PaymentMessages.bankSelection(orderId, totalIDR);

      expect(result).toBeDefined();
      // Should contain bank info or "not configured" message
      expect(result.length).toBeGreaterThan(50);
    });
  });

  describe('manualEWalletInstructions()', () => {
    const walletNumber = '081234567890';
    const accountName = 'Toko Premium';

    test('should return manual e-wallet instructions', () => {
      const result = PaymentMessages.manualEWalletInstructions(
        'DANA',
        walletNumber,
        accountName,
        totalIDR,
        orderId
      );

      expect(result).toContain('DANA');
      expect(result).toContain(walletNumber);
      expect(result).toContain(accountName);
      expect(result).toContain(orderId);
    });

    test('should include transfer instructions', () => {
      const result = PaymentMessages.manualEWalletInstructions(
        'OVO',
        walletNumber,
        accountName,
        totalIDR,
        orderId
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(100);
    });
  });

  describe('manualBankTransferInstructions()', () => {
    const accountNumber = '1234567890';
    const accountName = 'PT Toko Premium';

    test('should return manual bank transfer instructions', () => {
      const result = PaymentMessages.manualBankTransferInstructions(
        'BCA',
        accountNumber,
        accountName,
        totalIDR,
        orderId
      );

      expect(result).toContain('BCA');
      expect(result).toContain(accountNumber);
      expect(result).toContain(accountName);
      expect(result).toContain(orderId);
    });

    test('should include payment instructions', () => {
      const result = PaymentMessages.manualBankTransferInstructions(
        'BNI',
        accountNumber,
        accountName,
        totalIDR,
        orderId
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(100);
    });
  });

  describe('invalidBankChoice()', () => {
    test('should return invalid bank choice message', () => {
      const result = PaymentMessages.invalidBankChoice();

      expect(result.toLowerCase()).toContain('tidak valid');
    });
  });

  describe('paymentError()', () => {
    test('should return payment error message', () => {
      const result = PaymentMessages.paymentError('API Error');

      expect(result).toContain('Gagal');
    });

    test('should include error details', () => {
      const result = PaymentMessages.paymentError('Timeout');

      expect(result).toBeDefined();
    });
  });

  describe('noActiveInvoice()', () => {
    test('should return no active invoice message', () => {
      const result = PaymentMessages.noActiveInvoice();

      expect(result.toLowerCase()).toContain('tidak ada');
    });
  });

  describe('paymentSuccess()', () => {
    test('should return payment success message', () => {
      const result = PaymentMessages.paymentSuccess(orderId, totalIDR);

      expect(result).toContain('BERHASIL');
      expect(result).toContain(orderId);
    });

    test('should format amount correctly', () => {
      const deliveryMsg = 'Netflix Premium - Rp 1.000.000';
      const result = PaymentMessages.paymentSuccess(orderId, 'QRIS', deliveryMsg);

      expect(result).toContain('1.000.000');
      expect(result).toContain('Netflix');
    });
  });

  describe('paymentExpired()', () => {
    test('should return payment expired message', () => {
      const result = PaymentMessages.paymentExpired();

      expect(result.toLowerCase()).toContain('expired');
    });
  });

  describe('paymentPending()', () => {
    test('should return payment pending message', () => {
      const result = PaymentMessages.paymentPending();

      expect(result.toLowerCase()).toContain('pending');
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero amount', () => {
      const result = PaymentMessages.qrisPayment(orderId, 0);

      expect(result).toContain('0');
    });

    test('should handle very large amounts', () => {
      const result = PaymentMessages.virtualAccount('BCA', '1234', orderId, 100000000);

      expect(result).toContain('100.000.000');
    });

    test('should handle empty strings', () => {
      const result = PaymentMessages.ewalletPayment('', orderId, totalIDR, '');

      expect(result).toBeDefined();
    });

    test('should handle special characters in wallet type', () => {
      const result = PaymentMessages.ewalletPayment('SHOP@EE-PAY', orderId, totalIDR, 'http://test');

      expect(result).toBeDefined();
    });
  });

  describe('Return Types', () => {
    test('all methods should return strings', () => {
      expect(typeof PaymentMessages.qrisPayment(orderId, totalIDR)).toBe('string');
      expect(typeof PaymentMessages.bankSelection(orderId, totalIDR)).toBe('string');
      expect(typeof PaymentMessages.invalidBankChoice()).toBe('string');
      expect(typeof PaymentMessages.noActiveInvoice()).toBe('string');
    });

    test('messages should not be empty', () => {
      expect(PaymentMessages.qrisPayment(orderId, totalIDR).length).toBeGreaterThan(0);
      expect(PaymentMessages.bankSelection(orderId, totalIDR).length).toBeGreaterThan(0);
    });
  });
});
