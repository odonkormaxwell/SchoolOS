import { useState } from "react";
import {
  useListClasses,
  useListStudents,
  useListTerms,
  useMarkAttendance,
  useListAttendance,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, AlertCircle, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

const statusConfig: Record<AttendanceStatus, { label: string; icon: React.ComponentType<any>; style: string; active: string }> = {
  present: { label: "Present", icon: CheckCircle, style: "border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700", active: "border-emerald-400 bg-emerald-50 text-emerald-700" },
  absent: { label: "Absent", icon: XCircle, style: "border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700", active: "border-red-400 bg-red-50 text-red-700" },
  late: { label: "Late", icon: Clock, style: "border-gray-200 text-gray-600 hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700", active: "border-yellow-400 bg-yellow-50 text-yellow-700" },
  excused: { label: "Excused", icon: AlertCircle, style: "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700", active: "border-blue-400 bg-blue-50 text-blue-700" },
};

export default function Attendance() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(today);
  const [termId, setTermId] = useState("");
  const [attendanceMap, setAttendanceMap] = useState<Record<number, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: classes = [] } = useListClasses();
  const { data: terms = [] } = useListTerms();
  const { data: students = [], isLoading: studentsLoading } = useListStudents(
    { classId: selectedClass ? parseInt(selectedClass) : undefined },
    { query: { queryKey: ["students", selectedClass], enabled: !!selectedClass } }
  );
  const { data: existingAttendance = [] } = useListAttendance(
    { classId: selectedClass ? parseInt(selectedClass) : undefined, date },
    { query: { queryKey: ["attendance", selectedClass, date], enabled: !!selectedClass } }
  );

  const markMutation = useMarkAttendance();

  function initAttendance() {
    const map: Record<number, AttendanceStatus> = {};
    for (const s of students) {
      const existing = existingAttendance.find(a => a.studentId === s.id);
      map[s.id] = (existing?.status as AttendanceStatus) ?? "present";
    }
    setAttendanceMap(map);
    setSaved(false);
  }

  function setStatus(studentId: number, status: AttendanceStatus) {
    setAttendanceMap(m => ({ ...m, [studentId]: status }));
    setSaved(false);
  }

  async function handleSave() {
    if (!selectedClass) return;
    try {
      const records = students.map(s => ({
        studentId: s.id,
        status: (attendanceMap[s.id] ?? "present") as any,
      }));
      await markMutation.mutateAsync({
        data: {
          classId: parseInt(selectedClass),
          date,
          termId: termId ? parseInt(termId) : undefined,
          records,
        },
      });
      await qc.invalidateQueries({ queryKey: ["attendance"] });
      setSaved(true);
      toast({ title: "Attendance saved successfully" });
    } catch (err: any) {
      toast({ title: "Error saving attendance", description: err?.data?.error, variant: "destructive" });
    }
  }

  const currentTerm = terms.find(t => t.isCurrent);

  const summary = Object.values(attendanceMap).reduce(
    (acc, status) => { acc[status] = (acc[status] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm">Mark daily class attendance</p>
        </div>
        {Object.keys(attendanceMap).length > 0 && (
          <Button onClick={handleSave} disabled={markMutation.isPending || saved}>
            <Save className="h-4 w-4 mr-2" />
            {markMutation.isPending ? "Saving..." : saved ? "Saved" : "Save Attendance"}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Class *</Label>
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setAttendanceMap({}); setSaved(false); }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={e => { setDate(e.target.value); setAttendanceMap({}); setSaved(false); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Term</Label>
              <Select value={termId} onValueChange={setTermId}>
                <SelectTrigger><SelectValue placeholder={currentTerm?.name ?? "Select term"} /></SelectTrigger>
                <SelectContent>{terms.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name} {t.isCurrent ? "(Current)" : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {selectedClass && students.length > 0 && (
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={initAttendance}>
                Load / Reset Attendance
              </Button>
              {Object.keys(attendanceMap).length > 0 && (
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-600 font-medium">{summary.present ?? 0} Present</span>
                  <span className="text-red-500 font-medium">{summary.absent ?? 0} Absent</span>
                  <span className="text-yellow-600 font-medium">{summary.late ?? 0} Late</span>
                  <span className="text-blue-600 font-medium">{summary.excused ?? 0} Excused</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!selectedClass ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Select a class to begin taking attendance
        </div>
      ) : studentsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No students enrolled in this class
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((student, idx) => {
            const currentStatus = attendanceMap[student.id] ?? null;
            return (
              <Card key={student.id} className={`transition-all ${currentStatus === "absent" ? "border-red-200 bg-red-50/30" : currentStatus === "present" ? "border-emerald-200" : ""}`}>
                <CardContent className="p-3 flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-6 text-right flex-shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{student.studentId}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {(Object.entries(statusConfig) as [AttendanceStatus, typeof statusConfig[AttendanceStatus]][]).map(([status, config]) => {
                      const Icon = config.icon;
                      const isActive = currentStatus === status;
                      return (
                        <button
                          key={status}
                          onClick={() => setStatus(student.id, status)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${isActive ? config.active : config.style}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span className="hidden sm:inline">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
