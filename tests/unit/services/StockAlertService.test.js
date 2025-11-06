/**
 * Unit Tests for StockAlertService
 */

const StockAlertService = require('../../../src/services/alerts/StockAlertService');
const DynamicProductLoader = require('../../../src/services/utils/DynamicProductLoader');

// Mock DynamicProductLoader
jest.mock('../../../src/utils/DynamicProductLoader');

describe('StockAlertService', () => {
  let service;
  let mockClient;
  let mockAdminNumbers;

  beforeEach(() => {
    mockClient = {
      sendMessage: jest.fn().mockResolvedValue(true)
    };
    mockAdminNumbers = ['628xxx@c.us', '628yyy@c.us'];
    service = new StockAlertService(mockClient, mockAdminNumbers);

    // Mock product data
    DynamicProductLoader.loadProducts.mockReturnValue({
      premiumAccounts: [
        { id: 'netflix', name: 'Netflix Premium', stock: 10, price: 15800, category: 'premium' },
        { id: 'spotify', name: 'Spotify Premium', stock: 3, price: 15800, category: 'premium' },
        { id: 'youtube', name: 'YouTube Premium', stock: 0, price: 15800, category: 'premium' }
      ],
      virtualCards: [
        { id: 'vcc-basic', name: 'VCC Basic', stock: 2, price: 15800, category: 'vcc' }
      ]
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor()', () => {
    test('should initialize with default values', () => {
      const s = new StockAlertService();
      expect(s.lowStockThreshold).toBe(5);
      expect(s.adminNumbers).toEqual([]);
    });

    test('should filter empty admin numbers', () => {
      const s = new StockAlertService(null, ['628xxx@c.us', '', null, '628yyy@c.us']);
      expect(s.adminNumbers).toHaveLength(2);
    });

    test('should respect LOW_STOCK_THRESHOLD env var', () => {
      process.env.LOW_STOCK_THRESHOLD = '10';
      const s = new StockAlertService();
      expect(s.lowStockThreshold).toBe(10);
      delete process.env.LOW_STOCK_THRESHOLD;
    });
  });

  describe('getProductsWithStock()', () => {
    test('should return all products with stock info', () => {
      const products = service.getProductsWithStock();
      expect(products).toHaveLength(4);
      expect(products[0]).toHaveProperty('id');
      expect(products[0]).toHaveProperty('name');
      expect(products[0]).toHaveProperty('stock');
    });

    test('should handle loader errors gracefully', () => {
      DynamicProductLoader.loadProducts.mockImplementation(() => {
        throw new Error('Loader error');
      });
      const products = service.getProductsWithStock();
      expect(products).toEqual([]);
    });
  });

  describe('getLowStockProducts()', () => {
    test('should return products with stock <= threshold', () => {
      const lowStock = service.getLowStockProducts();
      expect(lowStock).toHaveLength(2); // spotify(3), vcc-basic(2)
      expect(lowStock.every(p => p.stock > 0 && p.stock <= 5)).toBe(true);
    });

    test('should exclude out of stock products', () => {
      const lowStock = service.getLowStockProducts();
      expect(lowStock.every(p => p.stock > 0)).toBe(true);
    });

    test('should accept custom threshold', () => {
      const lowStock = service.getLowStockProducts(2);
      expect(lowStock).toHaveLength(1); // Only vcc-basic(2)
    });
  });

  describe('getOutOfStockProducts()', () => {
    test('should return products with stock = 0', () => {
      const outOfStock = service.getOutOfStockProducts();
      expect(outOfStock).toHaveLength(1); // youtube(0)
      expect(outOfStock[0].stock).toBe(0);
    });
  });

  describe('formatStockAlertMessage()', () => {
    test('should format message with low stock products', () => {
      const lowStock = [{ name: 'Spotify', stock: 3, price: 15800 }];
      const outOfStock = [];
      const message = service.formatStockAlertMessage(lowStock, outOfStock);
      
      expect(message).toContain('Daily Stock Report');
      expect(message).toContain('Low Stock');
      expect(message).toContain('Spotify');
    });

    test('should format message with out of stock products', () => {
      const lowStock = [];
      const outOfStock = [{ name: 'YouTube', stock: 0, price: 15800 }];
      const message = service.formatStockAlertMessage(lowStock, outOfStock);
      
      expect(message).toContain('Out of Stock');
      expect(message).toContain('YouTube');
    });

    test('should show all clear message when no alerts', () => {
      const message = service.formatStockAlertMessage([], []);
      expect(message).toContain('Semua Produk Stock Aman');
    });

    test('should include summary statistics', () => {
      const message = service.formatStockAlertMessage([], []);
      expect(message).toContain('Summary');
      expect(message).toContain('Total Products');
      expect(message).toContain('Total Stock');
    });

    test('should include recommended actions', () => {
      const lowStock = [{ name: 'Spotify', stock: 3, price: 15800 }];
      const outOfStock = [{ name: 'YouTube', stock: 0, price: 15800 }];
      const message = service.formatStockAlertMessage(lowStock, outOfStock);
      
      expect(message).toContain('Recommended Actions');
      expect(message).toContain('Restock');
    });
  });

  describe('sendStockAlert()', () => {
    test('should not send if no alerts and not forced', async () => {
      DynamicProductLoader.loadProducts.mockReturnValue({
        premiumAccounts: [
          { id: 'netflix', name: 'Netflix', stock: 10, price: 15800, category: 'premium' }
        ],
        virtualCards: []
      });

      const result = await service.sendStockAlert(false);
      expect(result.sent).toBe(false);
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });

    test('should send if forced even without alerts', async () => {
      DynamicProductLoader.loadProducts.mockReturnValue({
        premiumAccounts: [
          { id: 'netflix', name: 'Netflix', stock: 10, price: 15800, category: 'premium' }
        ],
        virtualCards: []
      });

      const result = await service.sendStockAlert(true);
      expect(result.sent).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(2);
    });

    test('should send to all admin numbers', async () => {
      const result = await service.sendStockAlert(true);
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(2);
      expect(result.sent).toBe(true);
    });

    test('should handle client not available', async () => {
      service.setClient(null);
      const result = await service.sendStockAlert(true);
      expect(result.success).toBe(false);
      expect(result.message).toContain('not available');
    });

    test('should handle send failures gracefully', async () => {
      mockClient.sendMessage.mockRejectedValueOnce(new Error('Send failed'));
      const result = await service.sendStockAlert(true);
      expect(result.success).toBe(true); // Overall success
      expect(result.results[0].success).toBe(false);
    });
  });

  describe('getStockReport()', () => {
    test('should return formatted stock report', () => {
      const report = service.getStockReport();
      expect(report).toContain('Inventory Stock Report');
      expect(report).toContain('Premium Accounts');
      expect(report).toContain('Virtual Cards');
    });

    test('should group products by category', () => {
      const report = service.getStockReport();
      expect(report).toContain('Premium Accounts');
      expect(report).toContain('Virtual Cards');
    });

    test('should show stock status emojis', () => {
      const report = service.getStockReport();
      expect(report).toMatch(/[✅❌🔴🟠]/); // Contains status emojis
    });
  });

  describe('setClient()', () => {
    test('should update client', () => {
      const newClient = { sendMessage: jest.fn() };
      service.setClient(newClient);
      expect(service.client).toBe(newClient);
    });
  });

  describe('setAdminNumbers()', () => {
    test('should update admin numbers', () => {
      service.setAdminNumbers(['628zzz@c.us']);
      expect(service.adminNumbers).toEqual(['628zzz@c.us']);
    });

    test('should filter empty values', () => {
      service.setAdminNumbers(['628xxx@c.us', '', null, '628yyy@c.us']);
      expect(service.adminNumbers).toHaveLength(2);
    });
  });
});
