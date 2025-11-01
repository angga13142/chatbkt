/**
 * Webhook Server Test
 * Tests webhook endpoints without starting WhatsApp client
 */

const http = require("http");

// Mock dependencies
const mockSessionManager = {
  useRedis: false,
  sessions: new Map(),
  async initialize() {},
  async getSession(customerId) {
    if (!this.sessions.has(customerId)) {
      this.sessions.set(customerId, {
        customerId,
        cart: [{ id: "netflix", name: "Netflix Premium", price: 15800 }],
        step: "awaiting_admin_approval",
        orderId: "ORD-TEST-123",
        paymentInvoiceId: "INV-TEST-456",
      });
    }
    return this.sessions.get(customerId);
  },
  async getStep(customerId) {
    const session = await this.getSession(customerId);
    return session.step;
  },
  async getCart(customerId) {
    const session = await this.getSession(customerId);
    return session.cart;
  },
  async getOrderId(customerId) {
    const session = await this.getSession(customerId);
    return session.orderId;
  },
  async setStep(customerId, step) {
    const session = await this.getSession(customerId);
    session.step = step;
  },
  async clearCart(customerId) {
    const session = await this.getSession(customerId);
    session.cart = [];
  },
};

const mockChatbotLogic = {};

const mockWhatsappClient = {
  info: { wid: { user: "6281234567890" } },
  async sendMessage(customerId, message) {
    console.log(
      `📤 Mock send to ${customerId}: ${message.substring(0, 50)}...`
    );
    return true;
  },
};

// Override environment variables for testing
process.env.WEBHOOK_PORT = "3001";
process.env.XENDIT_WEBHOOK_TOKEN = "test_webhook_token_12345";

const WebhookServer = require("./webhookServer");

async function testWebhook() {
  console.log("🧪 Testing Webhook Server...\n");

  let webhookServer;

  try {
    // Initialize webhook server
    console.log("1️⃣ Initializing webhook server...");
    webhookServer = new WebhookServer(
      mockSessionManager,
      mockChatbotLogic,
      mockWhatsappClient
    );
    webhookServer.start();

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("✅ Webhook server started on port 3001\n");

    // Test 2: Health check
    console.log("2️⃣ Testing health check endpoint...");
    const healthResponse = await makeRequest("GET", "/health");
    if (healthResponse.status !== "ok") {
      throw new Error("Health check failed");
    }
    console.log("✅ Health check passed\n");

    // Test 3: Invalid signature
    console.log("3️⃣ Testing invalid signature rejection...");
    const invalidSigResponse = await makeRequest("POST", "/webhook/xendit", {
      id: "test-invoice-123",
      status: "PAID",
    });

    if (invalidSigResponse.statusCode !== 401) {
      throw new Error("Should reject invalid signature");
    }
    console.log("✅ Invalid signature rejected\n");

    // Test 4: Valid webhook with correct signature
    console.log("4️⃣ Testing valid webhook with signature...");

    // Mock a session with payment data
    mockSessionManager.sessions.set("6281234567890@c.us", {
      customerId: "6281234567890@c.us",
      cart: [{ id: "netflix", name: "Netflix Premium", price: 15800 }],
      step: "awaiting_admin_approval",
      orderId: "ORD-TEST-123",
      paymentInvoiceId: "test-invoice-valid",
    });

    const validWebhook = await makeRequest(
      "POST",
      "/webhook/xendit",
      {
        id: "test-invoice-valid",
        status: "SUCCEEDED",
        amount: 15800,
        external_id: "ORD-TEST-123",
      },
      { "x-callback-token": "test_webhook_token_12345" }
    );

    if (!validWebhook.received) {
      throw new Error("Valid webhook not processed");
    }
    console.log("✅ Valid webhook processed\n");

    // Test 5: 404 handler
    console.log("5️⃣ Testing 404 handler...");
    const notFoundResponse = await makeRequest("GET", "/nonexistent");
    if (notFoundResponse.statusCode !== 404) {
      throw new Error("Should return 404 for invalid routes");
    }
    console.log("✅ 404 handler working\n");

    // Test 6: Graceful shutdown
    console.log("6️⃣ Testing graceful shutdown...");
    await webhookServer.stop();
    console.log("✅ Webhook server stopped\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ALL WEBHOOK TESTS PASSED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return true;
  } catch (error) {
    console.error("\n❌ Webhook test failed:", error.message);
    console.error("Stack:", error.stack);

    // Cleanup
    if (webhookServer) {
      try {
        await webhookServer.stop();
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return false;
  }
}

/**
 * Make HTTP request to webhook server
 */
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3001,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          parsed.statusCode = res.statusCode;
          resolve(parsed);
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Run tests
testWebhook()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
