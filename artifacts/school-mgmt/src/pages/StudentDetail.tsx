import { useParams } from "wouter";
import { useGetStudent, useListAttendance, useListFeeBalances, useListResults } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, GraduationCap, Phone, MapPin, Users } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

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

export default function StudentDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);

  const { data: student, isLoading } = useGetStudent(id, { query: { enabled: !!id, queryKey: [`/api/students/${id}`] } });
  const { data: attendance = [] } = useListAttendance({ studentId: id }, { query: { enabled: !!id, queryKey: ["attendance", "student", id] } });
  const { data: balances = [] } = useListFeeBalances({ studentId: id }, { query: { enabled: !!id, queryKey: ["fee-balances", "student", id] } });
  const { data: results = [] } = useListResults({ studentId: id }, { query: { enabled: !!id, queryKey: ["results", "student", id] } });

  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === "present" || a.status === "late").length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const totalPaid = balances.reduce((sum, b) => sum + b.totalPaid, 0);
  const totalOwed = balances.reduce((sum, b) => sum + b.totalFee, 0);
  const outstanding = totalOwed - totalPaid;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Student not found.</p>
        <Link href="/students"><Button variant="outline" className="mt-3">Back to Students</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/students">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Students
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold">{student.firstName} {student.lastName}</h1>
                  <p className="text-muted-foreground text-sm font-mono">{student.studentId}</p>
                </div>
                <Badge className={student.status === "active" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ""}>{student.status}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Class</p>
                  <p className="text-sm font-medium">{student.className ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="text-sm font-medium capitalize">{student.gender}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Admitted</p>
                  <p className="text-sm font-medium">{student.admissionDate?.slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                  <p className="text-sm font-medium">{attendanceRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {student.parentName && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Parent / Guardian</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {student.parentName} ({student.parentRelationship})
                </span>
                {student.parentPhone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {student.parentPhone}
                  </span>
                )}
                {student.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {student.address}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
          <TabsTrigger value="fees">Fees ({balances.length})</TabsTrigger>
          <TabsTrigger value="attendance">Attendance ({attendance.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Subject</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Class (30)</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Exam (70)</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Grade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">No results recorded</td></tr>
                  ) : results.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/10">
                      <td className="px-4 py-3 text-sm font-medium">{r.subjectName}</td>
                      <td className="px-4 py-3 text-sm text-center">{r.classScore ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-center">{r.examScore ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-center font-semibold">{r.totalScore ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {r.grade && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${gradeColors[r.grade] ?? ""}`}>
                            {r.grade}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.remarks ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex gap-6 pb-3 border-b">
                <div><p className="text-xs text-muted-foreground">Total Expected</p><p className="font-semibold">GH₵{totalOwed.toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Total Paid</p><p className="font-semibold text-emerald-600">GH₵{totalPaid.toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Outstanding</p><p className={`font-semibold ${outstanding > 0 ? "text-red-500" : "text-emerald-600"}`}>GH₵{outstanding.toFixed(2)}</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Fee Type</th>
                      <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">Expected</th>
                      <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">Paid</th>
                      <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">Balance</th>
                      <th className="text-center py-2 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No fee records</td></tr>
                    ) : balances.map((b, i) => (
                      <tr key={i} className="border-b hover:bg-muted/10">
                        <td className="py-2.5 text-sm font-medium">{b.feeTypeName}</td>
                        <td className="py-2.5 text-sm text-right">GH₵{b.totalFee}</td>
                        <td className="py-2.5 text-sm text-right text-emerald-600">GH₵{b.totalPaid}</td>
                        <td className="py-2.5 text-sm text-right text-red-500">GH₵{b.balance.toFixed(2)}</td>
                        <td className="py-2.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                            ${b.status === "paid" ? "bg-emerald-100 text-emerald-700" : b.status === "partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-6 pb-3 mb-3 border-b">
                <div><p className="text-xs text-muted-foreground">Total Days</p><p className="font-semibold">{totalDays}</p></div>
                <div><p className="text-xs text-muted-foreground">Present</p><p className="font-semibold text-emerald-600">{presentDays}</p></div>
                <div><p className="text-xs text-muted-foreground">Absent</p><p className="font-semibold text-red-500">{attendance.filter(a => a.status === "absent").length}</p></div>
                <div><p className="text-xs text-muted-foreground">Rate</p><p className="font-semibold">{attendanceRate}%</p></div>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {attendance.slice().reverse().map(a => (
                  <div key={a.id} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-sm">{a.date}</span>
                    <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded
                      ${a.status === "present" ? "bg-emerald-100 text-emerald-700" :
                        a.status === "absent" ? "bg-red-100 text-red-700" :
                        a.status === "late" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                      {a.status}
                    </span>
                  </div>
                ))}
                {attendance.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No attendance records</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
