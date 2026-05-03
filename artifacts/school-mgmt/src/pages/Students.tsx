import { useState } from "react";
import { Link } from "wouter";
import {
  useListStudents,
  useListClasses,
  useCreateStudent,
  useDeleteStudent,
} from "@workspace/api-client-react";
import type { SchoolClass } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Trash2, GraduationCap, Filter } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const GENDERS = ["male", "female"];
const STATUSES = ["active", "inactive", "graduated", "transferred"];

function AddStudentDialog({ classes, onClose }: { classes: SchoolClass[]; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { mutateAsync, isPending } = useCreateStudent();
  const [form, setForm] = useState({
    firstName: "", lastName: "", otherNames: "", gender: "male",
    classId: "", admissionDate: new Date().toISOString().slice(0, 10),
    status: "active", parentName: "", parentPhone: "", parentEmail: "",
    parentRelationship: "Father", address: "", dateOfBirth: "",
  });

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutateAsync({
        data: {
          ...form,
          classId: form.classId ? parseInt(form.classId) : undefined,
          gender: form.gender as any,
          status: form.status as any,
        },
      });
      await qc.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Student added successfully" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error adding student", description: err?.data?.error ?? "Please try again", variant: "destructive" });
    }
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Student</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
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
                <SelectContent>
                  {["Father", "Mother", "Guardian", "Grandparent", "Uncle", "Aunt", "Sibling", "Other"].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
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
          <Button type="submit" disabled={isPending}>{isPending ? "Adding..." : "Add Student"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default function Students() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: classes = [] } = useListClasses();
  const { data: students = [], isLoading } = useListStudents(
    {
      search: search || undefined,
      classId: classFilter !== "all" ? parseInt(classFilter) : undefined,
    },
    { query: { queryKey: ["students", search, classFilter] } }
  );

  const deleteMutation = useDeleteStudent();

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Student deleted" });
    } catch {
      toast({ title: "Could not delete student", variant: "destructive" });
    }
  }

  const statusColor: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-gray-100 text-gray-600",
    graduated: "bg-blue-100 text-blue-700",
    transferred: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground text-sm">{students.length} students found</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Student
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or student ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parent</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <GraduationCap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No students found</p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{student.studentId}</td>
                    <td className="px-4 py-3 text-sm font-medium">{student.firstName} {student.lastName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{student.className ?? "—"}</td>
                    <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{student.gender}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{student.parentName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{student.parentPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor[student.status] ?? ""}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/students/${student.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(student.id, `${student.firstName} ${student.lastName}`)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        {showAdd && <AddStudentDialog classes={classes} onClose={() => setShowAdd(false)} />}
      </Dialog>
    </div>
  );
}
