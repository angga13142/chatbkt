/**
 * Tests for RelevanceFilter
 */

const RelevanceFilter = require('../../../src/middleware/RelevanceFilter');

describe('RelevanceFilter', () => {
  let filter;

  beforeEach(() => {
    filter = new RelevanceFilter();
  });

  describe('isRelevant()', () => {
    describe('should accept shop-related questions', () => {
      test('product-specific questions', () => {
        expect(filter.isRelevant('Berapa harga Netflix?')).toBe(true);
        expect(filter.isRelevant('Netflix bisa dipake berapa device?')).toBe(true);
        expect(filter.isRelevant('Spotify premium fiturnya apa?')).toBe(true);
        expect(filter.isRelevant('VCC itu apa?')).toBe(true);
      });

      test('comparison questions', () => {
        expect(filter.isRelevant('Lebih bagus Netflix atau Disney?')).toBe(true);
        expect(filter.isRelevant('Bedanya VCC Basic dan Premium?')).toBe(true);
        expect(filter.isRelevant('Netflix vs Spotify mending mana?')).toBe(true);
      });

      test('order/payment questions', () => {
        expect(filter.isRelevant('Gimana cara bayarnya?')).toBe(true);
        expect(filter.isRelevant('Bagaimana cara order?')).toBe(true);
        expect(filter.isRelevant('Pembayaran bisa pakai apa?')).toBe(true);
        expect(filter.isRelevant('Cara checkout gimana?')).toBe(true);
      });

      test('availability questions', () => {
        expect(filter.isRelevant('Stok Netflix ada gak?')).toBe(true);
        expect(filter.isRelevant('Produk tersedia?')).toBe(true);
        expect(filter.isRelevant('Ada Spotify premium?')).toBe(true);
      });

      test('general shop questions', () => {
        expect(filter.isRelevant('Apa aja produk yang dijual?')).toBe(true);
        expect(filter.isRelevant('Harga termurah berapa?')).toBe(true);
        expect(filter.isRelevant('Ada garansi gak?')).toBe(true);
      });
    });

    describe('should reject spam/irrelevant', () => {
      test('simple greetings', () => {
        expect(filter.isRelevant('hi')).toBe(false);
        expect(filter.isRelevant('hello')).toBe(false);
        expect(filter.isRelevant('hai')).toBe(false);
        expect(filter.isRelevant('halo')).toBe(false);
      });

      test('single characters', () => {
        expect(filter.isRelevant('a')).toBe(false);
        expect(filter.isRelevant('x')).toBe(false);
        expect(filter.isRelevant('1')).toBe(false);
      });

      test('simple confirmations', () => {
        expect(filter.isRelevant('ok')).toBe(false);
        expect(filter.isRelevant('oke')).toBe(false);
        expect(filter.isRelevant('yes')).toBe(false);
        expect(filter.isRelevant('no')).toBe(false);
      });

      test('test messages', () => {
        expect(filter.isRelevant('test')).toBe(false);
        expect(filter.isRelevant('testing')).toBe(false);
        expect(filter.isRelevant('tes')).toBe(false);
      });

      test('only numbers', () => {
        expect(filter.isRelevant('123')).toBe(false);
        expect(filter.isRelevant('999')).toBe(false);
      });

      test('completely irrelevant questions', () => {
        // These don't contain shop keywords or question patterns
        expect(filter.isRelevant('Random irrelevant text here')).toBe(false);
        expect(filter.isRelevant('Just some words without meaning')).toBe(false);
        expect(filter.isRelevant('Lorem ipsum dolor sit amet')).toBe(false);
      });
    });

    describe('edge cases', () => {
      test('should handle null/undefined', () => {
        expect(filter.isRelevant(null)).toBe(false);
        expect(filter.isRelevant(undefined)).toBe(false);
      });

      test('should handle non-string input', () => {
        expect(filter.isRelevant(123)).toBe(false);
        expect(filter.isRelevant({})).toBe(false);
        expect(filter.isRelevant([])).toBe(false);
      });

      test('should handle empty string', () => {
        expect(filter.isRelevant('')).toBe(false);
        expect(filter.isRelevant('   ')).toBe(false);
      });

      test('should handle very short messages', () => {
        expect(filter.isRelevant('ab')).toBe(false);
      });
    });
  });

  describe('isSpam()', () => {
    test('should detect spam patterns', () => {
      expect(filter.isSpam('hi')).toBe(true);
      expect(filter.isSpam('ok')).toBe(true);
      expect(filter.isSpam('test')).toBe(true);
    });

    test('should not flag valid messages', () => {
      expect(filter.isSpam('netflix price')).toBe(false);
      expect(filter.isSpam('how to order')).toBe(false);
    });
  });

  describe('containsShopKeywords()', () => {
    test('should detect shop keywords', () => {
      expect(filter.containsShopKeywords('netflix')).toBe(true);
      expect(filter.containsShopKeywords('harga spotify')).toBe(true);
      expect(filter.containsShopKeywords('cara order')).toBe(true);
      expect(filter.containsShopKeywords('vcc premium')).toBe(true);
    });

    test('should not detect non-shop words', () => {
      expect(filter.containsShopKeywords('cuaca hari ini')).toBe(false);
      expect(filter.containsShopKeywords('random text')).toBe(false);
    });
  });

  describe('looksLikeQuestion()', () => {
    test('should detect question patterns', () => {
      expect(filter.looksLikeQuestion('apa itu netflix?')).toBe(true);
      expect(filter.looksLikeQuestion('berapa harga?')).toBe(true);
      expect(filter.looksLikeQuestion('gimana cara order?')).toBe(true);
      expect(filter.looksLikeQuestion('bisa bayar pakai dana gak?')).toBe(true);
    });

    test('should not flag statements', () => {
      expect(filter.looksLikeQuestion('saya mau order')).toBe(false);
      expect(filter.looksLikeQuestion('netflix bagus')).toBe(false);
    });
  });

  describe('getRelevanceScore()', () => {
    test('should return 0 for irrelevant messages', () => {
      expect(filter.getRelevanceScore('hi')).toBe(0);
      expect(filter.getRelevanceScore('test')).toBe(0);
    });

    test('should return higher scores for relevant messages', () => {
      const score1 = filter.getRelevanceScore('Berapa harga Netflix?');
      const score2 = filter.getRelevanceScore('Netflix');
      
      expect(score1).toBeGreaterThan(0.5);
      expect(score2).toBeGreaterThan(0);
      expect(score1).toBeGreaterThan(score2); // Question should score higher
    });

    test('should return max 1.0', () => {
      const score = filter.getRelevanceScore('Berapa harga Netflix premium untuk order dan bayar pakai DANA?');
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });
});
