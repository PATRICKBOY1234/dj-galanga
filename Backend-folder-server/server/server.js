require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 24) {
  console.error("JWT_SECRET is missing or too short. Check your .env file.");
  process.exit(1);
}

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const CATEGORIES = [
  "Ugandan", "Kikkade", "Kadongo Kamu", "Afrobeats", "Dancehall", "Reggae", "Amapiano", "Old School", "Gospel",
  "Hip Hop", "R&B", "Bongo Flava", "Rumba", "Genge", "Artist Mixes", "Pop", "House", "EDM", "Reggaeton",
  "Rock", "Jazz", "Slow Jams", "Country",
];
const EVENT_TYPES = ["Club", "Festival", "Private"];
const BOOKING_STATUSES = ["new", "contacted", "confirmed", "declined"];
const AUDIO_EXTENSIONS = [".mp3", ".m4a", ".wav", ".ogg", ".aac"];

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "dj_galanga",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  ssl: {
      rejectUnauthorized: false
  }
});

const app = express();
app.disable("x-powered-by");// Add these CORS lines right here:
const cors = require("cors");
app.use(cors());


const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed"));
    },
  })
);
app.use(express.json({ limit: "100kb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

/* ---------------- Helpers ---------------- */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const clean = (value, max) =>
  String(value === undefined || value === null ? "" : value).trim().slice(0, max);

const removeFile = (filename) => {
  if (!filename) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(filename)), () => {});
};

const mapMix = (row, req) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  length: row.duration,
  date: String(row.created_at).slice(0, 10),
  src: req.protocol + "://" + req.get("host") + "/uploads/" + row.audio_file,
  plays: row.plays,
  downloads: row.downloads,
  trending: Boolean(row.is_trending),
  trendingAt: row.trending_at ? String(row.trending_at) : "",
});

/* ---------------- Login protection ---------------- */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = {};
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const isBlocked = (ip) => {
  const a = attempts[ip];
  if (!a) return false;
  if (Date.now() - a.first > WINDOW_MS) {
    delete attempts[ip];
    return false;
  }
  return a.count >= MAX_ATTEMPTS;
};

const recordFailure = (ip) => {
  const a = attempts[ip];
  if (!a || Date.now() - a.first > WINDOW_MS) attempts[ip] = { count: 1, first: Date.now() };
  else a.count += 1;
};

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.indexOf("Bearer ") === 0 ? header.slice(7) : "";
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Please log in as admin." });
  }
}

/* ---------------- Uploads ---------------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
    },
  }),
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (AUDIO_EXTENSIONS.indexOf(ext) !== -1) cb(null, true);
    else cb(new Error("Only audio files are allowed (mp3, m4a, wav, ogg, aac)."));
  },
});

/* ---------------- Public routes ---------------- */
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get(
  "/api/mixes",
  wrap(async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM mixes ORDER BY created_at DESC, id DESC");
    res.json(rows.map((r) => mapMix(r, req)));
  })
);

app.post(
  "/api/mixes/:id/play",
  wrap(async (req, res) => {
    await pool.query("UPDATE mixes SET plays = plays + 1 WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  })
);

app.get(
  "/api/mixes/:id/download",
  wrap(async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM mixes WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Mix not found." });
    const mix = rows[0];
    const file = path.join(UPLOAD_DIR, path.basename(mix.audio_file));
    if (!fs.existsSync(file)) return res.status(404).json({ error: "File is missing on the server." });
    await pool.query("UPDATE mixes SET downloads = downloads + 1 WHERE id = ?", [mix.id]);
    const safeTitle = mix.title.replace(/[^\w\s.-]/g, "").trim() || "mix";
    res.download(file, safeTitle + " - DJ GALANGA" + path.extname(mix.audio_file));
  })
);

app.get(
  "/api/events",
  wrap(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT id, event_date AS date, venue, city, type, price FROM events WHERE event_date >= CURDATE() ORDER BY event_date ASC"
    );
    res.json(rows);
  })
);

app.post(
  "/api/bookings",
  wrap(async (req, res) => {
    const b = req.body || {};
    const name = clean(b.name, 100);
    const email = clean(b.email, 120);
    const phone = clean(b.phone, 30);
    const date = clean(b.date, 10);
    const type = clean(b.type, 30);
    const message = clean(b.message, 2000);
    const guests = b.guests ? parseInt(b.guests, 10) : null;

    if (name.length < 2) return res.status(400).json({ error: "Enter your full name." });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email." });
    if (!/^\+?[0-9\s-]{9,15}$/.test(phone)) return res.status(400).json({ error: "Enter a valid phone number." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Choose a valid date." });
    if (message.length < 10) return res.status(400).json({ error: "Please add more details." });
    if (guests !== null && (isNaN(guests) || guests < 1)) return res.status(400).json({ error: "Invalid guests." });

    await pool.query(
      "INSERT INTO bookings (name, email, phone, event_date, event_type, guests, message) VALUES (?,?,?,?,?,?,?)",
      [name, email, phone, date, type || "Other", guests, message]
    );
    res.status(201).json({ ok: true });
  })
);

/* ---------------- Auth ---------------- */
app.post(
  "/api/auth/login",
  wrap(async (req, res) => {
    const ip = req.ip;
    if (isBlocked(ip)) {
      return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
    }
    const username = clean((req.body || {}).username, 50);
    const password = String((req.body || {}).password || "");

    const [rows] = await pool.query("SELECT * FROM admins WHERE username = ?", [username]);
    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);

    if (!admin || !valid) {
      recordFailure(ip);
      return res.status(401).json({ error: "Wrong username or password." });
    }
    delete attempts[ip];
    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, username: admin.username });
  })
);

app.get("/api/auth/me", requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

/* ---------------- Admin routes ---------------- */
app.get(
  "/api/admin/stats",
  requireAdmin,
  wrap(async (req, res) => {
    const [[mixes]] = await pool.query(
      "SELECT COUNT(*) AS total, COALESCE(SUM(plays),0) AS plays, COALESCE(SUM(downloads),0) AS downloads, COALESCE(SUM(is_trending),0) AS trending FROM mixes"
    );
    const [[events]] = await pool.query("SELECT COUNT(*) AS total FROM events WHERE event_date >= CURDATE()");
    const [[bookings]] = await pool.query(
      "SELECT COUNT(*) AS total, COALESCE(SUM(status = 'new'),0) AS fresh FROM bookings"
    );
    res.json({
      mixes: Number(mixes.total),
      plays: Number(mixes.plays),
      downloads: Number(mixes.downloads),
      trending: Number(mixes.trending),
      upcomingEvents: Number(events.total),
      bookings: Number(bookings.total),
      newBookings: Number(bookings.fresh),
    });
  })
);

app.post(
  "/api/admin/mixes",
  requireAdmin,
  upload.single("audio"),
  wrap(async (req, res) => {
    const title = clean(req.body.title, 150);
    const category = clean(req.body.category, 40);
    const duration = clean(req.body.duration, 20);
    const trending = String(req.body.trending) === "true" || String(req.body.trending) === "1";
    if (!req.file) return res.status(400).json({ error: "Choose an audio file to upload." });
    if (title.length < 2 || CATEGORIES.indexOf(category) === -1) {
      removeFile(req.file.filename);
      return res.status(400).json({ error: "Enter a title and choose a valid category." });
    }
    const [result] = await pool.query(
      "INSERT INTO mixes (title, category, duration, audio_file, is_trending, trending_at) VALUES (?,?,?,?,?,?)",
      [title, category, duration, req.file.filename, trending ? 1 : 0, trending ? new Date() : null]
    );
    const [rows] = await pool.query("SELECT * FROM mixes WHERE id = ?", [result.insertId]);
    res.status(201).json(mapMix(rows[0], req));
  })
);

app.put(
  "/api/admin/mixes/:id",
  requireAdmin,
  wrap(async (req, res) => {
    const title = clean(req.body.title, 150);
    const category = clean(req.body.category, 40);
    const duration = clean(req.body.duration, 20);
    if (title.length < 2 || CATEGORIES.indexOf(category) === -1) {
      return res.status(400).json({ error: "Enter a title and choose a valid category." });
    }
    const [result] = await pool.query("UPDATE mixes SET title = ?, category = ?, duration = ? WHERE id = ?", [
      title,
      category,
      duration,
      req.params.id,
    ]);
    if (!result.affectedRows) return res.status(404).json({ error: "Mix not found." });
    const [rows] = await pool.query("SELECT * FROM mixes WHERE id = ?", [req.params.id]);
    res.json(mapMix(rows[0], req));
  })
);

app.patch(
  "/api/admin/mixes/:id/trending",
  requireAdmin,
  wrap(async (req, res) => {
    const trending = (req.body || {}).trending === true;
    const [result] = await pool.query("UPDATE mixes SET is_trending = ?, trending_at = ? WHERE id = ?", [
      trending ? 1 : 0,
      trending ? new Date() : null,
      req.params.id,
    ]);
    if (!result.affectedRows) return res.status(404).json({ error: "Mix not found." });
    const [rows] = await pool.query("SELECT * FROM mixes WHERE id = ?", [req.params.id]);
    res.json(mapMix(rows[0], req));
  })
);

app.delete(
  "/api/admin/mixes/:id",
  requireAdmin,
  wrap(async (req, res) => {
    const [rows] = await pool.query("SELECT audio_file FROM mixes WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Mix not found." });
    await pool.query("DELETE FROM mixes WHERE id = ?", [req.params.id]);
    removeFile(rows[0].audio_file);
    res.json({ ok: true });
  })
);

app.get(
  "/api/admin/events",
  requireAdmin,
  wrap(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT id, event_date AS date, venue, city, type, price FROM events ORDER BY event_date DESC"
    );
    res.json(rows);
  })
);

app.post(
  "/api/admin/events",
  requireAdmin,
  wrap(async (req, res) => {
    const date = clean(req.body.date, 10);
    const venue = clean(req.body.venue, 120);
    const city = clean(req.body.city, 60);
    const type = clean(req.body.type, 20);
    const price = clean(req.body.price, 40);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Choose a valid date." });
    if (venue.length < 2 || city.length < 2) return res.status(400).json({ error: "Enter the venue and city." });
    if (EVENT_TYPES.indexOf(type) === -1) return res.status(400).json({ error: "Choose a valid event type." });
    const [result] = await pool.query(
      "INSERT INTO events (event_date, venue, city, type, price) VALUES (?,?,?,?,?)",
      [date, venue, city, type, price]
    );
    res.status(201).json({ id: result.insertId, date, venue, city, type, price });
  })
);

app.delete(
  "/api/admin/events/:id",
  requireAdmin,
  wrap(async (req, res) => {
    await pool.query("DELETE FROM events WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  })
);

app.get(
  "/api/admin/bookings",
  requireAdmin,
  wrap(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT id, name, email, phone, event_date AS date, event_type AS type, guests, message, status, created_at AS createdAt FROM bookings ORDER BY created_at DESC"
    );
    res.json(rows);
  })
);

app.patch(
  "/api/admin/bookings/:id",
  requireAdmin,
  wrap(async (req, res) => {
    const status = clean(req.body.status, 20);
    if (BOOKING_STATUSES.indexOf(status) === -1) return res.status(400).json({ error: "Invalid status." });
    await pool.query("UPDATE bookings SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ ok: true });
  })
);

app.delete(
  "/api/admin/bookings/:id",
  requireAdmin,
  wrap(async (req, res) => {
    await pool.query("DELETE FROM bookings WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  })
);

app.put(
  "/api/admin/password",
  requireAdmin,
  wrap(async (req, res) => {
    const current = String(req.body.currentPassword || "");
    const next = String(req.body.newPassword || "");
    if (next.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters." });
    const [rows] = await pool.query("SELECT * FROM admins WHERE id = ?", [req.admin.id]);
    if (!rows.length || !(await bcrypt.compare(current, rows[0].password_hash))) {
      return res.status(401).json({ error: "Current password is wrong." });
    }
    const hash = await bcrypt.hash(next, 10);
    await pool.query("UPDATE admins SET password_hash = ? WHERE id = ?", [hash, req.admin.id]);
    res.json({ ok: true });
  })
);

/* ---------------- Errors ---------------- */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "That file is too large. The limit is 300 MB." : "Upload failed: " + err.message;
    return res.status(400).json({ error: message });
  }
  if (err && err.message === "Origin not allowed") return res.status(403).json({ error: "Origin not allowed." });
  if (err && /audio files/.test(err.message)) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

/* ---------------- Start ---------------- */
pool
  .query("SELECT 1")
  .then(() => {
    app.listen(PORT, () => console.log("DJ Galanga server running on http://localhost:" + PORT + " (database connected)"));
  })
  .catch((err) => {
    console.error("Could not connect to MySQL. Is MySQL started in XAMPP?");
    console.error(err.message);
    process.exit(1);
  });