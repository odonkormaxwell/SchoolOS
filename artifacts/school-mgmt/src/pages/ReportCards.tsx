import { useState } from "react";
import { useListClasses, useListTerms, useListReportCards, useGetSchoolProfile } from "@workspace/api-client-react";
import type { ReportCard } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Award, TrendingUp } from "lucide-react";

const gradeConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  A1: { bg: "bg-emerald-50",  text: "text-emerald-800", border: "border-l-emerald-500", label: "Excellent" },
  B2: { bg: "bg-green-50",   text: "text-green-800",   border: "border-l-green-500",   label: "Very Good" },
  B3: { bg: "bg-lime-50",    text: "text-lime-800",    border: "border-l-lime-500",     label: "Good" },
  C4: { bg: "bg-yellow-50",  text: "text-yellow-800",  border: "border-l-yellow-500",  label: "Credit" },
  C5: { bg: "bg-yellow-50",  text: "text-yellow-800",  border: "border-l-yellow-400",  label: "Credit" },
  C6: { bg: "bg-orange-50",  text: "text-orange-800",  border: "border-l-orange-500",  label: "Credit" },
  D7: { bg: "bg-red-50",     text: "text-red-700",     border: "border-l-red-400",     label: "Pass" },
  E8: { bg: "bg-red-50",     text: "text-red-800",     border: "border-l-red-500",     label: "Pass" },
  F9: { bg: "bg-red-100",    text: "text-red-900",     border: "border-l-red-600",     label: "Fail" },
};

function avatarColor(name: string): string {
  const palette = ["#0285FF","#10B981","#F59E0B","#8B5CF6","#EC4899","#06B6D4","#F97316","#6366F1"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function performanceLabel(avg: number): string {
  if (avg >= 80) return "Excellent Performance";
  if (avg >= 70) return "Very Good Performance";
  if (avg >= 60) return "Good Performance";
  if (avg >= 50) return "Average Performance";
  if (avg >= 40) return "Below Average";
  return "Poor Performance";
}

function performanceColor(avg: number): string {
  if (avg >= 70) return "bg-emerald-500";
  if (avg >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function ReportCardView({ rc, school }: { rc: ReportCard; school: { name?: string | null; motto?: string | null; address?: string | null; phone?: string | null; headteacher?: string | null } | null | undefined }) {
  const initials = rc.studentName?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "ST";
  const bg = avatarColor(rc.studentName ?? "Student");
  const avg = rc.averageScore ?? 0;
  const attendancePct = rc.attendanceSummary?.totalDays
    ? Math.round(((rc.attendanceSummary.presentDays ?? 0) / rc.attendanceSummary.totalDays) * 100)
    : 0;

  return (
    <div className="print:break-after-page">
      <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-slate-300">

        {/* === SCHOOL HEADER === */}
        <div className="bg-[#071A2C] text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-2 right-4 text-8xl font-bold tracking-widest text-white">GES</div>
          </div>
          <div className="relative flex items-center gap-5 px-8 py-5">
            <div className="h-16 w-16 rounded-full bg-[#0285FF] flex items-center justify-center flex-shrink-0 border-2 border-blue-400 shadow-lg">
              <Award className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold tracking-wide uppercase">{school?.name ?? "Ghana Basic School"}</h2>
              {school?.motto && <p className="text-blue-300 text-sm italic mt-0.5">"{school.motto}"</p>}
              {school?.address && <p className="text-blue-200 text-xs mt-0.5">{school.address}{school.phone ? ` • Tel: ${school.phone}` : ""}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="inline-block bg-[#0285FF] rounded-lg px-4 py-2 text-center">
                <p className="text-xs text-blue-200 uppercase tracking-wider">Terminal Report</p>
                <p className="text-sm font-bold">{rc.termName}</p>
              </div>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-[#0285FF] via-blue-400 to-transparent" />
        </div>

        <div className="p-6">
          {/* === STUDENT INFO + PERFORMANCE SUMMARY === */}
          <div className="flex gap-5 mb-6 pb-6 border-b">
            <div
              className="h-20 w-20 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 border-2 border-slate-100 shadow"
              style={{ background: bg }}
            >
              {initials}
            </div>

            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Full Name</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{rc.studentName}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Class</p>
                <p className="text-sm font-semibold mt-0.5">{rc.className}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Class Position</p>
                <p className="text-sm font-semibold mt-0.5">
                  {rc.classPosition != null
                    ? <span>{rc.classPosition}<sup>{["st","nd","rd"][rc.classPosition - 1] ?? "th"}</sup> out of {rc.totalStudents} students</span>
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Attendance</p>
                <p className="text-sm font-semibold mt-0.5">
                  {rc.attendanceSummary?.presentDays ?? 0}/{rc.attendanceSummary?.totalDays ?? 0} days
                  <span className={`ml-1.5 text-xs font-bold ${attendancePct >= 80 ? "text-emerald-600" : attendancePct >= 60 ? "text-amber-600" : "text-red-500"}`}>
                    ({attendancePct}%)
                  </span>
                </p>
              </div>
            </div>

            <div className="w-44 flex-shrink-0 bg-slate-50 rounded-xl p-4 border text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Overall Average</p>
              <div className="text-4xl font-black mb-1" style={{ color: avg >= 70 ? "#10B981" : avg >= 50 ? "#F59E0B" : "#EF4444" }}>
                {avg.toFixed(1)}
              </div>
              {rc.overallGrade && (
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${gradeConfig[rc.overallGrade]?.bg ?? ""} ${gradeConfig[rc.overallGrade]?.text ?? ""}`}>
                  {rc.overallGrade} — {gradeConfig[rc.overallGrade]?.label}
                </span>
              )}
              <div className="mt-2">
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${performanceColor(avg)}`} style={{ width: `${avg}%` }} />
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">{performanceLabel(avg)}</p>
              </div>
            </div>
          </div>

          {/* === RESULTS TABLE === */}
          {(!rc.results || rc.results.length === 0) ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No results entered for this term</p>
          ) : (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Academic Performance</h3>
              </div>
              <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-[#071A2C] text-white">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Subject</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wider w-20">Class (30)</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wider w-20">Exam (70)</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wider w-20">Total</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wider w-16">Grade</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider w-24">Remarks</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {rc.results.map((r: any, i: number) => {
                    const cfg = gradeConfig[r.grade ?? ""] ?? {};
                    return (
                      <tr key={i} className={`border-b border-slate-100 border-l-4 ${cfg.border ?? "border-l-transparent"} ${cfg.bg ?? ""}`}>
                        <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{r.subjectName}</td>
                        <td className="px-3 py-2.5 text-sm text-center text-slate-600">{r.classScore ?? "—"}</td>
                        <td className="px-3 py-2.5 text-sm text-center text-slate-600">{r.examScore ?? "—"}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-sm font-bold text-slate-900">{r.totalScore ?? "—"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {r.grade && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${cfg.text ?? ""}`}>
                              {r.grade}
                            </span>
                          )}
                        </td>
                        <td className={`px-3 py-2.5 text-xs ${cfg.text ?? "text-muted-foreground"}`}>
                          {cfg.label ?? r.remarks ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 w-32">
                          {r.totalScore != null && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${r.totalScore >= 70 ? "bg-emerald-500" : r.totalScore >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.totalScore}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-7 text-right">{r.totalScore}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#071A2C]/5 border-t-2 border-[#071A2C]/20">
                    <td className="px-4 py-2.5 text-sm font-bold text-slate-800" colSpan={3}>AGGREGATE / AVERAGE</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-sm font-black text-slate-900">{avg.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {rc.overallGrade && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${gradeConfig[rc.overallGrade]?.text ?? ""}`}>
                          {rc.overallGrade}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{rc.classPosition != null ? `Position: ${rc.classPosition}/${rc.totalStudents}` : ""}</td>
                    <td className="px-4 py-2.5 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${performanceColor(avg)}`} style={{ width: `${avg}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{avg.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* === GRADE KEY === */}
          <div className="flex flex-wrap gap-1.5 mb-6 pb-5 border-b">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1 self-center">Grade Key:</span>
            {Object.entries(gradeConfig).map(([g, c]) => (
              <span key={g} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${c.bg} ${c.text}`}>
                {g} = {c.label}
              </span>
            ))}
          </div>

          {/* === TEACHER REMARKS === */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Class Teacher's Remarks</p>
              <div className="border border-dashed border-slate-300 rounded-lg p-3 min-h-[60px] bg-slate-50">
                <p className="text-xs text-slate-400 italic">
                  {rc.classPosition != null && rc.classPosition <= 3
                    ? `${rc.studentName?.split(" ")[0]} is a top performer. Outstanding work! Keep it up.`
                    : rc.classPosition != null && rc.classPosition <= Math.ceil((rc.totalStudents ?? 1) / 2)
                    ? `${rc.studentName?.split(" ")[0]} is making good progress. More effort needed in weak areas.`
                    : `${rc.studentName?.split(" ")[0]} needs to work harder. Please provide support at home.`
                  }
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Next Term Begins</p>
              <div className="border border-dashed border-slate-300 rounded-lg p-3 min-h-[60px] bg-slate-50 flex flex-col justify-center">
                <p className="text-sm font-semibold text-slate-700">Monday, 28th April 2025</p>
                <p className="text-xs text-muted-foreground mt-1">3rd Term 2024/2025 Academic Year</p>
              </div>
            </div>
          </div>

          {/* === SIGNATURE SECTION === */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t">
            {[
              { label: "Class Teacher", name: school?.headteacher ? "Abena Mensah" : undefined },
              { label: "Headteacher", name: school?.headteacher ?? undefined },
              { label: "Parent / Guardian", name: undefined },
            ].map(sig => (
              <div key={sig.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{sig.label}</p>
                {sig.name && <p className="text-xs text-slate-600 mb-3">{sig.name}</p>}
                <div className="mt-5 border-b border-slate-300" />
                <p className="text-[9px] text-muted-foreground mt-1">Signature &amp; Date</p>
              </div>
            ))}
          </div>
        </div>

        {/* === FOOTER === */}
        <div className="bg-[#071A2C] text-blue-200 text-[9px] px-6 py-2 flex justify-between items-center">
          <span>{school?.name ?? "Ghana Basic School"} • Ghana Education Service</span>
          <span>Printed: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
        </div>
      </div>
    </div>
  );
}

export default function ReportCards() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("all");

  const { data: classes = [] } = useListClasses();
  const { data: terms = [] } = useListTerms();
  const { data: school } = useGetSchoolProfile();
  const currentTerm = terms.find(t => t.isCurrent);

  const { data: reportCards = [], isLoading } = useListReportCards(
    {
      classId: selectedClass ? parseInt(selectedClass) : undefined,
      termId: selectedTerm ? parseInt(selectedTerm) : undefined,
    },
    {
      query: {
        queryKey: ["report-cards", selectedClass, selectedTerm],
        enabled: !!(selectedClass || selectedTerm),
      },
    }
  );

  const displayCards = selectedStudent !== "all"
    ? reportCards.filter(rc => String(rc.studentId) === selectedStudent)
    : reportCards;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Report Cards</h1>
          <p className="text-muted-foreground text-sm">Terminal academic reports with full performance breakdown</p>
        </div>
        {displayCards.length > 0 && (
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print {selectedStudent === "all" ? `All (${displayCards.length})` : "Selected"}
          </Button>
        )}
      </div>

      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedStudent("all"); }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger><SelectValue placeholder={currentTerm?.name ?? "Select term"} /></SelectTrigger>
                <SelectContent>{terms.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name} {t.isCurrent ? "(Current)" : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger><SelectValue placeholder="All students" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students ({reportCards.length})</SelectItem>
                  {reportCards.map(rc => <SelectItem key={rc.studentId} value={String(rc.studentId)}>{rc.studentName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {reportCards.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              {reportCards.length} report {reportCards.length === 1 ? "card" : "cards"} available •
              Select a single student for individual printing or print all at once
            </p>
          )}
        </CardContent>
      </Card>

      {!selectedClass && !selectedTerm ? (
        <div className="text-center py-16 text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm">Select a class and term to generate report cards</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Results must be entered first via the Results page</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}</div>
      ) : displayCards.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No report cards available. Please enter results first.</p>
        </div>
      ) : (
        <div className="space-y-8 print:space-y-0">
          {displayCards.map(rc => (
            <ReportCardView key={rc.studentId} rc={rc} school={school} />
          ))}
        </div>
      )}
    </div>
  );
}
