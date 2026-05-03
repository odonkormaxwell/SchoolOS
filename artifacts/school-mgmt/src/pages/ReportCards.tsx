import { useState } from "react";
import { useListClasses, useListTerms, useListReportCards, useGetSchoolProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer } from "lucide-react";

const gradeColors: Record<string, string> = {
  A1: "text-emerald-700", B2: "text-green-700", B3: "text-lime-700",
  C4: "text-yellow-700", C5: "text-amber-700", C6: "text-orange-700",
  D7: "text-red-600", E8: "text-red-700", F9: "text-red-800",
};

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Report Cards</h1>
          <p className="text-muted-foreground text-sm">Terminal academic reports</p>
        </div>
        {displayCards.length > 0 && (
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        )}
      </div>

      <Card>
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
                  <SelectItem value="all">All Students</SelectItem>
                  {reportCards.map(rc => <SelectItem key={rc.studentId} value={String(rc.studentId)}>{rc.studentName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedClass && !selectedTerm ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Select a class or term to view report cards</div>
      ) : isLoading ? (
        <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}</div>
      ) : displayCards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No report cards available. Please enter results first.</div>
      ) : (
        <div className="space-y-6 print:space-y-0">
          {displayCards.map((rc) => (
            <div key={rc.studentId} className="print:break-after-page">
              <Card className="overflow-hidden border-2">
                <div className="bg-primary px-6 py-4 text-primary-foreground">
                  <div className="text-center">
                    <h2 className="text-lg font-bold">{school?.name ?? "Ghana Basic School"}</h2>
                    {school?.motto && <p className="text-sm opacity-80 italic">"{school.motto}"</p>}
                    {school?.address && <p className="text-xs opacity-70">{school.address}</p>}
                    <div className="mt-2 inline-block bg-primary-foreground/20 rounded px-3 py-0.5">
                      <p className="text-sm font-semibold">Terminal Report — {rc.termName}</p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 pb-5 border-b">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Student</p>
                      <p className="font-semibold text-sm mt-0.5">{rc.studentName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Class</p>
                      <p className="font-semibold text-sm mt-0.5">{rc.className}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Position</p>
                      <p className="font-semibold text-sm mt-0.5">{rc.classPosition ?? "—"} / {rc.totalStudents}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Attendance</p>
                      <p className="font-semibold text-sm mt-0.5">{rc.attendanceSummary?.presentDays ?? 0}/{rc.attendanceSummary?.totalDays ?? 0} days</p>
                    </div>
                  </div>

                  <table className="w-full mb-4">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Subject</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Class (30)</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Exam (70)</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Grade</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!rc.results || rc.results.length === 0) ? (
                        <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">No results entered</td></tr>
                      ) : rc.results?.map((r, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-3 py-2 text-sm font-medium">{r.subjectName}</td>
                          <td className="px-3 py-2 text-sm text-center">{r.classScore ?? "—"}</td>
                          <td className="px-3 py-2 text-sm text-center">{r.examScore ?? "—"}</td>
                          <td className="px-3 py-2 text-sm text-center font-bold">{r.totalScore ?? "—"}</td>
                          <td className="px-3 py-2 text-center">
                            {r.grade && <span className={`font-bold text-sm ${gradeColors[r.grade] ?? ""}`}>{r.grade}</span>}
                          </td>
                          <td className="px-3 py-2 text-sm text-muted-foreground">{r.remarks ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    {rc.results && rc.results.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-primary/30 bg-muted/30">
                          <td className="px-3 py-2 text-sm font-bold" colSpan={3}>Aggregate</td>
                          <td className="px-3 py-2 text-sm font-bold text-center">{rc.averageScore?.toFixed(1) ?? "—"}</td>
                          <td className="px-3 py-2 text-center">
                            {rc.overallGrade && <span className={`font-bold ${gradeColors[rc.overallGrade] ?? ""}`}>{rc.overallGrade}</span>}
                          </td>
                          <td className="px-3 py-2"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Class Teacher</p>
                      <div className="mt-6 border-b border-dashed border-gray-300"></div>
                      <p className="text-xs text-muted-foreground mt-1">Signature &amp; Date</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Headteacher</p>
                      <div className="mt-6 border-b border-dashed border-gray-300"></div>
                      <p className="text-xs text-muted-foreground mt-1">Signature &amp; Date</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Parent / Guardian</p>
                      <div className="mt-6 border-b border-dashed border-gray-300"></div>
                      <p className="text-xs text-muted-foreground mt-1">Signature &amp; Date</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
