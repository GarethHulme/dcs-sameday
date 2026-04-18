import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Plus, FileText, Package, CheckCircle2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  claimed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"}`}>{status.replace(/_/g, " ")}</span>;
}

export default function ClientPortalPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: jobs = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/jobs"] });
  const { data: contracts = [] } = useQuery<any[]>({ queryKey: ["/api/contracts"] });

  const myJobs = jobs;
  const active = myJobs.filter(j => ["open", "claimed", "assigned", "in_progress"].includes(j.status));
  const completed = myJobs.filter(j => j.status === "completed");
  const activeContracts = contracts.filter((c: any) => c.status === "active" || c.status === "pending_signatures");

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Client Portal</h1>
          <p className="text-muted-foreground text-sm">{user?.clientCompany || user?.name}</p>
        </div>
        <Button onClick={() => navigate("/jobs/new")}><Plus className="h-4 w-4 mr-2" />Post Job</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Jobs</p><p className="text-2xl font-bold text-emerald-500">{active.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold">{completed.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Contracts</p><p className="text-2xl font-bold">{activeContracts.length}</p></CardContent></Card>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">Active Jobs</h2>
        {isLoading ? <p className="text-muted-foreground text-sm">Loading...</p> : active.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No active jobs.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {active.map(j => (
              <Card key={j.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{j.title}</p>
                    <p className="text-xs text-muted-foreground">{j.date} · {j.region}</p>
                  </div>
                  <StatusBadge status={j.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">Active Contracts</h2>
        {activeContracts.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No active contracts.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {activeContracts.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Contract #{c.id} — Job #{c.jobId}</p>
                      <p className="text-xs text-muted-foreground">
                        Client {c.acceptedByClient ? "✓ signed" : "✗ pending"} · Driver {c.acceptedByDriver ? "✓ signed" : "✗ pending"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
