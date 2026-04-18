import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, PenLine } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  pending_signatures: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  voided: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ContractsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<any | null>(null);

  const { data: contracts = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/contracts"] });
  const { data: jobs = [] } = useQuery<any[]>({ queryKey: ["/api/jobs"] });
  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"], enabled: user?.role === "admin" || user?.role === "osm" });

  function getJob(jobId: number) { return (jobs as any[]).find(j => j.id === jobId); }
  function getUser(userId: number | null) { return userId ? (users as any[]).find(u => u.id === userId) : null; }

  const sign = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/contracts/${id}/sign`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract signed!" });
      setSelected(null);
    },
  });

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold">Contracts</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : contracts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No contracts yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {contracts.map((c: any) => {
            const job = getJob(c.jobId);
            return (
              <Card key={c.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelected(c)}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">Contract #{c.id} — Job #{c.jobId}</p>
                      <p className="text-xs text-muted-foreground truncate">{job?.title ?? "—"} · Created {fmtDate(c.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className={c.acceptedByClient ? "text-emerald-500" : "text-muted-foreground"}>Client {c.acceptedByClient ? "✓" : "✗"}</span>
                    <span className={c.acceptedByDriver ? "text-emerald-500" : "text-muted-foreground"}>Driver {c.acceptedByDriver ? "✓" : "✗"}</span>
                    <StatusBadge status={c.status} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract #{selected?.id}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <StatusBadge status={selected.status} />
                <span className="text-xs text-muted-foreground">Created {fmtDate(selected.createdAt)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Client Signed</p>
                  <p className="font-medium">{selected.acceptedByClient ? fmtDate(selected.clientSignedAt) : "Pending"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Driver Signed</p>
                  <p className="font-medium">{selected.acceptedByDriver ? fmtDate(selected.driverSignedAt) : "Pending"}</p>
                </div>
              </div>

              {selected.contractTerms && (
                <div className="rounded-lg border p-4 text-xs font-mono whitespace-pre-wrap bg-muted/30 max-h-80 overflow-y-auto">
                  {selected.contractTerms}
                </div>
              )}

              {selected.status === "pending_signatures" && (
                <div className="flex gap-2">
                  {(user?.role === "driver" && !selected.acceptedByDriver) && (
                    <Button className="flex-1" onClick={() => sign.mutate(selected.id)} disabled={sign.isPending}>
                      <PenLine className="h-4 w-4 mr-2" />Sign as Driver
                    </Button>
                  )}
                  {(user?.role === "client" && !selected.acceptedByClient) && (
                    <Button className="flex-1" onClick={() => sign.mutate(selected.id)} disabled={sign.isPending}>
                      <PenLine className="h-4 w-4 mr-2" />Sign as Client
                    </Button>
                  )}
                  {(user?.role === "osm" || user?.role === "admin") && (
                    <Button className="flex-1" onClick={() => sign.mutate(selected.id)} disabled={sign.isPending}>
                      <PenLine className="h-4 w-4 mr-2" />Sign on behalf of Client
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
