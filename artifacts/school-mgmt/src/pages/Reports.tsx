import { useState } from "react";
import { useListClasses, useListTerms, useGetAttendanceReport, useGetFeesReport, useGetResultsReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatGhc(amount: number) { return `GH₵ ${amount.toFixed(2)}`; }

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

  const attendanceChartData = attendanceReport.map(r => ({
    name: r.studentName?.split(" ")[0] ?? "Student",
    rate: r.attendanceRate,
  })).slice(0, 15);

  const feesChartData = feesReport?.byClass?.map(c => ({
    name: c.className,
    collected: c.totalCollected,
    pending: c.totalExpected - c.totalCollected,
  })) ?? [];

  const resultsChartData = resultsReport.map(r => ({
    name: r.subjectName ?? r.className,
    average: r.averageScore ?? 0,
    pass: r.passRate ?? 0,
  }));

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm">Analytics and summary reports</p>
      </div>

      <div className="flex gap-3">
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={termFilter} onValueChange={setTermFilter}>
          <SelectTrigger className="w-44">
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
          <TabsTrigger value="fees">Fees Report</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Report</TabsTrigger>
          <TabsTrigger value="results">Results Report</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="mt-4 space-y-4">
          {feesLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : feesReport ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase">Expected</p>
                  <p className="text-xl font-bold mt-1">{formatGhc(feesReport.totalExpected ?? 0)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase">Collected</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{formatGhc(feesReport.totalCollected ?? 0)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase">Outstanding</p>
                  <p className="text-xl font-bold text-red-500 mt-1">{formatGhc(feesReport.totalPending ?? 0)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase">Collection Rate</p>
                  <p className="text-xl font-bold mt-1">{feesReport.collectionRate ?? 0}%</p>
                </CardContent></Card>
              </div>

              {feesChartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Fees by Class</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={feesChartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number) => formatGhc(value)} />
                        <Bar dataKey="collected" name="Collected" fill="#006B3F" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="pending" name="Pending" fill="#FCD116" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {feesReport.byFeeType && feesReport.byFeeType.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">By Fee Type</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Fee Type</th>
                          <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">Expected</th>
                          <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">Collected</th>
                          <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feesReport.byFeeType.map((ft, i) => (
                          <tr key={i} className="border-b hover:bg-muted/10">
                            <td className="py-2 text-sm font-medium">{ft.feeTypeName}</td>
                            <td className="py-2 text-sm text-right">{formatGhc(ft.totalExpected ?? 0)}</td>
                            <td className="py-2 text-sm text-right text-emerald-600">{formatGhc(ft.totalCollected ?? 0)}</td>
                            <td className="py-2 text-sm text-right text-red-500">{formatGhc(ft.balance ?? 0)}</td>
                          </tr>
                        ))}
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

        <TabsContent value="attendance" className="mt-4 space-y-4">
          {attLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : attendanceReport.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No attendance data available</div>
          ) : (
            <>
              {attendanceChartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Attendance Rate by Student</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={attendanceChartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Bar dataKey="rate" name="Attendance Rate %" fill="#006B3F" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Student</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Class</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Present</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Absent</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceReport.map((r, i) => (
                        <tr key={i} className="border-b hover:bg-muted/20">
                          <td className="px-4 py-3 text-sm font-medium">{r.studentName}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{r.className ?? "—"}</td>
                          <td className="px-4 py-3 text-sm text-center">{r.totalDays}</td>
                          <td className="px-4 py-3 text-sm text-center text-emerald-600">{r.presentDays}</td>
                          <td className="px-4 py-3 text-sm text-center text-red-500">{r.absentDays}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-semibold ${r.attendanceRate >= 80 ? "text-emerald-600" : r.attendanceRate >= 60 ? "text-yellow-600" : "text-red-500"}`}>
                              {r.attendanceRate}%
                            </span>
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

        <TabsContent value="results" className="mt-4 space-y-4">
          {resultsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : resultsReport.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No results data available</div>
          ) : (
            <>
              {resultsChartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Average Score by Subject</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={resultsChartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="average" name="Average Score" fill="#006B3F" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="pass" name="Pass Rate %" fill="#FCD116" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Class</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Subject</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Students</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Average</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Highest</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Lowest</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultsReport.map((r, i) => (
                        <tr key={i} className="border-b hover:bg-muted/20">
                          <td className="px-4 py-3 text-sm">{r.className}</td>
                          <td className="px-4 py-3 text-sm font-medium">{r.subjectName ?? "—"}</td>
                          <td className="px-4 py-3 text-sm text-center">{r.studentCount}</td>
                          <td className="px-4 py-3 text-sm text-center font-semibold">{r.averageScore?.toFixed(1) ?? "—"}</td>
                          <td className="px-4 py-3 text-sm text-center text-emerald-600">{r.highestScore?.toFixed(1) ?? "—"}</td>
                          <td className="px-4 py-3 text-sm text-center text-red-500">{r.lowestScore?.toFixed(1) ?? "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-semibold ${(r.passRate ?? 0) >= 70 ? "text-emerald-600" : (r.passRate ?? 0) >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                              {r.passRate?.toFixed(1) ?? "—"}%
                            </span>
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
