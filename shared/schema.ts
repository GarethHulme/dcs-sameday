import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ─── ENUMS ───────────────────────────────────────────────────────────────────

export const userRoles = ["driver", "osm", "admin", "client"] as const;
export type UserRole = (typeof userRoles)[number];

export const jobStatuses = ["open", "claimed", "assigned", "in_progress", "completed", "cancelled"] as const;
export type JobStatus = (typeof jobStatuses)[number];

export const jobTypes = ["multi_drop", "single_drop"] as const;
export type JobType = (typeof jobTypes)[number];

export const poolComplianceStatuses = ["pending_review", "approved", "rejected", "suspended"] as const;
export type PoolComplianceStatus = (typeof poolComplianceStatuses)[number];

export const contractStatuses = ["draft", "pending_signatures", "active", "completed", "voided"] as const;
export type ContractStatus = (typeof contractStatuses)[number];

export const notificationChannels = ["email", "whatsapp", "in_app"] as const;
export const notificationResponses = ["accepted", "declined", "expired"] as const;

// ─── USERS ───────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("driver"),
  status: text("status").notNull().default("active"),
  region: text("region"),
  vehicleReg: text("vehicle_reg"),
  vehicleType: text("vehicle_type"),
  complianceStatus: text("compliance_status").default("pending_review"),
  clientCompany: text("client_company"),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export const insertUserSchema = createInsertSchema(users);

// ─── SITES ───────────────────────────────────────────────────────────────────

export const sites = sqliteTable("sites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  client: text("client").notNull(),
  region: text("region"),
  active: integer("active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type Site = typeof sites.$inferSelect;
export type InsertSite = typeof sites.$inferInsert;
export const insertSiteSchema = createInsertSchema(sites);

// ─── SAME DAY JOBS ────────────────────────────────────────────────────────────

export const sameDayJobs = sqliteTable("same_day_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientUserId: integer("client_user_id").references(() => users.id),
  siteId: integer("site_id").references(() => sites.id),
  title: text("title").notNull(),
  description: text("description"),
  jobType: text("job_type").notNull().default("multi_drop"),
  region: text("region").notNull(),
  postcodes: text("postcodes"),
  estimatedStops: integer("estimated_stops"),
  estimatedParcels: integer("estimated_parcels"),
  estimatedHours: real("estimated_hours"),
  payRate: real("pay_rate"),
  additionalPayNotes: text("additional_pay_notes"),
  departureTime: text("departure_time"),
  date: text("date").notNull(),
  status: text("status").notNull().default("open"),
  claimedByDriverId: integer("claimed_by_driver_id").references(() => users.id),
  claimedAt: text("claimed_at"),
  assignedByManagerId: integer("assigned_by_manager_id").references(() => users.id),
  assignedAt: text("assigned_at"),
  completedAt: text("completed_at"),
  cancelledAt: text("cancelled_at"),
  cancelReason: text("cancel_reason"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export type SameDayJob = typeof sameDayJobs.$inferSelect;
export type InsertSameDayJob = typeof sameDayJobs.$inferInsert;
export const insertJobSchema = createInsertSchema(sameDayJobs);

// ─── ADHOC POOL DRIVERS ───────────────────────────────────────────────────────

export const adhocPoolDrivers = sqliteTable("adhoc_pool_drivers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  region: text("region").notNull(),
  preferredSites: text("preferred_sites"),
  availableDays: text("available_days"),
  multiDropCapable: integer("multi_drop_capable", { mode: "boolean" }).default(false),
  singleDropCapable: integer("single_drop_capable", { mode: "boolean" }).default(true),
  hasOwnVehicle: integer("has_own_vehicle", { mode: "boolean" }).default(false),
  vehicleType: text("vehicle_type"),
  insuranceVerified: integer("insurance_verified", { mode: "boolean" }).default(false),
  drivingLicenceVerified: integer("driving_licence_verified", { mode: "boolean" }).default(false),
  rightToWorkVerified: integer("right_to_work_verified", { mode: "boolean" }).default(false),
  complianceStatus: text("compliance_status").notNull().default("pending_review"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: text("approved_at"),
  experienceNotes: text("experience_notes"),
  rating: real("rating").default(0),
  completedJobs: integer("completed_jobs").default(0),
  status: text("status").notNull().default("inactive"),
  registeredAt: text("registered_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export type AdhocPoolDriver = typeof adhocPoolDrivers.$inferSelect;
export type InsertAdhocPoolDriver = typeof adhocPoolDrivers.$inferInsert;
export const insertPoolDriverSchema = createInsertSchema(adhocPoolDrivers);

// ─── SAME DAY CONTRACTS ───────────────────────────────────────────────────────

export const sameDayContracts = sqliteTable("same_day_contracts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull().references(() => sameDayJobs.id),
  clientUserId: integer("client_user_id").references(() => users.id),
  driverUserId: integer("driver_user_id").references(() => users.id),
  contractTerms: text("contract_terms"),
  nonSolicitationClause: integer("non_solicitation_clause", { mode: "boolean" }).default(true),
  acceptedByClient: integer("accepted_by_client", { mode: "boolean" }).default(false),
  acceptedByDriver: integer("accepted_by_driver", { mode: "boolean" }).default(false),
  clientSignedAt: text("client_signed_at"),
  driverSignedAt: text("driver_signed_at"),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type SameDayContract = typeof sameDayContracts.$inferSelect;
export type InsertSameDayContract = typeof sameDayContracts.$inferInsert;

// ─── JOB PUSH NOTIFICATIONS ───────────────────────────────────────────────────

export const jobPushNotifications = sqliteTable("job_push_notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull().references(() => sameDayJobs.id),
  driverUserId: integer("driver_user_id").notNull().references(() => users.id),
  channel: text("channel").notNull().default("in_app"),
  sentAt: text("sent_at").notNull().default(sql`(datetime('now'))`),
  respondedAt: text("responded_at"),
  response: text("response"),
  expiresAt: text("expires_at"),
});

export type JobPushNotification = typeof jobPushNotifications.$inferSelect;

// ─── ALERTS ──────────────────────────────────────────────────────────────────

export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  priority: text("priority").notNull().default("info"),
  title: text("title").notNull(),
  message: text("message"),
  recipientUserId: integer("recipient_user_id").references(() => users.id),
  read: integer("read", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  targetEntity: text("target_entity"),
  targetId: integer("target_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
