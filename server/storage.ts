import {
  type User, type InsertUser, users,
  type Site, type InsertSite, sites,
  type SameDayJob, type InsertSameDayJob, sameDayJobs,
  type AdhocPoolDriver, type InsertAdhocPoolDriver, adhocPoolDrivers,
  type SameDayContract, type InsertSameDayContract, sameDayContracts,
  type JobPushNotification, jobPushNotifications,
  type Alert, type InsertAlert, alerts,
  type AuditLogEntry, auditLog,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, gte, lte, desc, asc, sql, or } from "drizzle-orm";
import path from "path";
import fs from "fs";

// Use Railway persistent volume at /data if available, otherwise local
const volPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || "";
const dataDir = volPath && fs.existsSync(volPath) ? volPath : ".";
const dbPath = path.join(dataDir, "data.db");
console.log(`[DB] Using database at: ${dbPath}`);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`[DB] Created data directory: ${dataDir}`);
}

let sqlite: ReturnType<typeof Database>;
try {
  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");
  console.log(`[DB] Database opened successfully`);
} catch (err) {
  console.error(`[DB] FATAL: Failed to open database at ${dbPath}:`, err);
  process.exit(1);
}

export const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getUserByEmail(email: string): User | undefined;
  createUser(user: InsertUser): User;
  updateUser(id: number, data: Partial<User>): User | undefined;
  getAllUsers(): User[];
  getUsersByRole(role: string): User[];

  // Sites
  getSite(id: number): Site | undefined;
  getAllSites(): Site[];
  createSite(site: InsertSite): Site;
  updateSite(id: number, data: Partial<Site>): Site | undefined;

  // Jobs
  getJob(id: number): SameDayJob | undefined;
  getAllJobs(filters?: { region?: string; date?: string; status?: string; jobType?: string }): SameDayJob[];
  getJobsByClient(clientUserId: number): SameDayJob[];
  getJobsByDriver(driverId: number): SameDayJob[];
  createJob(job: InsertSameDayJob): SameDayJob;
  updateJob(id: number, data: Partial<SameDayJob>): SameDayJob | undefined;

  // Pool drivers
  getPoolDriver(id: number): AdhocPoolDriver | undefined;
  getPoolDriverByUserId(userId: number): AdhocPoolDriver | undefined;
  getAllPoolDrivers(filters?: { region?: string; status?: string; complianceStatus?: string }): AdhocPoolDriver[];
  createPoolDriver(data: InsertAdhocPoolDriver): AdhocPoolDriver;
  updatePoolDriver(id: number, data: Partial<AdhocPoolDriver>): AdhocPoolDriver | undefined;

  // Contracts
  getContract(id: number): SameDayContract | undefined;
  getContractByJob(jobId: number): SameDayContract | undefined;
  getAllContracts(): SameDayContract[];
  createContract(data: InsertSameDayContract): SameDayContract;
  updateContract(id: number, data: Partial<SameDayContract>): SameDayContract | undefined;

  // Push notifications
  createPushNotification(data: any): JobPushNotification;
  getNotificationsByJob(jobId: number): JobPushNotification[];
  updateNotification(id: number, data: any): JobPushNotification | undefined;

  // Alerts
  getAlertsByUser(userId: number): Alert[];
  createAlert(data: InsertAlert): Alert;
  markAlertRead(id: number): void;

  // Audit
  createAuditEntry(data: any): AuditLogEntry;
  getAuditLog(limit?: number): AuditLogEntry[];
}

export class SqliteStorage implements IStorage {
  // ── Users ──
  getUser(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email)).get();
  }
  createUser(user: InsertUser): User {
    return db.insert(users).values(user).returning().get();
  }
  updateUser(id: number, data: Partial<User>): User | undefined {
    return db.update(users).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(users.id, id)).returning().get();
  }
  getAllUsers(): User[] {
    return db.select().from(users).orderBy(asc(users.name)).all();
  }
  getUsersByRole(role: string): User[] {
    return db.select().from(users).where(eq(users.role, role)).orderBy(asc(users.name)).all();
  }

  // ── Sites ──
  getSite(id: number): Site | undefined {
    return db.select().from(sites).where(eq(sites.id, id)).get();
  }
  getAllSites(): Site[] {
    return db.select().from(sites).where(eq(sites.active, true)).orderBy(asc(sites.name)).all();
  }
  createSite(site: InsertSite): Site {
    return db.insert(sites).values(site).returning().get();
  }
  updateSite(id: number, data: Partial<Site>): Site | undefined {
    return db.update(sites).set(data).where(eq(sites.id, id)).returning().get();
  }

  // ── Jobs ──
  getJob(id: number): SameDayJob | undefined {
    return db.select().from(sameDayJobs).where(eq(sameDayJobs.id, id)).get();
  }
  getAllJobs(filters?: { region?: string; date?: string; status?: string; jobType?: string }): SameDayJob[] {
    const conditions: any[] = [];
    if (filters?.region) conditions.push(eq(sameDayJobs.region, filters.region));
    if (filters?.date) conditions.push(eq(sameDayJobs.date, filters.date));
    if (filters?.status) conditions.push(eq(sameDayJobs.status, filters.status));
    if (filters?.jobType) conditions.push(eq(sameDayJobs.jobType, filters.jobType));
    const query = conditions.length > 0
      ? db.select().from(sameDayJobs).where(and(...conditions))
      : db.select().from(sameDayJobs);
    return query.orderBy(desc(sameDayJobs.createdAt)).all();
  }
  getJobsByClient(clientUserId: number): SameDayJob[] {
    return db.select().from(sameDayJobs).where(eq(sameDayJobs.clientUserId, clientUserId)).orderBy(desc(sameDayJobs.createdAt)).all();
  }
  getJobsByDriver(driverId: number): SameDayJob[] {
    return db.select().from(sameDayJobs).where(eq(sameDayJobs.claimedByDriverId, driverId)).orderBy(desc(sameDayJobs.createdAt)).all();
  }
  createJob(job: InsertSameDayJob): SameDayJob {
    return db.insert(sameDayJobs).values(job).returning().get();
  }
  updateJob(id: number, data: Partial<SameDayJob>): SameDayJob | undefined {
    return db.update(sameDayJobs).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(sameDayJobs.id, id)).returning().get();
  }

  // ── Pool Drivers ──
  getPoolDriver(id: number): AdhocPoolDriver | undefined {
    return db.select().from(adhocPoolDrivers).where(eq(adhocPoolDrivers.id, id)).get();
  }
  getPoolDriverByUserId(userId: number): AdhocPoolDriver | undefined {
    return db.select().from(adhocPoolDrivers).where(eq(adhocPoolDrivers.userId, userId)).get();
  }
  getAllPoolDrivers(filters?: { region?: string; status?: string; complianceStatus?: string }): AdhocPoolDriver[] {
    const conditions: any[] = [];
    if (filters?.region) conditions.push(eq(adhocPoolDrivers.region, filters.region));
    if (filters?.status) conditions.push(eq(adhocPoolDrivers.status, filters.status));
    if (filters?.complianceStatus) conditions.push(eq(adhocPoolDrivers.complianceStatus, filters.complianceStatus));
    const query = conditions.length > 0
      ? db.select().from(adhocPoolDrivers).where(and(...conditions))
      : db.select().from(adhocPoolDrivers);
    return query.orderBy(desc(adhocPoolDrivers.registeredAt)).all();
  }
  createPoolDriver(data: InsertAdhocPoolDriver): AdhocPoolDriver {
    return db.insert(adhocPoolDrivers).values(data).returning().get();
  }
  updatePoolDriver(id: number, data: Partial<AdhocPoolDriver>): AdhocPoolDriver | undefined {
    return db.update(adhocPoolDrivers).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(adhocPoolDrivers.id, id)).returning().get();
  }

  // ── Contracts ──
  getContract(id: number): SameDayContract | undefined {
    return db.select().from(sameDayContracts).where(eq(sameDayContracts.id, id)).get();
  }
  getContractByJob(jobId: number): SameDayContract | undefined {
    return db.select().from(sameDayContracts).where(eq(sameDayContracts.jobId, jobId)).get();
  }
  getAllContracts(): SameDayContract[] {
    return db.select().from(sameDayContracts).orderBy(desc(sameDayContracts.createdAt)).all();
  }
  createContract(data: InsertSameDayContract): SameDayContract {
    return db.insert(sameDayContracts).values(data).returning().get();
  }
  updateContract(id: number, data: Partial<SameDayContract>): SameDayContract | undefined {
    return db.update(sameDayContracts).set(data).where(eq(sameDayContracts.id, id)).returning().get();
  }

  // ── Push Notifications ──
  createPushNotification(data: any): JobPushNotification {
    return db.insert(jobPushNotifications).values(data).returning().get();
  }
  getNotificationsByJob(jobId: number): JobPushNotification[] {
    return db.select().from(jobPushNotifications).where(eq(jobPushNotifications.jobId, jobId)).all();
  }
  updateNotification(id: number, data: any): JobPushNotification | undefined {
    return db.update(jobPushNotifications).set(data).where(eq(jobPushNotifications.id, id)).returning().get();
  }

  // ── Alerts ──
  getAlertsByUser(userId: number): Alert[] {
    return db.select().from(alerts).where(eq(alerts.recipientUserId, userId)).orderBy(desc(alerts.createdAt)).all();
  }
  createAlert(data: InsertAlert): Alert {
    return db.insert(alerts).values(data).returning().get();
  }
  markAlertRead(id: number): void {
    db.update(alerts).set({ read: true }).where(eq(alerts.id, id)).run();
  }

  // ── Audit ──
  createAuditEntry(data: any): AuditLogEntry {
    return db.insert(auditLog).values(data).returning().get();
  }
  getAuditLog(limit: number = 100): AuditLogEntry[] {
    return db.select().from(auditLog).orderBy(desc(auditLog.timestamp)).limit(limit).all();
  }
}

export const storage = new SqliteStorage();
