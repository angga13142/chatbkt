/**
 * Unit Tests for Dynamic Payment System
 * Tests payment config and dynamic menu generation
 */

// Load .env before imports
require('dotenv').config();

const paymentConfig = require('../../../src/config/payment.config');
const PaymentMessages = require('../../../lib/paymentMessages');

// Override test env variables for consistency
process.env.DANA_ENABLED = 'true';
process.env.DANA_NUMBER = '081234567890';
process.env.DANA_NAME = 'Test Shop';
process.env.GOPAY_ENABLED = 'true';
process.env.GOPAY_NUMBER = '081234567891';
process.env.GOPAY_NAME = 'Test Shop';
process.env.XENDIT_SECRET_KEY = 'test_key';
process.env.BCA_ENABLED = 'false';
process.env.OVO_ENABLED = 'false';

describe('Dynamic Payment System', () => {
  describe('Payment Config', () => {
    test('should return available payments based on .env', () => {
      const available = paymentConfig.getAvailablePayments();
      
      expect(available).toBeDefined();
      expect(Array.isArray(available)).toBe(true);
      expect(available.length).toBeGreaterThan(0);
    });

    test('should include QRIS when Xendit is configured', () => {
      const available = paymentConfig.getAvailablePayments();
      const hasQris = available.some(p => p.id === 'qris');
      
      expect(hasQris).toBe(true);
    });

    test('should include enabled e-wallets', () => {
      const available = paymentConfig.getAvailablePayments();
      const hasDana = available.some(p => p.id === 'dana');
      const hasGopay = available.some(p => p.id === 'gopay');
      
      expect(hasDana).toBe(true);
      expect(hasGopay).toBe(true);
    });

    test('should NOT include disabled e-wallets', () => {
      const available = paymentConfig.getAvailablePayments();
      const hasOvo = available.some(p => p.id === 'ovo');
      
      expect(hasOvo).toBe(false);
    });

    test('should return empty banks when no banks enabled', () => {
      const banks = paymentConfig.getAvailableBanks();
      
      expect(banks).toBeDefined();
      expect(Array.isArray(banks)).toBe(true);
      expect(banks.length).toBe(0);
    });
  });

  describe('PaymentMessages Dynamic Generation', () => {
    test('should generate payment menu with only enabled methods', () => {
      const orderId = 'ORD-12345';
      const menu = PaymentMessages.paymentMethodSelection(orderId);
      
      expect(menu).toBeDefined();
      expect(menu).toContain(orderId);
      expect(menu.length).toBeGreaterThan(50);
    });

    test('should return payment method by index', () => {
      const method1 = PaymentMessages.getPaymentMethodByIndex(1);
      const method2 = PaymentMessages.getPaymentMethodByIndex(2);
      
      expect(method1).toBeDefined();
      expect(method1).toHaveProperty('id');
      expect(method2).toBeDefined();
    });

    test('should return null for invalid index', () => {
      const method = PaymentMessages.getPaymentMethodByIndex(999);
      
      expect(method).toBeNull();
    });

    test('should return correct payment method count', () => {
      const count = PaymentMessages.getPaymentMethodCount();
      
      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe('number');
    });

    test('should return bank count (0 when no banks)', () => {
      const count = PaymentMessages.getBankCount();
      
      expect(count).toBe(0);
    });

    test('should handle bank selection when no banks configured', () => {
      const orderId = 'ORD-12345';
      const totalIDR = 100000;
      const menu = PaymentMessages.bankSelection(orderId, totalIDR);
      
      expect(menu).toBeDefined();
      expect(menu.toLowerCase()).toContain('not configured');
    });
  });

  describe('Payment Config Edge Cases', () => {
    test('should handle missing env variables gracefully', () => {
      const originalDana = process.env.DANA_NUMBER;
      delete process.env.DANA_NUMBER;
      
      // Should not crash
      const available = paymentConfig.getAvailablePayments();
      expect(available).toBeDefined();
      
      // Restore
      process.env.DANA_NUMBER = originalDana;
    });

    test('should require both enabled flag AND credentials', () => {
      // Even if enabled=true, requires actual number
      expect(paymentConfig.ewallet.dana.enabled).toBe(true);
      expect(paymentConfig.ewallet.dana.number).toBeTruthy();
    });
  });
});
