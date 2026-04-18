import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Package, Clock, DollarSign, MapPin, CheckCircle2 } from "lucide-react";

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

  const completeJob = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/jobs/${id}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job marked complete!" });
    },
  });

  function JobCard({ job }: { job: any }) {
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
            {job.estimatedStops && <span className="flex items-center gap-1"><Package className="h-3 w-3" />{job.estimatedStops} stops</span>}
            {job.estimatedHours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.estimatedHours}h est.</span>}
            {job.payRate && <span className="flex items-center gap-1 text-emerald-500 font-medium"><DollarSign className="h-3 w-3" />£{job.payRate}</span>}
          </div>
          {job.postcodes && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />{job.postcodes}
            </p>
          )}
          {job.description && (
            <p className="text-xs text-muted-foreground">{job.description}</p>
          )}
          {(job.status === "claimed" || job.status === "assigned" || job.status === "in_progress") && (
            <Button size="sm" className="w-full" onClick={() => completeJob.mutate(job.id)} disabled={completeJob.isPending}>
              <CheckCircle2 className="h-3 w-3 mr-1" />Mark Complete
            </Button>
          )}
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
