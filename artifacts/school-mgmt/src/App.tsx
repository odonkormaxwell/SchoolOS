import { Switch, Route, Router as WouterRouter, Redirect, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import type { Module } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import StudentDetail from "@/pages/StudentDetail";
import Teachers from "@/pages/Teachers";
import Classes from "@/pages/Classes";
import Attendance from "@/pages/Attendance";
import Fees from "@/pages/Fees";
import Results from "@/pages/Results";
import ReportCards from "@/pages/ReportCards";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import { Lock } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
      <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
        <Lock className="h-8 w-8 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You don't have permission to view this page.
        </p>
      </div>
      <Link href="/dashboard">
        <Button variant="outline">Go to Dashboard</Button>
      </Link>
    </div>
  );
}

function ProtectedRoute({
  component: Component,
  module,
}: {
  component: React.ComponentType;
  module?: Module;
}) {
  const { user, isLoading, can } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  if (module && !can(module)) {
    return (
      <Layout>
        <AccessDenied />
      </Layout>
    );
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} module="dashboard" />} />
      <Route path="/students/:id" component={() => <ProtectedRoute component={StudentDetail} module="students" />} />
      <Route path="/students" component={() => <ProtectedRoute component={Students} module="students" />} />
      <Route path="/teachers" component={() => <ProtectedRoute component={Teachers} module="teachers" />} />
      <Route path="/classes" component={() => <ProtectedRoute component={Classes} module="classes" />} />
      <Route path="/attendance" component={() => <ProtectedRoute component={Attendance} module="attendance" />} />
      <Route path="/fees" component={() => <ProtectedRoute component={Fees} module="fees" />} />
      <Route path="/results" component={() => <ProtectedRoute component={Results} module="results" />} />
      <Route path="/report-cards" component={() => <ProtectedRoute component={ReportCards} module="reportCards" />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} module="reports" />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} module="settings" />} />
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
