require("dotenv").config();
const readline = require("readline");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let muted = false;

rl._writeToOutput = function (text) {
  if (muted && text.trim() !== "" && text.indexOf("\n") === -1) {
    rl.output.write("*");
  } else {
    rl.output.write(text);
  }
};

const ask = (question, hidden) =>
  new Promise((resolve) => {
    rl.question(question, (answer) => {
      muted = false;
      if (hidden) rl.output.write("\n");
      resolve(answer);
    });
    muted = Boolean(hidden);
  });

(async () => {
  try {
    const username = (await ask("Admin username: ", false)).trim();
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(username)) {
      throw new Error("Username must be 3 to 30 characters: letters, numbers, dot, dash or underscore.");
    }
    const password = await ask("Admin password (min 8 characters): ", true);
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    const again = await ask("Repeat password: ", true);
    if (password !== again) throw new Error("The two passwords do not match.");

    const pool = await mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "dj_galanga",
    });

    const hash = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO admins (username, password_hash) VALUES (?, ?)", [username, hash]);
    console.log("\nAdmin account '" + username + "' created. You can now log in to the dashboard.");
    await pool.end();
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") console.error("\nThat username already exists.");
    else console.error("\n" + err.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
})();