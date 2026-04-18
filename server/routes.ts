import { type Express, type Request, type Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { authenticate, requireRole, hashPassword, verifyPassword, generateToken } from "./auth";

function audit(userId: number | undefined, action: string, entity?: string, id?: number, oldVal?: any, newVal?: any) {
  try {
    storage.createAuditEntry({
      userId: userId ?? null,
      action,
      targetEntity: entity ?? null,
      targetId: id ?? null,
      oldValue: oldVal ? JSON.stringify(oldVal) : null,
      newValue: newVal ? JSON.stringify(newVal) : null,
    });
  } catch { /* non-fatal */ }
}

function generateContractTerms(job: any, driver: any, client: any): string {
  return `DCS SAME DAY AD-HOC DRIVER AGREEMENT

Date: ${new Date().toLocaleDateString("en-GB")}

PARTIES:
- DCS Command Suite (Operator)
- Client: ${client?.name ?? "Client"}
- Driver: ${driver?.name ?? "Driver"}

JOB REFERENCE: Job #${job.id} — ${job.title}
Date: ${job.date}
Region: ${job.region}
Job Type: ${job.jobType === "multi_drop" ? "Multi Drop" : "Single Drop"}
Estimated Stops: ${job.estimatedStops ?? "TBC"}
Pay Rate: £${job.payRate ?? "TBC"}/day

TERMS:
1. The driver agrees to complete the delivery job as described above.
2. The driver shall maintain professional standards throughout the engagement.
3. All deliveries must comply with applicable laws and client requirements.
4. NON-SOLICITATION: The driver agrees not to approach or solicit business directly from the client for a period of 12 months following completion of this engagement, bypassing DCS Command Suite.
5. Payment will be processed within 5 working days of job completion.
6. DCS reserves the right to cancel this engagement with reasonable notice.

By accepting this contract, all parties confirm agreement to the above terms.`;
}

export async function registerRoutes(server: Server, app: Express) {
  // ─────────────────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────────────────

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    // Support login by username or email
    let user = storage.getUserByEmail(email);
    if (!user) user = storage.getUserByEmail(email + "@dcs.com");
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    storage.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    const token = generateToken(user);
    audit(user.id, "login");
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, region: user.region } });
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name, phone, role } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "Email, password and name required" });

    const existing = storage.getUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await hashPassword(password);
    const user = storage.createUser({ email, passwordHash, name, phone, role: role || "driver" });
    const token = generateToken(user);
    audit(user.id, "register");
    return res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  app.get("/api/auth/me", authenticate, (req: Request, res: Response) => {
    const user = storage.getUser(req.user!.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash: _, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.post("/api/auth/logout", authenticate, (req: Request, res: Response) => {
    audit(req.user?.userId, "logout");
    return res.json({ ok: true });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // JOBS
  // ─────────────────────────────────────────────────────────────────────────

  app.get("/api/jobs", authenticate, (req: Request, res: Response) => {
    const { region, date, status, jobType } = req.query as Record<string, string>;
    const user = req.user!;

    let jobs = storage.getAllJobs({ region, date, status, jobType });

    // Drivers only see open jobs in their region + their own claimed jobs
    if (user.role === "driver") {
      const myUser = storage.getUser(user.userId);
      jobs = jobs.filter(j =>
        j.status === "open" ||
        j.claimedByDriverId === user.userId
      );
      if (myUser?.region && !region) {
        jobs = jobs.filter(j => j.status !== "open" || j.region === myUser.region);
      }
    }
    // Clients only see their own jobs
    if (user.role === "client") {
      jobs = jobs.filter(j => j.clientUserId === user.userId);
    }

    return res.json(jobs);
  });

  app.post("/api/jobs", authenticate, requireRole("osm", "admin", "client"), async (req: Request, res: Response) => {
    const { title, description, jobType, region, date, estimatedStops, estimatedParcels, estimatedHours, payRate, additionalPayNotes, postcodes, departureTime, siteId } = req.body;
    if (!title || !region || !date) return res.status(400).json({ error: "Title, region and date required" });

    const job = storage.createJob({
      title, description, jobType: jobType || "multi_drop",
      region, date,
      estimatedStops: estimatedStops ?? null,
      estimatedParcels: estimatedParcels ?? null,
      estimatedHours: estimatedHours ?? null,
      payRate: payRate ?? null,
      additionalPayNotes: additionalPayNotes ?? null,
      postcodes: postcodes ?? null,
      departureTime: departureTime ?? null,
      siteId: siteId ?? null,
      clientUserId: req.user!.role === "client" ? req.user!.userId : (req.body.clientUserId ?? null),
      status: "open",
    });

    // Auto-generate contract draft
    const client = req.user!.role === "client" ? storage.getUser(req.user!.userId) : null;
    const contractTerms = generateContractTerms(job, null, client);
    storage.createContract({
      jobId: job.id,
      clientUserId: req.user!.role === "client" ? req.user!.userId : null,
      driverUserId: null,
      contractTerms,
      status: "draft",
    });

    audit(req.user!.userId, "create_job", "job", job.id, null, job);
    return res.status(201).json(job);
  });

  app.get("/api/jobs/:id", authenticate, (req: Request, res: Response) => {
    const job = storage.getJob(parseInt(req.params.id as string));
    if (!job) return res.status(404).json({ error: "Job not found" });
    return res.json(job);
  });

  app.patch("/api/jobs/:id", authenticate, requireRole("osm", "admin"), (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const job = storage.getJob(id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    const updated = storage.updateJob(id, req.body);
    audit(req.user!.userId, "update_job", "job", id, job, updated);
    return res.json(updated);
  });

  app.post("/api/jobs/:id/claim", authenticate, requireRole("driver"), (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const job = storage.getJob(id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== "open") return res.status(400).json({ error: "Job is not available" });

    // Check driver is in pool and approved
    const poolEntry = storage.getPoolDriverByUserId(req.user!.userId);
    if (!poolEntry || poolEntry.complianceStatus !== "approved") {
      return res.status(403).json({ error: "You must be an approved pool driver to claim jobs" });
    }

    const updated = storage.updateJob(id, {
      status: "claimed",
      claimedByDriverId: req.user!.userId,
      claimedAt: new Date().toISOString(),
    });

    // Update contract with driver
    const contract = storage.getContractByJob(id);
    if (contract) {
      storage.updateContract(contract.id, { driverUserId: req.user!.userId, status: "pending_signatures" });
    }

    audit(req.user!.userId, "claim_job", "job", id, job, updated);

    // Alert manager
    const managers = storage.getUsersByRole("osm");
    for (const mgr of managers) {
      storage.createAlert({ type: "job_claimed", priority: "info", title: "Job Claimed", message: `Job #${id} has been claimed by a driver`, recipientUserId: mgr.id });
    }

    return res.json(updated);
  });

  app.post("/api/jobs/:id/assign", authenticate, requireRole("osm", "admin"), (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: "driverId required" });
    const job = storage.getJob(id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const updated = storage.updateJob(id, {
      status: "assigned",
      claimedByDriverId: driverId,
      assignedByManagerId: req.user!.userId,
      assignedAt: new Date().toISOString(),
    });

    const contract = storage.getContractByJob(id);
    if (contract) {
      storage.updateContract(contract.id, { driverUserId: driverId, status: "pending_signatures" });
    }

    audit(req.user!.userId, "assign_job", "job", id, job, updated);
    return res.json(updated);
  });

  app.post("/api/jobs/:id/complete", authenticate, (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const job = storage.getJob(id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (req.user!.role === "driver" && job.claimedByDriverId !== req.user!.userId) {
      return res.status(403).json({ error: "Not your job" });
    }

    const updated = storage.updateJob(id, { status: "completed", completedAt: new Date().toISOString() });

    // Increment driver completed jobs
    if (job.claimedByDriverId) {
      const pool = storage.getPoolDriverByUserId(job.claimedByDriverId);
      if (pool) {
        storage.updatePoolDriver(pool.id, { completedJobs: (pool.completedJobs ?? 0) + 1 });
      }
    }

    const contract = storage.getContractByJob(id);
    if (contract) {
      storage.updateContract(contract.id, { status: "completed" });
    }

    audit(req.user!.userId, "complete_job", "job", id, job, updated);
    return res.json(updated);
  });

  app.post("/api/jobs/:id/cancel", authenticate, requireRole("osm", "admin", "client"), (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const { reason } = req.body;
    const job = storage.getJob(id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const updated = storage.updateJob(id, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancelReason: reason ?? null,
    });

    audit(req.user!.userId, "cancel_job", "job", id, job, updated);
    return res.json(updated);
  });

  app.post("/api/jobs/:id/push", authenticate, requireRole("osm", "admin"), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const job = storage.getJob(id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Get approved pool drivers in same region
    const poolDrivers = storage.getAllPoolDrivers({ region: job.region, complianceStatus: "approved" });
    const notifications = [];

    for (const pd of poolDrivers) {
      const notif = storage.createPushNotification({
        jobId: id,
        driverUserId: pd.userId,
        channel: "in_app",
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      });
      notifications.push(notif);

      // Create in-app alert
      storage.createAlert({
        type: "new_job",
        priority: "info",
        title: "New Job Available",
        message: `A new ${job.jobType === "multi_drop" ? "multi-drop" : "single-drop"} job is available in ${job.region} on ${job.date}`,
        recipientUserId: pd.userId,
      });
    }

    return res.json({ pushed: notifications.length });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POOL
  // ─────────────────────────────────────────────────────────────────────────

  app.get("/api/pool", authenticate, requireRole("osm", "admin"), (req: Request, res: Response) => {
    const { region, status, complianceStatus } = req.query as Record<string, string>;
    return res.json(storage.getAllPoolDrivers({ region, status, complianceStatus }));
  });

  app.post("/api/pool/register", authenticate, requireRole("driver"), async (req: Request, res: Response) => {
    const existing = storage.getPoolDriverByUserId(req.user!.userId);
    if (existing) return res.status(409).json({ error: "Already registered in pool" });

    const poolDriver = storage.createPoolDriver({
      userId: req.user!.userId,
      region: req.body.region || "NW",
      preferredSites: req.body.preferredSites ? JSON.stringify(req.body.preferredSites) : null,
      availableDays: req.body.availableDays ? JSON.stringify(req.body.availableDays) : null,
      multiDropCapable: req.body.multiDropCapable ?? false,
      singleDropCapable: req.body.singleDropCapable ?? true,
      hasOwnVehicle: req.body.hasOwnVehicle ?? false,
      vehicleType: req.body.vehicleType ?? null,
      experienceNotes: req.body.experienceNotes ?? null,
      complianceStatus: "pending_review",
      status: "inactive",
    });

    audit(req.user!.userId, "pool_register", "pool_driver", poolDriver.id, null, poolDriver);

    // Alert managers
    const managers = storage.getUsersByRole("osm");
    for (const mgr of managers) {
      storage.createAlert({ type: "new_registration", priority: "info", title: "New Pool Registration", message: `A driver has applied to join the ad-hoc pool`, recipientUserId: mgr.id });
    }

    return res.status(201).json(poolDriver);
  });

  app.get("/api/pool/:id", authenticate, requireRole("osm", "admin"), (req: Request, res: Response) => {
    const pool = storage.getPoolDriver(parseInt(req.params.id as string));
    if (!pool) return res.status(404).json({ error: "Not found" });
    return res.json(pool);
  });

  app.patch("/api/pool/:id", authenticate, requireRole("osm", "admin"), (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const updated = storage.updatePoolDriver(id, req.body);
    return res.json(updated);
  });

  app.post("/api/pool/:id/approve", authenticate, requireRole("osm", "admin"), (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const pool = storage.getPoolDriver(id);
    if (!pool) return res.status(404).json({ error: "Not found" });
    const updated = storage.updatePoolDriver(id, {
      complianceStatus: "approved",
      status: "active",
      approvedBy: req.user!.userId,
      approvedAt: new Date().toISOString(),
    });
    storage.createAlert({ type: "pool_approved", priority: "info", title: "Pool Application Approved", message: "Your ad-hoc driver pool application has been approved. You can now claim jobs.", recipientUserId: pool.userId });
    audit(req.user!.userId, "pool_approve", "pool_driver", id);
    return res.json(updated);
  });

  app.post("/api/pool/:id/reject", authenticate, requireRole("osm", "admin"), (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const pool = storage.getPoolDriver(id);
    if (!pool) return res.status(404).json({ error: "Not found" });
    const updated = storage.updatePoolDriver(id, { complianceStatus: "rejected", status: "inactive" });
    storage.createAlert({ type: "pool_rejected", priority: "warning", title: "Pool Application Rejected", message: "Unfortunately your ad-hoc driver pool application was not approved.", recipientUserId: pool.userId });
    audit(req.user!.userId, "pool_reject", "pool_driver", id);
    return res.json(updated);
  });

  app.post("/api/pool/:id/suspend", authenticate, requireRole("osm", "admin"), (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const updated = storage.updatePoolDriver(id, { complianceStatus: "suspended", status: "inactive" });
    audit(req.user!.userId, "pool_suspend", "pool_driver", id);
    return res.json(updated);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CONTRACTS
  // ─────────────────────────────────────────────────────────────────────────

  app.get("/api/contracts", authenticate, (req: Request, res: Response) => {
    const user = req.user!;
    let contracts = storage.getAllContracts();
    if (user.role === "client") {
      contracts = contracts.filter(c => c.clientUserId === user.userId);
    } else if (user.role === "driver") {
      contracts = contracts.filter(c => c.driverUserId === user.userId);
    }
    return res.json(contracts);
  });

  app.get("/api/contracts/:id", authenticate, (req: Request, res: Response) => {
    const contract = storage.getContract(parseInt(req.params.id as string));
    if (!contract) return res.status(404).json({ error: "Not found" });
    return res.json(contract);
  });

  app.post("/api/contracts/:jobId/generate", authenticate, requireRole("osm", "admin"), (req: Request, res: Response) => {
    const jobId = parseInt(req.params.jobId as string);
    const job = storage.getJob(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const existing = storage.getContractByJob(jobId);
    if (existing) return res.json(existing);

    const driver = job.claimedByDriverId ? storage.getUser(job.claimedByDriverId) : null;
    const client = job.clientUserId ? storage.getUser(job.clientUserId) : null;
    const contractTerms = generateContractTerms(job, driver, client);

    const contract = storage.createContract({
      jobId,
      clientUserId: job.clientUserId ?? null,
      driverUserId: job.claimedByDriverId ?? null,
      contractTerms,
      status: "draft",
    });
    return res.status(201).json(contract);
  });

  app.post("/api/contracts/:id/sign", authenticate, (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const contract = storage.getContract(id);
    if (!contract) return res.status(404).json({ error: "Not found" });

    const user = req.user!;
    const now = new Date().toISOString();
    const update: any = {};

    if (user.role === "client" && contract.clientUserId === user.userId) {
      update.acceptedByClient = true;
      update.clientSignedAt = now;
    } else if (user.role === "driver" && contract.driverUserId === user.userId) {
      update.acceptedByDriver = true;
      update.driverSignedAt = now;
    } else if (user.role === "osm" || user.role === "admin") {
      update.acceptedByClient = true;
      update.clientSignedAt = now;
    } else {
      return res.status(403).json({ error: "Not a party to this contract" });
    }

    const updated = storage.updateContract(id, update);

    // Auto-activate if both signed
    if (updated && (updated.acceptedByClient || !updated.clientUserId) && (updated.acceptedByDriver || !updated.driverUserId)) {
      storage.updateContract(id, { status: "active" });
    }

    return res.json(updated);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────────────────────────────────

  app.get("/api/users", authenticate, requireRole("admin", "osm"), (req: Request, res: Response) => {
    return res.json(storage.getAllUsers().map(u => { const { passwordHash: _, ...s } = u; return s; }));
  });

  app.patch("/api/users/:id", authenticate, requireRole("admin", "osm"), (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const { passwordHash: _, ...safeBody } = req.body;
    const updated = storage.updateUser(id, safeBody);
    if (!updated) return res.status(404).json({ error: "Not found" });
    const { passwordHash: __, ...safeUpdated } = updated;
    return res.json(safeUpdated);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SITES
  // ─────────────────────────────────────────────────────────────────────────

  app.get("/api/sites", authenticate, (req: Request, res: Response) => {
    return res.json(storage.getAllSites());
  });

  app.post("/api/sites", authenticate, requireRole("admin"), (req: Request, res: Response) => {
    const { name, code, address, client, region } = req.body;
    if (!name || !code || !client) return res.status(400).json({ error: "Name, code and client required" });
    const site = storage.createSite({ name, code, address, client, region });
    return res.status(201).json(site);
  });

  app.patch("/api/sites/:id", authenticate, requireRole("admin"), (req: Request, res: Response) => {
    const updated = storage.updateSite(parseInt(req.params.id as string), req.body);
    return res.json(updated);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ALERTS
  // ─────────────────────────────────────────────────────────────────────────

  app.get("/api/alerts", authenticate, (req: Request, res: Response) => {
    return res.json(storage.getAlertsByUser(req.user!.userId));
  });

  app.patch("/api/alerts/:id/read", authenticate, (req: Request, res: Response) => {
    storage.markAlertRead(parseInt(req.params.id as string));
    return res.json({ ok: true });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AUDIT LOG
  // ─────────────────────────────────────────────────────────────────────────

  app.get("/api/audit", authenticate, requireRole("admin"), (req: Request, res: Response) => {
    return res.json(storage.getAuditLog(200));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEED
  // ─────────────────────────────────────────────────────────────────────────

  app.post("/api/seed", async (req: Request, res: Response) => {
    try {
      // Check if already seeded
      const existing = storage.getUserByEmail("admin");
      if (existing) return res.json({ message: "Already seeded" });

      const now = new Date().toISOString();

      // Create admin
      const admin = storage.createUser({
        email: "admin",
        passwordHash: await hashPassword("admin123"),
        name: "Gareth Hulme",
        role: "admin",
        status: "active",
        region: "NW",
      });

      // Create OSM
      const osm = storage.createUser({
        email: "osm@dcs.com",
        passwordHash: await hashPassword("osm123"),
        name: "Sarah Mitchell",
        role: "osm",
        status: "active",
        region: "NW",
      });

      // Create drivers
      const driver1 = storage.createUser({
        email: "driver1@dcs.com",
        passwordHash: await hashPassword("driver123"),
        name: "Tom Williams",
        role: "driver",
        status: "active",
        region: "NW",
        vehicleType: "own",
      });

      const driver2 = storage.createUser({
        email: "driver2@dcs.com",
        passwordHash: await hashPassword("driver123"),
        name: "Emma Clarke",
        role: "driver",
        status: "active",
        region: "SCO",
        vehicleType: "own",
      });

      const driver3 = storage.createUser({
        email: "driver3@dcs.com",
        passwordHash: await hashPassword("driver123"),
        name: "James Harper",
        role: "driver",
        status: "active",
        region: "NW",
        vehicleType: "own",
      });

      // Create client
      const client = storage.createUser({
        email: "client@dpd.com",
        passwordHash: await hashPassword("client123"),
        name: "DPD Operations",
        role: "client",
        status: "active",
        clientCompany: "DPD",
      });

      // Create sites
      const site1 = storage.createSite({ name: "DPD Liverpool", code: "DPD-LVP", address: "Estuary Commerce Park, Liverpool, L24 8RL", client: "DPD", region: "NW" });
      const site2 = storage.createSite({ name: "InPost Scotland", code: "INP-SCO", address: "Eurocentral, Motherwell, ML1 4WQ", client: "InPost", region: "SCO" });

      // Create approved pool registrations
      const pool1 = storage.createPoolDriver({
        userId: driver1.id, region: "NW",
        multiDropCapable: true, singleDropCapable: true, hasOwnVehicle: true, vehicleType: "van",
        insuranceVerified: true, drivingLicenceVerified: true, rightToWorkVerified: true,
        complianceStatus: "approved", status: "active",
        approvedBy: admin.id, approvedAt: now,
        completedJobs: 12, rating: 4.7,
        experienceNotes: "Former DPD employed driver, excellent track record.",
      });

      const pool2 = storage.createPoolDriver({
        userId: driver2.id, region: "SCO",
        multiDropCapable: false, singleDropCapable: true, hasOwnVehicle: true, vehicleType: "car",
        insuranceVerified: true, drivingLicenceVerified: true, rightToWorkVerified: true,
        complianceStatus: "approved", status: "active",
        approvedBy: admin.id, approvedAt: now,
        completedJobs: 5, rating: 4.5,
      });

      const pool3 = storage.createPoolDriver({
        userId: driver3.id, region: "NW",
        multiDropCapable: true, singleDropCapable: true, hasOwnVehicle: true, vehicleType: "van",
        insuranceVerified: false, drivingLicenceVerified: true, rightToWorkVerified: true,
        complianceStatus: "pending_review", status: "inactive",
      });

      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

      // Create demo jobs
      const job1 = storage.createJob({
        clientUserId: client.id, siteId: site1.id,
        title: "DPD Liverpool Multi-Drop", description: "Standard multi-drop route covering L1-L8 postcodes",
        jobType: "multi_drop", region: "NW", date: today,
        estimatedStops: 85, estimatedParcels: 120, estimatedHours: 8,
        payRate: 145, departureTime: "07:30", postcodes: "L1, L2, L3, L4, L5, L6, L7, L8",
        status: "open",
      });

      const job2 = storage.createJob({
        clientUserId: client.id, siteId: site1.id,
        title: "DPD Wirral Route", description: "Wirral peninsula single-drop bulk delivery",
        jobType: "single_drop", region: "NW", date: today,
        estimatedStops: 1, estimatedParcels: 45, estimatedHours: 4,
        payRate: 95, departureTime: "09:00", postcodes: "CH41, CH42, CH43",
        status: "claimed", claimedByDriverId: driver1.id, claimedAt: now,
      });

      const job3 = storage.createJob({
        siteId: site2.id,
        title: "InPost Scotland Urban", description: "Glasgow city centre locker top-ups",
        jobType: "multi_drop", region: "SCO", date: today,
        estimatedStops: 22, estimatedParcels: 66, estimatedHours: 6,
        payRate: 125, departureTime: "08:00", postcodes: "G1, G2, G3, G4, G5",
        status: "in_progress", claimedByDriverId: driver2.id, claimedAt: now,
        assignedByManagerId: osm.id, assignedAt: now,
      });

      const job4 = storage.createJob({
        title: "NW Emergency Drop", description: "Urgent pharmaceutical delivery",
        jobType: "single_drop", region: "NW", date: tomorrow,
        estimatedStops: 1, estimatedParcels: 3, estimatedHours: 2,
        payRate: 80, departureTime: "10:00",
        status: "open",
      });

      const job5 = storage.createJob({
        clientUserId: client.id, siteId: site1.id,
        title: "DPD Saturday Cover", description: "Weekend overflow route",
        jobType: "multi_drop", region: "NW", date: tomorrow,
        estimatedStops: 65, estimatedParcels: 90, estimatedHours: 7,
        payRate: 135, departureTime: "07:00",
        status: "completed", claimedByDriverId: driver1.id,
        completedAt: now,
      });

      // Generate contracts
      const contract1 = storage.createContract({
        jobId: job2.id, clientUserId: client.id, driverUserId: driver1.id,
        contractTerms: generateContractTerms(job2, driver1, client),
        acceptedByClient: true, acceptedByDriver: true,
        clientSignedAt: now, driverSignedAt: now,
        status: "active",
      });

      const contract2 = storage.createContract({
        jobId: job5.id, clientUserId: client.id, driverUserId: driver1.id,
        contractTerms: generateContractTerms(job5, driver1, client),
        acceptedByClient: true, acceptedByDriver: true,
        clientSignedAt: now, driverSignedAt: now,
        status: "completed",
      });

      return res.json({
        message: "Seed data created",
        users: [admin.id, osm.id, driver1.id, driver2.id, driver3.id, client.id],
        jobs: [job1.id, job2.id, job3.id, job4.id, job5.id],
        contracts: [contract1.id, contract2.id],
      });
    } catch (err: any) {
      console.error("Seed error:", err);
      return res.status(500).json({ error: err.message });
    }
  });
}
