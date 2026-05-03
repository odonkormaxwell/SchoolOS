import { useState } from "react";
import {
  useListClasses, useCreateClass, useDeleteClass,
  useListSubjects, useCreateSubject, useDeleteSubject,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, BookOpen, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const LEVELS = [
  { value: "nursery", label: "Nursery" },
  { value: "kg1", label: "KG 1" },
  { value: "kg2", label: "KG 2" },
  { value: "primary1", label: "Primary 1" },
  { value: "primary2", label: "Primary 2" },
  { value: "primary3", label: "Primary 3" },
  { value: "primary4", label: "Primary 4" },
  { value: "primary5", label: "Primary 5" },
  { value: "primary6", label: "Primary 6" },
  { value: "jhs1", label: "JHS 1" },
  { value: "jhs2", label: "JHS 2" },
  { value: "jhs3", label: "JHS 3" },
];

function AddClassDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { mutateAsync, isPending } = useCreateClass();
  const [form, setForm] = useState({ name: "", level: "primary1", section: "", capacity: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutateAsync({ data: { ...form, level: form.level as any, capacity: form.capacity ? parseInt(form.capacity) : undefined } });
      await qc.invalidateQueries({ queryKey: ["classes"] });
      toast({ title: "Class added" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err?.data?.error, variant: "destructive" });
    }
  }

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle>Add New Class</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Class Name *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Primary 4A" required />
        </div>
        <div className="space-y-1.5">
          <Label>Level *</Label>
          <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Input value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder="A, B, etc." />
          </div>
          <div className="space-y-1.5">
            <Label>Capacity</Label>
            <Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="40" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Adding..." : "Add Class"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function AddSubjectDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { mutateAsync, isPending } = useCreateSubject();
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutateAsync({ data: form });
      await qc.invalidateQueries({ queryKey: ["subjects"] });
      toast({ title: "Subject added" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err?.data?.error, variant: "destructive" });
    }
  }

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle>Add New Subject</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Subject Name *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Code</Label>
          <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. MATH" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Adding..." : "Add Subject"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default function Classes() {
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: classes = [], isLoading: classesLoading } = useListClasses({ query: { queryKey: ["classes"] } });
  const { data: subjects = [], isLoading: subjectsLoading } = useListSubjects({ query: { queryKey: ["subjects"] } });

  const deleteClass = useDeleteClass();
  const deleteSubject = useDeleteSubject();

  async function handleDeleteClass(id: number, name: string) {
    if (!confirm(`Delete class "${name}"?`)) return;
    try {
      await deleteClass.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: ["classes"] });
      toast({ title: "Class deleted" });
    } catch { toast({ title: "Could not delete class", variant: "destructive" }); }
  }

  async function handleDeleteSubject(id: number, name: string) {
    if (!confirm(`Delete subject "${name}"?`)) return;
    try {
      await deleteSubject.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: ["subjects"] });
      toast({ title: "Subject deleted" });
    } catch { toast({ title: "Could not delete subject", variant: "destructive" }); }
  }

  const levelLabel = (level: string) =>
    LEVELS.find(l => l.value === level)?.label ?? level;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Classes &amp; Subjects</h1>

      <Tabs defaultValue="classes">
        <TabsList>
          <TabsTrigger value="classes">Classes ({classes.length})</TabsTrigger>
          <TabsTrigger value="subjects">Subjects ({subjects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddClass(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Class
            </Button>
          </div>
          {classesLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map(cls => (
                <Card key={cls.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{cls.name}</p>
                        <p className="text-xs text-muted-foreground">{levelLabel(cls.level)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClass(cls.id, cls.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" /> {cls.studentCount} students
                    </span>
                    {cls.capacity && <span className="text-xs text-muted-foreground">Cap: {cls.capacity}</span>}
                    {cls.section && <Badge variant="outline" className="text-xs">{cls.section}</Badge>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subjects" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddSubject(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Subject
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Subject</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {subjectsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                      </tr>
                    ))
                  ) : subjects.map(subject => (
                    <tr key={subject.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium">{subject.name}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs font-mono">{subject.code ?? "—"}</Badge></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{subject.description ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSubject(subject.id, subject.name)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddClass} onOpenChange={setShowAddClass}>
        {showAddClass && <AddClassDialog onClose={() => setShowAddClass(false)} />}
      </Dialog>
      <Dialog open={showAddSubject} onOpenChange={setShowAddSubject}>
        {showAddSubject && <AddSubjectDialog onClose={() => setShowAddSubject(false)} />}
      </Dialog>
    </div>
  );
}
