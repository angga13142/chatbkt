/**
 * WhatsApp Shopping Chatbot Assistant
 * Main application file
 *
 * This chatbot helps customers browse and purchase premium accounts
 * and virtual credit cards with fast response times.
 *
 * Optimized for VPS with 1 vCPU and 2GB RAM
 */

// Load environment variables from .env file
require("dotenv").config();

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const SessionManager = require("./sessionManager");
const ChatbotLogic = require("./chatbotLogic");

// Initialize session manager
const sessionManager = new SessionManager();

// Initialize chatbot logic
const chatbotLogic = new ChatbotLogic(sessionManager);

// Pairing code configuration from environment variables
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
    intervalMs: 180000, // 3 minutes (WhatsApp default)
  };
}

// Create WhatsApp client with optimized settings for low-resource VPS
const client = new Client(clientOptions);

// Generate QR Code for authentication
client.on("qr", (qr) => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📱 SCAN QR CODE WITH WHATSAPP");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  qrcode.generate(qr, { small: true });
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Waiting for authentication...");
});

// Handle pairing code (alternative to QR code)
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

// Client is ready
client.on("ready", () => {
  console.log("\n✅ WhatsApp Shopping Chatbot is ready!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 Bot Status: ACTIVE");
  console.log("💬 Ready to serve customers");
  console.log("⚡ Fast response mode enabled");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Clean up inactive sessions every 10 minutes
  setInterval(() => {
    sessionManager.cleanupSessions();
    console.log("🧹 Cleaned up inactive sessions");
  }, 10 * 60 * 1000);
});

// Handle incoming messages
client.on("message", async (message) => {
  try {
    // Get customer ID (phone number)
    const customerId = message.from;

    // Ignore group messages and status updates
    if (message.from.includes("@g.us") || message.from === "status@broadcast") {
      return;
    }

    // Handle image messages (payment proof)
    if (message.hasMedia && message.type === "image") {
      const step = sessionManager.getStep(customerId);

      if (step === "awaiting_payment" || step === "awaiting_admin_approval") {
        console.log(`📸 Payment proof received from ${customerId}`);

        try {
          const media = await message.downloadMedia();
          const fs = require("fs");
          const orderId = sessionManager.getOrderId(customerId);
          const filename = `${orderId}-${Date.now()}.jpg`;
          const filepath = `./payment_proofs/${filename}`;

          // Save payment proof
          fs.writeFileSync(filepath, media.data, "base64");
          console.log(`💾 Saved payment proof: ${filename}`);

          // Store filepath in session
          sessionManager.setPaymentProof(customerId, filepath);

          // Send confirmation to customer
          const confirmResponse = chatbotLogic.handlePaymentProof(customerId);
          await message.reply(confirmResponse.message);

          // Forward to admin
          if (confirmResponse.forwardToAdmin) {
            const adminNumbers = [
              process.env.ADMIN_NUMBER_1,
              process.env.ADMIN_NUMBER_2,
              process.env.ADMIN_NUMBER_3,
            ].filter(Boolean);

            const cart = confirmResponse.cart;
            const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);

            let adminMessage = "🔔 *PEMBAYARAN BARU*\n\n";
            adminMessage += `📋 Order ID: ${confirmResponse.orderId}\n`;
            adminMessage += `👤 Customer: ${customerId.replace("@c.us", "")}\n`;
            adminMessage += `💵 Total: $${totalUSD}\n\n`;
            adminMessage += "*Produk:*\n";
            cart.forEach((item, index) => {
              adminMessage += `${index + 1}. ${item.name}\n`;
            });
            adminMessage += "\n━━━━━━━━━━━━━━━━━━\n\n";
            adminMessage += "✅ Untuk approve:\n";
            adminMessage += `/approve ${confirmResponse.orderId}\n\n`;
            adminMessage += "📸 Bukti pembayaran:";
            for (const adminNum of adminNumbers) {
              const adminId = adminNum.includes("@c.us")
                ? adminNum
                : `${adminNum}@c.us`;
              try {
                await client.sendMessage(adminId, adminMessage);
                const { MessageMedia } = require("whatsapp-web.js");
                const proofMedia = MessageMedia.fromFilePath(filepath);
                await client.sendMessage(adminId, proofMedia);
                console.log(`✅ Forwarded to admin: ${adminNum}`);
              } catch (adminError) {
                console.error(
                  `❌ Error forwarding to admin ${adminNum}:`,
                  adminError
                );
              }
            }
          }

          console.log(`✅ Payment proof processed for ${customerId}`);
          return;
        } catch (saveError) {
          console.error("❌ Error saving payment proof:", saveError);
          await message.reply(
            "⚠️ Gagal menyimpan bukti pembayaran. Silakan coba lagi."
          );
          return;
        }
      }
    }

    // Get message content
    const messageBody = message.body;

    // Log incoming message
    console.log(`📩 Message from ${customerId}: ${messageBody}`);

    // Process message and get response (now async)
    const response = await chatbotLogic.processMessage(customerId, messageBody);

    // Handle response object (for QRIS checkout or admin delivery)
    if (response && typeof response === "object" && response.message) {
      // Send text message first
      await message.reply(response.message);

      // Handle admin product delivery
      if (
        response.deliverToCustomer &&
        response.customerId &&
        response.customerMessage
      ) {
        try {
          await client.sendMessage(
            response.customerId,
            response.customerMessage
          );
          console.log(`✅ Delivered products to ${response.customerId}`);
        } catch (deliveryError) {
          console.error("❌ Error delivering to customer:", deliveryError);
          await message.reply(
            "⚠️ Gagal mengirim ke customer. Silakan kirim manual."
          );
        }
      }

      // Send QRIS QR code if available (Xendit QRIS)
      if (response.qrisData && response.qrisData.qrCodePath) {
        try {
          const { MessageMedia } = require("whatsapp-web.js");

          // Send QR code image from Xendit
          const media = MessageMedia.fromFilePath(response.qrisData.qrCodePath);
          await message.reply(media);
          console.log(`📸 Sent Xendit QRIS QR code`);
        } catch (qrError) {
          console.error("❌ Error sending QRIS QR code:", qrError);
          await message.reply(
            "⚠️ Gagal mengirim QR code. Silakan hubungi support."
          );
        }
      }

      // Send QRIS QR code if available (InterActive QRIS - legacy)
      if (response.qrisData && response.qrisData.qrisContent) {
        try {
          const QRISService = require("./qrisService");
          const qrisService = new QRISService();
          const { MessageMedia } = require("whatsapp-web.js");

          // Generate QR code image
          const orderId = sessionManager.getOrderId(customerId);
          const qrFilename = `${orderId}.png`;
          const qrPath = await qrisService.generateQRImage(
            response.qrisData.qrisContent,
            qrFilename
          );

          // Send QR code image
          const media = MessageMedia.fromFilePath(qrPath);
          await message.reply(media);
          console.log(`📸 Sent InterActive QRIS QR code: ${qrFilename}`);
        } catch (qrError) {
          console.error("❌ Error sending QRIS QR code:", qrError);
          await message.reply(
            "⚠️ Gagal mengirim QR code. Silakan hubungi support."
          );
        }
      }

      // Handle automatic product delivery (for Xendit webhook auto-payment)
      if (response.deliverToCustomer && response.products) {
        try {
          const { MessageMedia } = require("whatsapp-web.js");

          // Send product credentials
          for (const product of response.products) {
            let productMessage = `🎁 *${product.name}*\n\n`;
            productMessage += `📧 Email: ${product.email}\n`;
            productMessage += `🔐 Password: ${product.password}\n\n`;
            productMessage += "━━━━━━━━━━━━━━━━━━\n\n";
            productMessage += "💡 Simpan kredensial ini dengan baik!\n";
            productMessage += "🔒 Jangan bagikan ke orang lain";

            await client.sendMessage(customerId, productMessage);
          }

          console.log(
            `✅ Auto-delivered ${response.products.length} products to ${customerId}`
          );
        } catch (deliveryError) {
          console.error("❌ Error auto-delivering products:", deliveryError);
        }
      }
    } else {
      // Send simple text response
      await message.reply(response);
    }

    // Log outgoing response
    console.log(`📤 Sent response to ${customerId}`);
  } catch (error) {
    console.error("❌ Error handling message:", error);

    // Send user-friendly error message with support contact
    try {
      await message.reply(
        "⚠️ Sorry, something went wrong processing your request.\n\nPlease try again or type *support* for help.\n\nIf the problem persists, please contact our support team."
      );
    } catch (replyError) {
      console.error("❌ Error sending error message:", replyError);
    }
  }
});

// Handle authentication
client.on("authenticated", () => {
  console.log("✅ Authentication successful!");
});

// Handle authentication failure
client.on("auth_failure", (msg) => {
  console.error("❌ Authentication failed:", msg);
});

// Handle disconnection
client.on("disconnected", (reason) => {
  console.log("⚠️ Client disconnected:", reason);
  console.log("Attempting to reconnect...");
});

// Handle errors
client.on("error", (error) => {
  console.error("❌ Client error:", error);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\n⚠️ Shutting down gracefully...");
  await client.destroy();
  console.log("✅ Client destroyed. Goodbye!");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n\n⚠️ Shutting down gracefully...");
  await client.destroy();
  console.log("✅ Client destroyed. Goodbye!");
  process.exit(0);
});

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
