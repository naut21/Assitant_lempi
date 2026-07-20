import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'path'

export const databasePath = resolve('database.db')
export const database = new DatabaseSync(databasePath, { timeout: 10000 })

database.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    jid TEXT NOT NULL,
    name TEXT NOT NULL,
    commands INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_seen TEXT NOT NULL
  ) STRICT;
`)

const saveUser = database.prepare(`
  INSERT INTO users (id, jid, name, commands, created_at, last_seen)
  VALUES (?, ?, ?, 1, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    jid = excluded.jid,
    name = excluded.name,
    commands = users.commands + 1,
    last_seen = excluded.last_seen
`)

const listUsers = database.prepare(`
  SELECT id, jid, name, commands, created_at, last_seen
  FROM users
  ORDER BY commands DESC, last_seen DESC
  LIMIT ?
`)

const countUsers = database.prepare('SELECT COUNT(*) AS total FROM users')

export function registerUser({ id, jid, name }) {
  const now = new Date().toISOString()
  saveUser.run(id, jid, name || 'Usuario', now, now)
}

export function getUsers(limit = 50) {
  return listUsers.all(limit)
}

export function getUserCount() {
  return countUsers.get().total
}

export function checkpointDatabase() {
  database.exec('PRAGMA wal_checkpoint(FULL)')
}
