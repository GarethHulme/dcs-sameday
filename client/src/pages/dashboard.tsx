import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Zap, Package, Users, ClipboardList, CheckCircle2, AlertTriangle,
  TrendingUp, Plus, ArrowRight, Truck, MapPin, Clock, DollarSign,
} from "lucide-react";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    claimed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    assigned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    completed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    inactive: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Driver Dashboard ──────────────────────────────────────────────────────────

function DriverDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: jobs = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/jobs"] });
  const { data: pool } = useQuery<any>({
    queryKey: ["/api/pool/me"],
    enabled: false,
  });
  const { data: allPool = [] } = useQuery<any[]>({ queryKey: ["/api/pool"] });
  const myPool = allPool.find((p: any) => p.userId === user?.id);

  const openJobs = jobs.filter(j => j.status === "open");
  const myJobs = jobs.filter(j => j.claimedByDriverId === user?.id);
  const myActive = myJobs.filter(j => ["claimed", "assigned", "in_progress"].includes(j.status));
  const myCompleted = myJobs.filter(j => j.status === "completed");

  const claimJob = useMutation({
    mutationFn: (jobId: number) => apiRequest("POST", `/api/jobs/${jobId}/claim`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job claimed!", description: "Check My Jobs for details." });
    },
    onError: async (err: any) => {
      const msg = err.message || "Failed to claim job";
      toast({ variant: "destructive", title: "Error", description: msg });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {user?.name?.split(" ")[0]}</h1>
          <p className="text-muted-foreground text-sm">Same Day Ad-Hoc Pool</p>
        </div>
        {myPool && statusBadge(myPool.complianceStatus === "approved" ? myPool.status : myPool.complianceStatus)}
      </div>

      {!myPool && (
        <Card className="border-primary/30">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Join the Ad-Hoc Pool</p>
              <p className="text-sm text-muted-foreground">Register to pick up same-day jobs on your days off</p>
            </div>
            <Button onClick={() => navigate("/register-pool")}>Register Now</Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Available Jobs</p>
            <p className="text-2xl font-bold text-emerald-500">{openJobs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">My Active</p>
            <p className="text-2xl font-bold text-blue-500">{myActive.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">{myPool?.completedJobs ?? myCompleted.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Rating</p>
            <p className="text-2xl font-bold text-amber-500">{myPool?.rating ? `${myPool.rating.toFixed(1)}★` : "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Available Jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Available Jobs in Your Region</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")}>View all <ArrowRight className="h-3 w-3 ml-1" /></Button>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : openJobs.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No jobs available in your region right now.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {openJobs.slice(0, 4).map(job => (
              <Card key={job.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.date} · {job.departureTime ?? "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{job.region}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Package className="h-3 w-3" />{job.estimatedStops ?? "?"} stops</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.estimatedHours ?? "?"}h</span>
                    <span className="flex items-center gap-1 text-emerald-500 font-medium"><DollarSign className="h-3 w-3" />£{job.payRate ?? "TBC"}</span>
                  </div>
                  <Button
                    size="sm" className="w-full"
                    disabled={!myPool || myPool.complianceStatus !== "approved" || claimJob.isPending}
                    onClick={() => claimJob.mutate(job.id)}
                  >
                    Claim Job
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* My Active Jobs */}
      {myActive.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">My Active Jobs</h2>
          <div className="space-y-2">
            {myActive.map(job => (
              <Card key={job.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.date} · {job.region}</p>
                  </div>
                  {statusBadge(job.status)}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Manager/Admin Dashboard ───────────────────────────────────────────────────

function ManagerDashboard() {
  const [, navigate] = useLocation();
  const { data: jobs = [] } = useQuery<any[]>({ queryKey: ["/api/jobs"] });
  const { data: pool = [] } = useQuery<any[]>({ queryKey: ["/api/pool"] });

  const today = new Date().toISOString().split("T")[0];
  const todayJobs = jobs.filter(j => j.date === today);
  const open = todayJobs.filter(j => j.status === "open").length;
  const claimed = todayJobs.filter(j => ["claimed", "assigned"].includes(j.status)).length;
  const inProgress = todayJobs.filter(j => j.status === "in_progress").length;
  const completed = todayJobs.filter(j => j.status === "completed").length;

  const activeDrivers = pool.filter((p: any) => p.status === "active").length;
  const pendingApplications = pool.filter((p: any) => p.complianceStatus === "pending_review").length;

  const weeklyJobs = jobs.filter(j => j.status === "completed");
  const weeklyValue = weeklyJobs.reduce((sum: number, j: any) => sum + (j.payRate ?? 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Same Day Overview</h1>
          <p className="text-muted-foreground text-sm">Today: {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <Button onClick={() => navigate("/jobs/new")}><Plus className="h-4 w-4 mr-2" />Post Job</Button>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open</p>
            <p className="text-2xl font-bold text-emerald-500">{open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Claimed</p>
            <p className="text-2xl font-bold text-amber-500">{claimed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-blue-500">{inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">{completed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Active Pool Drivers</p>
            </div>
            <p className="text-2xl font-bold">{activeDrivers}</p>
          </CardContent>
        </Card>
        <Card className={pendingApplications > 0 ? "border-amber-500/50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium">Pending Applications</p>
            </div>
            <p className="text-2xl font-bold text-amber-500">{pendingApplications}</p>
            {pendingApplications > 0 && (
              <Button variant="ghost" size="sm" className="p-0 h-auto text-xs text-primary" onClick={() => navigate("/pool")}>Review now →</Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Completed Jobs Value</p>
            </div>
            <p className="text-2xl font-bold">£{weeklyValue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Today's Jobs</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")}>View all <ArrowRight className="h-3 w-3 ml-1" /></Button>
        </div>
        {todayJobs.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No jobs posted for today.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {todayJobs.slice(0, 6).map(job => (
              <Card key={job.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.region} · {job.departureTime ?? "—"} · {job.estimatedStops ?? "?"} stops</p>
                  </div>
                  {statusBadge(job.status)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Client Dashboard ──────────────────────────────────────────────────────────

function ClientDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: jobs = [] } = useQuery<any[]>({ queryKey: ["/api/jobs"] });
  const { data: contracts = [] } = useQuery<any[]>({ queryKey: ["/api/contracts"] });

  const myJobs = jobs;
  const active = myJobs.filter(j => ["open", "claimed", "assigned", "in_progress"].includes(j.status));
  const activeContracts = contracts.filter((c: any) => c.status === "active");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Client Portal</h1>
          <p className="text-muted-foreground text-sm">{user?.clientCompany || user?.name}</p>
        </div>
        <Button onClick={() => navigate("/jobs/new")}><Plus className="h-4 w-4 mr-2" />Post Job</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">My Active Jobs</p>
            <p className="text-2xl font-bold text-emerald-500">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Jobs</p>
            <p className="text-2xl font-bold">{myJobs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Contracts</p>
            <p className="text-2xl font-bold">{activeContracts.length}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">My Jobs</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")}>View all →</Button>
        </div>
        {myJobs.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No jobs yet. <button className="text-primary underline" onClick={() => navigate("/jobs/new")}>Post your first job</button></CardContent></Card>
        ) : (
          <div className="space-y-2">
            {myJobs.slice(0, 5).map((job: any) => (
              <Card key={job.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.date} · {job.region}</p>
                  </div>
                  {statusBadge(job.status)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "driver") return <DriverDashboard />;
  if (user.role === "client") return <ClientDashboard />;
  return <ManagerDashboard />;
}
