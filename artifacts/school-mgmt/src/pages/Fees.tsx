import { useState } from "react";
import {
  useListFeeTypes, useCreateFeeType, useDeleteFeeType,
  useListPayments, useCreatePayment, useDeletePayment,
  useListFeeBalances,
  useListClasses, useListTerms, useListStudents,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, DollarSign, Filter } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function formatGhc(amount: number) {
  return `GH₵ ${amount.toFixed(2)}`;
}

function AddFeeTypeForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { mutateAsync, isPending } = useCreateFeeType();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutateAsync({ data: { name, description: description || undefined } });
      await qc.invalidateQueries({ queryKey: ["fee-types"] });
      toast({ title: "Fee type added" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err?.data?.error, variant: "destructive" });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Adding..." : "Add"}</Button>
      </DialogFooter>
    </form>
  );
}

function RecordPaymentDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { mutateAsync, isPending } = useCreatePayment();
  const { data: students = [] } = useListStudents();
  const { data: feeTypes = [] } = useListFeeTypes();
  const { data: terms = [] } = useListTerms();
  const currentTerm = terms.find(t => t.isCurrent);

  const [form, setForm] = useState({
    studentId: "", feeTypeId: "", termId: currentTerm ? String(currentTerm.id) : "",
    amountPaid: "", paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash", notes: "",
  });

  function set(key: string, value: string) { setForm(f => ({ ...f, [key]: value })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutateAsync({
        data: {
          studentId: parseInt(form.studentId),
          feeTypeId: parseInt(form.feeTypeId),
          termId: parseInt(form.termId),
          amountPaid: parseFloat(form.amountPaid),
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod as any,
          notes: form.notes || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: ["payments"] });
      await qc.invalidateQueries({ queryKey: ["fee-balances"] });
      toast({ title: "Payment recorded successfully" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error recording payment", description: err?.data?.error, variant: "destructive" });
    }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Student *</Label>
          <Select value={form.studentId} onValueChange={v => set("studentId", v)}>
            <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent>
              {students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName} ({s.studentId})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Fee Type *</Label>
            <Select value={form.feeTypeId} onValueChange={v => set("feeTypeId", v)}>
              <SelectTrigger><SelectValue placeholder="Fee type" /></SelectTrigger>
              <SelectContent>{feeTypes.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Term *</Label>
            <Select value={form.termId} onValueChange={v => set("termId", v)}>
              <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
              <SelectContent>{terms.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name} {t.isCurrent ? "(Current)" : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Amount (GH₵) *</Label>
            <Input type="number" step="0.01" value={form.amountPaid} onChange={e => set("amountPaid", e.target.value)} required placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="momo">Mobile Money</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Payment Date</Label>
          <Input type="date" value={form.paymentDate} onChange={e => set("paymentDate", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Recording..." : "Record Payment"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default function Fees() {
  const [showPayment, setShowPayment] = useState(false);
  const [showFeeType, setShowFeeType] = useState(false);
  const [classFilter, setClassFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: feeTypes = [], isLoading: ftLoading } = useListFeeTypes({ query: { queryKey: ["fee-types"] } });
  const { data: payments = [], isLoading: paymentsLoading } = useListPayments(
    {
      classId: classFilter !== "all" ? parseInt(classFilter) : undefined,
      termId: termFilter !== "all" ? parseInt(termFilter) : undefined,
    },
    { query: { queryKey: ["payments", classFilter, termFilter] } }
  );
  const { data: balances = [], isLoading: balancesLoading } = useListFeeBalances(
    {
      classId: classFilter !== "all" ? parseInt(classFilter) : undefined,
      termId: termFilter !== "all" ? parseInt(termFilter) : undefined,
    },
    { query: { queryKey: ["fee-balances", classFilter, termFilter] } }
  );
  const { data: classes = [] } = useListClasses();
  const { data: terms = [] } = useListTerms();

  const deleteFeeType = useDeleteFeeType();
  const deletePayment = useDeletePayment();

  const currentTerm = terms.find(t => t.isCurrent);

  const totalCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalPending = balances.reduce((sum, b) => sum + Math.max(0, b.balance), 0);

  const statusColor: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    partial: "bg-yellow-100 text-yellow-700",
    unpaid: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fees &amp; Payments</h1>
          <p className="text-muted-foreground text-sm">{currentTerm?.name ?? "Current Term"}</p>
        </div>
        <Button onClick={() => setShowPayment(true)}>
          <Plus className="h-4 w-4 mr-2" /> Record Payment
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Collected</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatGhc(totalCollected)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</p>
          <p className="text-xl font-bold text-red-500 mt-1">{formatGhc(totalPending)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Payments</p>
          <p className="text-xl font-bold mt-1">{payments.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Fee Types</p>
          <p className="text-xl font-bold mt-1">{feeTypes.length}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
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

      <Tabs defaultValue="balances">
        <TabsList>
          <TabsTrigger value="balances">Fee Balances ({balances.length})</TabsTrigger>
          <TabsTrigger value="payments">Payment History ({payments.length})</TabsTrigger>
          <TabsTrigger value="types">Fee Types ({feeTypes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Class</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Fee Type</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Expected</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Paid</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Balance</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {balancesLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b">{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                    ))
                  ) : balances.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No fee balances found</td></tr>
                  ) : (
                    balances.map((b, i) => (
                      <tr key={i} className="border-b hover:bg-muted/20">
                        <td className="px-4 py-3 text-sm font-medium">{b.studentName}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{b.className ?? "—"}</td>
                        <td className="px-4 py-3 text-sm">{b.feeTypeName}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatGhc(b.totalFee)}</td>
                        <td className="px-4 py-3 text-sm text-right text-emerald-600">{formatGhc(b.totalPaid)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${b.balance > 0 ? "text-red-500" : "text-emerald-600"}`}>{formatGhc(b.balance)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor[b.status] ?? ""}`}>{b.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Receipt</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Fee Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Term</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Method</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
                    ))
                  ) : payments.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No payments recorded</td></tr>
                  ) : (
                    payments.slice().reverse().map(p => (
                      <tr key={p.id} className="border-b hover:bg-muted/20">
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.receiptNumber}</td>
                        <td className="px-4 py-3 text-sm font-medium">{p.studentName}</td>
                        <td className="px-4 py-3 text-sm">{p.feeTypeName}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.termName}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">{formatGhc(p.amountPaid)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.paymentDate?.slice(0, 10)}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-xs capitalize">{p.paymentMethod?.replace("_", " ")}</Badge></td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={async () => {
                              if (!confirm("Delete this payment?")) return;
                              try {
                                await deletePayment.mutateAsync({ id: p.id });
                                await qc.invalidateQueries({ queryKey: ["payments"] });
                                toast({ title: "Payment deleted" });
                              } catch { toast({ title: "Could not delete", variant: "destructive" }); }
                            }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowFeeType(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Add Fee Type
            </Button>
          </div>
          {ftLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {feeTypes.map(ft => (
                <Card key={ft.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{ft.name}</p>
                      {ft.description && <p className="text-xs text-muted-foreground">{ft.description}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={async () => {
                      if (!confirm(`Delete fee type "${ft.name}"?`)) return;
                      try {
                        await deleteFeeType.mutateAsync({ id: ft.id });
                        await qc.invalidateQueries({ queryKey: ["fee-types"] });
                        toast({ title: "Fee type deleted" });
                      } catch { toast({ title: "Could not delete", variant: "destructive" }); }
                    }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        {showPayment && <RecordPaymentDialog onClose={() => setShowPayment(false)} />}
      </Dialog>
      <Dialog open={showFeeType} onOpenChange={setShowFeeType}>
        {showFeeType && (
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add Fee Type</DialogTitle></DialogHeader>
            <AddFeeTypeForm onClose={() => setShowFeeType(false)} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
