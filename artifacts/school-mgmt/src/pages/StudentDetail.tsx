import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetStudent, useUpdateStudent, useListAttendance,
  useListFeeBalances, useListResults, useListClasses,
} from "@workspace/api-client-react";
import type { Student } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Phone, MapPin, Users, Pencil, Printer, Camera, CalendarDays, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const GENDERS = ["male", "female"];
const STATUSES = ["active", "inactive", "graduated", "transferred"];
const RELATIONSHIPS = ["Father", "Mother", "Guardian", "Grandparent", "Uncle", "Aunt", "Sibling", "Other"];

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

function avatarColor(name: string): string {
  const palette = [
    "#0285FF","#10B981","#F59E0B","#8B5CF6",
    "#EC4899","#06B6D4","#F97316","#6366F1","#84CC16","#EF4444",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function StudentAvatar({ student, size = 72 }: { student: Student; size?: number }) {
  const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();
  const bg = avatarColor(student.firstName + student.lastName);
  if (student.photoUrl) {
    return (
      <img
        src={student.photoUrl}
        alt={`${student.firstName} ${student.lastName}`}
        className="rounded-xl object-cover flex-shrink-0 border-2 border-white shadow"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-white shadow font-bold text-white"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

function EditStudentDialog({ student, classes, onClose }: { student: Student; classes: { id: number; name: string }[]; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { mutateAsync, isPending } = useUpdateStudent();
  const [form, setForm] = useState({
    firstName: student.firstName,
    lastName: student.lastName,
    otherNames: student.otherNames ?? "",
    gender: student.gender,
    classId: student.classId ? String(student.classId) : "",
    dateOfBirth: student.dateOfBirth ?? "",
    admissionDate: student.admissionDate,
    status: student.status,
    parentName: student.parentName ?? "",
    parentPhone: student.parentPhone ?? "",
    parentEmail: student.parentEmail ?? "",
    parentRelationship: student.parentRelationship ?? "Father",
    address: student.address ?? "",
    photoUrl: student.photoUrl ?? "",
  });

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutateAsync({
        id: student.id,
        data: {
          ...form,
          classId: form.classId ? parseInt(form.classId) : undefined,
          gender: form.gender as any,
          status: form.status as any,
          photoUrl: form.photoUrl || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: [`/api/students/${student.id}`] });
      await qc.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Profile updated successfully" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error updating profile", description: err?.data?.error ?? "Please try again", variant: "destructive" });
    }
  }

  return (
    <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Student Profile</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Camera className="h-3.5 w-3.5" /> Profile Photo URL</Label>
          <Input
            value={form.photoUrl}
            onChange={e => set("photoUrl", e.target.value)}
            placeholder="https://example.com/photo.jpg (leave blank for avatar)"
          />
          {form.photoUrl && (
            <div className="flex items-center gap-2 mt-1">
              <img src={form.photoUrl} alt="Preview" className="h-12 w-12 rounded-lg object-cover border" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <p className="text-xs text-muted-foreground">Photo preview</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>First Name *</Label>
            <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Last Name *</Label>
            <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Other Names</Label>
            <Input value={form.otherNames} onChange={e => set("otherNames", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Gender *</Label>
            <Select value={form.gender} onValueChange={v => set("gender", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={form.classId} onValueChange={v => set("classId", v)}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Admission Date *</Label>
            <Input type="date" value={form.admissionDate} onChange={e => set("admissionDate", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Home Address</Label>
          <Input value={form.address} onChange={e => set("address", e.target.value)} />
        </div>
        <div className="border-t pt-4">
          <p className="text-sm font-semibold mb-3">Parent / Guardian Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Parent/Guardian Name</Label>
              <Input value={form.parentName} onChange={e => set("parentName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Select value={form.parentRelationship} onValueChange={v => set("parentRelationship", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input value={form.parentPhone} onChange={e => set("parentPhone", e.target.value)} placeholder="+233 XXX XXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.parentEmail} onChange={e => set("parentEmail", e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function printIDCard(student: Student, schoolName: string) {
  const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();
  const bg = avatarColor(student.firstName + student.lastName);
  const photoSection = student.photoUrl
    ? `<img src="${student.photoUrl}" style="width:72px;height:90px;object-fit:cover;border-radius:4px;border:1px solid #ddd;" alt="photo"/>`
    : `<div style="width:72px;height:90px;background:${bg};border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-size:26px;font-weight:bold;font-family:Arial,sans-serif;">${initials}</div>`;

  const html = `<!DOCTYPE html><html><head><title>Student ID Card</title>
  <style>
    @page { margin: 10mm; size: A4; }
    body { margin: 0; font-family: Arial, sans-serif; background: #f5f5f5; display: flex; align-items: flex-start; justify-content: center; padding: 20px; }
    .card { width: 330px; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
    .header { background: #071A2C; color: white; padding: 12px 16px; display: flex; align-items: center; gap: 10px; }
    .header-logo { width: 36px; height: 36px; background: #0285FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: bold; flex-shrink: 0; }
    .header-text h3 { margin: 0; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; }
    .header-text p { margin: 1px 0 0; font-size: 8px; opacity: 0.75; }
    .body { padding: 14px 16px; display: flex; gap: 14px; }
    .info { flex: 1; }
    .student-name { font-size: 15px; font-weight: bold; color: #0f172a; margin: 0 0 2px; line-height: 1.2; }
    .class-name { font-size: 11px; color: #64748b; margin: 0 0 8px; }
    .id-badge { display: inline-block; background: #eff6ff; border: 1.5px solid #0285FF; border-radius: 4px; padding: 3px 8px; font-size: 10px; font-family: monospace; font-weight: bold; color: #0285FF; margin-bottom: 8px; }
    .detail-row { font-size: 9px; color: #64748b; margin: 2px 0; }
    .detail-label { font-weight: bold; color: #374151; }
    .divider { height: 1px; background: #e5e7eb; margin: 0; }
    .footer { background: #0285FF; color: white; text-align: center; padding: 8px; font-size: 8px; letter-spacing: 0.5px; }
    .year-badge { position: absolute; top: 8px; right: 10px; font-size: 7px; background: rgba(255,255,255,0.15); border-radius: 3px; padding: 2px 6px; }
    .header { position: relative; }
    @media print { body { background: white; } .card { box-shadow: none; border: 1px solid #ccc; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  </style>
  </head><body>
  <div class="card">
    <div class="header">
      <div class="header-logo">A</div>
      <div class="header-text">
        <h3>${schoolName}</h3>
        <p>Ghana Education Service — Student Identity Card</p>
      </div>
      <div class="year-badge">2024/2025</div>
    </div>
    <div class="body">
      ${photoSection}
      <div class="info">
        <div class="student-name">${student.firstName} ${student.otherNames ? student.otherNames + " " : ""}${student.lastName}</div>
        <div class="class-name">${student.className ?? "Unassigned"}</div>
        <div class="id-badge">${student.studentId}</div>
        <div class="detail-row"><span class="detail-label">DOB:</span> ${student.dateOfBirth ?? "N/A"}</div>
        <div class="detail-row"><span class="detail-label">Gender:</span> ${student.gender?.charAt(0).toUpperCase()}${student.gender?.slice(1)}</div>
        <div class="detail-row"><span class="detail-label">Admitted:</span> ${student.admissionDate}</div>
        ${student.parentName ? `<div class="detail-row"><span class="detail-label">Parent:</span> ${student.parentName}</div>` : ""}
        ${student.parentPhone ? `<div class="detail-row"><span class="detail-label">Phone:</span> ${student.parentPhone}</div>` : ""}
      </div>
    </div>
    <div class="divider"></div>
    <div class="footer">VALID FOR ACADEMIC YEAR 2024/2025 &nbsp;•&nbsp; PROPERTY OF ${schoolName.toUpperCase()}</div>
  </div>
  <script>window.onload = function() { window.print(); }<\/script>
  </body></html>`;

  const win = window.open("", "_blank", "width=500,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export default function StudentDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const [showEdit, setShowEdit] = useState(false);

  const { data: student, isLoading } = useGetStudent(id, { query: { enabled: !!id, queryKey: [`/api/students/${id}`] } });
  const { data: classes = [] } = useListClasses();
  const { data: attendance = [] } = useListAttendance({ studentId: id }, { query: { enabled: !!id, queryKey: ["attendance", "student", id] } });
  const { data: balances = [] } = useListFeeBalances({ studentId: id }, { query: { enabled: !!id, queryKey: ["fee-balances", "student", id] } });
  const { data: results = [] } = useListResults({ studentId: id }, { query: { enabled: !!id, queryKey: ["results", "student", id] } });

  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === "present" || a.status === "late").length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const totalPaid = balances.reduce((sum, b) => sum + b.totalPaid, 0);
  const totalOwed = balances.reduce((sum, b) => sum + b.totalFee, 0);
  const outstanding = totalOwed - totalPaid;

  const avgScore = results.length > 0 ? results.reduce((s, r) => s + (r.totalScore ?? 0), 0) / results.length : null;

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

  const statusColor: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    inactive: "bg-gray-100 text-gray-600 border-gray-200",
    graduated: "bg-blue-100 text-blue-700 border-blue-200",
    transferred: "bg-yellow-100 text-yellow-700 border-yellow-200",
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/students">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Students
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => printIDCard(student, "Accra Model Basic School")}>
            <Printer className="h-4 w-4 mr-1.5" /> Print ID Card
          </Button>
          <Button size="sm" onClick={() => setShowEdit(true)}>
            <Pencil className="h-4 w-4 mr-1.5" /> Edit Profile
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#071A2C] to-[#0f2d4a] px-6 py-5 text-white">
          <div className="flex items-start gap-5">
            <StudentAvatar student={student} size={80} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white">{student.firstName} {student.otherNames ? `${student.otherNames} ` : ""}{student.lastName}</h1>
                  <p className="text-blue-200 text-sm font-mono">{student.studentId}</p>
                </div>
                <Badge className={`${statusColor[student.status] ?? ""} capitalize text-xs`}>{student.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-blue-100">
                  <BookOpen className="h-3.5 w-3.5" />
                  {student.className ?? "No class assigned"}
                </span>
                {student.dateOfBirth && (
                  <span className="flex items-center gap-1.5 text-blue-100">
                    <CalendarDays className="h-3.5 w-3.5" />
                    DOB: {student.dateOfBirth}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-blue-100 capitalize">
                  {student.gender}
                </span>
                <span className="flex items-center gap-1.5 text-blue-100">
                  Admitted: {student.admissionDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x border-t">
          {[
            { label: "Attendance", value: `${attendanceRate}%`, sub: `${presentDays}/${totalDays} days`, color: attendanceRate >= 80 ? "text-emerald-600" : attendanceRate >= 60 ? "text-yellow-600" : "text-red-500" },
            { label: "Avg Score", value: avgScore != null ? avgScore.toFixed(1) : "—", sub: `${results.length} subjects`, color: avgScore != null && avgScore >= 70 ? "text-emerald-600" : "text-muted-foreground" },
            { label: "Total Paid", value: `GH₵${totalPaid.toFixed(0)}`, sub: `of GH₵${totalOwed.toFixed(0)}`, color: "text-emerald-600" },
            { label: "Outstanding", value: `GH₵${outstanding.toFixed(0)}`, sub: outstanding === 0 ? "Fully paid" : "Balance due", color: outstanding > 0 ? "text-red-500" : "text-emerald-600" },
          ].map(stat => (
            <div key={stat.label} className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {student.parentName && (
          <CardContent className="px-6 py-4 border-t bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Parent / Guardian</p>
            <div className="flex flex-wrap gap-5 text-sm">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{student.parentName}</span>
                {student.parentRelationship && <span className="text-muted-foreground">({student.parentRelationship})</span>}
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
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
          <TabsTrigger value="fees">Fees ({balances.length})</TabsTrigger>
          <TabsTrigger value="attendance">Attendance ({attendance.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-4">
          {results.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Average Score", value: avgScore != null ? avgScore.toFixed(1) : "—", color: avgScore != null && avgScore >= 70 ? "text-emerald-600" : "text-amber-600" },
                { label: "Highest Score", value: results.length > 0 ? Math.max(...results.map(r => r.totalScore ?? 0)).toFixed(1) : "—", color: "text-emerald-600" },
                { label: "Lowest Score", value: results.length > 0 ? Math.min(...results.map(r => r.totalScore ?? 0)).toFixed(1) : "—", color: "text-red-500" },
              ].map(s => (
                <Card key={s.label}><CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </CardContent></Card>
              ))}
            </div>
          )}
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
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Position</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">No results recorded</td></tr>
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
                      <td className="px-4 py-3 text-sm text-center text-muted-foreground">
                        {r.position ? `#${r.position}` : "—"}
                      </td>
                      <td className="px-4 py-3 w-28">
                        {r.totalScore != null && (
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${r.totalScore >= 70 ? "bg-emerald-500" : r.totalScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${r.totalScore}%` }}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Expected</p>
                  <p className="text-lg font-bold">GH₵{totalOwed.toFixed(2)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-emerald-600">Total Paid</p>
                  <p className="text-lg font-bold text-emerald-700">GH₵{totalPaid.toFixed(2)}</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${outstanding > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                  <p className={`text-xs ${outstanding > 0 ? "text-red-600" : "text-emerald-600"}`}>Outstanding</p>
                  <p className={`text-lg font-bold ${outstanding > 0 ? "text-red-700" : "text-emerald-700"}`}>GH₵{outstanding.toFixed(2)}</p>
                </div>
              </div>
              {totalOwed > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Payment progress</span>
                    <span>{Math.round((totalPaid / totalOwed) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (totalPaid / totalOwed) * 100)}%` }} />
                  </div>
                </div>
              )}
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
              <div className="grid grid-cols-4 gap-3 pb-4 mb-4 border-b">
                {[
                  { label: "Total Days", value: totalDays, color: "" },
                  { label: "Present", value: presentDays, color: "text-emerald-600" },
                  { label: "Absent", value: attendance.filter(a => a.status === "absent").length, color: "text-red-500" },
                  { label: "Rate", value: `${attendanceRate}%`, color: attendanceRate >= 80 ? "text-emerald-600" : attendanceRate >= 60 ? "text-yellow-600" : "text-red-500" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {attendance.slice().reverse().map(a => (
                  <div key={a.id} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-sm text-muted-foreground">{a.date}</span>
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

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        {showEdit && <EditStudentDialog student={student} classes={classes} onClose={() => setShowEdit(false)} />}
      </Dialog>
    </div>
  );
}
