import { useGetDashboardStats, useListClasses, useListStudents, useListAttendance } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, Redirect } from "wouter";
import {
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
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

function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats();

  const collectionRate =
    stats && stats.totalFeesExpected > 0
      ? Math.round((stats.totalFeesCollected / stats.totalFeesExpected) * 100)
      : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {user?.fullName?.split(" ")[0] ?? user?.username}
            {stats?.currentTerm && (
              <>
                {" "}·{" "}
                <span className="text-primary font-medium">{stats.currentTerm}</span>
              </>
            )}
            {stats?.currentAcademicYear && (
              <span className="text-muted-foreground"> — {stats.currentAcademicYear}</span>
            )}
          </p>
        </div>
        <Badge variant="outline" className="capitalize text-xs">
          {user?.role}
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          subtitle={`${stats?.activeStudents ?? 0} active`}
          icon={GraduationCap}
          loading={isLoading}
        />
        <StatCard
          title="Teachers"
          value={stats?.totalTeachers ?? 0}
          subtitle="active staff"
          icon={Users}
          color="gold"
          loading={isLoading}
        />
        <StatCard
          title="Classes"
          value={stats?.totalClasses ?? 0}
          subtitle="all levels"
          icon={BookOpen}
          color="green"
          loading={isLoading}
        />
        <StatCard
          title="Today's Attendance"
          value={
            stats
              ? `${stats.attendanceToday}/${stats.totalAttendanceToday}`
              : "—"
          }
          subtitle={
            stats?.totalAttendanceToday
              ? `${Math.round((stats.attendanceToday / stats.totalAttendanceToday) * 100)}% present`
              : "not marked yet"
          }
          icon={CheckCircle}
          color="green"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Fees Collection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {isLoading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)
              ) : (
                <>
                  <div className="rounded-lg bg-primary/5 p-3">
                    <p className="text-xs text-muted-foreground">Expected</p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {formatCurrency(stats?.totalFeesExpected ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-xs text-muted-foreground">Collected</p>
                    <p className="text-base font-bold text-emerald-600 mt-0.5">
                      {formatCurrency(stats?.totalFeesCollected ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-base font-bold text-red-600 mt-0.5">
                      {formatCurrency(stats?.totalFeesPending ?? 0)}
                    </p>
                  </div>
                </>
              )}
            </div>
            {!isLoading && stats && (
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Collection rate</span>
                  <span className="font-semibold">{collectionRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${collectionRate}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Students by Level</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(stats?.classesByLevel ?? []).map((lvl) => (
                  <div key={lvl.level} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-16 capitalize">
                      {lvl.level}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{
                          width:
                            stats?.activeStudents
                              ? `${(lvl.studentCount / stats.activeStudents) * 100}%`
                              : "0%",
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {lvl.studentCount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats?.recentPayments && stats.recentPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Payments</CardTitle>
            <Link href="/fees">
              <span className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">
                View all <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-1.5 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {p.studentName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.feeTypeName} · {p.paymentDate}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">
                    {formatCurrency(p.amountPaid)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TeacherDashboard() {
  const { user } = useAuth();
  const { data: classes = [], isLoading: classesLoading } = useListClasses();
  const { data: students = [], isLoading: studentsLoading } = useListStudents({});
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayAttendance = [] } = useListAttendance({ date: today });

  const presentToday = todayAttendance.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
  const totalToday = todayAttendance.length;
  const attendanceRate =
    totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome, {user?.fullName?.split(" ")[0] ?? "Teacher"} · Your assigned
            classes
          </p>
        </div>
        <Badge className="bg-emerald-600 text-white text-xs capitalize">
          Teacher
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="My Classes"
          value={classesLoading ? "—" : classes.length}
          subtitle="assigned to you"
          icon={BookOpen}
          loading={classesLoading}
        />
        <StatCard
          title="My Students"
          value={studentsLoading ? "—" : students.length}
          subtitle="across your classes"
          icon={GraduationCap}
          loading={studentsLoading}
        />
        <StatCard
          title="Today's Attendance"
          value={
            attendanceRate != null ? `${attendanceRate}%` : "Not marked"
          }
          subtitle={
            totalToday > 0
              ? `${presentToday}/${totalToday} present`
              : "No records yet"
          }
          icon={CheckCircle}
          color="green"
        />
      </div>

      {classesLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground">
              No classes assigned
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact your administrator to get assigned to classes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            My Classes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const classStudents = students.filter(
                (s) => s.classId === cls.id
              );
              const classAttendance = todayAttendance.filter(
                (a) => a.classId === cls.id
              );
              const classPct =
                classAttendance.length > 0
                  ? Math.round(
                      (classAttendance.filter((a) => a.status === "present")
                        .length /
                        classAttendance.length) *
                        100
                    )
                  : null;
              return (
                <Card
                  key={cls.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">
                          {cls.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {cls.level}
                        </p>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-muted-foreground">
                        <b className="text-foreground">
                          {classStudents.length}
                        </b>{" "}
                        students
                      </span>
                      {classPct != null ? (
                        <span className="text-muted-foreground">
                          Today:{" "}
                          <b className="text-emerald-600">{classPct}%</b>
                        </span>
                      ) : (
                        <span className="text-yellow-600 text-xs">
                          Not marked
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link href="/attendance">
                        <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-0.5">
                          Attendance <ArrowRight className="h-3 w-3" />
                        </span>
                      </Link>
                      <span className="text-muted-foreground">·</span>
                      <Link href="/results">
                        <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-0.5">
                          Results <ArrowRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountantDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats();
  const collectionRate =
    stats && stats.totalFeesExpected > 0
      ? Math.round((stats.totalFeesCollected / stats.totalFeesExpected) * 100)
      : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Finance Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome, {user?.fullName?.split(" ")[0] ?? "Accountant"}
            {stats?.currentTerm && (
              <>
                {" "}·{" "}
                <span className="text-primary font-medium">
                  {stats.currentTerm}
                </span>
              </>
            )}
          </p>
        </div>
        <Badge className="bg-amber-500 text-white text-xs">Accountant</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Fees Expected"
          value={stats ? formatCurrency(stats.totalFeesExpected) : "—"}
          subtitle="total assigned"
          icon={DollarSign}
          loading={isLoading}
        />
        <StatCard
          title="Collected"
          value={stats ? formatCurrency(stats.totalFeesCollected) : "—"}
          subtitle={`${collectionRate}% rate`}
          icon={CheckCircle}
          color="green"
          loading={isLoading}
        />
        <StatCard
          title="Outstanding"
          value={stats ? formatCurrency(stats.totalFeesPending) : "—"}
          subtitle="to be collected"
          icon={AlertCircle}
          color="red"
          loading={isLoading}
        />
      </div>

      {!isLoading && stats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Collection Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">
                Overall collection rate
              </span>
              <span className="font-bold text-foreground">
                {collectionRate}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-200">
              <div
                className="h-3 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {stats?.recentPayments && stats.recentPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Recent Payments
            </CardTitle>
            <Link href="/fees">
              <span className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">
                View all <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-1.5 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {p.studentName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.feeTypeName} · {p.paymentDate}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">
                    {formatCurrency(p.amountPaid)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === "student" || role === "parent") {
    return <Redirect to="/my-portal" />;
  }

  if (role === "teacher") {
    return <TeacherDashboard />;
  }

  if (role === "accountant") {
    return <AccountantDashboard />;
  }

  return <AdminDashboard />;
}
