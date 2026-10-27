import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Package, Clock, DollarSign, MapPin, CheckCircle2, Navigation, Phone } from "lucide-react";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function MyJobsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: jobs = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/jobs"] });

  const myJobs = jobs.filter(j => j.claimedByDriverId === user?.id);
  const upcoming = myJobs.filter(j => ["claimed", "assigned"].includes(j.status));
  const active = myJobs.filter(j => j.status === "in_progress");
  const completed = myJobs.filter(j => j.status === "completed");

  const startJob = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/jobs/${id}/start`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Route started", description: "The booking is now marked in progress." });
    },
    onError: (error: any) => toast({ variant: "destructive", title: "Could not start route", description: error?.message ?? "Please try again." }),
  });

  const completeJob = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/jobs/${id}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job marked complete!" });
    },
  });

  function JobCard({ job }: { job: any }) {
    const stops = job.stops ?? [];
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm">{job.title}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(job.date)}</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{job.region}</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {job.departureTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.departureTime}</span>}
            {(job.stops?.length || job.estimatedStops) && <span className="flex items-center gap-1"><Package className="h-3 w-3" />{job.stops?.length || job.estimatedStops} stops</span>}
            {job.estimatedHours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.estimatedHours}h est.</span>}
            {job.payRate && <span className="flex items-center gap-1 text-emerald-500 font-medium"><DollarSign className="h-3 w-3" />£{job.payRate}</span>}
          </div>
          {!job.stops?.length && job.postcodes && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />{job.postcodes}
            </p>
          )}
          {!!job.stops?.length && (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold">Ordered stops</p>
                <span className="text-[10px] text-muted-foreground">In booking order</span>
              </div>
              <ol className="space-y-2">
                {job.stops.map((stop: any, index: number) => {
                  const address = [stop.addressLine1, stop.addressLine2, stop.city, stop.postcode].filter(Boolean).join(", ");
                  return <li key={stop.id} className="flex gap-2 text-xs">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      {job.status !== "completed" ? <a className="inline-flex items-center gap-1 font-medium leading-5 text-primary hover:underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
                        <Navigation className="h-3 w-3 shrink-0" />{address}
                      </a> : <p className="font-medium leading-5">{address}</p>}
                      {stop.windowStart && <p className="text-muted-foreground">Delivery window {stop.windowStart}{stop.windowEnd ? `–${stop.windowEnd}` : " onward"}</p>}
                      {stop.recipientName && <p className="text-muted-foreground">{stop.recipientName}</p>}
                      {stop.instructions && <p className="mt-1 text-muted-foreground">{stop.instructions}</p>}
                    </div>
                    {stop.recipientPhone && <a className="self-start rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground" href={`tel:${stop.recipientPhone}`} aria-label={`Call ${stop.recipientName || "recipient"}`}><Phone className="h-3.5 w-3.5" /></a>}
                  </li>;
                })}
              </ol>
            </div>
          )}
          {job.description && (
            <p className="text-xs text-muted-foreground">{job.description}</p>
          )}
          {(job.status === "claimed" || job.status === "assigned") && <Button size="sm" className="w-full" onClick={() => startJob.mutate(job.id)} disabled={startJob.isPending}>
            <Navigation className="h-3 w-3 mr-1" />{startJob.isPending ? "Starting…" : "Start route"}
          </Button>}
          {job.status === "in_progress" && <Button size="sm" className="w-full" onClick={() => completeJob.mutate(job.id)} disabled={completeJob.isPending}>
            <CheckCircle2 className="h-3 w-3 mr-1" />{completeJob.isPending ? "Completing…" : "Mark Complete"}
          </Button>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">My Jobs</h1>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {isLoading ? <p className="text-muted-foreground">Loading...</p> : upcoming.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No upcoming jobs. Browse the job board to find one.</CardContent></Card>
          ) : upcoming.map(j => <JobCard key={j.id} job={j} />)}
        </TabsContent>

        <TabsContent value="active" className="mt-4 space-y-3">
          {active.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No jobs currently in progress.</CardContent></Card>
          ) : active.map(j => <JobCard key={j.id} job={j} />)}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completed.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No completed jobs yet.</CardContent></Card>
          ) : completed.map(j => <JobCard key={j.id} job={j} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
