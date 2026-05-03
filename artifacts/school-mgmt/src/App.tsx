import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

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
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/students/:id" component={() => <ProtectedRoute component={StudentDetail} />} />
      <Route path="/students" component={() => <ProtectedRoute component={Students} />} />
      <Route path="/teachers" component={() => <ProtectedRoute component={Teachers} />} />
      <Route path="/classes" component={() => <ProtectedRoute component={Classes} />} />
      <Route path="/attendance" component={() => <ProtectedRoute component={Attendance} />} />
      <Route path="/fees" component={() => <ProtectedRoute component={Fees} />} />
      <Route path="/results" component={() => <ProtectedRoute component={Results} />} />
      <Route path="/report-cards" component={() => <ProtectedRoute component={ReportCards} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
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
