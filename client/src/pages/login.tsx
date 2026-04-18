import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Login failed", description: err.message });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* DCS Logo */}
        <div className="flex flex-col items-center gap-3">
          <svg width="48" height="42" viewBox="0 0 58 52" fill="none" aria-label="DCS Logo" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4 C4 4 14 4 22 14 C26 19 26 26 26 26 C26 26 26 33 22 38 C14 48 4 48 4 48" stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="round" className="text-foreground" />
            <path d="M54 4 C54 4 44 4 36 14 C32 19 32 26 32 26 C32 26 32 33 36 38 C44 48 54 48 54 48" stroke="hsl(var(--primary))" strokeWidth="7" fill="none" strokeLinecap="round" />
          </svg>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight">Same Day</h1>
            <p className="text-sm text-muted-foreground">DCS Command Suite</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Username or email"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-dashed opacity-60">
          <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/70">Demo accounts</p>
            <p>Admin: admin@dcs.com / admin123</p>
            <p>Manager: osm@dcs.com / osm123</p>
            <p>Driver: driver1@dcs.com / driver123</p>
            <p>Client: client@dpd.com / client123</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
