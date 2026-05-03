import { useState } from "react";
import {
  useListClasses, useListSubjects, useListTerms,
  useListStudents, useListResults, useBulkCreateResults,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const gradeColors: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-800",
  B2: "bg-green-100 text-green-800",
  B3: "bg-lime-100 text-lime-800",
  C4: "bg-yellow-100 text-yellow-800",
  C5: "bg-amber-100 text-amber-800",
  C6: "bg-orange-100 text-orange-800",
  D7: "bg-red-100 text-red-800",
  E8: "bg-red-200 text-red-900",
  F9: "bg-red-300 text-red-900",
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

interface ScoreEntry { classScore: string; examScore: string; }

export default function Results() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [scores, setScores] = useState<Record<number, ScoreEntry>>({});
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: classes = [] } = useListClasses();
  const { data: subjects = [] } = useListSubjects();
  const { data: terms = [] } = useListTerms();
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

      if (results.length === 0) {
        toast({ title: "No scores to save", variant: "destructive" });
        return;
      }

      await bulkMutation.mutateAsync({
        data: {
          classId: parseInt(selectedClass),
          subjectId: parseInt(selectedSubject),
          termId: parseInt(selectedTerm),
          results: results as any,
        },
      });
      await qc.invalidateQueries({ queryKey: ["results"] });
      setSaved(true);
      toast({ title: `Results saved for ${results.length} students` });
    } catch (err: any) {
      toast({ title: "Error saving results", description: err?.data?.error, variant: "destructive" });
    }
  }

  const isReady = !!selectedClass && !!selectedSubject && !!selectedTerm;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Results Entry</h1>
          <p className="text-muted-foreground text-sm">Class scores (max 30) and exam scores (max 70)</p>
        </div>
        {isReady && Object.keys(scores).length > 0 && (
          <Button onClick={handleSave} disabled={bulkMutation.isPending || saved}>
            <Save className="h-4 w-4 mr-2" />
            {bulkMutation.isPending ? "Saving..." : saved ? "Saved" : "Save Results"}
          </Button>
        )}
      </div>

      <Card>
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
          {isReady && (
            <div className="mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={loadExisting}>
                Load Existing / Start New Entry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!isReady ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Select class, subject, and term to begin</div>
      ) : studentsLoading ? (
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
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-36">Class Score<br/><span className="text-[10px] font-normal">(max 30)</span></th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-36">Exam Score<br/><span className="text-[10px] font-normal">(max 70)</span></th>
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
                    <tr key={student.id} className="border-b hover:bg-muted/10">
                      <td className="px-4 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-2">
                        <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{student.studentId}</p>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number" min="0" max="30" step="0.5"
                          className="text-center h-8 text-sm"
                          placeholder="0–30"
                          value={entry?.classScore ?? ""}
                          onChange={e => updateScore(student.id, "classScore", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number" min="0" max="70" step="0.5"
                          className="text-center h-8 text-sm"
                          placeholder="0–70"
                          value={entry?.examScore ?? ""}
                          onChange={e => updateScore(student.id, "examScore", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        {total != null ? <span className="text-sm font-bold">{total.toFixed(1)}</span> : <span className="text-muted-foreground text-sm">—</span>}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {grade && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${gradeColors[grade] ?? ""}`}>{grade}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
