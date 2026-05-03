import { useState } from "react";
import {
  useListTeachers,
  useCreateTeacher,
  useDeleteTeacher,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Users, Mail, Phone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function AddTeacherDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { mutateAsync, isPending } = useCreateTeacher();
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    qualification: "", specialization: "", status: "active", hireDate: "",
  });

  function set(key: string, value: string) { setForm(f => ({ ...f, [key]: value })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutateAsync({ data: { ...form, status: form.status as any } });
      await qc.invalidateQueries({ queryKey: ["teachers"] });
      toast({ title: "Teacher added successfully" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error adding teacher", description: err?.data?.error, variant: "destructive" });
    }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Add New Teacher</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>First Name *</Label>
            <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Last Name *</Label>
            <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+233 XXX XXXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Qualification</Label>
            <Input value={form.qualification} onChange={e => set("qualification", e.target.value)} placeholder="e.g. B.Ed" />
          </div>
          <div className="space-y-1.5">
            <Label>Specialization</Label>
            <Input value={form.specialization} onChange={e => set("specialization", e.target.value)} placeholder="e.g. Mathematics" />
          </div>
          <div className="space-y-1.5">
            <Label>Hire Date</Label>
            <Input type="date" value={form.hireDate} onChange={e => set("hireDate", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Adding..." : "Add Teacher"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default function Teachers() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: teachers = [], isLoading } = useListTeachers(
    { search: search || undefined },
    { query: { queryKey: ["teachers", search] } }
  );

  const deleteMutation = useDeleteTeacher();

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: ["teachers"] });
      toast({ title: "Teacher deleted" });
    } catch {
      toast({ title: "Could not delete teacher", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-muted-foreground text-sm">{teachers.length} staff members</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Teacher
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teachers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : teachers.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No teachers found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map(teacher => (
            <Card key={teacher.id} className="p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">
                    {teacher.firstName[0]}{teacher.lastName[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{teacher.firstName} {teacher.lastName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{teacher.staffId}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-xs ${teacher.status === "active" ? "border-emerald-300 text-emerald-700 bg-emerald-50" : ""}`}>
                        {teacher.status}
                      </Badge>
                      <Button
                        variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(teacher.id, `${teacher.firstName} ${teacher.lastName}`)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {teacher.specialization && <p className="text-xs text-muted-foreground mt-1">{teacher.specialization}</p>}
                  {teacher.qualification && <p className="text-xs text-muted-foreground">{teacher.qualification}</p>}
                  <div className="mt-2 space-y-1">
                    {teacher.phone && (
                      <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3 w-3" />{teacher.phone}
                      </p>
                    )}
                    {teacher.email && (
                      <p className="text-xs flex items-center gap-1.5 text-muted-foreground truncate">
                        <Mail className="h-3 w-3" />{teacher.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        {showAdd && <AddTeacherDialog onClose={() => setShowAdd(false)} />}
      </Dialog>
    </div>
  );
}
