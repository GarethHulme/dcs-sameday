import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Ban, User, Star, Package, Car, Shield } from "lucide-react";

const COMPLIANCE_STYLES: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  suspended: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function ComplianceBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${COMPLIANCE_STYLES[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function PoolPage() {
  const { toast } = useToast();
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);

  const { data: pool = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/pool"] });
  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });

  function getUser(userId: number) {
    return (users as any[]).find(u => u.id === userId);
  }

  const approve = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/pool/${id}/approve`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pool"] }); toast({ title: "Driver approved!" }); setSelected(null); },
  });

  const reject = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/pool/${id}/reject`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pool"] }); toast({ title: "Application rejected." }); setSelected(null); },
  });

  const suspend = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/pool/${id}/suspend`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pool"] }); toast({ title: "Driver suspended." }); setSelected(null); },
  });

  const filtered = pool.filter((p: any) => {
    if (regionFilter !== "all" && p.region !== regionFilter) return false;
    if (statusFilter !== "all" && p.complianceStatus !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Driver Pool</h1>
          <p className="text-muted-foreground text-sm">Ad-hoc pool management</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filtered.length} drivers</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            <SelectItem value="NW">NW</SelectItem>
            <SelectItem value="SCO">SCO</SelectItem>
            <SelectItem value="E">East</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No pool drivers found.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p: any) => {
            const u = getUser(p.userId);
            return (
              <Card key={p.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelected(p)}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{u?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{u?.email} · {p.region}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.multiDropCapable && <Badge variant="outline" className="text-[10px]">Multi</Badge>}
                    {p.singleDropCapable && <Badge variant="outline" className="text-[10px]">Single</Badge>}
                    {p.rating > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <Star className="h-3 w-3" />{p.rating.toFixed(1)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{p.completedJobs ?? 0} jobs</span>
                    <ComplianceBadge status={p.complianceStatus} />
                    {p.complianceStatus === "pending_review" && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" onClick={() => approve.mutate(p.id)} disabled={approve.isPending}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => reject.mutate(p.id)} disabled={reject.isPending}>
                          <XCircle className="h-3 w-3 mr-1" />Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Driver Detail</DialogTitle>
          </DialogHeader>
          {selected && (() => {
            const u = getUser(selected.userId);
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{u?.name}</p>
                    <p className="text-sm text-muted-foreground">{u?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Region</p><p className="font-medium">{selected.region}</p></div>
                  <div><p className="text-muted-foreground text-xs">Status</p><ComplianceBadge status={selected.complianceStatus} /></div>
                  <div><p className="text-muted-foreground text-xs">Completed Jobs</p><p className="font-medium">{selected.completedJobs ?? 0}</p></div>
                  <div><p className="text-muted-foreground text-xs">Rating</p><p className="font-medium">{selected.rating ? `${selected.rating.toFixed(1)}★` : "—"}</p></div>
                  <div><p className="text-muted-foreground text-xs">Vehicle</p><p className="font-medium">{selected.vehicleType ?? "—"}</p></div>
                  <div><p className="text-muted-foreground text-xs">Own Vehicle</p><p className="font-medium">{selected.hasOwnVehicle ? "Yes" : "No"}</p></div>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Compliance</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded ${selected.insuranceVerified ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                      Insurance {selected.insuranceVerified ? "✓" : "✗"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${selected.drivingLicenceVerified ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                      Licence {selected.drivingLicenceVerified ? "✓" : "✗"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${selected.rightToWorkVerified ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                      RTW {selected.rightToWorkVerified ? "✓" : "✗"}
                    </span>
                  </div>
                </div>

                {selected.experienceNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Experience Notes</p>
                    <p className="text-sm">{selected.experienceNotes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {selected.complianceStatus === "pending_review" && (
                    <>
                      <Button className="flex-1" onClick={() => approve.mutate(selected.id)} disabled={approve.isPending}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => reject.mutate(selected.id)} disabled={reject.isPending}>
                        <XCircle className="h-4 w-4 mr-1" />Reject
                      </Button>
                    </>
                  )}
                  {selected.complianceStatus === "approved" && (
                    <Button variant="destructive" className="flex-1" onClick={() => suspend.mutate(selected.id)} disabled={suspend.isPending}>
                      <Ban className="h-4 w-4 mr-1" />Suspend
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
