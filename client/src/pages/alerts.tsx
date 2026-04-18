import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AlertsPage() {
  const { data: alerts = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/alerts"] });

  const markRead = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/alerts/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/alerts"] }),
  });

  const unread = alerts.filter(a => !a.read);

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Alerts</h1>
          <p className="text-muted-foreground text-sm">{unread.length} unread</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : alerts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>No alerts yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((a: any) => (
            <Card key={a.id} className={a.read ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {!a.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  {a.read && <div className="h-2 w-2 mt-1.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{a.title}</p>
                    {a.message && <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{fmtDate(a.createdAt)}</p>
                  </div>
                </div>
                {!a.read && (
                  <Button size="sm" variant="ghost" onClick={() => markRead.mutate(a.id)} className="shrink-0">
                    <CheckCheck className="h-3 w-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
