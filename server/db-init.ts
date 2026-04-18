import { db } from "./storage";
import { sql } from "drizzle-orm";

export function initializeDatabase() {
  try {
    db.run(sql`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'driver',
      status TEXT NOT NULL DEFAULT 'active',
      region TEXT,
      vehicle_reg TEXT,
      vehicle_type TEXT,
      compliance_status TEXT DEFAULT 'pending_review',
      client_company TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    db.run(sql`CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      address TEXT,
      client TEXT NOT NULL,
      region TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    db.run(sql`CREATE TABLE IF NOT EXISTS same_day_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_user_id INTEGER REFERENCES users(id),
      site_id INTEGER REFERENCES sites(id),
      title TEXT NOT NULL,
      description TEXT,
      job_type TEXT NOT NULL DEFAULT 'multi_drop',
      region TEXT NOT NULL,
      postcodes TEXT,
      estimated_stops INTEGER,
      estimated_parcels INTEGER,
      estimated_hours REAL,
      pay_rate REAL,
      additional_pay_notes TEXT,
      departure_time TEXT,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      claimed_by_driver_id INTEGER REFERENCES users(id),
      claimed_at TEXT,
      assigned_by_manager_id INTEGER REFERENCES users(id),
      assigned_at TEXT,
      completed_at TEXT,
      cancelled_at TEXT,
      cancel_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    db.run(sql`CREATE TABLE IF NOT EXISTS adhoc_pool_drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      region TEXT NOT NULL,
      preferred_sites TEXT,
      available_days TEXT,
      multi_drop_capable INTEGER DEFAULT 0,
      single_drop_capable INTEGER DEFAULT 1,
      has_own_vehicle INTEGER DEFAULT 0,
      vehicle_type TEXT,
      insurance_verified INTEGER DEFAULT 0,
      driving_licence_verified INTEGER DEFAULT 0,
      right_to_work_verified INTEGER DEFAULT 0,
      compliance_status TEXT NOT NULL DEFAULT 'pending_review',
      approved_by INTEGER REFERENCES users(id),
      approved_at TEXT,
      experience_notes TEXT,
      rating REAL DEFAULT 0,
      completed_jobs INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'inactive',
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    db.run(sql`CREATE TABLE IF NOT EXISTS same_day_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL REFERENCES same_day_jobs(id),
      client_user_id INTEGER REFERENCES users(id),
      driver_user_id INTEGER REFERENCES users(id),
      contract_terms TEXT,
      non_solicitation_clause INTEGER DEFAULT 1,
      accepted_by_client INTEGER DEFAULT 0,
      accepted_by_driver INTEGER DEFAULT 0,
      client_signed_at TEXT,
      driver_signed_at TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    db.run(sql`CREATE TABLE IF NOT EXISTS job_push_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL REFERENCES same_day_jobs(id),
      driver_user_id INTEGER NOT NULL REFERENCES users(id),
      channel TEXT NOT NULL DEFAULT 'in_app',
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      responded_at TEXT,
      response TEXT,
      expires_at TEXT
    )`);

    db.run(sql`CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT,
      recipient_user_id INTEGER REFERENCES users(id),
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    db.run(sql`CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      target_entity TEXT,
      target_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    console.log("[DB] All tables initialised");
  } catch (err) {
    console.error("[DB] Failed to initialise tables:", err);
    throw err;
  }
}
