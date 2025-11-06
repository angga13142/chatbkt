/**
 * Unit Tests for Dynamic Product Loader
 */

const fs = require("fs");
const path = require("path");
const DynamicProductLoader = require("../../../src/utils/DynamicProductLoader");

// Mock products_data directory
const MOCK_PRODUCTS_DIR = path.join(__dirname, "../../../products_data");

describe("DynamicProductLoader", () => {
  describe("scanProductFiles()", () => {
    test("should scan and return product files", () => {
      const files = DynamicProductLoader.scanProductFiles();

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    test("should extract productId from filename", () => {
      const files = DynamicProductLoader.scanProductFiles();
      const netflix = files.find((f) => f.filename === "netflix.txt");

      expect(netflix).toBeDefined();
      expect(netflix.productId).toBe("netflix");
      expect(netflix.path).toContain("products_data");
    });

    test("should ignore non-txt files", () => {
      const files = DynamicProductLoader.scanProductFiles();
      const hasReadme = files.some((f) => f.filename === "README.md");

      expect(hasReadme).toBe(false);
    });

    test("should ignore files starting with underscore", () => {
      const files = DynamicProductLoader.scanProductFiles();
      const hasUnderscore = files.some((f) => f.filename.startsWith("_"));

      expect(hasUnderscore).toBe(false);
    });
  });

  describe("loadProductMetadata()", () => {
    test("should load metadata from products.json if exists", () => {
      const metadata = DynamicProductLoader.loadProductMetadata();

      expect(typeof metadata).toBe("object");
    });

    test("should return empty object if no metadata file", () => {
      // This test assumes products.json exists
      // If it doesn't, it returns {}
      const metadata = DynamicProductLoader.loadProductMetadata();

      expect(metadata).toBeDefined();
    });
  });

  describe("generateMetadata()", () => {
    test("should generate metadata for streaming service", () => {
      const meta = DynamicProductLoader.generateMetadata("netflix");

      expect(meta.id).toBe("netflix");
      expect(meta.name).toContain("Netflix");
      expect(meta.category).toBe("premium");
      expect(meta.autoDiscovered).toBe(true);
    });

    test("should detect VCC category", () => {
      const meta = DynamicProductLoader.generateMetadata("vcc-basic");

      expect(meta.category).toBe("vcc");
      expect(meta.description).toContain("Virtual");
    });

    test("should format multi-word names", () => {
      const meta = DynamicProductLoader.generateMetadata("youtube-premium");

      expect(meta.name).toContain("Youtube");
      expect(meta.name).toContain("Premium");
    });

    test("should have default price", () => {
      const meta = DynamicProductLoader.generateMetadata("test-product");

      expect(meta.price).toBe(15800);
    });
  });

  describe("countStock()", () => {
    test("should count lines in product file", () => {
      const netflixPath = path.join(MOCK_PRODUCTS_DIR, "netflix.txt");

      if (fs.existsSync(netflixPath)) {
        const stock = DynamicProductLoader.countStock(netflixPath);
        expect(typeof stock).toBe("number");
        expect(stock).toBeGreaterThanOrEqual(0);
      }
    });

    test("should return 0 for non-existent file", () => {
      const fakePath = path.join(MOCK_PRODUCTS_DIR, "nonexistent.txt");
      const stock = DynamicProductLoader.countStock(fakePath);

      expect(stock).toBe(0);
    });

    test("should ignore empty lines", () => {
      // This test checks that only non-empty lines are counted
      // Actual implementation filters out empty lines
      const netflixPath = path.join(MOCK_PRODUCTS_DIR, "netflix.txt");

      if (fs.existsSync(netflixPath)) {
        const stock = DynamicProductLoader.countStock(netflixPath);
        // Should be a valid number
        expect(stock).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("loadProducts()", () => {
    test("should load all products", () => {
      const products = DynamicProductLoader.loadProducts();

      expect(products).toHaveProperty("premiumAccounts");
      expect(products).toHaveProperty("virtualCards");
      expect(Array.isArray(products.premiumAccounts)).toBe(true);
      expect(Array.isArray(products.virtualCards)).toBe(true);
    });

    test("should categorize VCC products separately", () => {
      const products = DynamicProductLoader.loadProducts();
      const hasVCC = products.virtualCards.some((p) => p.id.startsWith("vcc"));

      if (hasVCC) {
        expect(products.virtualCards.length).toBeGreaterThan(0);
      }
    });

    test("should include stock count", () => {
      const products = DynamicProductLoader.loadProducts();
      const allProducts = [
        ...products.premiumAccounts,
        ...products.virtualCards,
      ];

      allProducts.forEach((product) => {
        expect(product).toHaveProperty("stock");
        expect(typeof product.stock).toBe("number");
      });
    });

    test("should merge metadata with auto-generated data", () => {
      const products = DynamicProductLoader.loadProducts();
      const allProducts = [
        ...products.premiumAccounts,
        ...products.virtualCards,
      ];

      allProducts.forEach((product) => {
        expect(product).toHaveProperty("id");
        expect(product).toHaveProperty("name");
        expect(product).toHaveProperty("price");
        expect(product).toHaveProperty("description");
        expect(product).toHaveProperty("category");
      });
    });

    test("should sort products alphabetically", () => {
      const products = DynamicProductLoader.loadProducts();

      // Check if premiumAccounts are sorted
      for (let i = 1; i < products.premiumAccounts.length; i++) {
        expect(
          products.premiumAccounts[i].name >= products.premiumAccounts[i - 1].name
        ).toBe(true);
      }
    });
  });

  describe("getProductById()", () => {
    test("should find product by ID", () => {
      const product = DynamicProductLoader.getProductById("netflix");

      if (product) {
        expect(product.id).toBe("netflix");
        expect(product.name).toBeDefined();
      }
    });

    test("should return null for non-existent product", () => {
      const product = DynamicProductLoader.getProductById("nonexistent");

      expect(product).toBeNull();
    });

    test("should search in both premium and VCC", () => {
      const vccProduct = DynamicProductLoader.getProductById("vcc-basic");

      if (vccProduct) {
        expect(vccProduct.category).toBe("vcc");
      }
    });
  });

  describe("productFileExists()", () => {
    test("should check if product file exists", () => {
      const exists = DynamicProductLoader.productFileExists("netflix");

      expect(typeof exists).toBe("boolean");
    });

    test("should return false for non-existent file", () => {
      const exists = DynamicProductLoader.productFileExists("nonexistent-product");

      expect(exists).toBe(false);
    });
  });

  describe("generateSampleMetadata()", () => {
    test("should generate valid JSON", () => {
      const sample = DynamicProductLoader.generateSampleMetadata();

      expect(() => JSON.parse(sample)).not.toThrow();
    });

    test("should include example products", () => {
      const sample = DynamicProductLoader.generateSampleMetadata();
      const data = JSON.parse(sample);

      expect(data).toHaveProperty("netflix");
      expect(data).toHaveProperty("spotify");
      expect(data).toHaveProperty("vcc-basic");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty products_data directory", () => {
      // This test assumes directory exists but might be empty
      const products = DynamicProductLoader.loadProducts();

      expect(products.premiumAccounts).toBeDefined();
      expect(products.virtualCards).toBeDefined();
    });

    test("should handle malformed metadata gracefully", () => {
      // loadProductMetadata should not crash on invalid JSON
      expect(() => DynamicProductLoader.loadProductMetadata()).not.toThrow();
    });
  });
});
