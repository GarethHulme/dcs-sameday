import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import AppLayout from "@/components/app-layout";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import JobsPage from "@/pages/jobs";
import PostJobPage from "@/pages/post-job";
import PoolPage from "@/pages/pool";
import RegisterPoolPage from "@/pages/register-pool";
import ContractsPage from "@/pages/contracts";
import MyJobsPage from "@/pages/my-jobs";
import ClientPortalPage from "@/pages/client-portal";
import AlertsPage from "@/pages/alerts";
import AuditPage from "@/pages/audit";
import NotFound from "@/pages/not-found";

function ProtectedRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/jobs" component={JobsPage} />
        <Route path="/jobs/new" component={PostJobPage} />
        <Route path="/pool" component={PoolPage} />
        <Route path="/register-pool" component={RegisterPoolPage} />
        <Route path="/contracts" component={ContractsPage} />
        <Route path="/my-jobs" component={MyJobsPage} />
        <Route path="/client-portal" component={ClientPortalPage} />
        <Route path="/alerts" component={AlertsPage} />
        <Route path="/audit" component={AuditPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function AppRouter() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login">{user ? <Redirect to="/" /> : <LoginPage />}</Route>
      <Route><ProtectedRoutes /></Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router hook={useHashLocation}>
              <AppRouter />
            </Router>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
