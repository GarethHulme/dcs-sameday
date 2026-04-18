import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AuditPage() {
  const { data: log = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/audit"] });

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">Audit Log</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : log.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No audit entries.</CardContent></Card>
      ) : (
        <div className="space-y-1">
          {log.map((entry: any) => (
            <Card key={entry.id}>
              <CardContent className="p-3 flex items-center gap-4 text-xs">
                <span className="text-muted-foreground shrink-0 w-36">{fmtDate(entry.timestamp)}</span>
                <span className="font-medium text-primary shrink-0">{entry.action}</span>
                {entry.targetEntity && <span className="text-muted-foreground">{entry.targetEntity}#{entry.targetId}</span>}
                {entry.userId && <span className="text-muted-foreground ml-auto">User #{entry.userId}</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
