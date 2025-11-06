/**
 * Tests for AIFallbackHandler
 */

const AIFallbackHandler = require('../../../src/handlers/AIFallbackHandler');

// Mock dependencies
jest.mock('../../../src/services/ai/AIService');
jest.mock('../../../src/middleware/RelevanceFilter');
jest.mock('../../../src/services/ai/AIIntentClassifier');
jest.mock('../../../src/services/ai/AIPromptBuilder');

const AIService = require('../../../src/services/ai/AIService');
const RelevanceFilter = require('../../../src/middleware/RelevanceFilter');
const AIIntentClassifier = require('../../../src/services/ai/AIIntentClassifier');
const AIPromptBuilder = require('../../../src/services/ai/AIPromptBuilder');

describe('AIFallbackHandler', () => {
  let handler;
  let mockAIService;
  let mockRelevanceFilter;
  let mockIntentClassifier;
  let mockPromptBuilder;
  let mockLogger;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    // Setup mock AIService
    mockAIService = {
      isEnabled: jest.fn().mockReturnValue(true),
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, limit: 5 }),
      generateText: jest.fn().mockResolvedValue({
        success: true,
        text: 'AI generated response',
      }),
    };
    AIService.mockImplementation(() => mockAIService);

    // Setup mock RelevanceFilter
    mockRelevanceFilter = {
      isRelevant: jest.fn().mockReturnValue(true),
      getRelevanceScore: jest.fn().mockReturnValue(0.8),
    };
    RelevanceFilter.mockImplementation(() => mockRelevanceFilter);

    // Setup mock IntentClassifier
    mockIntentClassifier = {
      classify: jest.fn().mockReturnValue('product_qa'),
    };
    AIIntentClassifier.mockImplementation(() => mockIntentClassifier);

    // Setup mock PromptBuilder
    mockPromptBuilder = {
      buildPrompt: jest.fn().mockReturnValue('Generated prompt'),
    };
    AIPromptBuilder.mockImplementation(() => mockPromptBuilder);

    // Create handler
    handler = new AIFallbackHandler(null, mockLogger);
  });

  describe('constructor', () => {
    test('should initialize all dependencies', () => {
      expect(handler.aiService).toBeDefined();
      expect(handler.relevanceFilter).toBeDefined();
      expect(handler.intentClassifier).toBeDefined();
      expect(handler.promptBuilder).toBeDefined();
    });
  });

  describe('handle()', () => {
    test('should return null if AI is disabled', async () => {
      mockAIService.isEnabled.mockReturnValue(false);
      
      const result = await handler.handle('customer@c.us', 'test message');
      
      expect(result).toBeNull();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('AI disabled'));
    });

    test('should return null if message is not relevant', async () => {
      mockRelevanceFilter.isRelevant.mockReturnValue(false);
      
      const result = await handler.handle('customer@c.us', 'hi');
      
      expect(result).toBeNull();
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('not relevant'));
    });

    test('should return rate limit message if exceeded', async () => {
      mockAIService.checkRateLimit.mockResolvedValue({
        allowed: false,
        limit: 5,
        resetIn: 120000, // 2 minutes
      });
      
      const result = await handler.handle('customer@c.us', 'What is Netflix?');
      
      expect(result).toContain('Rate Limit');
      expect(result).toContain('2 menit');
    });

    test('should classify intent and build prompt', async () => {
      await handler.handle('customer@c.us', 'Apa itu Netflix?');
      
      expect(mockIntentClassifier.classify).toHaveBeenCalledWith('Apa itu Netflix?');
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith('product_qa', 'Apa itu Netflix?');
    });

    test('should call AI service with prompt', async () => {
      await handler.handle('customer@c.us', 'Test question');
      
      expect(mockAIService.generateText).toHaveBeenCalledWith(
        'Generated prompt',
        expect.objectContaining({
          maxTokens: 200,
          temperature: 0.3,
        })
      );
    });

    test('should return formatted AI response on success', async () => {
      const result = await handler.handle('customer@c.us', 'What is Netflix?');
      
      expect(result).toContain('🤖');
      expect(result).toContain('AI Assistant');
      expect(result).toContain('AI generated response');
      expect(result).toContain('belanja');
    });

    test('should return fallback message if AI fails', async () => {
      mockAIService.generateText.mockResolvedValue({
        success: false,
        error: 'API error',
      });
      
      const result = await handler.handle('customer@c.us', 'Test question');
      
      expect(result).toContain('Perintah Tidak Dikenali');
      expect(result).toContain('menu');
    });

    test('should handle exceptions gracefully', async () => {
      mockAIService.generateText.mockRejectedValue(new Error('Network error'));
      
      const result = await handler.handle('customer@c.us', 'Test question');
      
      expect(result).toContain('Perintah Tidak Dikenali');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('formatResponse()', () => {
    test('should add AI indicator', () => {
      const result = handler.formatResponse('Test response', 'product_qa');
      
      expect(result).toContain('🤖');
      expect(result).toContain('AI Assistant');
      expect(result).toContain('Test response');
    });

    test('should add product commands for product_qa intent', () => {
      const result = handler.formatResponse('Response', 'product_qa');
      
      expect(result).toContain('belanja');
    });

    test('should add order commands for order_help intent', () => {
      const result = handler.formatResponse('Response', 'order_help');
      
      expect(result).toContain('menu');
    });

    test('should always include help command', () => {
      const result = handler.formatResponse('Response', 'general_info');
      
      expect(result).toContain('help');
    });
  });

  describe('getRateLimitMessage()', () => {
    test('should format rate limit message correctly', () => {
      const rateLimitCheck = {
        allowed: false,
        limit: 5,
        resetIn: 180000, // 3 minutes
      };
      
      const result = handler.getRateLimitMessage(rateLimitCheck);
      
      expect(result).toContain('Rate Limit');
      expect(result).toContain('5 pertanyaan/jam');
      expect(result).toContain('3 menit');
    });
  });

  describe('getFallbackMessage()', () => {
    test('should return default fallback message', () => {
      const result = handler.getFallbackMessage();
      
      expect(result).toContain('Perintah Tidak Dikenali');
      expect(result).toContain('menu');
      expect(result).toContain('belanja');
      expect(result).toContain('help');
    });
  });

  describe('maskCustomerId()', () => {
    test('should mask customer ID for privacy', () => {
      const result = handler.maskCustomerId('1234567890@c.us');
      
      expect(result).toContain('1234');
      expect(result).toContain('***');
      expect(result).not.toContain('567890');
    });

    test('should handle short IDs', () => {
      const result = handler.maskCustomerId('123@c.us');
      
      // Short IDs still get masked
      expect(result).toContain('***');
      expect(result).toContain('c.us');
    });

    test('should handle null/undefined', () => {
      expect(handler.maskCustomerId(null)).toBe('***@c.us');
      expect(handler.maskCustomerId(undefined)).toBe('***@c.us');
    });
  });

  describe('getRelevanceScore()', () => {
    test('should return relevance score from filter', () => {
      mockRelevanceFilter.getRelevanceScore.mockReturnValue(0.75);
      
      const score = handler.getRelevanceScore('Test message');
      
      expect(score).toBe(0.75);
      expect(mockRelevanceFilter.getRelevanceScore).toHaveBeenCalledWith('Test message');
    });
  });
});
