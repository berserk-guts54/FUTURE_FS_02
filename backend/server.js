
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Check required login settings
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET) {
    throw new Error(
        "Missing ADMIN_EMAIL, ADMIN_PASSWORD, or JWT_SECRET in .env"
    );
}

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "mini_crm",
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

const ALLOWED_STATUSES = ["new", "contacted", "converted"];

function isValidId(id) {
    return Number.isInteger(id) && id > 0;
}

// Home route
app.get("/", (req, res) => {
    res.send("Mini CRM Backend is running!");
});

// Admin login - must remain PUBLIC
app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body || {};

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        email !== ADMIN_EMAIL ||
        password !== ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    const token = jwt.sign(
        { email: ADMIN_EMAIL, role: "admin" },
        JWT_SECRET,
        { expiresIn: "2h" }
    );

    res.json({
        message: "Login successful",
        token,
        expiresIn: 7200
    });
});

// Protect all API routes registered AFTER this middleware,
// except the login route registered above.
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please log in first"
        });
    }

    const token = authHeader.slice(7);

    try {
        const user = jwt.verify(token, JWT_SECRET);

        if (user.role !== "admin" || user.email !== ADMIN_EMAIL) {
            return res.status(403).json({
                message: "Admin access required"
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired login. Please log in again."
        });
    }
}

// Public database connection test
app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT DATABASE() AS database_name"
        );

        res.json({
            message: "MySQL connected successfully!",
            database: rows[0].database_name
        });
    } catch (error) {
        console.error("Database test error:", error.message);
        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

// All routes below this point require a valid admin token.
app.use("/api", authenticateToken);

// GET: Retrieve all leads
app.get("/api/leads", async (req, res) => {
    try {
        const [leads] = await db.query(
            "SELECT * FROM leads ORDER BY created_at DESC"
        );
        res.json(leads);
    } catch (error) {
        console.error("Load leads error:", error.message);
        res.status(500).json({
            message: "Could not load leads"
        });
    }
});

// POST: Create a lead
app.post("/api/leads", async (req, res) => {
    try {
        const { name, email, phone, enquiry, source } = req.body || {};

        if (
            typeof name !== "string" || !name.trim() ||
            typeof email !== "string" || !email.trim()
        ) {
            return res.status(400).json({
                message: "Name and email are required"
            });
        }

        const cleanPhone =
            typeof phone === "string" && phone.trim()
                ? phone.trim()
                : null;

        const cleanEnquiry =
            typeof enquiry === "string" && enquiry.trim()
                ? enquiry.trim()
                : null;

        const cleanSource =
            typeof source === "string" && source.trim()
                ? source.trim()
                : "Website";

        const [result] = await db.execute(
            `INSERT INTO leads
             (name, email, phone, enquiry, source)
             VALUES (?, ?, ?, ?, ?)`,
            [
                name.trim(),
                email.trim(),
                cleanPhone,
                cleanEnquiry,
                cleanSource
            ]
        );

        const [rows] = await db.execute(
            "SELECT * FROM leads WHERE id = ?",
            [result.insertId]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Create lead error:", error.message);
        res.status(500).json({
            message: "Could not create lead"
        });
    }
});

// PATCH: Update lead status
app.patch("/api/leads/:id/status", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body || {};

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid lead ID"
            });
        }

        if (!ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const [result] = await db.execute(
            "UPDATE leads SET status = ? WHERE id = ?",
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Lead not found"
            });
        }

        res.json({
            message: "Status updated successfully"
        });
    } catch (error) {
        console.error("Update status error:", error.message);
        res.status(500).json({
            message: "Could not update status"
        });
    }
});

// DELETE: Remove a lead
app.delete("/api/leads/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid lead ID"
            });
        }

        const [result] = await db.execute(
            "DELETE FROM leads WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Lead not found"
            });
        }

        res.json({
            message: "Lead deleted successfully"
        });
    } catch (error) {
        console.error("Delete lead error:", error.message);
        res.status(500).json({
            message: "Could not delete lead"
        });
    }
});

// GET: Retrieve follow-up notes
app.get("/api/notes", async (req, res) => {
    try {
        let sql = `
            SELECT n.id, n.lead_id, n.note, n.follow_up_date,
                   n.created_at, l.name AS lead_name
            FROM follow_up_notes n
            JOIN leads l ON l.id = n.lead_id
        `;

        const params = [];

        if (req.query.leadId !== undefined) {
            const leadId = Number(req.query.leadId);

            if (!isValidId(leadId)) {
                return res.status(400).json({
                    message: "Invalid lead ID"
                });
            }

            sql += " WHERE n.lead_id = ?";
            params.push(leadId);
        }

        sql += " ORDER BY n.created_at DESC";

        const [notes] = await db.execute(sql, params);
        res.json(notes);
    } catch (error) {
        console.error("Load notes error:", error.message);
        res.status(500).json({
            message: "Could not load notes"
        });
    }
});

// POST: Create a follow-up note
app.post("/api/notes", async (req, res) => {
    try {
        const { lead_id, note, follow_up_date } = req.body || {};
        const leadId = Number(lead_id);

        if (
            !isValidId(leadId) ||
            typeof note !== "string" ||
            !note.trim()
        ) {
            return res.status(400).json({
                message: "A valid lead ID and note are required"
            });
        }

        let cleanDate = null;

        if (
            follow_up_date !== undefined &&
            follow_up_date !== null &&
            follow_up_date !== ""
        ) {
            if (
                typeof follow_up_date !== "string" ||
                !/^\d{4}-\d{2}-\d{2}$/.test(follow_up_date)
            ) {
                return res.status(400).json({
                    message: "Date must use YYYY-MM-DD format"
                });
            }

            const parsedDate = new Date(
                `${follow_up_date}T00:00:00Z`
            );

            if (
                Number.isNaN(parsedDate.getTime()) ||
                parsedDate.toISOString().slice(0, 10) !== follow_up_date
            ) {
                return res.status(400).json({
                    message: "Invalid follow-up date"
                });
            }

            cleanDate = follow_up_date;
        }

        const [result] = await db.execute(
            `INSERT INTO follow_up_notes
             (lead_id, note, follow_up_date)
             VALUES (?, ?, ?)`,
            [leadId, note.trim(), cleanDate]
        );

        const [rows] = await db.execute(
            `SELECT n.id, n.lead_id, n.note, n.follow_up_date,
                    n.created_at, l.name AS lead_name
             FROM follow_up_notes n
             JOIN leads l ON l.id = n.lead_id
             WHERE n.id = ?`,
            [result.insertId]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(404).json({
                message: "Lead not found"
            });
        }

        console.error("Create note error:", error.message);
        res.status(500).json({
            message: "Could not save note"
        });
    }
});

// Start server after checking MySQL
async function startServer() {
    try {
        const connection = await db.getConnection();
        console.log("MySQL connected successfully!");
        connection.release();

        app.listen(PORT, () => {
            console.log(
                `Server running at http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error(
            "Could not connect to MySQL:",
            error.message
        );
        process.exitCode = 1;
    }
}

startServer();
