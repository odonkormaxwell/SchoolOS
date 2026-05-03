import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "primary",
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<any>;
  color?: "primary" | "gold" | "green" | "red";
  loading?: boolean;
}) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    gold: "bg-yellow-100 text-yellow-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            )}
            {subtitle && !loading && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(amount: number) {
  return `GH₵ ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats();

  const collectionRate = stats && stats.totalFeesExpected > 0
    ? Math.round((stats.totalFeesCollected / stats.totalFeesExpected) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {user?.fullName?.split(" ")[0]}
          </p>
        </div>
        <div className="text-right">
          {stats && (
            <>
              <div className="text-sm font-medium text-foreground">{stats.currentAcademicYear}</div>
              <div className="text-xs text-muted-foreground">{stats.currentTerm}</div>
            </>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          subtitle={`${stats?.activeStudents ?? 0} active`}
          icon={GraduationCap}
          color="primary"
          loading={isLoading}
        />
        <StatCard
          title="Teachers"
          value={stats?.totalTeachers ?? 0}
          subtitle="Active staff"
          icon={Users}
          color="green"
          loading={isLoading}
        />
        <StatCard
          title="Classes"
          value={stats?.totalClasses ?? 0}
          subtitle="All levels"
          icon={BookOpen}
          color="gold"
          loading={isLoading}
        />
        <StatCard
          title="Fees Collected"
          value={isLoading ? 0 : formatCurrency(stats?.totalFeesCollected ?? 0)}
          subtitle={`${collectionRate}% collection rate`}
          icon={DollarSign}
          color="green"
          loading={isLoading}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Classes by level */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Enrollment by Level</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : (
              stats?.classesByLevel?.map((item) => (
                <div key={item.level} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-sm text-foreground capitalize font-medium">
                    {item.level.replace(/(\d)/, " $1").replace("primary", "Primary").replace("jhs", "JHS").replace("nursery", "Nursery").replace("kg", "KG ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-primary/20 w-16">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (item.studentCount / 50) * 100)}%` }}
                      />
                    </div>
                    <Badge variant="secondary" className="text-xs min-w-[28px] text-center">
                      {item.studentCount}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Fees summary */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fees Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expected</span>
                    <span className="font-medium">{formatCurrency(stats?.totalFeesExpected ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Collected</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(stats?.totalFeesCollected ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-medium text-red-500">{formatCurrency(stats?.totalFeesPending ?? 0)}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Collection Progress</span>
                    <span className="font-medium">{collectionRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${collectionRate}%` }}
                    />
                  </div>
                </div>
                <Link href="/fees">
                  <span className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer font-medium">
                    Manage fees <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent payments */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : stats?.recentPayments?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recent payments</p>
            ) : (
              <div className="space-y-3">
                {stats?.recentPayments?.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.studentName}</p>
                      <p className="text-xs text-muted-foreground">{p.feeTypeName} · {p.paymentDate?.slice(0, 10)}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 flex-shrink-0">
                      GH₵{p.amountPaid}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/students", label: "Add Student", icon: GraduationCap },
          { href: "/attendance", label: "Take Attendance", icon: CheckCircle },
          { href: "/fees", label: "Record Payment", icon: DollarSign },
          { href: "/results", label: "Enter Results", icon: TrendingUp },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
