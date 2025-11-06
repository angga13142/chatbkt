/**
 * Tests for AIPromptBuilder
 */

const AIPromptBuilder = require('../../../../src/services/ai/AIPromptBuilder');

describe('AIPromptBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new AIPromptBuilder();
  });

  describe('constructor', () => {
    test('should initialize with shop context', () => {
      expect(builder.shopContext).toBeDefined();
      expect(builder.shopContext.shopName).toBe('Premium Shop');
      expect(builder.shopContext.products).toBeInstanceOf(Array);
      expect(builder.shopContext.paymentMethods).toBeInstanceOf(Array);
    });
  });

  describe('buildShopContext()', () => {
    test('should build complete shop context', () => {
      const context = builder.buildShopContext();
      
      expect(context).toHaveProperty('shopName');
      expect(context).toHaveProperty('description');
      expect(context).toHaveProperty('products');
      expect(context).toHaveProperty('paymentMethods');
      expect(context).toHaveProperty('policies');
    });

    test('should include policies', () => {
      const context = builder.shopContext;
      
      expect(context.policies).toHaveProperty('refund');
      expect(context.policies).toHaveProperty('guarantee');
      expect(context.policies).toHaveProperty('support');
      expect(context.policies).toHaveProperty('delivery');
    });
  });

  describe('buildPrompt()', () => {
    test('should build complete prompt with all sections', () => {
      const prompt = builder.buildPrompt('product_qa', 'Apa itu Netflix?');
      
      expect(prompt).toContain('Premium Shop');
      expect(prompt).toContain('User Question');
      expect(prompt).toContain('Apa itu Netflix?');
      expect(prompt).toContain('Response Guidelines');
    });

    test('should include intent-specific context', () => {
      const prompt = builder.buildPrompt('comparison', 'Netflix vs Spotify?');
      
      expect(prompt.toLowerCase()).toContain('comparison');
      expect(prompt.toLowerCase()).toContain('compare');
    });

    test('should handle all intent types', () => {
      const intents = [
        'product_qa',
        'features',
        'comparison',
        'pricing',
        'availability',
        'order_help',
        'troubleshoot',
        'general_info'
      ];

      intents.forEach(intent => {
        const prompt = builder.buildPrompt(intent, 'Test question');
        expect(prompt).toBeTruthy();
        expect(prompt.length).toBeGreaterThan(100);
      });
    });
  });

  describe('getBasePrompt()', () => {
    test('should include shop information', () => {
      const basePrompt = builder.getBasePrompt();
      
      expect(basePrompt).toContain('Premium Shop');
      expect(basePrompt).toContain('Products:');
      expect(basePrompt).toContain('Payment Methods:');
      expect(basePrompt).toContain('Shop Policies:');
    });

    test('should list products', () => {
      const basePrompt = builder.getBasePrompt().toLowerCase();
      
      // Should contain at least one product (case-insensitive)
      expect(
        basePrompt.includes('netflix') || 
        basePrompt.includes('spotify') ||
        basePrompt.includes('vcc') ||
        basePrompt.includes('premium')
      ).toBe(true);
    });
  });

  describe('getIntentPrompt()', () => {
    test('should return specific prompt for each intent', () => {
      const productPrompt = builder.getIntentPrompt('product_qa');
      const comparisonPrompt = builder.getIntentPrompt('comparison');
      
      expect(productPrompt).not.toBe(comparisonPrompt);
      expect(productPrompt.toLowerCase()).toContain('product');
      expect(comparisonPrompt.toLowerCase()).toContain('compare');
    });

    test('should fallback to general_info for unknown intent', () => {
      const prompt = builder.getIntentPrompt('unknown_intent');
      const generalPrompt = builder.getIntentPrompt('general_info');
      
      expect(prompt).toBe(generalPrompt);
    });
  });

  describe('getGuidelines()', () => {
    test('should return response guidelines', () => {
      const guidelines = builder.getGuidelines();
      
      expect(guidelines).toContain('Bahasa Indonesia');
      expect(guidelines).toContain('concise');
      expect(guidelines).toContain('DO NOT');
    });
  });

  describe('buildSimplePrompt()', () => {
    test('should build concise prompt', () => {
      const simplePrompt = builder.buildSimplePrompt('Test question');
      
      expect(simplePrompt).toContain('Test question');
      expect(simplePrompt).toContain('Bahasa Indonesia');
      expect(simplePrompt.length).toBeLessThan(500); // Should be shorter than full prompt
    });

    test('should be shorter than full prompt', () => {
      const fullPrompt = builder.buildPrompt('product_qa', 'Test');
      const simplePrompt = builder.buildSimplePrompt('Test');
      
      expect(simplePrompt.length).toBeLessThan(fullPrompt.length);
    });
  });
});
