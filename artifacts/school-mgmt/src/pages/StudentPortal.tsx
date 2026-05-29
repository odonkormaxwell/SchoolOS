import { useState } from "react";
import {
  useGetStudent,
  useListResults,
  useListAttendance,
  useListFeeBalances,
  useListTerms,
  useGetSchoolProfile,
  useListReportCards,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  BookOpen,
  ClipboardList,
  DollarSign,
  FileText,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Printer,
} from "lucide-react";

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  A1: { bg: "bg-emerald-100", text: "text-emerald-700" },
  B2: { bg: "bg-green-100", text: "text-green-700" },
  B3: { bg: "bg-lime-100", text: "text-lime-700" },
  C4: { bg: "bg-yellow-100", text: "text-yellow-700" },
  C5: { bg: "bg-amber-100", text: "text-amber-700" },
  C6: { bg: "bg-orange-100", text: "text-orange-700" },
  D7: { bg: "bg-red-100", text: "text-red-600" },
  E8: { bg: "bg-red-100", text: "text-red-700" },
  F9: { bg: "bg-rose-100", text: "text-rose-800" },
};

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-muted-foreground text-xs">—</span>;
  const c = GRADE_COLORS[grade] ?? { bg: "bg-gray-100", text: "text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${c.bg} ${c.text}`}>
      {grade}
    </span>
  );
}

function GradeBar({ score }: { score: number | null }) {
  if (score == null) return null;
  const pct = Math.min(100, Math.max(0, score));
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : score >= 40 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground w-8 text-right">{score}</span>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`flex-1 min-w-[80px] rounded-2xl p-3 ${color} text-white`}>
      <p className="text-xs opacity-80 font-medium">{label}</p>
      <p className="text-xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

const statusIcon = {
  present: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
  absent: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  late: <Clock className="h-3.5 w-3.5 text-yellow-500" />,
  excused: <AlertCircle className="h-3.5 w-3.5 text-blue-500" />,
};

function formatCurrency(n: number) {
  return `GH₵ ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function StudentPortal() {
  const { user } = useAuth();
  const studentId = user?.studentId ?? null;
  const [activeTab, setActiveTab] = useState("results");
  const [selectedTermId, setSelectedTermId] = useState<number | "">("");

  const { data: school } = useGetSchoolProfile();
  const { data: student, isLoading: studentLoading } = useGetStudent(
    studentId!,
    { query: { enabled: !!studentId } }
  );
  const { data: terms = [] } = useListTerms();
  const currentTerm = terms.find(t => t.isCurrent);
  const termIdForQuery = selectedTermId || currentTerm?.id;

  const { data: results = [], isLoading: resultsLoading } = useListResults(
    {},
    { query: { enabled: !!studentId } }
  );
  const { data: attendance = [], isLoading: attendanceLoading } = useListAttendance(
    {},
    { query: { enabled: !!studentId } }
  );
  const { data: balances = [], isLoading: feesLoading } = useListFeeBalances(
    {},
    { query: { enabled: !!studentId } }
  );
  const { data: reportCards = [] } = useListReportCards(
    termIdForQuery ? { termId: termIdForQuery } : {},
    { query: { enabled: !!studentId } }
  );

  const termResults = termIdForQuery ? results.filter(r => r.termId === termIdForQuery) : results;
  const scores = termResults.map(r => r.totalScore).filter((s): s is number => s != null);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null;

  const presentCount = attendance.filter(a => a.status === "present" || a.status === "late").length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;

  const totalOwed = balances.reduce((sum, b) => sum + Math.max(0, b.balance), 0);

  const reportCard = reportCards[0] ?? null;

  const firstName = student?.firstName ?? user?.fullName?.split(" ")[0] ?? "Student";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071A2C] via-[#0d2640] to-[#0285FF]/60">
      {/* Header Hero */}
      <div className="px-4 pt-6 pb-4">
        {/* School name */}
        <p className="text-center text-[10px] font-semibold tracking-widest uppercase text-blue-200/70 mb-4">
          {school?.name ?? "SchoolPro GH"}
        </p>

        {/* Avatar + greeting */}
        <div className="flex items-center gap-4 mb-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
            {student ? `${student.firstName[0]}${student.lastName[0]}` : user?.fullName?.slice(0, 2).toUpperCase() ?? "ST"}
          </div>
          <div className="flex-1 min-w-0">
            {studentLoading ? (
              <Skeleton className="h-6 w-40 bg-white/10" />
            ) : (
              <>
                <p className="text-blue-200/80 text-xs font-medium">{getGreeting()},</p>
                <h1 className="text-white text-xl font-bold leading-tight truncate">
                  {student ? `${student.firstName} ${student.lastName}` : (user?.fullName ?? "Student")}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {student?.className && (
                    <span className="text-xs text-blue-200/80 font-medium">{student.className}</span>
                  )}
                  {student?.studentId && (
                    <span className="text-xs text-white/50">• {student.studentId}</span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                    student?.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300"
                  }`}>
                    {student?.status ?? "active"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex gap-2">
          <StatCard
            label="Attendance"
            value={attendanceRate != null ? `${attendanceRate}%` : "—"}
            sub={`${presentCount}/${attendance.length} days`}
            color="bg-white/10 backdrop-blur-sm"
          />
          <StatCard
            label="Avg Score"
            value={avgScore != null ? String(avgScore) : "—"}
            sub={termIdForQuery ? `${termResults.length} subjects` : "all terms"}
            color="bg-white/10 backdrop-blur-sm"
          />
          <StatCard
            label="Fees Owed"
            value={totalOwed > 0 ? `GH₵${totalOwed.toLocaleString()}` : "Cleared"}
            sub={totalOwed > 0 ? "outstanding" : "all paid"}
            color={totalOwed > 0 ? "bg-rose-500/30" : "bg-emerald-500/20"}
          />
        </div>
      </div>

      {/* Content card */}
      <div className="bg-background rounded-t-3xl min-h-[calc(100vh-260px)] mt-2">
        <div className="px-4 pt-4">
          {/* Term selector */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">My Academic Record</p>
            <select
              className="text-xs border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={selectedTermId}
              onChange={e => setSelectedTermId(e.target.value ? parseInt(e.target.value) : "")}
            >
              <option value="">All Terms</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.isCurrent ? " (Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4 grid grid-cols-4 h-auto p-1">
              <TabsTrigger value="results" className="text-xs py-1.5 gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                Results
              </TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs py-1.5 gap-1">
                <ClipboardList className="h-3.5 w-3.5" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="fees" className="text-xs py-1.5 gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Fees
              </TabsTrigger>
              <TabsTrigger value="report" className="text-xs py-1.5 gap-1">
                <FileText className="h-3.5 w-3.5" />
                Report
              </TabsTrigger>
            </TabsList>

            {/* Results Tab */}
            <TabsContent value="results">
              {resultsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : termResults.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">No results recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Summary bar */}
                  {avgScore != null && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 mb-3">
                      <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Term Average</p>
                        <p className="text-sm font-bold text-foreground">{avgScore} / 100</p>
                      </div>
                      <GradeBadge grade={reportCard?.overallGrade ?? null} />
                    </div>
                  )}
                  {termResults.map(r => (
                    <div key={r.id} className="p-3 rounded-xl border bg-card">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold text-foreground truncate">{r.subjectName ?? "Subject"}</p>
                        <GradeBadge grade={r.grade} />
                      </div>
                      <GradeBar score={r.totalScore} />
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground">Class: <b className="text-foreground">{r.classScore ?? "—"}</b></span>
                        <span className="text-xs text-muted-foreground">Exam: <b className="text-foreground">{r.examScore ?? "—"}</b></span>
                        {r.remarks && <span className="text-xs text-muted-foreground italic">{r.remarks}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance">
              {attendanceLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : attendance.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">No attendance records yet</p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: "Present", count: attendance.filter(a => a.status === "present").length, color: "bg-emerald-50 text-emerald-700" },
                      { label: "Late", count: attendance.filter(a => a.status === "late").length, color: "bg-yellow-50 text-yellow-700" },
                      { label: "Absent", count: attendance.filter(a => a.status === "absent").length, color: "bg-red-50 text-red-700" },
                      { label: "Excused", count: attendance.filter(a => a.status === "excused").length, color: "bg-blue-50 text-blue-700" },
                    ].map(s => (
                      <div key={s.label} className={`rounded-xl p-2 text-center ${s.color}`}>
                        <p className="text-lg font-bold">{s.count}</p>
                        <p className="text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                    {[...attendance].sort((a, b) => b.date.localeCompare(a.date)).map(a => (
                      <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-card">
                        {statusIcon[a.status as keyof typeof statusIcon] ?? <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="flex-1 text-sm text-foreground">
                          {new Date(a.date + "T00:00:00").toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                          a.status === "present" ? "bg-emerald-100 text-emerald-700" :
                          a.status === "absent" ? "bg-red-100 text-red-700" :
                          a.status === "late" ? "bg-yellow-100 text-yellow-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>{a.status}</span>
                        {a.remarks && <span className="text-xs text-muted-foreground italic hidden sm:block">{a.remarks}</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Fees Tab */}
            <TabsContent value="fees">
              {feesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : balances.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">No fee records found</p>
                </div>
              ) : (
                <>
                  <div className={`p-4 rounded-xl mb-4 ${totalOwed > 0 ? "bg-rose-50 border border-rose-200" : "bg-emerald-50 border border-emerald-200"}`}>
                    <p className="text-xs font-medium text-muted-foreground">Total Outstanding</p>
                    <p className={`text-2xl font-bold ${totalOwed > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {formatCurrency(totalOwed)}
                    </p>
                    {totalOwed === 0 && <p className="text-xs text-emerald-600 mt-0.5">All fees cleared</p>}
                  </div>
                  <div className="space-y-2">
                    {balances.map((b, i) => (
                      <div key={i} className="p-3 rounded-xl border bg-card">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{b.feeTypeName}</p>
                            <p className="text-xs text-muted-foreground">Term ID: {b.termId}</p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            b.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                            b.status === "partial" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>{b.status}</span>
                        </div>
                        <div className="flex gap-3 text-xs mt-2">
                          <span className="text-muted-foreground">Fee: <b className="text-foreground">{formatCurrency(b.totalFee)}</b></span>
                          <span className="text-muted-foreground">Paid: <b className="text-emerald-600">{formatCurrency(b.totalPaid)}</b></span>
                          <span className="text-muted-foreground">Bal: <b className={b.balance > 0 ? "text-rose-600" : "text-emerald-600"}>{formatCurrency(b.balance)}</b></span>
                        </div>
                        {b.totalFee > 0 && (
                          <div className="mt-2 h-1.5 rounded-full bg-gray-200">
                            <div
                              className="h-1.5 rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${Math.min(100, (b.totalPaid / b.totalFee) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Report Card Tab */}
            <TabsContent value="report">
              {!reportCard ? (
                <div className="text-center py-12">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">
                    {termIdForQuery ? "No report card for this term" : "Select a term to view your report card"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Report header */}
                  <div className="rounded-xl border bg-card p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {school?.name ?? "Ghana School"}
                    </p>
                    <p className="text-sm font-bold text-foreground mt-1">Student Report Card</p>
                    <p className="text-xs text-muted-foreground">{reportCard.termName} • {reportCard.academicYearName}</p>
                    <div className="flex justify-center gap-4 mt-3">
                      {reportCard.averageScore != null && (
                        <div className="text-center">
                          <p className="text-2xl font-black text-primary">{reportCard.averageScore}</p>
                          <p className="text-xs text-muted-foreground">Average</p>
                        </div>
                      )}
                      {reportCard.overallGrade && (
                        <div className="text-center">
                          <p className={`text-2xl font-black ${GRADE_COLORS[reportCard.overallGrade]?.text ?? "text-foreground"}`}>
                            {reportCard.overallGrade}
                          </p>
                          <p className="text-xs text-muted-foreground">Grade</p>
                        </div>
                      )}
                      {reportCard.attendanceSummary.totalDays > 0 && (
                        <div className="text-center">
                          <p className="text-2xl font-black text-emerald-600">{reportCard.attendanceSummary.attendanceRate}%</p>
                          <p className="text-xs text-muted-foreground">Attendance</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subjects */}
                  {reportCard.results.length > 0 && (
                    <div className="rounded-xl border overflow-hidden">
                      <div className="bg-muted px-3 py-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject Results</p>
                      </div>
                      <div className="divide-y">
                        {reportCard.results.map((r, i) => (
                          <div key={i} className="px-3 py-2.5 flex items-center gap-2">
                            <span className="flex-1 text-sm text-foreground">{r.subjectName}</span>
                            <span className="text-xs text-muted-foreground w-16 text-right">{r.classScore ?? "—"} / {r.examScore ?? "—"}</span>
                            <span className="font-bold text-sm text-foreground w-8 text-right">{r.totalScore ?? "—"}</span>
                            <GradeBadge grade={r.grade} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4" />
                    Print Report Card
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
