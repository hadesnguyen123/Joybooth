import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface SessionRecord {
  id: string
  status: 'ACTIVE' | 'COMPLETED' | 'ABORTED'
  started_at: string
  completed_at?: string
  total_slots: number
  layout_id?: string
  price?: number
  payment_status: 'PENDING' | 'PAID' | 'SKIPPED'
  print_copies: number
  updated_at: string
}

export interface CaptureRecordDB {
  id: string
  session_id: string
  slot_index: number
  status: string
  file_path?: string
  raw_file_path?: string
  is_retake: number
  retake_count: number
  latency_ms?: number
  shutter_ms?: number
  transfer_ms?: number
  created_at: string
  updated_at: string
}

export interface MediaFileRecord {
  id: string
  session_id: string
  capture_id?: string
  type: 'raw' | 'composite' | 'print' | 'qr' | 'timelapse'
  file_path: string
  file_size?: number
  created_at: string
}

export interface PrintJobRecord {
  id: string
  session_id: string
  file_path: string
  copies: number
  status: 'QUEUED' | 'PRINTING' | 'SUCCESS' | 'FAILED'
  printer_name?: string
  created_at: string
  completed_at?: string
  error?: string
}

let dbInstance: DatabaseSync | null = null

export function getDatabase(customPath?: string): DatabaseSync {
  if (dbInstance) return dbInstance

  const dbPath = customPath || path.join(process.cwd(), 'fotolism_sessions.db')
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const db = new DatabaseSync(dbPath)

  // Initialize SQLite Schema according to Fotolism 2.2 Architecture (FR-06)
  db.exec(`
    CREATE TABLE IF NOT EXISTS Sessions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      total_slots INTEGER NOT NULL DEFAULT 4,
      layout_id TEXT,
      price INTEGER DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      print_copies INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Captures (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      slot_index INTEGER NOT NULL,
      status TEXT NOT NULL,
      file_path TEXT,
      raw_file_path TEXT,
      is_retake INTEGER NOT NULL DEFAULT 0,
      retake_count INTEGER NOT NULL DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      shutter_ms INTEGER DEFAULT 0,
      transfer_ms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES Sessions(id)
    );

    CREATE TABLE IF NOT EXISTS MediaFiles (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      capture_id TEXT,
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES Sessions(id)
    );

    CREATE TABLE IF NOT EXISTS PrintJobs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      copies INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'QUEUED',
      printer_name TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      error TEXT,
      FOREIGN KEY(session_id) REFERENCES Sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_captures_session ON Captures(session_id);
    CREATE INDEX IF NOT EXISTS idx_media_session ON MediaFiles(session_id);
    CREATE INDEX IF NOT EXISTS idx_print_session ON PrintJobs(session_id);
  `)

  dbInstance = db
  return db
}

export const SessionDB = {
  createSession(session: Omit<SessionRecord, 'updated_at'>): SessionRecord {
    const db = getDatabase()
    const now = new Date().toISOString()
    const record: SessionRecord = { ...session, updated_at: now }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO Sessions (
        id, status, started_at, completed_at, total_slots, layout_id, price, payment_status, print_copies, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      record.id,
      record.status,
      record.started_at,
      record.completed_at || null,
      record.total_slots,
      record.layout_id || null,
      record.price || 0,
      record.payment_status,
      record.print_copies,
      record.updated_at
    )

    return record
  },

  updateSession(id: string, updates: Partial<SessionRecord>): void {
    const db = getDatabase()
    const now = new Date().toISOString()
    const fields: string[] = []
    const values: any[] = []

    for (const [key, val] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`)
        values.push(val)
      }
    }
    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const sql = `UPDATE Sessions SET ${fields.join(', ')} WHERE id = ?`
    db.prepare(sql).run(...values)
  },

  getSession(id: string): SessionRecord | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM Sessions WHERE id = ?').get(id) as any
    return row ? (row as SessionRecord) : null
  },

  getActiveSession(): SessionRecord | null {
    const db = getDatabase()
    const row = db.prepare("SELECT * FROM Sessions WHERE status = 'ACTIVE' ORDER BY started_at DESC LIMIT 1").get() as any
    return row ? (row as SessionRecord) : null
  },

  saveCapture(capture: Omit<CaptureRecordDB, 'created_at' | 'updated_at'>): CaptureRecordDB {
    const db = getDatabase()
    const now = new Date().toISOString()

    // Kiểm tra số lần retake hiện tại trên slot này
    const existing = db
      .prepare('SELECT COUNT(*) as count FROM Captures WHERE session_id = ? AND slot_index = ?')
      .get(capture.session_id, capture.slot_index) as any
    const retakeCount = (existing?.count || 0)

    const record: CaptureRecordDB = {
      ...capture,
      is_retake: retakeCount > 0 ? 1 : 0,
      retake_count: retakeCount,
      created_at: now,
      updated_at: now,
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO Captures (
        id, session_id, slot_index, status, file_path, raw_file_path, is_retake, retake_count,
        latency_ms, shutter_ms, transfer_ms, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      record.id,
      record.session_id,
      record.slot_index,
      record.status,
      record.file_path || null,
      record.raw_file_path || null,
      record.is_retake,
      record.retake_count,
      record.latency_ms || 0,
      record.shutter_ms || 0,
      record.transfer_ms || 0,
      record.created_at,
      record.updated_at
    )

    return record
  },

  getCaptures(sessionId: string): CaptureRecordDB[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM Captures WHERE session_id = ? ORDER BY slot_index ASC, created_at ASC').all(sessionId) as any[]
    return rows as CaptureRecordDB[]
  },

  recordMediaFile(media: Omit<MediaFileRecord, 'created_at'>): MediaFileRecord {
    const db = getDatabase()
    const now = new Date().toISOString()
    const record: MediaFileRecord = { ...media, created_at: now }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO MediaFiles (id, session_id, capture_id, type, file_path, file_size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      record.id,
      record.session_id,
      record.capture_id || null,
      record.type,
      record.file_path,
      record.file_size || 0,
      record.created_at
    )

    return record
  },

  createPrintJob(job: Omit<PrintJobRecord, 'created_at'>): PrintJobRecord {
    const db = getDatabase()
    const now = new Date().toISOString()
    const record: PrintJobRecord = { ...job, created_at: now }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO PrintJobs (id, session_id, file_path, copies, status, printer_name, created_at, completed_at, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      record.id,
      record.session_id,
      record.file_path,
      record.copies,
      record.status,
      record.printer_name || null,
      record.created_at,
      record.completed_at || null,
      record.error || null
    )

    return record
  },

  updatePrintJob(id: string, status: PrintJobRecord['status'], error?: string): void {
    const db = getDatabase()
    const now = new Date().toISOString()
    const stmt = db.prepare('UPDATE PrintJobs SET status = ?, error = ?, completed_at = ? WHERE id = ?')
    stmt.run(status, error || null, now, id)
  },
}
