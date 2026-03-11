import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatEuro } from "@/lib/utils";

interface Props {
  bookingId: string;
  totalPrice: number;
}

export function BookingPaymentSection({ bookingId, totalPrice }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState("");

  const { data: queryItems = [], isLoading } = useQuery({
    queryKey: ["booking-payment-items", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payment_items")
        .select("*")
        .eq("booking_id", bookingId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const [items, setItems] = useState(queryItems);
  useEffect(() => { setItems(queryItems); }, [queryItems]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["booking-payment-items", bookingId] });
    queryClient.invalidateQueries({ queryKey: ["host-payments-bookings"] });
  };

  const today = new Date().toISOString().split("T")[0];
  const paidTotal = items.filter(i => i.is_paid).reduce((s, i) => s + i.amount, 0);
  const remaining = totalPrice - paidTotal;
  const hasOverdue = items.some(i => !i.is_paid && i.due_date && i.due_date < today);

  const handleToggle = async (item: typeof items[0]) => {
    const newIsPaid = !item.is_paid;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_paid: newIsPaid, paid_at: newIsPaid ? new Date().toISOString() : null } : i));
    try {
      await supabase
        .from("booking_payment_items")
        .update({ is_paid: newIsPaid, paid_at: newIsPaid ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      invalidate();
      toast({ title: newIsPaid ? "Marqué comme payé" : "Marqué comme non payé" });
    } catch (e: any) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_paid: item.is_paid, paid_at: item.paid_at } : i));
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim() || !newAmount) return;
    setSaving(true);
    try {
      await supabase.from("booking_payment_items").insert({
        booking_id: bookingId,
        label: newLabel.trim(),
        amount: parseFloat(newAmount),
        due_date: newDueDate || null,
        sort_order: items.length,
      });
      invalidate();
      setNewLabel(""); setNewAmount(""); setNewDueDate("");
      toast({ title: "Échéance ajoutée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await supabase.from("booking_payment_items").delete().eq("id", id);
      invalidate();
      toast({ title: "Échéance supprimée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDate = async (id: string) => {
    setSaving(true);
    try {
      await supabase.from("booking_payment_items").update({ due_date: editDateValue || null, updated_at: new Date().toISOString() }).eq("id", id);
      invalidate();
      setEditingDateId(null);
      toast({ title: "Date modifiée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-2">
        {hasOverdue ? (
          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 animate-pulse">En retard</Badge>
        ) : paidTotal >= totalPrice ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Payé</Badge>
        ) : paidTotal > 0 ? (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Acompte payé</Badge>
        ) : (
          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Non payé</Badge>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {formatEuro(paidTotal)} / {formatEuro(totalPrice)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/20">
          <p className="text-xs text-muted-foreground">Encaissé</p>
          <p className="font-bold text-green-600">{formatEuro(paidTotal)}</p>
        </div>
        <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/20">
          <p className="text-xs text-muted-foreground">Restant</p>
          <p className="font-bold text-amber-600">{formatEuro(remaining)}</p>
        </div>
      </div>

      <Separator />

      {/* Items */}
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune échéance configurée</p>}
        {items.map(item => {
          const isOverdue = !item.is_paid && item.due_date && item.due_date < today;
          return (
            <div key={item.id} className={`flex items-center gap-2 p-2.5 rounded-lg border ${isOverdue ? "border-destructive/50 bg-destructive/5" : "bg-card"}`}>
              <Checkbox checked={item.is_paid} onCheckedChange={() => handleToggle(item)} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.is_paid ? "line-through text-muted-foreground" : ""}`}>
                  {item.label}
                  {isOverdue && <span className="text-destructive text-xs ml-1 animate-pulse">Retard</span>}
                </p>
                {editingDateId === item.id ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Input type="date" value={editDateValue} onChange={e => setEditDateValue(e.target.value)} className="h-6 text-xs w-32" />
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleSaveDate(item.id)} disabled={saving}><Check className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditingDateId(null)}><X className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <p className={`text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                      {item.due_date ? format(new Date(item.due_date), "dd/MM/yyyy") : "Pas de date"}
                    </p>
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => { setEditingDateId(item.id); setEditDateValue(item.due_date || ""); }}>
                      <Pencil className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                )}
                {item.is_paid && item.paid_at && <p className="text-xs text-green-600">Payé le {format(new Date(item.paid_at), "dd/MM/yyyy")}</p>}
              </div>
              <p className="text-sm font-semibold whitespace-nowrap">{formatEuro(item.amount)}</p>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)} disabled={saving}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Add */}
      <div className="space-y-2">
        <p className="text-xs font-medium">Ajouter une échéance</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Libellé</Label>
            <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Ex: Acompte" className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Montant (€)</Label>
            <Input type="number" min="0" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0.00" className="h-8 text-sm" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Date d'échéance</Label>
          <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="h-8 text-sm" />
        </div>
        <Button onClick={handleAdd} disabled={saving || !newLabel.trim() || !newAmount} size="sm" className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
        </Button>
      </div>
    </div>
  );
}
