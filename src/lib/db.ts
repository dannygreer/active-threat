import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'data', 'quiz.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      answer_1 INTEGER NOT NULL,
      answer_2 INTEGER NOT NULL,
      answer_3 INTEGER NOT NULL,
      time_1_ms INTEGER NOT NULL,
      time_2_ms INTEGER NOT NULL,
      time_3_ms INTEGER NOT NULL,
      total_time_ms INTEGER NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  return db;
}

export function insertResult(data: {
  firstName: string;
  lastName: string;
  answers: number[];
  times: number[];
}) {
  const totalTime = data.times.reduce((sum, t) => sum + t, 0);
  const stmt = getDb().prepare(`
    INSERT INTO quiz_results (first_name, last_name, answer_1, answer_2, answer_3, time_1_ms, time_2_ms, time_3_ms, total_time_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    data.firstName,
    data.lastName,
    data.answers[0],
    data.answers[1],
    data.answers[2],
    data.times[0],
    data.times[1],
    data.times[2],
    totalTime
  );
}

export interface QuizResultRow {
  id: number;
  first_name: string;
  last_name: string;
  answer_1: number;
  answer_2: number;
  answer_3: number;
  time_1_ms: number;
  time_2_ms: number;
  time_3_ms: number;
  total_time_ms: number;
  completed_at: string;
}

export function getAllResults(): QuizResultRow[] {
  return getDb()
    .prepare('SELECT * FROM quiz_results ORDER BY completed_at DESC')
    .all() as QuizResultRow[];
}

export function getAverageTime(): number | null {
  const row = getDb()
    .prepare('SELECT AVG(total_time_ms) as avg_time FROM quiz_results')
    .get() as { avg_time: number | null } | undefined;
  return row?.avg_time ?? null;
}
