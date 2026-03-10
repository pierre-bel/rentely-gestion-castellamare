import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatEuro } from "@/lib/utils";
import type { PaymentItem } from "./HostPaymentsBookingsList";

interface BookingInfo {
  id: string;
  listing_title: string;
  tenant_name: string;
  checkin_date: string;
  checkout_date: string;
  total_price: number;
  currency: string | null;
  pricing_breakdown: any;
  payment_items: PaymentItem[];
}

interface Props {
  booking: BookingInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingPaymentDetailDialog({ booking, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState("");

  if (!booking) return null;

  const paidTotal = booking.payment_items.filter(i => i.is_paid).reduce((s, i) => s + i.amount, 0);
  const remaining = booking.total_price - paidTotal;
  const today = new Date().toISOString().split("T")[0];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["host-payments-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["booking-payment-items"] });
  };

  const handleTogglePaid = async (item: PaymentItem) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("booking_payment_items")
        .update({
          is_paid: !item.is_paid,
          paid_at: !item.is_paid ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      if (error) throw error;
      invalidate();
      toast({ title: item.is_paid ? "Marqué comme non payé" : "Marqué comme payé" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!newLabel.trim() || !newAmount) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("booking_payment_items").insert({
        booking_id: booking.id,
        label: newLabel.trim(),
        amount: parseFloat(newAmount),
        due_date: newDueDate || null,
        sort_order: booking.payment_items.length,
      });
      if (error) throw error;
      invalidate();
      setNewLabel("");
      setNewAmount("");
      setNewDueDate("");
      toast({ title: "Échéance ajoutée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("booking_payment_items").delete().eq("id", itemId);
      if (error) throw error;
      invalidate();
      toast({ title: "Échéance supprimée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDueDate = async (itemId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("booking_payment_items")
        .update({ due_date: editDateValue || null, updated_at: new Date().toISOString() })
        .eq("id", itemId);
      if (error) throw error;
      invalidate();
      setEditingDateId(null);
      toast({ title: "Date d'échéance modifiée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détail des paiements</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-sm">
          <p><span className="font-medium">Bien :</span> {booking.listing_title}</p>
          <p><span className="font-medium">Locataire :</span> {booking.tenant_name}</p>
          <p><span className="font-medium">Dates :</span> {format(new Date(booking.checkin_date), "dd/MM/yyyy")} → {format(new Date(booking.checkout_date), "dd/MM/yyyy")}</p>
          <p><span className="font-medium">Total :</span> {formatEuro(booking.total_price)}</p>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Encaissé</p>
            <p className="text-lg font-bold text-green-600">{formatEuro(paidTotal)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Restant</p>
            <p className="text-lg font-bold text-amber-600">{formatEuro(remaining)}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium">Échéances de paiement</p>
          {booking.payment_items.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune échéance configurée</p>
          )}
          {booking.payment_items.map(item => {
            const isOverdue = !item.is_paid && item.due_date && item.due_date < today;
            return (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${isOverdue ? "border-destructive/50 bg-destructive/5" : ""}`}>
                <Checkbox
                  checked={item.is_paid}
                  onCheckedChange={() => handleTogglePaid(item)}
                  disabled={saving}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.is_paid ? "line-through text-muted-foreground" : ""}`}>
                    {item.label}
                    {isOverdue && <span className="text-destructive text-xs ml-2 animate-pulse">En retard</span>}
                  </p>
                  {editingDateId === item.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="date"
                        value={editDateValue}
                        onChange={e => setEditDateValue(e.target.value)}
                        className="h-7 text-xs w-36"
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSaveDueDate(item.id)} disabled={saving}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingDateId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {item.due_date ? (
                        <p className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          Échéance : {format(new Date(item.due_date), "dd/MM/yyyy")}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Pas de date d'échéance</p>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditingDateId(item.id); setEditDateValue(item.due_date || ""); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {item.is_paid && item.paid_at && (
                    <p className="text-xs text-green-600">
                      Payé le {format(new Date(item.paid_at), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold whitespace-nowrap">{formatEuro(item.amount)}</p>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteItem(item.id)} disabled={saving}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium">Ajouter une échéance</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Libellé</Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Ex: Acompte" />
            </div>
            <div>
              <Label className="text-xs">Montant (€)</Label>
              <Input type="number" min="0" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Date d'échéance (optionnel)</Label>
            <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
          </div>
          <Button onClick={handleAddItem} disabled={saving || !newLabel.trim() || !newAmount} size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
