/**
 * Tests for AIIntentClassifier
 */

const AIIntentClassifier = require('../../../../src/services/ai/AIIntentClassifier');

describe('AIIntentClassifier', () => {
  let classifier;

  beforeEach(() => {
    classifier = new AIIntentClassifier();
  });

  describe('classify()', () => {
    test('should classify product comparisons', () => {
      expect(classifier.classify('Lebih bagus Netflix atau Disney?')).toBe('comparison');
      expect(classifier.classify('Bedanya Netflix dan Spotify?')).toBe('comparison');
      expect(classifier.classify('VCC Basic vs Premium mending mana?')).toBe('comparison');
      expect(classifier.classify('Pilih Spotify atau YouTube?')).toBe('comparison');
    });

    test('should classify feature questions', () => {
      expect(classifier.classify('Netflix fiturnya apa?')).toBe('features');
      expect(classifier.classify('Cara pakai VCC gimana?')).toBe('features');
      expect(classifier.classify('Spotify bisa apa aja?')).toBe('features');
      expect(classifier.classify('Netflix bisa berapa device?')).toBe('features');
    });

    test('should classify product questions', () => {
      expect(classifier.classify('Apa itu VCC?')).toBe('product_qa');
      expect(classifier.classify('Netflix recommended gak?')).toBe('product_qa');
      expect(classifier.classify('Penjelasan tentang Spotify?')).toBe('product_qa');
    });

    test('should classify pricing questions', () => {
      expect(classifier.classify('Berapa harga Netflix?')).toBe('pricing');
      expect(classifier.classify('Harga termurah berapa?')).toBe('pricing');
      expect(classifier.classify('Ada diskon gak?')).toBe('pricing');
      expect(classifier.classify('Spotify mahal gak?')).toBe('pricing');
    });

    test('should classify availability questions', () => {
      expect(classifier.classify('Stok Netflix ada?')).toBe('availability');
      expect(classifier.classify('Spotify ready gak?')).toBe('availability');
      expect(classifier.classify('VCC masih tersedia?')).toBe('availability');
    });

    test('should classify order help', () => {
      expect(classifier.classify('Cara order gimana?')).toBe('order_help');
      expect(classifier.classify('Bagaimana cara bayar?')).toBe('order_help');
      expect(classifier.classify('Pembayaran pakai apa?')).toBe('order_help');
      expect(classifier.classify('Proses order bagaimana?')).toBe('order_help');
    });

    test('should classify troubleshooting', () => {
      expect(classifier.classify('Netflix gak bisa login')).toBe('troubleshoot');
      expect(classifier.classify('Error pas checkout')).toBe('troubleshoot');
      expect(classifier.classify('Ada masalah dengan pesanan')).toBe('troubleshoot');
      expect(classifier.classify('Mau komplain')).toBe('troubleshoot');
    });

    test('should default to general_info for unclear intents', () => {
      expect(classifier.classify('Halo')).toBe('general_info');
      expect(classifier.classify('Info toko')).toBe('general_info');
      expect(classifier.classify('Tentang kalian')).toBe('general_info');
    });

    test('should handle edge cases', () => {
      expect(classifier.classify(null)).toBe('general_info');
      expect(classifier.classify(undefined)).toBe('general_info');
      expect(classifier.classify('')).toBe('general_info');
      expect(classifier.classify(123)).toBe('general_info');
    });
  });

  describe('isComparison()', () => {
    test('should detect comparison patterns', () => {
      expect(classifier.isComparison('netflix vs spotify')).toBe(true);
      expect(classifier.isComparison('lebih bagus mana')).toBe(true);
      expect(classifier.isComparison('bandingkan netflix dan disney')).toBe(true);
    });

    test('should not flag non-comparisons', () => {
      expect(classifier.isComparison('saya mau netflix')).toBe(false);
      expect(classifier.isComparison('harga spotify')).toBe(false);
    });
  });

  describe('isFeaturesQuestion()', () => {
    test('should detect feature questions', () => {
      expect(classifier.isFeaturesQuestion('fitur netflix apa?')).toBe(true);
      expect(classifier.isFeaturesQuestion('cara pakai vcc')).toBe(true);
      expect(classifier.isFeaturesQuestion('bisa apa aja')).toBe(true);
    });

    test('should not flag non-feature questions', () => {
      expect(classifier.isFeaturesQuestion('harga netflix')).toBe(false);
    });
  });

  describe('isProductQuestion()', () => {
    test('should detect product questions with product mention', () => {
      expect(classifier.isProductQuestion('apa itu netflix')).toBe(true);
      expect(classifier.isProductQuestion('penjelasan spotify')).toBe(true);
    });

    test('should require product mention', () => {
      expect(classifier.isProductQuestion('apa itu')).toBe(false);
      expect(classifier.isProductQuestion('penjelasan')).toBe(false);
    });
  });

  describe('getIntents()', () => {
    test('should return all intent constants', () => {
      const intents = classifier.getIntents();
      expect(intents).toHaveProperty('PRODUCT_QA');
      expect(intents).toHaveProperty('COMPARISON');
      expect(intents).toHaveProperty('PRICING');
      expect(intents).toHaveProperty('AVAILABILITY');
      expect(intents).toHaveProperty('ORDER_HELP');
      expect(intents).toHaveProperty('TROUBLESHOOT');
      expect(intents).toHaveProperty('GENERAL_INFO');
    });
  });
});
