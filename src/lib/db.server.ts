// Local SQLite database (Node's built-in node:sqlite — no native addons, no cloud).
// The database is a single file; back it up by copying it.
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

let db: DatabaseSync | null = null;

/** Ordered schema migrations. Append new entries; never edit old ones. */
const MIGRATIONS: string[] = [
  `CREATE TABLE users (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL UNIQUE COLLATE NOCASE,
     display_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
     password_hash TEXT NOT NULL,
     settings TEXT,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE user_roles (
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     role TEXT NOT NULL CHECK (role IN ('admin','user')),
     PRIMARY KEY (user_id, role)
   );
   CREATE TABLE sessions (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at INTEGER NOT NULL
   );
   CREATE TABLE games (
     id TEXT PRIMARY KEY,
     owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     status TEXT NOT NULL,
     data TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE game_players (
     game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
     seat INTEGER NOT NULL,
     user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
     guest_name TEXT,
     PRIMARY KEY (game_id, seat)
   );
   CREATE INDEX game_players_user ON game_players(user_id);`,
];

export function getDb(): DatabaseSync {
  if (db) return db;
  const file = resolve(process.env["DATABASE_FILE"] ?? "data/yatzy.db");
  mkdirSync(dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const version = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec("BEGIN");
    db.exec(MIGRATIONS[i]!);
    db.exec(`PRAGMA user_version = ${i + 1}`);
    db.exec("COMMIT");
  }
  return db;
}

export function tx<T>(fn: (d: DatabaseSync) => T): T {
  const d = getDb();
  d.exec("BEGIN");
  try {
    const r = fn(d);
    d.exec("COMMIT");
    return r;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
