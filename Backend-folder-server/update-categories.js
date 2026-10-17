const fs = require("fs");

const CATEGORIES = [
  "Ugandan", "Kikkade", "Kadongo Kamu", "Afrobeats", "Dancehall", "Reggae", "Amapiano", "Old School", "Gospel",
  "Hip Hop", "R&B", "Bongo Flava", "Rumba", "Genge", "Artist Mixes", "Pop", "House", "EDM", "Reggaeton",
  "Rock", "Jazz", "Slow Jams", "Country",
];

// Works in both folders: it updates whichever of these files exists in the folder it is run from.
const FILES = ["server.js", "src/Admin.jsx"];
const pattern = /const CATEGORIES = \[[^\]]*\];/;
const replacement = "const CATEGORIES = [" + CATEGORIES.map((c) => JSON.stringify(c)).join(", ") + "];";

let updated = 0;
let failed = false;

FILES.forEach((file) => {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  if (!pattern.test(text)) {
    console.log("Could not find the category list in " + file);
    failed = true;
    return;
  }
  fs.writeFileSync(file, text.replace(pattern, replacement));
  console.log("Updated " + file);
  updated += 1;
});

if (failed) console.log("\nSomething did not update. Send me a screenshot of this message.");
else if (updated === 0) console.log("Nothing to update here. Run this inside the folder that contains server.js or src/Admin.jsx.");
else console.log("\nDone.");