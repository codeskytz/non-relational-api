import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const app = express();
app.use(express.json());

// 🌐 Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🐘 PostgreSQL connection
const pool = new Pool({
  connectionString: "postgres://kibiki:01319943591Bk@europe-north1-001.proxy.kinsta.app:30798/christian-brown-magpie",
  ssl: false
});

// 🧠 Daily Quote Endpoint
app.get("/life", async (req, res) => {
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
app.get("/todos", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM todos ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch todos", details: err.message });
  }
});

// ➕ Add a Todo
app.post("/todos", async (req, res) => {
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
app.patch("/todos/:id", async (req, res) => {
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
app.delete("/todos/:id", async (req, res) => {
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
