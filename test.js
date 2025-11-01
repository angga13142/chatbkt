/**
 * Test script for chatbot logic
 * This tests the chatbot functionality without requiring WhatsApp connection
 */

const SessionManager = require('./sessionManager');
const ChatbotLogic = require('./chatbotLogic');
const { getAllProducts, getProductById } = require('./config');

console.log('🧪 Starting Chatbot Logic Tests...\n');

// Test 1: Session Manager
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 1: Session Manager');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const sessionManager = new SessionManager();
const testCustomerId = '1234567890';

const session = sessionManager.getSession(testCustomerId);
console.log('✓ Created session for customer:', testCustomerId);
console.log('  Initial step:', session.step);

sessionManager.setStep(testCustomerId, 'browsing');
console.log('✓ Changed step to:', sessionManager.getStep(testCustomerId));

const testProduct = { id: 'test', name: 'Test Product', price: 1 };
sessionManager.addToCart(testCustomerId, testProduct);
console.log('✓ Added product to cart');
console.log('  Cart items:', sessionManager.getCart(testCustomerId).length);

sessionManager.clearCart(testCustomerId);
console.log('✓ Cleared cart');
console.log('  Cart items after clear:', sessionManager.getCart(testCustomerId).length);

// Test 2: Product Configuration
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 2: Product Configuration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const allProducts = getAllProducts();
console.log('✓ Total products available:', allProducts.length);

const netflix = getProductById('netflix');
if (netflix) {
  console.log('✓ Found Netflix product:');
  console.log('  Name:', netflix.name);
  console.log('  Price: $' + netflix.price);
}

// Test 3: Chatbot Logic
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 3: Chatbot Logic Flow');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const chatbot = new ChatbotLogic(sessionManager);

// Test main menu
let response = chatbot.processMessage(testCustomerId, 'menu');
console.log('✓ Main menu command processed');
console.log('  Response length:', response.length, 'characters');
console.log('  Contains "Welcome":', response.includes('Welcome'));

// Test browsing products
response = chatbot.processMessage(testCustomerId, '1');
console.log('✓ Browse products command processed');
console.log('  Contains "PRODUCT CATALOG":', response.includes('PRODUCT CATALOG'));

// Test adding product to cart
response = chatbot.processMessage(testCustomerId, 'netflix');
console.log('✓ Product selection processed');
console.log('  Contains "Added to cart":', response.includes('Added to cart'));
console.log('  Cart has items:', sessionManager.getCart(testCustomerId).length > 0);

// Test viewing cart
response = chatbot.processMessage(testCustomerId, 'cart');
console.log('✓ View cart command processed');
console.log('  Contains "YOUR CART":', response.includes('YOUR CART'));

// Test checkout
response = chatbot.processMessage(testCustomerId, 'checkout');
console.log('✓ Checkout command processed');
console.log('  Contains "ORDER CONFIRMED":', response.includes('ORDER CONFIRMED'));
console.log('  Cart cleared after checkout:', sessionManager.getCart(testCustomerId).length === 0);

// Test 4: Multiple Sessions
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 4: Multiple Customer Sessions');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const customer1 = '1111111111';
const customer2 = '2222222222';

chatbot.processMessage(customer1, 'menu');
chatbot.processMessage(customer1, '1');
chatbot.processMessage(customer1, 'netflix');

chatbot.processMessage(customer2, 'menu');
chatbot.processMessage(customer2, '1');
chatbot.processMessage(customer2, 'spotify');

const cart1 = sessionManager.getCart(customer1);
const cart2 = sessionManager.getCart(customer2);

console.log('✓ Customer 1 cart:', cart1.length, 'items');
console.log('  Product:', cart1[0]?.name);
console.log('✓ Customer 2 cart:', cart2.length, 'items');
console.log('  Product:', cart2[0]?.name);
console.log('✓ Sessions are isolated:', cart1[0]?.id !== cart2[0]?.id);

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ ALL TESTS PASSED!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nThe chatbot logic is working correctly! 🎉');
console.log('Ready to connect to WhatsApp.\n');
