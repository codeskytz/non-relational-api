import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pkg from "pg";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { authenticateApiKey } from "./middleware/auth.js";
import { PaymentService } from "./services/paymentService.js";
import {
  validatePaymentLinkGeneration,
  validatePaymentProcessing,
  validateTodoCreation,
  validateTodoStatusUpdate
} from "./middleware/validation.js";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Debug: Check if environment variables are loaded
console.log('🔧 Environment Variables Debug:');
console.log(`GEMINI_API_KEY loaded: ${process.env.GEMINI_API_KEY ? '✅' : '❌'}`);
console.log(`CODESKYTZ_API_KEY loaded: ${process.env.CODESKYTZ_API_KEY ? '✅' : '❌'}`);
console.log(`CODESKYTZ_API_KEY value: ${process.env.CODESKYTZ_API_KEY || 'undefined'}`);

// 📚 Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CodeSkyTZ Life API',
      version: '1.0.0',
      description: 'A lightweight RESTful API providing AI-generated daily life quotes and todo management. All endpoints require authentication via codeskytz-api-key header.',
      contact: {
        name: 'CodeSkyTZ',
        email: 'shadows@codeskytz.site'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server'
      },
      {
        url: 'https://api.codeskytz.site',
        description: 'Production server'
      }
    ],
    security: [
      {
        ApiKeyAuth: []
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'codeskytz-api-key',
          description: 'API key for authenticating requests to CodeSkyTZ Life API'
        }
      },
      schemas: {
        Quote: {
          type: 'object',
          properties: {
            quote: {
              type: 'string',
              description: 'The beautifully crafted motivational quote text with vivid imagery',
              example: 'Every sunrise resets your code—rewrite your destiny clean and fresh.'
            },
            mood: {
              type: 'string',
              enum: ['uplifting', 'inspirational', 'calm'],
              description: 'The mood or tone of the quote'
            },
            author: {
              type: 'string',
              description: 'The author of the quote',
              example: 'CodeSkyTZ'
            }
          }
        },
        Todo: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the todo'
            },
            title: {
              type: 'string',
              description: 'The todo title/task description'
            },
            status: {
              type: 'string',
              enum: ['done', 'not yet'],
              description: 'Current status of the todo'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'When the todo was created'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            message: {
              type: 'string',
              description: 'Additional error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            }
          }
        }
      }
    }
  },
  apis: ['./index.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// � Self-ping function to keep server alive
const pingDomain = async () => {
  try {
    const response = await fetch("https://non-relational-api.onrender.com");
    console.log(`✅ Pinged domain - Status: ${response.status}`);
  } catch (error) {
    console.error(`❌ Ping failed: ${error.message}`);
  }
};

// Start pinging every 10 seconds
setInterval(pingDomain, 10000);

const app = express();
app.use(express.json());

// 📖 Swagger UI middleware
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 🌐 Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🐘 PostgreSQL connection
const pool = new Pool({
  connectionString: "postgres://kibiki:01319943591Bk@europe-north1-001.proxy.kinsta.app:30798/christian-brown-magpie",
  ssl: false
});

// 💳 Initialize Payment Service after pool is created
const paymentService = new PaymentService(pool);

// 🧠 Daily Quote Endpoint
/**
 * @swagger
 * /life:
 *   get:
 *     summary: Get AI-generated motivational quote
 *     description: Retrieves a beautifully crafted, AI-generated motivational quote about life, coding, and success using Google's Gemini AI
 *     tags: [Quotes]
 *     responses:
 *       200:
 *         description: Successfully generated quote
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quote'
 *       500:
 *         description: Failed to generate quote
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get("/life", authenticateApiKey, async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Generate one short, powerful, and beautifully illustrated motivational quote about life, coding, success, or personal growth.

    Guidelines for the quote:
    - Make it poetic and memorable with vivid imagery
    - Include metaphors, analogies, or coding references when appropriate
    - Keep it concise but impactful (15-25 words)
    - Make it universally relatable and inspiring
    - Use creative language that paints a mental picture

    Examples of good quotes:
    - "Every sunrise resets your code—rewrite your destiny clean and fresh."
    - "In the algorithm of life, persistence is the loop that never breaks."
    - "Stack your dreams like functions; each layer builds toward something beautiful."

    Return ONLY valid JSON with no markdown formatting or code blocks:
    {
      "quote": "your creative quote here",
      "mood": "uplifting/inspirational/calm",
      "author": "CodeSkyTZ"
    }`;
    
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse to validate JSON and then send
    const jsonData = JSON.parse(text);
    
    res.setHeader("Content-Type", "application/json");
    res.json(jsonData);
    
  } catch (err) {
    res.status(500).json({ error: "Failed to generate quote", details: err.message });
  }
});

// ✅ Get All Todos
/**
 * @swagger
 * /todos:
 *   get:
 *     summary: Get all todos
 *     description: Retrieves all todo items from the database ordered by ID in descending order
 *     tags: [Todos]
 *     responses:
 *       200:
 *         description: Successfully retrieved todos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Todo'
 *       500:
 *         description: Failed to fetch todos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get("/todos", authenticateApiKey, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM todos ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch todos", details: err.message });
  }
});

// ➕ Add a Todo
/**
 * @swagger
 * /todos:
 *   post:
 *     summary: Create a new todo
 *     description: Creates a new todo item with the provided title
 *     tags: [Todos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: The todo title/task description
 *                 example: "Learn Swagger documentation"
 *     responses:
 *       200:
 *         description: Successfully created todo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       400:
 *         description: Title is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to create todo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post("/todos", authenticateApiKey, validateTodoCreation, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });
  
  try {
    const { rows } = await pool.query(
      "INSERT INTO todos (title) VALUES ($1) RETURNING *",
      [title]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add todo", details: err.message });
  }
});

// 🟢 Mark as Done / Not Yet
/**
 * @swagger
 * /todos/{id}:
 *   patch:
 *     summary: Update todo status
 *     description: Updates the status of a specific todo item to either 'done' or 'not yet'
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Todo ID to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [done, "not yet"]
 *                 description: New status for the todo
 *                 example: "done"
 *     responses:
 *       200:
 *         description: Successfully updated todo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       400:
 *         description: Invalid status value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Todo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to update todo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.patch("/todos/:id", authenticateApiKey, validateTodoStatusUpdate, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'done' or 'not yet'
  
  if (!["done", "not yet"].includes(status))
    return res.status(400).json({ error: "Status must be 'done' or 'not yet'" });
  
  try {
    const { rows } = await pool.query(
      "UPDATE todos SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Todo not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update todo", details: err.message });
  }
});

// ❌ Delete Todo
/**
 * @swagger
 * /todos/{id}:
 *   delete:
 *     summary: Delete a todo
 *     description: Deletes a specific todo item by its ID
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Todo ID to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully deleted todo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Todo deleted"
 *       404:
 *         description: Todo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to delete todo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete("/todos/:id", authenticateApiKey, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rowCount } = await pool.query("DELETE FROM todos WHERE id = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "Todo not found" });
    res.json({ success: true, message: "Todo deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete todo", details: err.message });
  }
});

// 💳 Payment Endpoints
/**
 * @swagger
 * /api/payments/generate-link:
 *   post:
 *     summary: Generate payment link
 *     description: Creates a unique payment link for a specific amount and description
 *     tags: [Payments]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount in TZS
 *                 example: 1000.00
 *               description:
 *                 type: string
 *                 description: Payment description
 *                 example: "Payment for services"
 *               customerName:
 *                 type: string
 *                 description: "Customer name (optional)"
 *                 example: "John Doe"
 *               customerEmail:
 *                 type: string
 *                 description: "Customer email (optional)"
 *                 example: "john@example.com"
 *               returnUrl:
 *                 type: string
 *                 description: "URL to return to after successful payment (optional)"
 *                 example: "https://example.com"
 *     responses:
 *       201:
 *         description: Payment link generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 paymentLink:
 *                   type: string
 *                   example: "http://localhost:3000/pay/abc-123-def-456"
 *                 paymentLinkId:
 *                   type: string
 *                   example: "abc-123-def-456"
 *                 payment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     payment_link_id:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to generate payment link
 */
app.post("/api/payments/generate-link", authenticateApiKey, validatePaymentLinkGeneration, async (req, res) => {
  try {
    const { amount, description, customerName, customerEmail, returnUrl } = req.body;

    // Validation
    if (!amount || !description) {
      return res.status(400).json({
        error: "Amount and description are required",
        code: "VALIDATION_FAIL"
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: "Amount must be greater than 0",
        code: "INVALID_AMOUNT"
      });
    }

    const result = await paymentService.generatePaymentLink({
      amount,
      description,
      customerName,
      customerEmail,
      returnUrl
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error generating payment link:', error);
    res.status(500).json({
      error: "Failed to generate payment link",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/link/{paymentLinkId}:
 *   get:
 *     summary: Get payment details by link ID
 *     description: Retrieves payment information for a specific payment link
 *     tags: [Payments]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentLinkId
 *         required: true
 *         description: Unique payment link ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     payment_link_id:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                     customer_name:
 *                       type: string
 *                     customer_email:
 *                       type: string
 *       404:
 *         description: Payment link not found
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to retrieve payment details
 */
app.get("/api/payments/link/:paymentLinkId", authenticateApiKey, async (req, res) => {
  try {
    const { paymentLinkId } = req.params;

    const payment = await paymentService.getPaymentByLinkId(paymentLinkId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment link not found",
        code: "PAYMENT_LINK_NOT_FOUND"
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Error retrieving payment details:', error);
    res.status(500).json({
      error: "Failed to retrieve payment details",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/process:
 *   post:
 *     summary: Process payment
 *     description: Initiates payment processing with Fastlipa for a specific payment link
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentLinkId
 *               - phoneNumber
 *               - customerName
 *             properties:
 *               paymentLinkId:
 *                 type: string
 *                 description: Unique payment link ID
 *                 example: "abc-123-def-456"
 *               phoneNumber:
 *                 type: string
 *                 description: Customer phone number for payment
 *                 example: "255712345678"
 *               customerName:
 *                 type: string
 *                 description: Customer full name
 *                 example: "John Doe"
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 paymentId:
 *                   type: string
 *                   example: "fastlipa_payment_123"
 *                 status:
 *                   type: string
 *                   example: "processing"
 *                 instructions:
 *                   type: string
 *                   example: "Payment initiated successfully"
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Payment link not found
 *       500:
 *         description: Payment processing failed
 */
app.post("/api/payments/process", validatePaymentProcessing, async (req, res) => {
  try {
    const { paymentLinkId, phoneNumber, customerName } = req.body;

    // Validation
    if (!paymentLinkId || !phoneNumber || !customerName) {
      return res.status(400).json({
        error: "Payment link ID, phone number, and customer name are required",
        code: "VALIDATION_FAIL"
      });
    }

    // Get payment details
    const payment = await paymentService.getPaymentByLinkId(paymentLinkId);
    if (!payment) {
      return res.status(404).json({
        error: "Payment link not found",
        code: "PAYMENT_LINK_NOT_FOUND"
      });
    }

    // Process payment
    const result = await paymentService.processPayment({
      paymentLinkId,
      amount: payment.amount,
      currency: payment.currency,
      phoneNumber,
      description: payment.description,
      customerName
    });

    res.json(result);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      error: "Payment processing failed",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/callback:
 *   post:
 *     summary: Payment callback handler
 *     description: Handles payment status callbacks from Fastlipa
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentReference:
 *                 type: string
 *                 description: Payment reference ID
 *               status:
 *                 type: string
 *                 description: Payment status
 *               paymentId:
 *                 type: string
 *                 description: External payment ID
 *     responses:
 *       200:
 *         description: Callback processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 */
app.post("/api/payments/callback", async (req, res) => {
  try {
    const callbackData = req.body;

    const result = await paymentService.handlePaymentCallback(callbackData);

    res.json(result);
  } catch (error) {
    console.error('Error handling payment callback:', error);
    res.status(500).json({
      error: "Callback processing failed",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Fastlipa webhook handler
 *     description: Handles payment webhook notifications from Fastlipa with comprehensive logging
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tranid:
 *                 type: string
 *                 description: Fastlipa transaction ID
 *               status:
 *                 type: string
 *                 description: Transaction status
 *               amount:
 *                 type: number
 *                 description: Transaction amount
 *               number:
 *                 type: string
 *                 description: Customer phone number
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Webhook processed successfully"
 *                 paymentId:
 *                   type: integer
 *                   example: 123
 *                 transactionId:
 *                   type: string
 *                   example: "pay_abc123"
 *       400:
 *         description: Invalid webhook data
 *       500:
 *         description: Webhook processing failed
 */
app.post("/api/payments/webhook", async (req, res) => {
  try {
    const webhookData = req.body;

    // Validate that we have some data
    if (!webhookData || Object.keys(webhookData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Empty webhook data",
        message: "No data received in webhook"
      });
    }

    const result = await paymentService.handleFastlipaWebhook(webhookData, req);

    // Return appropriate status code based on result
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('❌ Error handling Fastlipa webhook:', error);
    res.status(500).json({
      success: false,
      error: "Webhook processing failed",
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/payments/stats:
 *   get:
 *     summary: Get payment statistics
 *     description: Retrieves payment statistics and analytics
 *     tags: [Payments]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_payments:
 *                   type: integer
 *                   example: 150
 *                 total_amount:
 *                   type: number
 *                   example: 250000.00
 *                 completed_payments:
 *                   type: integer
 *                   example: 140
 *                 pending_payments:
 *                   type: integer
 *                   example: 8
 *                 failed_payments:
 *                   type: integer
 *                   example: 2
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to retrieve statistics
 */
app.get("/api/payments/stats", authenticateApiKey, async (req, res) => {
  try {
    const stats = await paymentService.getPaymentStats();
    res.json(stats);
  } catch (error) {
    console.error('Error retrieving payment stats:', error);
    res.status(500).json({
      error: "Failed to retrieve payment statistics",
      details: error.message
    });
  }
});

// Serve payment form page
app.get("/pay/:paymentLinkId", async (req, res) => {
  try {
    const { paymentLinkId } = req.params;

    // Check if payment exists and is valid
    const payment = await paymentService.getPaymentByLinkId(paymentLinkId);

    if (!payment) {
      return res.status(404).send(`
        <html>
          <head><title>Payment Link Not Found</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Payment Link Not Found</h1>
            <p>The payment link you're looking for doesn't exist or has expired.</p>
            <a href="/">← Back to Home</a>
          </body>
        </html>
      `);
    }

    if (payment.status === 'completed') {
      return res.status(400).send(`
        <html>
          <head><title>Payment Already Completed</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Payment Already Completed</h1>
            <p>This payment has already been processed successfully.</p>
            <a href="/">← Back to Home</a>
          </body>
        </html>
      `);
    }

    res.sendFile(path.join(__dirname, 'public', 'pay.html'));
  } catch (error) {
    console.error('Error serving payment page:', error);
    res.status(500).send('Error loading payment page');
  }
});

// 💳 Additional Payment Management Endpoints

/**
 * @swagger
 * /api/payments/check-status/{transactionId}:
 *   get:
 *     summary: Check payment status with Fastlipa
 *     description: Manually check the status of a payment with Fastlipa using transaction ID
 *     tags: [Payments]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         description: Fastlipa transaction ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to check status
 */
app.get("/api/payments/check-status/:transactionId", authenticateApiKey, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const statusResult = await paymentService.checkPaymentStatus(transactionId);

    res.json({
      success: true,
      transactionId,
      fastlipaStatus: statusResult,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      error: "Failed to check payment status",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/webhook-logs:
 *   get:
 *     summary: Get webhook logs for debugging
 *     description: Retrieve webhook logs to debug Fastlipa webhook integration
 *     tags: [Payments]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         description: "Number of logs to retrieve (default: 50)"
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: status
 *         description: "Filter by status (processed, error, no_matching_payment)"
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       payment_id:
 *                         type: integer
 *                       webhook_data:
 *                         type: object
 *                       status:
 *                         type: string
 *                       error_message:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to retrieve logs
 */
app.get("/api/payments/webhook-logs", authenticateApiKey, async (req, res) => {
  try {
    const { limit = 50, status } = req.query;

    let query = `
      SELECT id, payment_id, webhook_data, status, error_message, created_at
      FROM webhook_logs
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` WHERE status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const { rows } = await pool.query(query, params);

    res.json({
      success: true,
      count: rows.length,
      logs: rows
    });
  } catch (error) {
    console.error('Error retrieving webhook logs:', error);
    res.status(500).json({
      error: "Failed to retrieve webhook logs",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/webhook/{paymentId}:
 *   get:
 *     summary: Get webhook logs for specific payment
 *     description: Retrieve webhook logs for a specific payment ID
 *     tags: [Payments]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         description: Internal payment ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment webhook logs retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Failed to retrieve logs
 */
app.get("/api/payments/webhook/:paymentId", authenticateApiKey, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const query = `
      SELECT id, payment_id, webhook_data, status, error_message, created_at
      FROM webhook_logs
      WHERE payment_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(query, [paymentId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No webhook logs found for this payment"
      });
    }

    res.json({
      success: true,
      paymentId: parseInt(paymentId),
      webhookCount: rows.length,
      logs: rows
    });
  } catch (error) {
    console.error('Error retrieving payment webhook logs:', error);
    res.status(500).json({
      error: "Failed to retrieve payment webhook logs",
      details: error.message
    });
  }
});

// 🏠 Serve Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🚀 Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 API running at http://localhost:${PORT}`));
