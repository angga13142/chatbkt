/**
 * Test Fuzzy Search for Netflix
 */

const FuzzySearch = require("./src/utils/FuzzySearch");
const { getAllProducts } = require("./config");

const products = getAllProducts();

console.log("🔍 Testing Fuzzy Search\n");
console.log("Available products:", products.length);
console.log(products.map((p) => `  - ${p.id}: ${p.name}`).join("\n"));

console.log("\n📝 Testing query: 'netflix'");
const result = FuzzySearch.search(products, "netflix", 5);

if (result) {
  console.log("\n✅ Match found:", result.name);
  console.log("   ID:", result.id);

  const similarity = FuzzySearch.similarityRatio(
    result.name.toLowerCase(),
    "netflix"
  );
  console.log("   Similarity:", similarity.toFixed(3));
} else {
  console.log("\n❌ No matches found!");
}

// Test other queries
console.log("\n\n📝 Testing other queries:");
const testQueries = ["Netflix", "netflik", "net", "spotify", "spot", "youtube"];
testQueries.forEach((query) => {
  const match = FuzzySearch.search(products, query, 5);
  if (match) {
    const sim = FuzzySearch.similarityRatio(
      match.name.toLowerCase(),
      query.toLowerCase()
    );
    console.log(`  "${query}" -> ${match.name} (${sim.toFixed(2)})`);
  } else {
    console.log(`  "${query}" -> No match`);
  }
});
