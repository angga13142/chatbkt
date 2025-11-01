/**
 * WhatsApp Shopping Chatbot Assistant
 * Main application file - Refactored
 */

require("dotenv").config();

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const SessionManager = require("./sessionManager");
const ChatbotLogic = require("./chatbotLogic");
const MessageRouter = require("./lib/messageRouter");
const WebhookServer = require("./webhookServer");

// Initialize components
const sessionManager = new SessionManager();
const chatbotLogic = new ChatbotLogic(sessionManager);

// Initialize session manager (connect to Redis)
(async () => {
  await sessionManager.initialize();
})();

// Pairing code configuration
const usePairingCode = process.env.USE_PAIRING_CODE === "true";
const pairingPhoneNumber = process.env.PAIRING_PHONE_NUMBER || "";

// Client configuration
const clientOptions = {
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
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

  // Clean up inactive sessions every 10 minutes
  setInterval(() => {
    sessionManager.cleanupSessions();
    console.log("🧹 Cleaned up inactive sessions");
  }, 10 * 60 * 1000);
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

client.initialize();
