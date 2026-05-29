import { useState } from "react";
import {
  useListClasses, useListSubjects, useListTerms,
  useListStudents, useListResults, useBulkCreateResults,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Printer, BarChart3, PenLine, Trophy, TrendingUp, TrendingDown, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSchoolProfile } from "@workspace/api-client-react";

const gradeColors: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-800 border-emerald-200",
  B2: "bg-green-100 text-green-800 border-green-200",
  B3: "bg-lime-100 text-lime-800 border-lime-200",
  C4: "bg-yellow-100 text-yellow-800 border-yellow-200",
  C5: "bg-amber-100 text-amber-800 border-amber-200",
  C6: "bg-orange-100 text-orange-800 border-orange-200",
  D7: "bg-red-100 text-red-700 border-red-200",
  E8: "bg-red-100 text-red-800 border-red-200",
  F9: "bg-red-200 text-red-900 border-red-300",
};

const gradeRowBg: Record<string, string> = {
  A1: "bg-emerald-50/40", B2: "bg-green-50/40", B3: "bg-lime-50/40",
  C4: "bg-yellow-50/40", C5: "bg-amber-50/30", C6: "bg-orange-50/30",
  D7: "bg-red-50/40", E8: "bg-red-50/50", F9: "bg-red-100/50",
};

function computeGrade(total: number): string {
  if (total >= 80) return "A1";
  if (total >= 70) return "B2";
  if (total >= 60) return "B3";
  if (total >= 55) return "C4";
  if (total >= 50) return "C5";
  if (total >= 45) return "C6";
  if (total >= 40) return "D7";
  if (total >= 30) return "E8";
  return "F9";
}

function avatarColor(name: string): string {
  const p = ["#0285FF","#10B981","#F59E0B","#8B5CF6","#EC4899","#06B6D4","#F97316","#6366F1"];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
}

function gradeDistribution(scores: number[]): Record<string, number> {
  const dist: Record<string, number> = { A1: 0, B2: 0, B3: 0, C4: 0, C5: 0, C6: 0, D7: 0, E8: 0, F9: 0 };
  scores.forEach(s => { dist[computeGrade(s)]++; });
  return dist;
}

interface ScoreEntry { classScore: string; examScore: string; }

export default function Results() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [scores, setScores] = useState<Record<number, ScoreEntry>>({});
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("entry");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: classes = [] } = useListClasses();
  const { data: subjects = [] } = useListSubjects();
  const { data: terms = [] } = useListTerms();
  const { data: school } = useGetSchoolProfile();
  const currentTerm = terms.find(t => t.isCurrent);

  const { data: students = [], isLoading: studentsLoading } = useListStudents(
    { classId: selectedClass ? parseInt(selectedClass) : undefined },
    { query: { queryKey: ["students", selectedClass], enabled: !!selectedClass } }
  );

  const { data: existingResults = [] } = useListResults(
    {
      classId: selectedClass ? parseInt(selectedClass) : undefined,
      subjectId: selectedSubject ? parseInt(selectedSubject) : undefined,
      termId: selectedTerm ? parseInt(selectedTerm) : undefined,
    },
    {
      query: {
        queryKey: ["results", selectedClass, selectedSubject, selectedTerm],
        enabled: !!selectedClass && !!selectedSubject && !!selectedTerm,
      },
    }
  );

  const bulkMutation = useBulkCreateResults();

  function loadExisting() {
    const map: Record<number, ScoreEntry> = {};
    for (const s of students) {
      const r = existingResults.find(e => e.studentId === s.id);
      map[s.id] = {
        classScore: r?.classScore != null ? String(r.classScore) : "",
        examScore: r?.examScore != null ? String(r.examScore) : "",
      };
    }
    setScores(map);
    setSaved(false);
  }

  function updateScore(studentId: number, field: keyof ScoreEntry, value: string) {
    setScores(s => ({ ...s, [studentId]: { ...s[studentId], [field]: value } }));
    setSaved(false);
  }

  function getTotal(entry: ScoreEntry | undefined): number | null {
    if (!entry) return null;
    const c = parseFloat(entry.classScore);
    const e = parseFloat(entry.examScore);
    if (isNaN(c) && isNaN(e)) return null;
    return (isNaN(c) ? 0 : c) + (isNaN(e) ? 0 : e);
  }

  async function handleSave() {
    if (!selectedClass || !selectedSubject || !selectedTerm) {
      toast({ title: "Please select class, subject, and term", variant: "destructive" });
      return;
    }
    try {
      const results = students.map(s => {
        const entry = scores[s.id];
        return {
          studentId: s.id,
          classScore: entry?.classScore ? parseFloat(entry.classScore) : undefined,
          examScore: entry?.examScore ? parseFloat(entry.examScore) : undefined,
        };
      }).filter(r => r.classScore != null || r.examScore != null);

      if (results.length === 0) { toast({ title: "No scores to save", variant: "destructive" }); return; }

      await bulkMutation.mutateAsync({
        data: { classId: parseInt(selectedClass), subjectId: parseInt(selectedSubject), termId: parseInt(selectedTerm), results: results as any },
      });
      await qc.invalidateQueries({ queryKey: ["results"] });
      setSaved(true);
      toast({ title: `Results saved for ${results.length} students` });
    } catch (err: any) {
      toast({ title: "Error saving results", description: err?.data?.error, variant: "destructive" });
    }
  }

  const isReady = !!selectedClass && !!selectedSubject && !!selectedTerm;
  const className = classes.find(c => String(c.id) === selectedClass)?.name ?? "";
  const subjectName = subjects.find(s => String(s.id) === selectedSubject)?.name ?? "";
  const termName = terms.find(t => String(t.id) === selectedTerm)?.name ?? "";

  const sheetScores: { student: (typeof students)[0]; cs: number | null; es: number | null; total: number | null; grade: string | null; position: number | null }[] = students.map(s => {
    const r = existingResults.find(e => e.studentId === s.id);
    const total = r?.totalScore ?? null;
    return {
      student: s,
      cs: r?.classScore ?? null,
      es: r?.examScore ?? null,
      total,
      grade: total != null ? computeGrade(total) : null,
      position: r?.position ?? null,
    };
  }).sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  const allTotals = sheetScores.map(s => s.total).filter((t): t is number => t != null);
  const avg = allTotals.length > 0 ? allTotals.reduce((a, b) => a + b, 0) / allTotals.length : null;
  const highest = allTotals.length > 0 ? Math.max(...allTotals) : null;
  const lowest = allTotals.length > 0 ? Math.min(...allTotals) : null;
  const passCount = allTotals.filter(t => t >= 50).length;
  const passRate = allTotals.length > 0 ? Math.round((passCount / allTotals.length) * 100) : null;
  const gradeDist = gradeDistribution(allTotals);

  const gradeBarMax = Math.max(...Object.values(gradeDist), 1);

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-muted-foreground text-sm">Enter scores and view printable results sheets</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "sheet" && existingResults.length > 0 && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print Sheet
            </Button>
          )}
          {activeTab === "entry" && isReady && Object.keys(scores).length > 0 && (
            <Button onClick={handleSave} disabled={bulkMutation.isPending || saved}>
              <Save className="h-4 w-4 mr-2" />
              {bulkMutation.isPending ? "Saving..." : saved ? "Saved ✓" : "Save Results"}
            </Button>
          )}
        </div>
      </div>

      {/* Selector Card */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setScores({}); setSaved(false); }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={v => { setSelectedSubject(v); setScores({}); setSaved(false); }}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={v => { setSelectedTerm(v); setScores({}); setSaved(false); }}>
                <SelectTrigger><SelectValue placeholder={currentTerm?.name ?? "Select term"} /></SelectTrigger>
                <SelectContent>{terms.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name} {t.isCurrent ? "(Current)" : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isReady ? (
        <div className="text-center py-14 text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm">Select class, subject, and term to begin</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:block">
          <TabsList className="print:hidden">
            <TabsTrigger value="entry" className="gap-2"><PenLine className="h-3.5 w-3.5" /> Entry</TabsTrigger>
            <TabsTrigger value="sheet" className="gap-2"><BarChart3 className="h-3.5 w-3.5" /> Results Sheet {existingResults.length > 0 && `(${existingResults.length})`}</TabsTrigger>
          </TabsList>

          {/* ── ENTRY TAB ── */}
          <TabsContent value="entry" className="mt-4">
            {isReady && (
              <div className="mb-3">
                <Button variant="outline" size="sm" onClick={loadExisting}>
                  Load Existing / Start New Entry
                </Button>
              </div>
            )}
            {studentsLoading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No students in selected class</div>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-8">#</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Student</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-36">Class Score<br /><span className="text-[10px] font-normal">(max 30)</span></th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-36">Exam Score<br /><span className="text-[10px] font-normal">(max 70)</span></th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-24">Total</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-20">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, idx) => {
                        const entry = scores[student.id];
                        const total = getTotal(entry);
                        const grade = total != null ? computeGrade(total) : null;
                        return (
                          <tr key={student.id} className={`border-b hover:bg-muted/10 ${grade ? gradeRowBg[grade] ?? "" : ""}`}>
                            <td className="px-4 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: avatarColor(student.firstName + student.lastName) }}>
                                  {student.firstName[0]}{student.lastName[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{student.studentId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <Input type="number" min="0" max="30" step="0.5" className="text-center h-8 text-sm" placeholder="0–30" value={entry?.classScore ?? ""} onChange={e => updateScore(student.id, "classScore", e.target.value)} />
                            </td>
                            <td className="px-4 py-2">
                              <Input type="number" min="0" max="70" step="0.5" className="text-center h-8 text-sm" placeholder="0–70" value={entry?.examScore ?? ""} onChange={e => updateScore(student.id, "examScore", e.target.value)} />
                            </td>
                            <td className="px-4 py-2 text-center">
                              {total != null ? <span className="text-sm font-bold">{total.toFixed(1)}</span> : <span className="text-muted-foreground text-sm">—</span>}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {grade && <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${gradeColors[grade] ?? ""}`}>{grade}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── RESULTS SHEET TAB ── */}
          <TabsContent value="sheet" className="mt-4 print:mt-0">
            {existingResults.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">
                <p className="text-sm">No results saved yet. Enter and save scores in the Entry tab first.</p>
              </div>
            ) : (
              <div className="bg-white print:p-0">
                {/* ── PRINTABLE SHEET HEADER ── */}
                <div className="border-2 border-slate-200 rounded-xl overflow-hidden print:border-slate-300 print:rounded-none">
                  <div className="bg-[#071A2C] text-white px-6 py-4 print:py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold uppercase tracking-wide">{school?.name ?? "Ghana Basic School"}</h2>
                        {school?.motto && <p className="text-blue-300 text-xs italic">{school.motto}</p>}
                      </div>
                      <div className="text-right text-xs text-blue-200 space-y-0.5">
                        <p className="font-semibold text-white">CLASS RESULTS SHEET</p>
                        <p>{className} &nbsp;|&nbsp; {subjectName}</p>
                        <p>{termName} &nbsp;|&nbsp; 2024/2025</p>
                      </div>
                    </div>
                  </div>

                  {/* ── STATS STRIP ── */}
                  <div className="grid grid-cols-5 divide-x bg-slate-50 border-b print:grid-cols-5">
                    {[
                      { icon: Users, label: "Students", value: allTotals.length, color: "text-slate-700" },
                      { icon: BarChart3, label: "Average", value: avg != null ? avg.toFixed(1) : "—", color: avg != null && avg >= 70 ? "text-emerald-600" : "text-amber-600" },
                      { icon: Trophy, label: "Highest", value: highest?.toFixed(1) ?? "—", color: "text-emerald-600" },
                      { icon: TrendingDown, label: "Lowest", value: lowest?.toFixed(1) ?? "—", color: "text-red-500" },
                      { icon: TrendingUp, label: "Pass Rate", value: passRate != null ? `${passRate}%` : "—", color: passRate != null && passRate >= 70 ? "text-emerald-600" : "text-amber-600" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="flex flex-col items-center justify-center py-3 px-2 text-center">
                        <Icon className={`h-3.5 w-3.5 mb-1 ${color}`} />
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                        <p className={`text-lg font-black ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── SCORES TABLE ── */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-slate-100">
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-10">Pos.</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Student Name</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-12">ID</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-24">Class (30)</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-24">Exam (70)</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-20">Total</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-16">Grade</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Performance Bar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sheetScores.map(({ student, cs, es, total, grade, position }, idx) => (
                          <tr key={student.id} className={`border-b ${grade ? gradeRowBg[grade] ?? "" : ""} hover:bg-slate-50`}>
                            <td className="px-3 py-2.5 text-center">
                              {position != null ? (
                                <span className={`inline-flex h-6 w-6 rounded-full items-center justify-center text-xs font-bold ${position === 1 ? "bg-yellow-400 text-yellow-900" : position === 2 ? "bg-slate-300 text-slate-700" : position === 3 ? "bg-orange-300 text-orange-900" : "bg-slate-100 text-slate-600"}`}>
                                  {position}
                                </span>
                              ) : <span className="text-xs text-muted-foreground">{idx + 1}</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 print:hidden" style={{ background: avatarColor(student.firstName + student.lastName) }}>
                                  {student.firstName[0]}{student.lastName[0]}
                                </div>
                                <span className="text-sm font-medium">{student.firstName} {student.lastName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center text-[10px] text-muted-foreground font-mono">{student.studentId?.slice(-4)}</td>
                            <td className="px-3 py-2.5 text-center text-sm">{cs ?? "—"}</td>
                            <td className="px-3 py-2.5 text-center text-sm">{es ?? "—"}</td>
                            <td className="px-3 py-2.5 text-center">
                              {total != null ? <span className="text-sm font-bold">{total.toFixed(1)}</span> : <span className="text-sm text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {grade && <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${gradeColors[grade] ?? ""}`}>{grade}</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              {total != null && (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${total >= 70 ? "bg-emerald-500" : total >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${total}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground w-8 text-right">{total.toFixed(0)}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── GRADE DISTRIBUTION ── */}
                  <div className="px-6 py-4 border-t bg-slate-50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">Grade Distribution</p>
                    <div className="grid grid-cols-9 gap-2">
                      {Object.entries(gradeDist).map(([g, count]) => (
                        <div key={g} className="flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-muted-foreground">{count}</span>
                          <div className="w-full bg-slate-200 rounded-t" style={{ height: 48 }}>
                            <div
                              className={`w-full rounded-t transition-all ${gradeColors[g]?.split(" ")[0] ?? "bg-slate-400"}`}
                              style={{ height: count > 0 ? `${Math.max(8, (count / gradeBarMax) * 48)}px` : "0" }}
                            />
                          </div>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColors[g] ?? ""}`}>{g}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── SHEET FOOTER ── */}
                  <div className="px-6 py-3 border-t bg-[#071A2C] text-blue-200 flex justify-between items-center text-[10px]">
                    <span>Prepared by: {school?.headteacher ?? "School Administration"} &nbsp;•&nbsp; {school?.name ?? "School"}</span>
                    <span>Date Printed: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
