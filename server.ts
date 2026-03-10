import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import * as line from "@line/bot-sdk";
import dotenv from "dotenv";

import { google } from "googleapis";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function syncToSheet(sheetName: string, values: any[]) {
  if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return;
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A:A`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
  } catch (err) {
    console.error(`Failed to sync to Google Sheet (${sheetName}):`, err);
  }
}

const db = new Database("data.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    lineUserId TEXT PRIMARY KEY,
    name TEXT,
    position TEXT,
    department TEXT,
    phone TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lineUserId TEXT,
    type TEXT,
    data TEXT,
    status TEXT DEFAULT 'รอดำเนินการ',
    adminNote TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
};

const lineClient = new line.messagingApi.MessagingApiClient(lineConfig);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/user/:lineUserId", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE lineUserId = ?").get(req.params.lineUserId);
    res.json(user || null);
  });

  app.post("/api/user", async (req, res) => {
    const { lineUserId, name, position, department, phone } = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO users (lineUserId, name, position, department, phone)
      VALUES (?, ?, ?, ?, ?)
    `).run(lineUserId, name, position, department, phone);

    // Sync to Google Sheets
    await syncToSheet("Users", [lineUserId, name, position, department, phone, new Date().toLocaleString('th-TH')]);

    res.json({ success: true });
  });

  app.get("/api/requests/:lineUserId", (req, res) => {
    const requests = db.prepare("SELECT * FROM requests WHERE lineUserId = ? ORDER BY createdAt DESC").all(req.params.lineUserId);
    res.json(requests.map(r => ({ ...r, data: JSON.parse(r.data as string) })));
  });

  app.get("/api/admin/requests", (req, res) => {
    const requests = db.prepare(`
      SELECT r.*, u.name as userName, u.phone as userPhone 
      FROM requests r 
      JOIN users u ON r.lineUserId = u.lineUserId 
      ORDER BY r.createdAt DESC
    `).all();
    res.json(requests.map(r => ({ ...r, data: JSON.parse(r.data as string) })));
  });

  app.post("/api/requests", async (req, res) => {
    const { lineUserId, type, data } = req.body;
    const result = db.prepare(`
      INSERT INTO requests (lineUserId, type, data)
      VALUES (?, ?, ?)
    `).run(lineUserId, type, JSON.stringify(data));

    const requestId = result.lastInsertRowid;
    const details = data.pathologyId || data.details || "-";

    // Sync to Google Sheets
    await syncToSheet("Requests", [
      requestId, 
      lineUserId, 
      type, 
      details, 
      "รอดำเนินการ", 
      "-", 
      new Date().toLocaleString('th-TH'),
      JSON.stringify(data)
    ]);

    // Notify Admin
    const adminId = process.env.LINE_ADMIN_USER_ID;
    if (adminId) {
      try {
        await lineClient.pushMessage({
          to: adminId,
          messages: [{
            type: "text",
            text: `🔔 มีคำร้องใหม่!\nประเภท: ${type}\nจาก: ${lineUserId}\nตรวจสอบได้ที่ระบบหลังบ้าน`
          }]
        });
      } catch (err) {
        console.error("Failed to notify admin", err);
      }
    }

    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.patch("/api/admin/requests/:id", async (req, res) => {
    const { status, adminNote } = req.body;
    const request = db.prepare("SELECT * FROM requests WHERE id = ?").get(req.params.id) as any;
    
    if (!request) return res.status(404).json({ error: "Not found" });

    db.prepare("UPDATE requests SET status = ?, adminNote = ? WHERE id = ?")
      .run(status, adminNote, req.params.id);

    // Notify User
    try {
      await lineClient.pushMessage({
        to: request.lineUserId,
        messages: [{
          type: "text",
          text: `📢 อัพเดตสถานะคำร้องของคุณ\nประเภท: ${request.type}\nสถานะ: ${status}\nหมายเหตุ: ${adminNote || '-'}`
        }]
      });
    } catch (err) {
      console.error("Failed to notify user", err);
    }

    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
