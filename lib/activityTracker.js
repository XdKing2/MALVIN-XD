const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data/activity.json');

function loadDB() {
  return fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function logActivity(userId) {
  const db = loadDB();
  db[userId] = Date.now();
  saveDB(db);
}

function getInactiveUsers(days = 7) {
  const db = loadDB();
  const now = Date.now();
  const limit = days * 86400000;
  return Object.entries(db)
    .filter(([_, lastSeen]) => now - lastSeen > limit)
    .map(([id]) => id);
}

module.exports = { logActivity, getInactiveUsers };
