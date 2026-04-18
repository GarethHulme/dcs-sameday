import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <p className="text-6xl font-bold text-muted-foreground/20">404</p>
      <h1 className="text-xl font-semibold mt-4 mb-2">Page not found</h1>
      <p className="text-muted-foreground text-sm mb-6">The page you're looking for doesn't exist.</p>
      <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
    </div>
  );
}
