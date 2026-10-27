import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, AlertTriangle, ArrowRight, Check, Clock3, MapPin, Package,
  Plus, RefreshCw, Search, Truck, Users, Zap,
} from "lucide-react";

type Job = {
  id: number; title: string; date: string; region: string; status: string;
  departureTime?: string | null; estimatedStops?: number | null; estimatedHours?: number | null;
  payRate?: number | null; postcodes?: string | null; claimedByDriverId?: number | null;
  clientUserId?: number | null;
};

type PoolDriver = { id: number; userId: number; status: string; complianceStatus: string; region?: string | null };
type DriverUser = { id: number; name: string; region?: string | null };

const lanes = [
  { key: "open", title: "Needs a driver", hint: "New and unassigned", tone: "text-amber-700", dot: "bg-amber-500", statuses: ["open"] },
  { key: "accepted", title: "Driver assigned", hint: "Claimed or allocated", tone: "text-blue-700", dot: "bg-blue-500", statuses: ["claimed", "assigned"] },
  { key: "in_progress", title: "On the road", hint: "In progress", tone: "text-violet-700", dot: "bg-violet-500", statuses: ["in_progress"] },
  { key: "completed", title: "Completed", hint: "Delivered today", tone: "text-emerald-700", dot: "bg-emerald-500", statuses: ["completed"] },
];

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function prettyDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

export default function DispatchPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [assigning, setAssigning] = useState<Job | null>(null);
  const [driverId, setDriverId] = useState("");
  const { data: jobs = [], isLoading, isFetching, refetch } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const { data: pool = [] } = useQuery<PoolDriver[]>({ queryKey: ["/api/pool"] });
  const { data: users = [] } = useQuery<DriverUser[]>({ queryKey: ["/api/users"] });

  const today = localDateKey();
  const todayJobs = useMemo(() => jobs.filter(job => job.date === today), [jobs, today]);
  const eligibleDrivers = useMemo(() => {
    const ids = new Set(pool.filter(p => p.status === "active" && p.complianceStatus === "approved").map(p => p.userId));
    return users.filter(user => ids.has(user.id));
  }, [pool, users]);
  const filteredJobs = todayJobs.filter(job => {
    if (region !== "all" && job.region !== region) return false;
    if (!search) return true;
    return `${job.title} ${job.region} ${job.postcodes ?? ""} ${job.id}`.toLowerCase().includes(search.toLowerCase());
  });
  const regions = Array.from(new Set(todayJobs.map(job => job.region).filter(Boolean))).sort();
  const unassigned = todayJobs.filter(job => job.status === "open").length;
  const active = todayJobs.filter(job => ["claimed", "assigned", "in_progress"].includes(job.status)).length;
  const completed = todayJobs.filter(job => job.status === "completed").length;

  const assignJob = useMutation({
    mutationFn: ({ id, driver }: { id: number; driver: number }) => apiRequest("POST", `/api/jobs/${id}/assign`, { driverId: driver }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setAssigning(null); setDriverId("");
      toast({ title: "Driver assigned", description: "The booking has been updated." });
    },
    onError: (error: any) => toast({ variant: "destructive", title: "Could not assign driver", description: error?.message ?? "Please try again." }),
  });

  return (
    <main className="min-h-full bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Drivr-Sameday <span className="text-slate-300">/</span> Operations
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Dispatch</h1>
            <p className="mt-1 text-sm text-slate-500">{prettyDate()} <span className="mx-1 text-slate-300">·</span> One view of today’s same-day work.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="border-slate-300 bg-white" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button className="bg-slate-950 text-white hover:bg-slate-800" onClick={() => navigate("/jobs/new")}>
              <Plus className="mr-2 h-4 w-4" /> New booking
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Today's operation summary">
          <Metric label="Today’s bookings" value={todayJobs.length} icon={Package} detail="All regions" />
          <Metric label="Need a driver" value={unassigned} icon={AlertTriangle} detail={unassigned ? "Dispatch attention needed" : "All bookings allocated"} alert={unassigned > 0} />
          <Metric label="Active work" value={active} icon={Activity} detail="Assigned or underway" />
          <Metric label="Completed" value={completed} icon={Check} detail={`${eligibleDrivers.length} eligible pool drivers`} />
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input aria-label="Search today's bookings" placeholder="Search booking, region or postcode" value={search} onChange={e => setSearch(e.target.value)} className="border-slate-200 pl-9" />
            </div>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-full border-slate-200 sm:w-44"><SelectValue placeholder="All regions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {regions.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 self-end text-xs text-slate-500 sm:self-auto">
            <Users className="h-4 w-4" /> {eligibleDrivers.length} eligible pool drivers
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4" aria-label="Dispatch board">
          {lanes.map(lane => {
            const laneJobs = filteredJobs.filter(job => lane.statuses.includes(job.status));
            return (
              <div key={lane.key} className="min-w-0 rounded-xl border border-slate-200 bg-slate-100/70 p-3">
                <div className="mb-3 flex items-start justify-between gap-2 px-1 py-1">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className={`h-2 w-2 rounded-full ${lane.dot}`} />{lane.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">{lane.hint}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full bg-white text-slate-700">{laneJobs.length}</Badge>
                </div>
                <div className="space-y-3">
                  {isLoading ? <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-5 text-center text-xs text-slate-500">Loading dispatch…</div> : null}
                  {!isLoading && laneJobs.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-3 py-6 text-center text-xs text-slate-500">Nothing in this lane</div> : null}
                  {laneJobs.map(job => {
                    const assignedDriver = users.find(user => user.id === job.claimedByDriverId);
                    return <Card key={job.id} className="overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm">
                      <CardContent className="space-y-3 p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{job.title}</p>
                            <p className="mt-1 text-[11px] font-medium text-slate-400">SD-{String(job.id).padStart(4, "0")}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 border-slate-200 bg-slate-50 text-[10px] text-slate-600">{job.region}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{job.departureTime || "Time TBC"}</span>
                          <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5" />{job.estimatedStops ?? "—"} stops</span>
                          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.postcodes || "Route details TBC"}</span>
                          <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" />{assignedDriver?.name || "No driver yet"}</span>
                        </div>
                        {job.payRate != null && <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">Driver pay <strong className="ml-1 font-semibold text-slate-800">£{job.payRate}</strong></div>}
                        {job.status === "open" && <Button size="sm" variant="outline" className="h-8 w-full border-slate-300 text-xs" onClick={() => { setAssigning(job); setDriverId(""); }}>
                          <Zap className="mr-1.5 h-3.5 w-3.5" /> Assign eligible driver
                        </Button>}
                      </CardContent>
                    </Card>;
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <footer className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-slate-400" /> Booking and driver information from the Sameday workspace.</span>
          <button className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-950" onClick={() => navigate("/jobs")}>Open booking list <ArrowRight className="h-3.5 w-3.5" /></button>
        </footer>
      </div>

      <Dialog open={!!assigning} onOpenChange={open => { if (!open) setAssigning(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign a driver</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">{assigning?.title} · {assigning?.region}</p>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Choose an eligible pool driver" /></SelectTrigger>
              <SelectContent>
                {eligibleDrivers.filter(driver => !assigning?.region || !driver.region || driver.region === assigning.region).map(driver =>
                  <SelectItem key={driver.id} value={String(driver.id)}>{driver.name}{driver.region ? ` · ${driver.region}` : ""}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Only active, compliance-approved Sameday pool drivers appear here. Live availability is not yet connected.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigning(null)}>Cancel</Button>
            <Button disabled={!driverId || assignJob.isPending} onClick={() => assigning && assignJob.mutate({ id: assigning.id, driver: Number(driverId) })}>
              {assignJob.isPending ? "Assigning…" : "Confirm assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Metric({ label, value, icon: Icon, detail, alert = false }: { label: string; value: number; icon: any; detail: string; alert?: boolean }) {
  return <Card className={`rounded-xl border-slate-200 shadow-sm ${alert ? "border-amber-300 bg-amber-50/70" : "bg-white"}`}>
    <CardContent className="flex items-start justify-between p-4 sm:p-5">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className={`mt-2 text-3xl font-semibold tracking-tight ${alert ? "text-amber-800" : "text-slate-950"}`}>{value}</p>
        <p className={`mt-1 text-[11px] ${alert ? "text-amber-700" : "text-slate-400"}`}>{detail}</p>
      </div>
      <span className={`rounded-lg p-2 ${alert ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}><Icon className="h-4 w-4" /></span>
    </CardContent>
  </Card>;
}
