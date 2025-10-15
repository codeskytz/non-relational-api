import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pkg from "pg";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { authenticateApiKey } from "./middleware/auth.js";

const { Pool } = pkg;

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
              description: 'The motivational quote text',
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
              example: 'AI Mind'
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

// 🔄 Self-ping function to keep server alive
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

// 🧠 Daily Quote Endpoint
/**
 * @swagger
 * /life:
 *   get:
 *     summary: Get AI-generated motivational quote
 *     description: Retrieves a randomly generated motivational quote about life using Gemini AI
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
    const prompt = `Generate one short, powerful motivational quote about life.
    Return ONLY valid JSON with no markdown formatting or code blocks:
    {
      "quote": "...",
      "mood": "uplifting/inspirational/calm",
      "author": "AI Mind"
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
app.post("/todos", authenticateApiKey, async (req, res) => {
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
app.patch("/todos/:id", authenticateApiKey, async (req, res) => {
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

// 🚀 Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 API running at http://localhost:${PORT}`));
