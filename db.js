const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DEFAULT_DB_PATH = process.env.DB_PATH || path.join(__dirname, 'leaderboard.db');

class LeaderboardDb {
  constructor(dbPath = DEFAULT_DB_PATH) {
    this.db = new DatabaseSync(dbPath);
    this._init();
  }

  _init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);
  }

  addScore(name, score) {
    const stmt = this.db.prepare(
      'INSERT INTO scores (name, score, timestamp) VALUES (?, ?, ?)'
    );
    const safeName = String(name).slice(0, 50);
    const safeScore = Math.floor(score);
    const timestamp = new Date().toISOString();
    const result = stmt.run(safeName, safeScore, timestamp);
    return { id: result.lastInsertRowid, name: safeName, score: safeScore, timestamp };
  }

  getTopScores(limit = 10) {
    const stmt = this.db.prepare(
      'SELECT name, score, timestamp FROM scores ORDER BY score DESC, timestamp ASC LIMIT ?'
    );
    return stmt.all(limit);
  }

  getAllScores() {
    const stmt = this.db.prepare(
      'SELECT name, score, timestamp FROM scores ORDER BY score DESC, timestamp ASC'
    );
    return stmt.all();
  }

  getScoreCount() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM scores');
    return stmt.get().count;
  }

  clearAllScores() {
    this.db.exec('DELETE FROM scores');
  }

  close() {
    this.db.close();
  }
}

module.exports = { LeaderboardDb };
