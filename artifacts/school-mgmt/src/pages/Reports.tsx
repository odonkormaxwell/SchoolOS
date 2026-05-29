import { useState } from "react";
import {
  useListClasses, useListTerms, useGetAttendanceReport,
  useGetFeesReport, useGetResultsReport,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  DollarSign, Users, TrendingUp, AlertCircle,
  Download, GraduationCap, BookOpen, BarChart3,
} from "lucide-react";

function formatGhc(amount: number) { return `GH₵ ${amount.toFixed(2)}`; }
function formatGhcShort(amount: number) {
  if (amount >= 1000) return `GH₵${(amount / 1000).toFixed(1)}k`;
  return `GH₵${amount.toFixed(0)}`;
}

function exportCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CHART_COLORS = ["#0285FF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color ?? ""}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color ? "bg-primary/10" : "bg-muted"}`}>
            <Icon className={`h-4 w-4 ${color ?? "text-muted-foreground"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const [classFilter, setClassFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");

  const { data: classes = [] } = useListClasses();
  const { data: terms = [] } = useListTerms();

  const classId = classFilter !== "all" ? parseInt(classFilter) : undefined;
  const termId = termFilter !== "all" ? parseInt(termFilter) : undefined;

  const { data: attendanceReport = [], isLoading: attLoading } = useGetAttendanceReport(
    { classId, termId },
    { query: { queryKey: ["attendance-report", classFilter, termFilter] } }
  );
  const { data: feesReport, isLoading: feesLoading } = useGetFeesReport(
    { classId, termId },
    { query: { queryKey: ["fees-report", classFilter, termFilter] } }
  );
  const { data: resultsReport = [], isLoading: resultsLoading } = useGetResultsReport(
    { classId, termId },
    { query: { queryKey: ["results-report", classFilter, termFilter] } }
  );

  const avgAttendance = attendanceReport.length > 0
    ? Math.round(attendanceReport.reduce((s, r) => s + r.attendanceRate, 0) / attendanceReport.length)
    : 0;
  const avgScore = resultsReport.length > 0
    ? (resultsReport.reduce((s, r) => s + (r.averageScore ?? 0), 0) / resultsReport.length)
    : 0;
  const avgPassRate = resultsReport.length > 0
    ? (resultsReport.reduce((s, r) => s + (r.passRate ?? 0), 0) / resultsReport.length)
    : 0;

  const feesChartData = feesReport?.byClass?.map(c => ({
    name: c.className.replace("Primary", "P").replace("Junior High School", "JHS"),
    collected: c.totalCollected,
    pending: c.totalExpected - c.totalCollected,
  })) ?? [];

  const attendanceChartData = attendanceReport
    .slice()
    .sort((a, b) => (a.attendanceRate - b.attendanceRate))
    .slice(0, 20)
    .map(r => ({
      name: r.studentName?.split(" ")[0] ?? "Student",
      rate: r.attendanceRate,
    }));

  const resultsChartData = resultsReport.map(r => ({
    name: r.subjectName ?? r.className,
    average: parseFloat((r.averageScore ?? 0).toFixed(1)),
    pass: parseFloat((r.passRate ?? 0).toFixed(1)),
  }));

  const feesPieData = [
    { name: "Collected", value: feesReport?.totalCollected ?? 0 },
    { name: "Outstanding", value: feesReport?.totalPending ?? 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm">School performance overview with exportable data</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-48">
            <GraduationCap className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={termFilter} onValueChange={setTermFilter}>
          <SelectTrigger className="w-48">
            <BookOpen className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            {terms.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name} {t.isCurrent ? "(Current)" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="fees">
        <TabsList>
          <TabsTrigger value="fees" className="gap-2"><DollarSign className="h-3.5 w-3.5" /> Fees Report</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2"><Users className="h-3.5 w-3.5" /> Attendance</TabsTrigger>
          <TabsTrigger value="results" className="gap-2"><BarChart3 className="h-3.5 w-3.5" /> Results</TabsTrigger>
        </TabsList>

        {/* ─────── FEES ─────── */}
        <TabsContent value="fees" className="mt-4 space-y-4">
          {feesLoading ? (
            <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : feesReport ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon={DollarSign} label="Total Expected" value={formatGhcShort(feesReport.totalExpected ?? 0)} sub={formatGhc(feesReport.totalExpected ?? 0)} />
                <StatCard icon={TrendingUp} label="Collected" value={formatGhcShort(feesReport.totalCollected ?? 0)} sub={formatGhc(feesReport.totalCollected ?? 0)} color="text-emerald-600" />
                <StatCard icon={AlertCircle} label="Outstanding" value={formatGhcShort(feesReport.totalPending ?? 0)} sub={formatGhc(feesReport.totalPending ?? 0)} color="text-red-500" />
                <StatCard icon={BarChart3} label="Collection Rate" value={`${feesReport.collectionRate ?? 0}%`} sub={`${feesReport.collectionRate ?? 0 >= 80 ? "On track" : "Needs attention"}`} color={(feesReport.collectionRate ?? 0) >= 70 ? "text-emerald-600" : "text-amber-600"} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Card>
                    <CardHeader className="pb-2 flex-row items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Fees Collection by Class</CardTitle>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => exportCSV(
                        ["Class", "Collected (GH₵)", "Pending (GH₵)"],
                        feesChartData.map(d => [d.name, d.collected, d.pending]),
                        "fees-by-class.csv"
                      )}>
                        <Download className="h-3 w-3" /> Export
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={feesChartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₵${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => formatGhc(value)} />
                          <Bar dataKey="collected" name="Collected" fill="#0285FF" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="pending" name="Outstanding" fill="#FCA5A5" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Collection Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {feesPieData.length > 0 && (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={feesPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                              {feesPieData.map((_, i) => (
                                <Cell key={i} fill={i === 0 ? "#0285FF" : "#FCA5A5"} />
                              ))}
                            </Pie>
                            <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
                            <Tooltip formatter={(value: number) => formatGhc(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                      <div className="text-center mt-2">
                        <p className="text-3xl font-black text-primary">{feesReport.collectionRate ?? 0}%</p>
                        <p className="text-xs text-muted-foreground">collection rate</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {feesReport.byFeeType && feesReport.byFeeType.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Breakdown by Fee Type</CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => exportCSV(
                      ["Fee Type", "Expected (GH₵)", "Collected (GH₵)", "Balance (GH₵)"],
                      (feesReport.byFeeType ?? []).map(ft => [ft.feeTypeName, ft.totalExpected ?? 0, ft.totalCollected ?? 0, ft.balance ?? 0]),
                      "fees-by-type.csv"
                    )}>
                      <Download className="h-3 w-3" /> Export CSV
                    </Button>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Fee Type</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Expected</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Collected</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Balance</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feesReport.byFeeType.map((ft, i) => {
                          const pct = ft.totalExpected ? Math.round(((ft.totalCollected ?? 0) / ft.totalExpected) * 100) : 0;
                          return (
                            <tr key={i} className="border-b hover:bg-muted/10">
                              <td className="py-2.5 px-3 text-sm font-medium">{ft.feeTypeName}</td>
                              <td className="py-2.5 px-3 text-sm text-right">{formatGhc(ft.totalExpected ?? 0)}</td>
                              <td className="py-2.5 px-3 text-sm text-right text-emerald-600 font-medium">{formatGhc(ft.totalCollected ?? 0)}</td>
                              <td className="py-2.5 px-3 text-sm text-right text-red-500">{formatGhc(ft.balance ?? 0)}</td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">No fees data available</div>
          )}
        </TabsContent>

        {/* ─────── ATTENDANCE ─────── */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          {attLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : attendanceReport.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No attendance data available</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Students Tracked" value={String(attendanceReport.length)} />
                <StatCard icon={TrendingUp} label="Avg Attendance" value={`${avgAttendance}%`} color={avgAttendance >= 80 ? "text-emerald-600" : "text-amber-600"} />
                <StatCard icon={TrendingUp} label="Perfect (100%)" value={String(attendanceReport.filter(r => r.attendanceRate === 100).length)} color="text-emerald-600" />
                <StatCard icon={AlertCircle} label="Below 80%" value={String(attendanceReport.filter(r => r.attendanceRate < 80).length)} color="text-red-500" />
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Attendance Rate Distribution (lowest 20)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={attendanceChartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Bar dataKey="rate" name="Attendance Rate"
                        fill="#0285FF"
                        radius={[3, 3, 0, 0]}
                        label={{ position: "top", fontSize: 9, formatter: (v: number) => `${v}%` }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Attendance by Student</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => exportCSV(
                    ["Student", "Class", "Total Days", "Present", "Absent", "Rate (%)"],
                    attendanceReport.map(r => [r.studentName ?? "", r.className ?? "", r.totalDays, r.presentDays, r.absentDays, r.attendanceRate]),
                    "attendance-report.csv"
                  )}>
                    <Download className="h-3 w-3" /> Export CSV
                  </Button>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Student</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Class</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Present</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Absent</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceReport.map((r, i) => (
                        <tr key={i} className="border-b hover:bg-muted/20">
                          <td className="px-4 py-2.5 text-sm font-medium">{r.studentName}</td>
                          <td className="px-4 py-2.5 text-sm text-muted-foreground">{r.className ?? "—"}</td>
                          <td className="px-4 py-2.5 text-sm text-center">{r.totalDays}</td>
                          <td className="px-4 py-2.5 text-sm text-center text-emerald-600 font-medium">{r.presentDays}</td>
                          <td className="px-4 py-2.5 text-sm text-center text-red-500 font-medium">{r.absentDays}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${r.attendanceRate >= 80 ? "bg-emerald-500" : r.attendanceRate >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.attendanceRate}%` }} />
                              </div>
                              <span className={`text-sm font-semibold ${r.attendanceRate >= 80 ? "text-emerald-600" : r.attendanceRate >= 60 ? "text-yellow-600" : "text-red-500"}`}>
                                {r.attendanceRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ─────── RESULTS ─────── */}
        <TabsContent value="results" className="mt-4 space-y-4">
          {resultsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : resultsReport.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No results data available</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon={BarChart3} label="Subjects Tracked" value={String(resultsReport.length)} />
                <StatCard icon={TrendingUp} label="School Average" value={avgScore.toFixed(1)} color={avgScore >= 70 ? "text-emerald-600" : "text-amber-600"} />
                <StatCard icon={GraduationCap} label="Avg Pass Rate" value={`${avgPassRate.toFixed(0)}%`} color={avgPassRate >= 70 ? "text-emerald-600" : "text-amber-600"} />
                <StatCard icon={TrendingUp} label="Top Subject" value={resultsReport.reduce((best, r) => (r.averageScore ?? 0) > (best.averageScore ?? 0) ? r : best, resultsReport[0])?.subjectName?.split(" ")[0] ?? "—"} color="text-primary" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Average Score by Subject/Class</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={resultsChartData.slice(0, 15)} margin={{ top: 5, right: 10, left: 10, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="average" name="Avg Score" fill="#0285FF" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Pass Rate by Subject/Class</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={resultsChartData.slice(0, 15)} margin={{ top: 5, right: 10, left: 10, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Bar dataKey="pass" name="Pass Rate %" fill="#10B981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Detailed Results Summary</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => exportCSV(
                    ["Class", "Subject", "Students", "Average", "Highest", "Lowest", "Pass Rate (%)"],
                    resultsReport.map(r => [r.className ?? "", r.subjectName ?? "", r.studentCount, r.averageScore?.toFixed(1) ?? "", r.highestScore?.toFixed(1) ?? "", r.lowestScore?.toFixed(1) ?? "", r.passRate?.toFixed(1) ?? ""]),
                    "results-report.csv"
                  )}>
                    <Download className="h-3 w-3" /> Export CSV
                  </Button>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {["Class", "Subject", "Students", "Average", "Highest", "Lowest", "Pass Rate"].map(h => (
                          <th key={h} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase text-center first:text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultsReport.map((r, i) => (
                        <tr key={i} className="border-b hover:bg-muted/20">
                          <td className="px-4 py-2.5 text-sm">{r.className}</td>
                          <td className="px-4 py-2.5 text-sm font-medium">{r.subjectName ?? "—"}</td>
                          <td className="px-4 py-2.5 text-sm text-center">{r.studentCount}</td>
                          <td className="px-4 py-2.5 text-sm text-center font-semibold">
                            <span className={(r.averageScore ?? 0) >= 70 ? "text-emerald-600" : (r.averageScore ?? 0) >= 50 ? "text-amber-600" : "text-red-500"}>
                              {r.averageScore?.toFixed(1) ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-center text-emerald-600 font-medium">{r.highestScore?.toFixed(1) ?? "—"}</td>
                          <td className="px-4 py-2.5 text-sm text-center text-red-500 font-medium">{r.lowestScore?.toFixed(1) ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${(r.passRate ?? 0) >= 70 ? "bg-emerald-500" : (r.passRate ?? 0) >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.passRate ?? 0}%` }} />
                              </div>
                              <span className={`text-sm font-semibold ${(r.passRate ?? 0) >= 70 ? "text-emerald-600" : (r.passRate ?? 0) >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                                {r.passRate?.toFixed(0) ?? "—"}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
