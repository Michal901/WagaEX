// ===== WAGAEX BACKEND =====
// Simple Express API for product database using SQLite

import Database from "better-sqlite3";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, "products.db");
const db = new Database(dbPath);

// Create products table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    nazwa TEXT NOT NULL,
    waga REAL NOT NULL,
    ostatnio_uzyta TEXT NOT NULL
  )
`);

// Routes

// GET /products - Get all products
app.get("/products", (req, res) => {
  try {
    const products = db
      .prepare("SELECT * FROM products ORDER BY ostatnio_uzyta DESC")
      .all();
    // Convert to object format expected by frontend
    const result = {};
    products.forEach((p) => {
      result[p.id] = {
        nazwa: p.nazwa,
        waga: p.waga,
        ostatnioUzyta: p.ostatnio_uzyta,
      };
    });
    res.json(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// POST /products - Add or update product
app.post("/products", (req, res) => {
  try {
    const { id, nazwa, waga, ostatnioUzyta } = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO products (id, nazwa, waga, ostatnio_uzyta)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, nazwa, waga, ostatnioUzyta);
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving product:", error);
    res.status(500).json({ error: "Failed to save product" });
  }
});

// DELETE /products/:id - Delete product
app.delete("/products/:id", (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare("DELETE FROM products WHERE id = ?");
    const result = stmt.run(id);
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`WagaEX Backend running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Closing database connection...");
  db.close();
  process.exit(0);
});
