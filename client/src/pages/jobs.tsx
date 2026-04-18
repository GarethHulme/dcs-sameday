import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Package, Clock, DollarSign, MapPin, Filter, Plus, Zap, Users } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  claimed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  assigned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function JobsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; jobId: number | null }>({ open: false, jobId: null });
  const [assignDriverId, setAssignDriverId] = useState("");

  const { data: jobs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/jobs", regionFilter, statusFilter, typeFilter],
  });

  const { data: poolDrivers = [] } = useQuery<any[]>({
    queryKey: ["/api/pool"],
    enabled: user?.role === "osm" || user?.role === "admin",
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "osm" || user?.role === "admin",
  });

  const claimJob = useMutation({
    mutationFn: (jobId: number) => apiRequest("POST", `/api/jobs/${jobId}/claim`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/jobs"] }); toast({ title: "Job claimed!" }); },
    onError: async (err: any) => {
      let msg = err.message;
      toast({ variant: "destructive", title: "Failed", description: msg });
    },
  });

  const assignJob = useMutation({
    mutationFn: ({ jobId, driverId }: { jobId: number; driverId: number }) =>
      apiRequest("POST", `/api/jobs/${jobId}/assign`, { driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setAssignDialog({ open: false, jobId: null });
      toast({ title: "Job assigned!" });
    },
  });

  const completeJob = useMutation({
    mutationFn: (jobId: number) => apiRequest("POST", `/api/jobs/${jobId}/complete`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/jobs"] }); toast({ title: "Job marked complete." }); },
  });

  const pushJob = useMutation({
    mutationFn: (jobId: number) => apiRequest("POST", `/api/jobs/${jobId}/push`, {}),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: `Notifications sent to ${data.pushed} drivers` });
    },
  });

  // Filter
  const filtered = jobs.filter(j => {
    if (regionFilter !== "all" && j.region !== regionFilter) return false;
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (typeFilter !== "all" && j.jobType !== typeFilter) return false;
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.region.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isManager = user?.role === "osm" || user?.role === "admin";
  const isDriver = user?.role === "driver";

  // Find my pool entry
  const { data: myPool } = useQuery<any[]>({ queryKey: ["/api/pool"], enabled: isDriver });
  const poolEntry = (myPool ?? []).find((p: any) => p.userId === user?.id);
  const canClaim = isDriver && poolEntry?.complianceStatus === "approved";

  const poolUserIds = new Set(poolDrivers.map((p: any) => p.userId));
  const driverUsers = allUsers.filter(u => u.role === "driver" && poolUserIds.has(u.id));

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Job Board</h1>
        {(isManager || user?.role === "client") && (
          <Button onClick={() => navigate("/jobs/new")}><Plus className="h-4 w-4 mr-2" />Post Job</Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="w-40" />
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            <SelectItem value="NW">NW</SelectItem>
            <SelectItem value="SCO">SCO</SelectItem>
            <SelectItem value="E">East</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="claimed">Claimed</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="multi_drop">Multi Drop</SelectItem>
            <SelectItem value="single_drop">Single Drop</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} jobs</span>
      </div>

      {/* Job grid */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No jobs match your filters.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(job => (
            <Card key={job.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight">{job.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(job.date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={job.status} />
                    <Badge variant="outline" className="text-[10px]">{job.region}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {job.departureTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.departureTime}</span>}
                  {job.estimatedStops && <span className="flex items-center gap-1"><Package className="h-3 w-3" />{job.estimatedStops} stops</span>}
                  {job.payRate && <span className="flex items-center gap-1 text-emerald-500 font-medium"><DollarSign className="h-3 w-3" />£{job.payRate}</span>}
                  <Badge variant="outline" className="text-[10px]">{job.jobType === "multi_drop" ? "Multi" : "Single"}</Badge>
                </div>

                {job.postcodes && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{job.postcodes}
                  </p>
                )}

                <div className="flex gap-2">
                  {isDriver && job.status === "open" && (
                    <Button size="sm" className="flex-1" disabled={!canClaim || claimJob.isPending} onClick={() => claimJob.mutate(job.id)}>
                      <Zap className="h-3 w-3 mr-1" />Claim
                    </Button>
                  )}
                  {isManager && job.status === "open" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setAssignDialog({ open: true, jobId: job.id }); setAssignDriverId(""); }}>
                        <Users className="h-3 w-3 mr-1" />Assign
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => pushJob.mutate(job.id)}>
                        Push
                      </Button>
                    </>
                  )}
                  {(isManager || (isDriver && job.claimedByDriverId === user?.id)) && ["claimed", "assigned", "in_progress"].includes(job.status) && (
                    <Button size="sm" className="flex-1" variant="outline" onClick={() => completeJob.mutate(job.id)}>
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={open => setAssignDialog({ open, jobId: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Job to Driver</DialogTitle></DialogHeader>
          <Select value={assignDriverId} onValueChange={setAssignDriverId}>
            <SelectTrigger><SelectValue placeholder="Select a driver..." /></SelectTrigger>
            <SelectContent>
              {driverUsers.map(d => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.region ?? "—"})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, jobId: null })}>Cancel</Button>
            <Button
              disabled={!assignDriverId}
              onClick={() => assignDialog.jobId && assignJob.mutate({ jobId: assignDialog.jobId, driverId: parseInt(assignDriverId) })}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
