import { useState } from "react";
import {
  useGetSchoolProfile, useUpdateSchoolProfile,
  useListAcademicYears, useCreateAcademicYear, useDeleteAcademicYear, useSetCurrentAcademicYear,
  useListTerms, useCreateTerm, useDeleteTerm, useSetCurrentTerm,
  useListUsers, useCreateUser, useDeleteUser,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Star, Users, School, Calendar, Shield, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  MODULES, ACTIONS, MODULE_LABELS, ROLE_LABELS,
  DEFAULT_PERMISSIONS, resetPermissions,
  type AllPerms, type Module, type Action,
} from "@/lib/permissions";

const EDITABLE_ROLES = ["headteacher", "teacher", "accountant", "student", "parent"] as const;

function PermissionsTab() {
  const { permissions, setPermissions } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>("teacher");
  const [localPerms, setLocalPerms] = useState<AllPerms>(() => JSON.parse(JSON.stringify(permissions)));

  function toggle(role: string, mod: Module, action: Action) {
    if (role === "admin") return;
    setLocalPerms(prev => {
      const next: AllPerms = JSON.parse(JSON.stringify(prev));
      next[role][mod][action] = !next[role][mod][action];
      if (action === "view" && !next[role][mod][action]) {
        next[role][mod].create = false;
        next[role][mod].edit = false;
        next[role][mod].delete = false;
      }
      if (action !== "view" && next[role][mod][action]) {
        next[role][mod].view = true;
      }
      return next;
    });
  }

  function handleSave() {
    setPermissions(localPerms);
    toast({ title: "Permissions saved", description: "Role permissions have been updated." });
  }

  function handleReset() {
    const defaults = resetPermissions();
    setLocalPerms(JSON.parse(JSON.stringify(defaults)));
    setPermissions(defaults);
    toast({ title: "Permissions reset to defaults" });
  }

  const rolePerms = localPerms[selectedRole];
  if (!rolePerms) return null;

  const actionLabels: Record<Action, string> = {
    view: "View",
    create: "Create",
    edit: "Edit",
    delete: "Delete",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Role Permissions
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Configure which modules each role can access. Admin always has full access.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset Defaults
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-3.5 w-3.5 mr-1.5" /> Save Permissions
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2 flex-wrap mb-4">
            {["admin", ...EDITABLE_ROLES].map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                  selectedRole === role
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {ROLE_LABELS[role] ?? role}
                {role === "admin" && (
                  <span className="ml-1.5 text-[10px] opacity-70">(locked)</span>
                )}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">
                    Module
                  </th>
                  {ACTIONS.map(action => (
                    <th key={action} className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                      {actionLabels[action]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod, idx) => {
                  const perms = localPerms[selectedRole]?.[mod];
                  return (
                    <tr key={mod} className={`border-b last:border-0 ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                      <td className="px-4 py-3 text-sm font-medium">{MODULE_LABELS[mod]}</td>
                      {ACTIONS.map(action => {
                        const checked = perms?.[action] ?? false;
                        const isAdmin = selectedRole === "admin";
                        const isDisabled = isAdmin ||
                          (action !== "view" && !perms?.view);
                        return (
                          <td key={action} className="px-3 py-3 text-center">
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isDisabled}
                                onChange={() => toggle(selectedRole, mod, action)}
                                className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed accent-primary"
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            Changes take effect immediately after saving and affect sidebar visibility and page access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: school, isLoading: schoolLoading } = useGetSchoolProfile();
  const updateSchool = useUpdateSchoolProfile();
  const [schoolForm, setSchoolForm] = useState<Record<string, any> | null>(null);

  const { data: years = [] } = useListAcademicYears({ query: { queryKey: ["academic-years"] } });
  const { data: terms = [] } = useListTerms({}, { query: { queryKey: ["terms"] } });
  const { data: users = [] } = useListUsers({ query: { queryKey: ["users"] } });

  const createYear = useCreateAcademicYear();
  const deleteYear = useDeleteAcademicYear();
  const setCurrentYear = useSetCurrentAcademicYear();

  const createTerm = useCreateTerm();
  const deleteTerm = useDeleteTerm();
  const setCurrentTermMutation = useSetCurrentTerm();

  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const [showAddYear, setShowAddYear] = useState(false);
  const [showAddTerm, setShowAddTerm] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const [yearForm, setYearForm] = useState({ name: "", startDate: "", endDate: "" });
  const [termForm, setTermForm] = useState({ name: "", academicYearId: "", startDate: "", endDate: "" });
  const [userForm, setUserForm] = useState({ fullName: "", username: "", password: "", role: "teacher" });

  if (!schoolLoading && !schoolForm && school) {
    setSchoolForm({ ...school });
  }

  async function saveSchool(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolForm) return;
    try {
      await updateSchool.mutateAsync({ data: schoolForm as any });
      await qc.invalidateQueries({ queryKey: ["school"] });
      toast({ title: "School profile updated" });
    } catch (err: any) {
      toast({ title: "Error saving", description: err?.data?.error, variant: "destructive" });
    }
  }

  async function handleAddYear(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createYear.mutateAsync({ data: { ...yearForm, isCurrent: false } });
      await qc.invalidateQueries({ queryKey: ["academic-years"] });
      toast({ title: "Academic year added" });
      setShowAddYear(false);
      setYearForm({ name: "", startDate: "", endDate: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.data?.error, variant: "destructive" });
    }
  }

  async function handleAddTerm(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createTerm.mutateAsync({ data: { ...termForm, academicYearId: parseInt(termForm.academicYearId), isCurrent: false } });
      await qc.invalidateQueries({ queryKey: ["terms"] });
      toast({ title: "Term added" });
      setShowAddTerm(false);
      setTermForm({ name: "", academicYearId: "", startDate: "", endDate: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.data?.error, variant: "destructive" });
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createUser.mutateAsync({ data: { ...userForm, role: userForm.role as any } });
      await qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User created" });
      setShowAddUser(false);
      setUserForm({ fullName: "", username: "", password: "", role: "teacher" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.data?.error, variant: "destructive" });
    }
  }

  const roleColor: Record<string, string> = {
    admin: "bg-blue-100 text-blue-700 border-blue-200",
    headteacher: "bg-purple-100 text-purple-700 border-purple-200",
    teacher: "bg-emerald-100 text-emerald-700 border-emerald-200",
    accountant: "bg-amber-100 text-amber-700 border-amber-200",
    student: "bg-sky-100 text-sky-700 border-sky-200",
    parent: "bg-rose-100 text-rose-700 border-rose-200",
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">School configuration and administration</p>
      </div>

      <Tabs defaultValue="school">
        <TabsList className="flex-wrap">
          <TabsTrigger value="school"><School className="h-3.5 w-3.5 mr-1.5" />School Profile</TabsTrigger>
          <TabsTrigger value="academic"><Calendar className="h-3.5 w-3.5 mr-1.5" />Academic Years</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-3.5 w-3.5 mr-1.5" />Users</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="permissions"><Shield className="h-3.5 w-3.5 mr-1.5" />Permissions</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="school" className="mt-4">
          {schoolLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : schoolForm && (
            <Card>
              <CardHeader><CardTitle className="text-base">School Information</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={saveSchool} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>School Name *</Label>
                      <Input value={schoolForm.name ?? ""} onChange={e => setSchoolForm({ ...schoolForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Motto</Label>
                      <Input value={schoolForm.motto ?? ""} onChange={e => setSchoolForm({ ...schoolForm, motto: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Headteacher</Label>
                      <Input value={schoolForm.headteacher ?? ""} onChange={e => setSchoolForm({ ...schoolForm, headteacher: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>School Type</Label>
                      <Select value={schoolForm.schoolType ?? "public"} onValueChange={v => setSchoolForm({ ...schoolForm, schoolType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="mission">Mission</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input value={schoolForm.phone ?? ""} onChange={e => setSchoolForm({ ...schoolForm, phone: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" value={schoolForm.email ?? ""} onChange={e => setSchoolForm({ ...schoolForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Region</Label>
                      <Input value={schoolForm.region ?? ""} onChange={e => setSchoolForm({ ...schoolForm, region: e.target.value })} placeholder="e.g. Greater Accra" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>District</Label>
                      <Input value={schoolForm.district ?? ""} onChange={e => setSchoolForm({ ...schoolForm, district: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Address</Label>
                      <Input value={schoolForm.address ?? ""} onChange={e => setSchoolForm({ ...schoolForm, address: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateSchool.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateSchool.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="academic" className="mt-4 space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddTerm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Term
            </Button>
            <Button onClick={() => setShowAddYear(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Academic Year
            </Button>
          </div>

          <div className="space-y-3">
            {years.map(year => {
              const yearTerms = terms.filter(t => t.academicYearId === year.id);
              return (
                <Card key={year.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{year.name}</p>
                        {year.isCurrent && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Current</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        {!year.isCurrent && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={async () => {
                            await setCurrentYear.mutateAsync({ id: year.id });
                            await qc.invalidateQueries({ queryKey: ["academic-years"] });
                            toast({ title: `${year.name} set as current` });
                          }}>
                            <Star className="h-3 w-3 mr-1" /> Set Current
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={async () => {
                          if (!confirm(`Delete ${year.name}?`)) return;
                          try {
                            await deleteYear.mutateAsync({ id: year.id });
                            await qc.invalidateQueries({ queryKey: ["academic-years"] });
                            toast({ title: "Deleted" });
                          } catch { toast({ title: "Cannot delete year with terms", variant: "destructive" }); }
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{year.startDate?.slice(0, 10)} – {year.endDate?.slice(0, 10)}</p>
                    {yearTerms.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {yearTerms.map(term => (
                          <div key={term.id} className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
                            <span className="text-xs font-medium">{term.name}</span>
                            {term.isCurrent && <Badge className="text-[10px] px-1 h-4 bg-primary/10 text-primary border-primary/20">Current</Badge>}
                            {!term.isCurrent && (
                              <button className="text-[10px] text-primary hover:underline" onClick={async () => {
                                await setCurrentTermMutation.mutateAsync({ id: term.id });
                                await qc.invalidateQueries({ queryKey: ["terms"] });
                                toast({ title: `${term.name} set as current` });
                              }}>Set Current</button>
                            )}
                            <button className="text-muted-foreground hover:text-destructive" onClick={async () => {
                              if (!confirm(`Delete ${term.name}?`)) return;
                              await deleteTerm.mutateAsync({ id: term.id });
                              await qc.invalidateQueries({ queryKey: ["terms"] });
                              toast({ title: "Term deleted" });
                            }}><Trash2 className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {years.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No academic years configured</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddUser(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </div>

          {/* Test accounts info card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-primary mb-2">Test Accounts</p>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                {[
                  { username: "admin", password: "admin123", role: "admin" },
                  { username: "headteacher1", password: "head123", role: "headteacher" },
                  { username: "teacher1", password: "teacher123", role: "teacher" },
                  { username: "accountant1", password: "accountant123", role: "accountant" },
                  { username: "student1", password: "student123", role: "student" },
                  { username: "parent1", password: "parent123", role: "parent" },
                ].map(u => (
                  <div key={u.username} className="flex items-center gap-2 text-xs py-0.5">
                    <span className="font-mono font-medium w-28">{u.username}</span>
                    <span className="text-muted-foreground">/ {u.password}</span>
                    <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ml-auto ${roleColor[u.role] ?? ""}`}>{u.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Username</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Role</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium">{u.fullName}</td>
                      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{u.username}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs capitalize ${roleColor[u.role] ?? ""}`}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          disabled={u.username === "admin"}
                          onClick={async () => {
                            if (!confirm(`Delete user "${u.username}"?`)) return;
                            try {
                              await deleteUser.mutateAsync({ id: u.id });
                              await qc.invalidateQueries({ queryKey: ["users"] });
                              toast({ title: "User deleted" });
                            } catch { toast({ title: "Could not delete user", variant: "destructive" }); }
                          }}>
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

        {isAdmin && (
          <TabsContent value="permissions" className="mt-4">
            <PermissionsTab />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={showAddYear} onOpenChange={setShowAddYear}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Academic Year</DialogTitle></DialogHeader>
          <form onSubmit={handleAddYear} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={yearForm.name} onChange={e => setYearForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 2025/2026" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={yearForm.startDate} onChange={e => setYearForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={yearForm.endDate} onChange={e => setYearForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddYear(false)}>Cancel</Button>
              <Button type="submit" disabled={createYear.isPending}>{createYear.isPending ? "Adding..." : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTerm} onOpenChange={setShowAddTerm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Term</DialogTitle></DialogHeader>
          <form onSubmit={handleAddTerm} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Academic Year *</Label>
              <Select value={termForm.academicYearId} onValueChange={v => setTermForm(f => ({ ...f, academicYearId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Term Name *</Label>
              <Select value={termForm.name} onValueChange={v => setTermForm(f => ({ ...f, name: v }))}>
                <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Term">1st Term</SelectItem>
                  <SelectItem value="2nd Term">2nd Term</SelectItem>
                  <SelectItem value="3rd Term">3rd Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={termForm.startDate} onChange={e => setTermForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={termForm.endDate} onChange={e => setTermForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddTerm(false)}>Cancel</Button>
              <Button type="submit" disabled={createTerm.isPending}>{createTerm.isPending ? "Adding..." : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={userForm.fullName} onChange={e => setUserForm(f => ({ ...f, fullName: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Username *</Label>
              <Input value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="headteacher">Headteacher</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
              <Button type="submit" disabled={createUser.isPending}>{createUser.isPending ? "Creating..." : "Create User"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
