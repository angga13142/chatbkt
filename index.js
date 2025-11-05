/**
 * WhatsApp Shopping Chatbot Assistant
 * Main application file - Refactored
 */

require("dotenv").config();

// Security: Validate admin numbers on startup
const adminNumbers = [
  process.env.ADMIN_NUMBER_1,
  process.env.ADMIN_NUMBER_2,
  process.env.ADMIN_NUMBER_3,
].filter(Boolean);

if (adminNumbers.length === 0) {
  console.error("❌ CRITICAL: No admin numbers configured in .env");
  console.error("💡 Set at least ADMIN_NUMBER_1 in .env file");
  console.error("📝 Example: ADMIN_NUMBER_1=6281234567890");
  process.exit(1);
}

console.log(`✅ Configured ${adminNumbers.length} admin number(s)`);

// Security: Validate Xendit API key format if configured
if (process.env.XENDIT_SECRET_KEY) {
  if (!process.env.XENDIT_SECRET_KEY.startsWith("xnd_")) {
    console.error("❌ CRITICAL: Invalid XENDIT_SECRET_KEY format");
    console.error("💡 API key should start with 'xnd_'");
    process.exit(1);
  }
  console.log("✅ Xendit API key format validated");
}

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const SessionManager = require("./sessionManager");
const ChatbotLogic = require("./chatbotLogic");
const MessageRouter = require("./lib/messageRouter");
const WebhookServer = require("./services/webhookServer");
const logRotationManager = require("./lib/logRotationManager");
const PaymentReminderService = require("./src/services/payment/PaymentReminderService");

// Initialize components
const sessionManager = new SessionManager();
const chatbotLogic = new ChatbotLogic(sessionManager);

// Pairing code configuration
const usePairingCode = process.env.USE_PAIRING_CODE === "true";
const pairingPhoneNumber = process.env.PAIRING_PHONE_NUMBER || "";

// Client configuration
const clientOptions = {
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    timeout: 60000, // 60 seconds timeout
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
  // Add more specific options for stability
  qrMaxRetries: 5,
};

// Add pairing code configuration if enabled
if (usePairingCode && pairingPhoneNumber) {
  clientOptions.pairWithPhoneNumber = {
    phoneNumber: pairingPhoneNumber,
    showNotification: true,
    intervalMs: 180000, // 3 minutes
  };
}

// Create WhatsApp client
const client = new Client(clientOptions);

// Initialize message router
const messageRouter = new MessageRouter(client, sessionManager, chatbotLogic);

// Initialize session manager (connect to Redis) and start client
(async () => {
  try {
    console.log("🔧 Starting initialization sequence...");
    await sessionManager.initialize();

    // Initialize stock manager
    const { initializeStockManager } = require("./config");
    await initializeStockManager();

    // Start log rotation manager
    logRotationManager.start();

    // Start WhatsApp client after initialization
    console.log("🚀 Initializing WhatsApp client...");
    console.log("⏱️  This may take 30-60 seconds...");
    
    // Set a timeout for initialization
    const initTimeout = setTimeout(() => {
      console.warn("⚠️  WhatsApp client initialization taking longer than expected");
      console.warn("💡 This is normal for first-time setup or after session cleanup");
    }, 30000);
    
    await client.initialize();
    clearTimeout(initTimeout);
    console.log("✅ WhatsApp client initialization started!");
  } catch (error) {
    console.error("❌ Initialization error:", error);
    console.error("🔍 Error details:", error.message);
    console.error("📋 Stack trace:", error.stack);
    
    // Check common issues
    if (error.message?.includes("Protocol error")) {
      console.error("💡 Tip: Try removing .wwebjs_auth and .wwebjs_cache folders");
    }
    if (error.message?.includes("timeout")) {
      console.error("💡 Tip: Increase puppeteer timeout or check internet connection");
    }
    
    process.exit(1);
  }
})();

// Event: QR Code
client.on("qr", (qr) => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📱 SCAN QR CODE WITH WHATSAPP");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  qrcode.generate(qr, { small: true });
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Waiting for authentication...");
});

// Event: Pairing Code
client.on("code", (code) => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔐 PAIRING CODE AUTHENTICATION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`Your Pairing Code: ${code}`);
  console.log("\n📱 How to use:");
  console.log("1. Open WhatsApp on your phone");
  console.log("2. Go to Settings > Linked Devices");
  console.log('3. Tap "Link a Device"');
  console.log('4. Tap "Link with phone number instead"');
  console.log(`5. Enter this code: ${code}`);
  console.log("\n⏱️  Code expires in 3 minutes");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
});

// Payment reminder service (global)
let paymentReminderService;

// Event: Ready
client.on("ready", () => {
  console.log("\n✅ WhatsApp Shopping Chatbot is ready!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 Bot Status: ACTIVE");
  console.log("💬 Ready to serve customers");
  console.log("⚡ Fast response mode enabled");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Start webhook server for automatic payment verification
  if (process.env.WEBHOOK_URL) {
    const webhookServer = new WebhookServer(
      sessionManager,
      chatbotLogic,
      client
    );
    webhookServer.start();
  } else {
    console.log("⚠️  WEBHOOK_URL not configured, webhook server disabled");
  }

  // Start payment reminder service
  paymentReminderService = new PaymentReminderService(client, sessionManager);
  paymentReminderService.start();

  // Store cleanup intervals globally for proper cleanup on shutdown
  global.cleanupIntervals = {};

  // Clean up inactive sessions every 10 minutes
  global.cleanupIntervals.sessionCleanup = setInterval(() => {
    sessionManager.cleanupSessions();
    console.log("🧹 Cleaned up inactive sessions");
  }, 10 * 60 * 1000);

  // Cleanup rate limit data every 5 minutes
  global.cleanupIntervals.rateLimitCleanup = setInterval(() => {
    sessionManager.cleanupRateLimits();
    console.log("🧹 Cleaned up expired rate limit data");
  }, 5 * 60 * 1000);
});

// Event: Message (delegated to MessageRouter)
client.on("message", async (message) => {
  await messageRouter.handleMessage(message);
});

// Event: Authenticated
client.on("authenticated", () => {
  console.log("✅ Authentication successful!");
});

// Event: Authentication Failure
client.on("auth_failure", (msg) => {
  console.error("❌ Authentication failed:", msg);
});

// Event: Disconnected
client.on("disconnected", (reason) => {
  console.log("⚠️ Client disconnected:", reason);
  console.log("Attempting to reconnect...");
});

// Event: Error
client.on("error", (error) => {
  console.error("❌ Client error:", error);
});

// Graceful shutdown handlers
const shutdown = async (signal) => {
  console.log(`\n\n⚠️ Received ${signal}, shutting down gracefully...`);

  // Clear cleanup intervals (prevents memory leaks from PR #1 fix)
  if (global.cleanupIntervals) {
    clearInterval(global.cleanupIntervals.sessionCleanup);
    clearInterval(global.cleanupIntervals.rateLimitCleanup);
  }

  // Stop payment reminder service
  if (paymentReminderService) {
    paymentReminderService.stop();
  }

  // Stop log rotation
  logRotationManager.stop();

  // Close Redis connection
  await sessionManager.shutdown();

  // Close WhatsApp client
  await client.destroy();

  console.log("✅ Shutdown complete. Goodbye!");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Start the client
console.log("🚀 Starting WhatsApp Shopping Chatbot...");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("⚙️ Optimized for: 1 vCPU, 2GB RAM");
console.log("📦 Products: Premium Accounts & Virtual Cards");
console.log("💰 Price: $1 per item");
if (usePairingCode && pairingPhoneNumber) {
  console.log("🔐 Auth Method: Pairing Code");
  console.log(`📱 Phone Number: ${pairingPhoneNumber}`);
} else {
  console.log("📱 Auth Method: QR Code");
}
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
