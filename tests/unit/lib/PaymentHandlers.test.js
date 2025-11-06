/**
 * Unit Tests for PaymentHandlers
 * Tests payment processing logic for all payment methods
 */

const PaymentHandlers = require('../../../lib/paymentHandlers');
const PaymentMessages = require('../../../lib/paymentMessages');

// Mock dependencies
jest.mock('../../../lib/paymentMessages');

// Mock payment config (new structure)
jest.mock('../../../src/config/payment.config', () => ({
  getAvailablePayments: jest.fn(() => [
    { id: 'qris', name: 'QRIS (Semua E-Wallet)', emoji: '📱', enabled: true },
    { id: 'dana', name: 'DANA', emoji: '💳', enabled: true },
    { id: 'gopay', name: 'GoPay', emoji: '🟢', enabled: true },
    { id: 'ovo', name: 'OVO', emoji: '🟣', enabled: true },
    { id: 'shopeepay', name: 'ShopeePay', emoji: '🟠', enabled: true },
    { id: 'transfer', name: 'Transfer Bank', emoji: '🏦', enabled: true }
  ]),
  getAvailableBanks: jest.fn(() => [
    { code: 'BCA', name: 'Bank BCA', accountNumber: '1234567890', accountName: 'PT Toko Premium' },
    { code: 'BNI', name: 'Bank BNI', accountNumber: '0987654321', accountName: 'PT Toko Premium' },
    { code: 'BRI', name: 'Bank BRI', accountNumber: '1111222233', accountName: 'PT Toko Premium' },
    { code: 'MANDIRI', name: 'Bank Mandiri', accountNumber: '4444555566', accountName: 'PT Toko Premium' }
  ]),
  getAvailableEWallets: jest.fn(() => [
    { code: 'DANA', name: 'DANA', accountNumber: '081234567890', accountName: 'Toko Premium' },
    { code: 'OVO', name: 'OVO', accountNumber: '081234567892', accountName: 'Toko Premium' },
    { code: 'GOPAY', name: 'GoPay', accountNumber: '081234567891', accountName: 'Toko Premium' },
    { code: 'SHOPEEPAY', name: 'ShopeePay', accountNumber: '081234567893', accountName: 'Toko Premium' }
  ]),
  getBankByCode: jest.fn((code) => {
    const banks = {
      'BCA': { code: 'BCA', name: 'Bank BCA', accountNumber: '1234567890', accountName: 'PT Toko Premium' },
      'BNI': { code: 'BNI', name: 'Bank BNI', accountNumber: '0987654321', accountName: 'PT Toko Premium' },
      'BRI': { code: 'BRI', name: 'Bank BRI', accountNumber: '1111222233', accountName: 'PT Toko Premium' },
      'MANDIRI': { code: 'MANDIRI', name: 'Bank Mandiri', accountNumber: '4444555566', accountName: 'PT Toko Premium' }
    };
    return banks[code.toUpperCase()];
  })
}));

// Mock old config (for backward compatibility)
jest.mock('../../../config', () => ({
  systemSettings: {
    paymentAccounts: {
      dana: { number: '081234567890', name: 'Toko Premium', enabled: true },
      gopay: { number: '081234567891', name: 'Toko Premium', enabled: true },
      ovo: { number: '081234567892', name: 'Toko Premium', enabled: true },
      shopeepay: { number: '081234567893', name: 'Toko Premium', enabled: true },
      bca: { accountNumber: '1234567890', accountName: 'PT Toko Premium', enabled: true },
      bni: { accountNumber: '0987654321', accountName: 'PT Toko Premium', enabled: true },
      bri: { accountNumber: '1111222233', accountName: 'PT Toko Premium', enabled: true },
      mandiri: { accountNumber: '4444555566', accountName: 'PT Toko Premium', enabled: true }
    }
  }
}));

describe('PaymentHandlers', () => {
  let handler;
  let mockXenditService;
  let mockSessionManager;
  let mockLogger;

  const customerId = '628123456789@c.us';
  const orderId = 'ORD-123456';
  const totalIDR = 100000;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock XenditService
    mockXenditService = {
      createQrisPayment: jest.fn().mockResolvedValue({
        invoiceId: 'INV-QRIS-123',
        qrCodePath: '/qris/code.png',
        expiryDate: new Date(Date.now() + 3600000).toISOString()
      }),
      createEWalletPayment: jest.fn().mockResolvedValue({
        invoiceId: 'INV-EWALLET-123',
        checkoutUrl: 'https://checkout.xendit.co/test',
        expiryDate: new Date(Date.now() + 3600000).toISOString()
      }),
      createVirtualAccount: jest.fn().mockResolvedValue({
        invoiceId: 'INV-VA-123',
        accountNumber: '8808012345678901',
        bankCode: 'BCA',
        expiryDate: new Date(Date.now() + 86400000).toISOString()
      }),
      convertToIDR: jest.fn((usd) => usd * 15000)
    };

    // Mock SessionManager
    mockSessionManager = {
      getSession: jest.fn().mockResolvedValue({
        customerId,
        cart: [
          { id: 'netflix', name: 'Netflix', price: 50000 },
          { id: 'spotify', name: 'Spotify', price: 50000 }
        ],
        orderId,
        step: 'select_payment'
      }),
      setPaymentMethod: jest.fn().mockResolvedValue(undefined),
      setStep: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined)
    };

    // Mock Logger
    mockLogger = {
      logPaymentInit: jest.fn(),
      logTransaction: jest.fn(),
      log: jest.fn()
    };

    // Mock PaymentMessages
    PaymentMessages.qrisPayment = jest.fn().mockReturnValue('QRIS payment message');
    PaymentMessages.manualEWalletInstructions = jest.fn().mockReturnValue('E-Wallet instructions');
    PaymentMessages.bankSelection = jest.fn().mockReturnValue('Bank selection menu');
    PaymentMessages.manualBankTransferInstructions = jest.fn().mockReturnValue('Bank transfer instructions');
    PaymentMessages.paymentError = jest.fn().mockReturnValue('Payment error message');
    PaymentMessages.invalidBankChoice = jest.fn().mockReturnValue('Invalid bank choice');
    
    // Mock dynamic payment method helpers
    PaymentMessages.getPaymentMethodByIndex = jest.fn((index) => {
      const methods = [
        { id: 'qris', name: 'QRIS (Semua E-Wallet)', emoji: '📱' },
        { id: 'dana', name: 'DANA', emoji: '💳' },
        { id: 'gopay', name: 'GoPay', emoji: '🟢' },
        { id: 'ovo', name: 'OVO', emoji: '🟣' },
        { id: 'shopeepay', name: 'ShopeePay', emoji: '🟠' },
        { id: 'transfer', name: 'Transfer Bank', emoji: '🏦' }
      ];
      
      // Support both numeric index and keyword
      const numIndex = parseInt(index);
      if (!isNaN(numIndex)) {
        return methods[numIndex - 1] || null;
      }
      
      // Support keywords (qris, dana, gopay, etc.)
      const keyword = index.toString().toLowerCase();
      
      // Special cases: bank/transfer → transfer
      if (keyword === 'bank' || keyword === 'transfer') {
        return methods.find(m => m.id === 'transfer') || null;
      }
      
      return methods.find(m => m.id === keyword) || null;
    });
    
    PaymentMessages.getPaymentMethodCount = jest.fn().mockReturnValue(6);
    PaymentMessages.getBankByIndex = jest.fn((index) => {
      const banks = [
        { code: 'BCA', name: 'Bank BCA', accountNumber: '1234567890', accountName: 'PT Toko Premium' },
        { code: 'BNI', name: 'Bank BNI', accountNumber: '0987654321', accountName: 'PT Toko Premium' },
        { code: 'BRI', name: 'Bank BRI', accountNumber: '1111222233', accountName: 'PT Toko Premium' },
        { code: 'MANDIRI', name: 'Bank Mandiri', accountNumber: '4444555566', accountName: 'PT Toko Premium' }
      ];
      
      // Support both numeric index and keyword
      const numIndex = parseInt(index);
      if (!isNaN(numIndex)) {
        return banks[numIndex - 1] || null;
      }
      
      // Support keywords (bca, bni, etc.)
      const keyword = index.toString().toUpperCase();
      return banks.find(b => b.code === keyword) || null;
    });
    PaymentMessages.getBankCount = jest.fn().mockReturnValue(4);

    // Create handler instance
    handler = new PaymentHandlers(mockXenditService, mockSessionManager, mockLogger);
  });

  describe('Constructor', () => {
    test('should initialize with required dependencies', () => {
      expect(handler.xenditService).toBe(mockXenditService);
      expect(handler.sessionManager).toBe(mockSessionManager);
      expect(handler.logger).toBe(mockLogger);
    });

    test('should work without logger', () => {
      const handlerWithoutLogger = new PaymentHandlers(mockXenditService, mockSessionManager);
      expect(handlerWithoutLogger.logger).toBeNull();
    });
  });

  describe('handlePaymentSelection()', () => {
    test('should handle QRIS payment selection with "1"', async () => {
      const result = await handler.handlePaymentSelection(customerId, '1');

      expect(mockXenditService.createQrisPayment).toHaveBeenCalledWith(
        totalIDR,
        orderId,
        { phone: customerId }
      );
      expect(result.qrisData).toEqual({ qrCodePath: '/qris/code.png' });
    });

    test('should handle QRIS payment selection with "qris"', async () => {
      await handler.handlePaymentSelection(customerId, 'qris');

      expect(mockXenditService.createQrisPayment).toHaveBeenCalled();
    });

    test('should handle DANA payment selection', async () => {
      const result = await handler.handlePaymentSelection(customerId, '2');

      expect(PaymentMessages.manualEWalletInstructions).toHaveBeenCalledWith(
        'DANA',
        '081234567890',
        'Toko Premium',
        totalIDR,
        orderId
      );
      expect(result.qrisData).toBeNull();
    });

    test('should handle DANA payment with keyword "dana"', async () => {
      await handler.handlePaymentSelection(customerId, 'dana');

      expect(PaymentMessages.manualEWalletInstructions).toHaveBeenCalled();
    });

    test('should handle GoPay payment selection', async () => {
      await handler.handlePaymentSelection(customerId, '3');

      expect(PaymentMessages.manualEWalletInstructions).toHaveBeenCalledWith(
        'GOPAY',
        expect.any(String),
        expect.any(String),
        totalIDR,
        orderId
      );
    });

    test('should handle GoPay with keyword "gopay"', async () => {
      await handler.handlePaymentSelection(customerId, 'gopay');

      expect(PaymentMessages.manualEWalletInstructions).toHaveBeenCalled();
    });

    test('should handle OVO payment selection', async () => {
      await handler.handlePaymentSelection(customerId, '4');

      expect(PaymentMessages.manualEWalletInstructions).toHaveBeenCalledWith(
        'OVO',
        expect.any(String),
        expect.any(String),
        totalIDR,
        orderId
      );
    });

    test('should handle OVO with keyword "ovo"', async () => {
      await handler.handlePaymentSelection(customerId, 'ovo');

      expect(PaymentMessages.manualEWalletInstructions).toHaveBeenCalled();
    });

    test('should handle ShopeePay payment selection', async () => {
      await handler.handlePaymentSelection(customerId, '5');

      expect(PaymentMessages.manualEWalletInstructions).toHaveBeenCalledWith(
        'SHOPEEPAY',
        expect.any(String),
        expect.any(String),
        totalIDR,
        orderId
      );
    });

    test('should handle ShopeePay with keyword "shopeepay"', async () => {
      await handler.handlePaymentSelection(customerId, 'shopeepay');

      expect(PaymentMessages.manualEWalletInstructions).toHaveBeenCalled();
    });

    test('should handle bank transfer selection with "6"', async () => {
      await handler.handlePaymentSelection(customerId, '6');

      expect(mockSessionManager.setStep).toHaveBeenCalledWith(customerId, 'select_bank');
      expect(PaymentMessages.bankSelection).toHaveBeenCalled();
    });

    test('should handle bank transfer with keyword "bank"', async () => {
      await handler.handlePaymentSelection(customerId, 'bank');

      expect(mockSessionManager.setStep).toHaveBeenCalledWith(customerId, 'select_bank');
    });

    test('should handle bank transfer with keyword "transfer"', async () => {
      await handler.handlePaymentSelection(customerId, 'transfer');

      expect(mockSessionManager.setStep).toHaveBeenCalledWith(customerId, 'select_bank');
    });

    test('should return error for invalid payment choice', async () => {
      const result = await handler.handlePaymentSelection(customerId, '99');

      expect(result.message).toContain('tidak valid');
      expect(result.qrisData).toBeNull();
    });

    test('should handle payment creation errors gracefully', async () => {
      mockXenditService.createQrisPayment.mockRejectedValue(new Error('API Error'));

      const result = await handler.handlePaymentSelection(customerId, '1');

      expect(PaymentMessages.paymentError).toHaveBeenCalled();
      expect(result.qrisData).toBeNull();
    });
  });

  describe('handleQRISPayment()', () => {
    test('should create QRIS payment successfully', async () => {
      const result = await handler.handleQRISPayment(customerId, orderId, totalIDR);

      expect(mockXenditService.createQrisPayment).toHaveBeenCalledWith(
        totalIDR,
        orderId,
        { phone: customerId }
      );
      expect(result.qrisData).toEqual({ qrCodePath: '/qris/code.png' });
    });

    test('should set payment method to QRIS', async () => {
      await handler.handleQRISPayment(customerId, orderId, totalIDR);

      expect(mockSessionManager.setPaymentMethod).toHaveBeenCalledWith(
        customerId,
        'QRIS',
        'INV-QRIS-123'
      );
    });

    test('should set step to awaiting_payment', async () => {
      await handler.handleQRISPayment(customerId, orderId, totalIDR);

      expect(mockSessionManager.setStep).toHaveBeenCalledWith(customerId, 'awaiting_payment');
    });

    test('should log payment initiation', async () => {
      await handler.handleQRISPayment(customerId, orderId, totalIDR);

      expect(mockLogger.logPaymentInit).toHaveBeenCalledWith(
        customerId,
        orderId,
        'QRIS',
        totalIDR,
        'INV-QRIS-123'
      );
    });

    test('should not log if logger is null', async () => {
      const handlerWithoutLogger = new PaymentHandlers(mockXenditService, mockSessionManager, null);

      await handlerWithoutLogger.handleQRISPayment(customerId, orderId, totalIDR);

      // Should not throw error
      expect(mockLogger.logPaymentInit).not.toHaveBeenCalled();
    });

    test('should return correct message format', async () => {
      PaymentMessages.qrisPayment.mockReturnValue('QRIS: Scan QR Code');

      const result = await handler.handleQRISPayment(customerId, orderId, totalIDR);

      expect(result.message).toBe('QRIS: Scan QR Code');
      expect(PaymentMessages.qrisPayment).toHaveBeenCalledWith(orderId, totalIDR);
    });
  });

  describe('handleEWalletPayment()', () => {
    test('should handle DANA payment successfully', async () => {
      const result = await handler.handleEWalletPayment(customerId, orderId, totalIDR, 'DANA');

      expect(result.message).toBeDefined();
      expect(result.qrisData).toBeNull();
    });

    test('should set step to awaiting_admin_approval', async () => {
      await handler.handleEWalletPayment(customerId, orderId, totalIDR, 'DANA');

      expect(mockSessionManager.setStep).toHaveBeenCalledWith(customerId, 'awaiting_admin_approval');
    });

    test('should update session with payment metadata', async () => {
      const session = await mockSessionManager.getSession(customerId);

      await handler.handleEWalletPayment(customerId, orderId, totalIDR, 'DANA');

      expect(session.paymentMethod).toBe('dana');
      expect(session.paymentAccount).toBe('081234567890');
      expect(session.paymentStatus).toBe('awaiting_proof');
      expect(session.paymentInitiatedAt).toBeDefined();
    });

    test('should log transaction details', async () => {
      await handler.handleEWalletPayment(customerId, orderId, totalIDR, 'GOPAY');

      expect(mockLogger.logTransaction).toHaveBeenCalledWith(
        customerId,
        'payment_manual_initiated',
        orderId,
        expect.objectContaining({
          method: 'gopay',
          amount: totalIDR,
          paymentType: 'manual_ewallet'
        })
      );
    });

    test('should handle disabled payment method', async () => {
      const { systemSettings } = require('../../../config');
      systemSettings.paymentAccounts.dana.enabled = false;

      const result = await handler.handleEWalletPayment(customerId, orderId, totalIDR, 'DANA');

      expect(result.message).toContain('tidak tersedia');
      expect(result.qrisData).toBeNull();

      // Restore
      systemSettings.paymentAccounts.dana.enabled = true;
    });

    test('should handle missing payment account', async () => {
      const result = await handler.handleEWalletPayment(customerId, orderId, totalIDR, 'LINKAJA');

      expect(result.message).toContain('tidak tersedia');
    });

    test('should include payment metadata with timestamp', async () => {
      const session = await mockSessionManager.getSession(customerId);

      await handler.handleEWalletPayment(customerId, orderId, totalIDR, 'OVO');

      expect(session.paymentMetadata).toMatchObject({
        type: 'manual_ewallet',
        provider: 'ovo',
        amount: totalIDR,
        orderId: orderId
      });
      expect(session.paymentMetadata.initiatedAt).toBeDefined();
    });

    test('should call PaymentMessages with correct parameters', async () => {
      await handler.handleEWalletPayment(customerId, orderId, totalIDR, 'SHOPEEPAY');

      expect(PaymentMessages.manualEWalletInstructions).toHaveBeenCalledWith(
        'SHOPEEPAY',
        '081234567893',
        'Toko Premium',
        totalIDR,
        orderId
      );
    });
  });

  describe('handleBankSelection()', () => {
    test('should set step to select_bank', () => {
      handler.handleBankSelection(customerId, orderId, totalIDR);

      expect(mockSessionManager.setStep).toHaveBeenCalledWith(customerId, 'select_bank');
    });

    test('should return bank selection message', () => {
      const result = handler.handleBankSelection(customerId, orderId, totalIDR);

      expect(PaymentMessages.bankSelection).toHaveBeenCalledWith(orderId, totalIDR);
      expect(result.qrisData).toBeNull();
    });

    test('should return correct response format', () => {
      const result = handler.handleBankSelection(customerId, orderId, totalIDR);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('qrisData');
    });
  });

  describe('handleBankChoice()', () => {
    test('should handle BCA selection with number 1', async () => {
      const result = await handler.handleBankChoice(customerId, '1');

      expect(PaymentMessages.manualBankTransferInstructions).toHaveBeenCalled();
    });

    test('should handle BCA selection with keyword "bca"', async () => {
      await handler.handleBankChoice(customerId, 'bca');

      expect(PaymentMessages.manualBankTransferInstructions).toHaveBeenCalled();
    });

    test('should handle BNI selection', async () => {
      await handler.handleBankChoice(customerId, '2');

      expect(PaymentMessages.manualBankTransferInstructions).toHaveBeenCalled();
    });

    test('should handle BRI selection', async () => {
      await handler.handleBankChoice(customerId, '3');

      expect(PaymentMessages.manualBankTransferInstructions).toHaveBeenCalled();
    });

    test('should handle MANDIRI selection', async () => {
      await handler.handleBankChoice(customerId, '4');

      expect(PaymentMessages.manualBankTransferInstructions).toHaveBeenCalled();
    });

    test('should handle bank keyword case-insensitive', async () => {
      await handler.handleBankChoice(customerId, 'BCA');
      await handler.handleBankChoice(customerId, 'Bni');
      await handler.handleBankChoice(customerId, 'MANDIRI');

      expect(PaymentMessages.manualBankTransferInstructions).toHaveBeenCalledTimes(3);
    });

    test('should return error for invalid bank choice', async () => {
      const result = await handler.handleBankChoice(customerId, '99');

      expect(PaymentMessages.invalidBankChoice).toHaveBeenCalled();
      expect(result.qrisData).toBeNull();
    });

    test('should handle disabled bank', async () => {
      const { systemSettings } = require('../../../config');
      systemSettings.paymentAccounts.bca.enabled = false;

      await handler.handleBankChoice(customerId, '1');

      // Restore
      systemSettings.paymentAccounts.bca.enabled = true;
    });

    test('should update session with bank payment metadata', async () => {
      const session = await mockSessionManager.getSession(customerId);

      await handler.handleBankChoice(customerId, 'bca');

      expect(session.paymentMethod).toBe('bank_bca');
      expect(session.paymentAccount).toBe('1234567890');
      expect(session.paymentStatus).toBe('awaiting_proof');
    });

    test('should convert USD to IDR correctly', async () => {
      mockSessionManager.getSession.mockResolvedValue({
        customerId,
        cart: [{ id: 'netflix', name: 'Netflix', price: 10 }], // $10
        orderId
      });

      await handler.handleBankChoice(customerId, 'bca');

      expect(mockXenditService.convertToIDR).toHaveBeenCalledWith(10);
    });

    test('should log bank transfer transaction', async () => {
      await handler.handleBankChoice(customerId, 'bni');

      expect(mockLogger.logTransaction).toHaveBeenCalledWith(
        customerId,
        'payment_manual_initiated',
        orderId,
        expect.objectContaining({
          method: 'bank_bni',
          bankCode: 'BNI',
          paymentType: 'manual_bank_transfer'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle Xendit API errors', async () => {
      mockXenditService.createQrisPayment.mockRejectedValue(new Error('Xendit API failed'));

      const result = await handler.handlePaymentSelection(customerId, '1');

      expect(result.message).toBeDefined();
      expect(PaymentMessages.paymentError).toHaveBeenCalled();
    });

    test('should handle session manager errors', async () => {
      mockSessionManager.getSession.mockRejectedValue(new Error('Session not found'));

      await expect(handler.handlePaymentSelection(customerId, '1')).rejects.toThrow();
    });

    test('should handle missing cart data', async () => {
      mockSessionManager.getSession.mockResolvedValue({
        customerId,
        cart: [],
        orderId
      });

      const result = await handler.handlePaymentSelection(customerId, '1');

      expect(result).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete QRIS flow', async () => {
      await handler.handlePaymentSelection(customerId, 'qris');

      expect(mockXenditService.createQrisPayment).toHaveBeenCalled();
      expect(mockSessionManager.setPaymentMethod).toHaveBeenCalled();
      expect(mockSessionManager.setStep).toHaveBeenCalledWith(customerId, 'awaiting_payment');
      expect(mockLogger.logPaymentInit).toHaveBeenCalled();
    });

    test('should handle complete E-Wallet flow', async () => {
      await handler.handlePaymentSelection(customerId, 'dana');

      expect(mockSessionManager.setStep).toHaveBeenCalledWith(customerId, 'awaiting_admin_approval');
      expect(mockLogger.logTransaction).toHaveBeenCalled();
    });

    test('should handle complete Bank Transfer flow', async () => {
      // First select bank transfer
      await handler.handlePaymentSelection(customerId, 'bank');
      expect(mockSessionManager.setStep).toHaveBeenCalledWith(customerId, 'select_bank');

      // Then select specific bank
      await handler.handleBankChoice(customerId, 'bca');
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero amount', async () => {
      mockSessionManager.getSession.mockResolvedValue({
        customerId,
        cart: [{ id: 'free', name: 'Free', price: 0 }],
        orderId
      });

      await handler.handlePaymentSelection(customerId, 'qris');

      expect(mockXenditService.createQrisPayment).toHaveBeenCalledWith(0, orderId, expect.any(Object));
    });

    test('should handle very large amount', async () => {
      mockSessionManager.getSession.mockResolvedValue({
        customerId,
        cart: [{ id: 'premium', name: 'Premium Bundle', price: 10000000 }],
        orderId
      });

      const result = await handler.handlePaymentSelection(customerId, 'qris');

      expect(result).toBeDefined();
    });

    test('should handle special characters in customer ID', async () => {
      const specialId = '62-812-3456-7890@c.us';

      await handler.handleQRISPayment(specialId, orderId, totalIDR);

      expect(mockXenditService.createQrisPayment).toHaveBeenCalledWith(
        totalIDR,
        orderId,
        { phone: specialId }
      );
    });

    test('should handle concurrent payment attempts', async () => {
      const promises = [
        handler.handlePaymentSelection(customerId, 'qris'),
        handler.handlePaymentSelection(customerId, 'dana'),
        handler.handlePaymentSelection(customerId, 'gopay')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('qrisData');
      });
    });
  });
});
