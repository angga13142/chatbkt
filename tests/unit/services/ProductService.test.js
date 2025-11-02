/**
 * Unit tests for ProductService
 */

const { expect } = require("chai");
const ProductService = require("../../../src/services/product/ProductService");

describe("ProductService", () => {
  let productService;

  beforeEach(() => {
    productService = new ProductService();
  });

  describe("getAllProducts", () => {
    it("should return all products with categories", () => {
      const products = productService.getAllProducts();
      expect(products).to.be.an("array");
      expect(products.length).to.be.greaterThan(0);
      products.forEach((product) => {
        expect(product).to.have.property("id");
        expect(product).to.have.property("name");
        expect(product).to.have.property("price");
        expect(product).to.have.property("categoryLabel");
      });
    });

    it("should include premium accounts", () => {
      const products = productService.getAllProducts();
      const premiumAccounts = products.filter(
        (p) => p.categoryLabel === "Premium Accounts"
      );
      expect(premiumAccounts.length).to.be.greaterThan(0);
    });

    it("should include virtual cards", () => {
      const products = productService.getAllProducts();
      const virtualCards = products.filter(
        (p) => p.categoryLabel === "Virtual Cards"
      );
      expect(virtualCards.length).to.be.greaterThan(0);
    });
  });

  describe("getProductById", () => {
    it("should return product for valid ID", () => {
      const products = productService.getAllProducts();
      const firstProduct = products[0];
      const product = productService.getProductById(firstProduct.id);
      expect(product).to.exist;
      expect(product.id).to.equal(firstProduct.id);
    });

    it("should return null for invalid ID", () => {
      const product = productService.getProductById("invalid-id-12345");
      expect(product).to.be.null;
    });

    it("should handle null input", () => {
      const product = productService.getProductById(null);
      expect(product).to.be.null;
    });

    it("should handle undefined input", () => {
      const product = productService.getProductById(undefined);
      expect(product).to.be.null;
    });
  });

  describe("stock management", () => {
    it("isInStock should return true for products with stock", () => {
      const products = productService.getAllProducts();
      const firstProduct = products[0];
      if (firstProduct.stock > 0) {
        const inStock = productService.isInStock(firstProduct.id);
        expect(inStock).to.be.true;
      }
    });

    it("getStock should return correct stock level", () => {
      const products = productService.getAllProducts();
      const firstProduct = products[0];
      const stock = productService.getStock(firstProduct.id);
      expect(stock).to.be.a("number");
      // Stock can be any number including 0
      expect(typeof stock).to.equal("number");
    });

    it("getStock should return 0 for invalid product", () => {
      const stock = productService.getStock("invalid-id");
      expect(stock).to.equal(0);
    });

    it("setStock should update stock level", () => {
      const products = productService.getAllProducts();
      const firstProduct = products[0];
      const newStock = 50;
      const result = productService.setStock(firstProduct.id, newStock);
      expect(result).to.be.true;
      expect(productService.getStock(firstProduct.id)).to.equal(newStock);
    });

    it("setStock should not allow negative stock", () => {
      const products = productService.getAllProducts();
      const firstProduct = products[0];
      productService.setStock(firstProduct.id, -10);
      const stock = productService.getStock(firstProduct.id);
      expect(stock).to.be.at.least(0);
    });

    it("decrementStock should reduce stock by 1", () => {
      const products = productService.getAllProducts();
      const firstProduct = products[0];
      const initialStock = productService.getStock(firstProduct.id);
      productService.setStock(firstProduct.id, 10);
      productService.decrementStock(firstProduct.id);
      expect(productService.getStock(firstProduct.id)).to.equal(9);
    });

    it("decrementStock should not go below zero", () => {
      const products = productService.getAllProducts();
      const firstProduct = products[0];
      productService.setStock(firstProduct.id, 0);
      const result = productService.decrementStock(firstProduct.id);
      expect(result).to.be.false;
      expect(productService.getStock(firstProduct.id)).to.equal(0);
    });
  });

  describe("product management", () => {
    it("addProduct should add new product", () => {
      const newProduct = {
        id: "test-product-123",
        name: "Test Product",
        price: 100,
        description: "Test description",
        stock: 10,
      };
      const result = productService.addProduct(newProduct);
      expect(result).to.be.true;
      const product = productService.getProductById("test-product-123");
      expect(product).to.exist;
      expect(product.name).to.equal("Test Product");
    });

    it("addProduct should not allow duplicate IDs", () => {
      const newProduct = {
        id: "test-product-123",
        name: "Test Product",
        price: 100,
        description: "Test description",
        stock: 10,
      };
      productService.addProduct(newProduct);
      const result = productService.addProduct(newProduct);
      expect(result).to.be.false;
    });

    it("editProduct should update product fields", () => {
      const newProduct = {
        id: "test-product-edit",
        name: "Test Product",
        price: 100,
        description: "Test description",
        stock: 10,
      };
      productService.addProduct(newProduct);
      const result = productService.editProduct(
        "test-product-edit",
        "price",
        200
      );
      expect(result).to.be.true;
      const product = productService.getProductById("test-product-edit");
      expect(product.price).to.equal(200);
    });

    it("editProduct should not allow invalid fields", () => {
      const products = productService.getAllProducts();
      const firstProduct = products[0];
      const result = productService.editProduct(
        firstProduct.id,
        "invalidField",
        "value"
      );
      expect(result).to.be.false;
    });

    it("removeProduct should remove product", () => {
      const newProduct = {
        id: "test-product-remove",
        name: "Test Product",
        price: 100,
        description: "Test description",
        stock: 10,
      };
      productService.addProduct(newProduct);
      const result = productService.removeProduct("test-product-remove");
      expect(result).to.be.true;
      const product = productService.getProductById("test-product-remove");
      expect(product).to.be.null;
    });
  });

  describe("formatters", () => {
    it("formatIDR should format currency correctly", () => {
      const formatted = productService.formatIDR(100000);
      expect(formatted).to.be.a("string");
      expect(formatted).to.include("Rp");
    });

    it("formatProductList should return formatted string", () => {
      const formatted = productService.formatProductList();
      expect(formatted).to.be.a("string");
      expect(formatted).to.include("Katalog Produk");
      expect(formatted).to.include("Premium Accounts");
    });
  });

  describe("edge cases", () => {
    it("should handle very large stock numbers", () => {
      const products = productService.getAllProducts();
      const firstProduct = products[0];
      const result = productService.setStock(firstProduct.id, 999999999);
      expect(result).to.be.true;
    });

    it("should handle string prices in addProduct", () => {
      const newProduct = {
        id: "test-string-price",
        name: "Test Product",
        price: "100.50",
        description: "Test description",
        stock: 10,
      };
      productService.addProduct(newProduct);
      const product = productService.getProductById("test-string-price");
      expect(product.price).to.be.a("number");
      expect(product.price).to.equal(100.5);
    });

    it("should handle missing stock in addProduct", () => {
      const newProduct = {
        id: "test-no-stock",
        name: "Test Product",
        price: 100,
        description: "Test description",
      };
      productService.addProduct(newProduct);
      const product = productService.getProductById("test-no-stock");
      expect(product.stock).to.be.a("number");
      expect(product.stock).to.be.at.least(0);
    });
  });
});
