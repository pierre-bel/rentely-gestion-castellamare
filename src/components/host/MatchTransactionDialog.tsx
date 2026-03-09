import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDebounce } from "@/hooks/useDebounce";

interface MatchTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  transactionAmount: number;
  transactionDate: string;
}

export function MatchTransactionDialog({
  open,
  onOpenChange,
  transactionId,
  transactionAmount,
  transactionDate,
}: MatchTransactionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["host-bookings-match", user?.id, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select("id, checkin_date, checkout_date, total_price, guests, status, listing_id, listings(title), profiles:guest_user_id(full_name, email)")
        .order("checkin_date", { ascending: false })
        .limit(20);

      // Filter by host's listings
      const { data: listingIds } = await supabase
        .from("listings")
        .select("id")
        .eq("host_user_id", user!.id);

      if (listingIds && listingIds.length > 0) {
        query = query.in("listing_id", listingIds.map((l) => l.id));
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side filtering by search
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        return (data || []).filter((b: any) => {
          const title = b.listings?.title?.toLowerCase() || "";
          const name = b.profiles?.full_name?.toLowerCase() || "";
          const email = b.profiles?.email?.toLowerCase() || "";
          const amount = String(b.total_price);
          return title.includes(s) || name.includes(s) || email.includes(s) || amount.includes(s);
        });
      }

      return data || [];
    },
    enabled: !!user?.id && open,
  });

  const matchMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from("bank_transactions")
        .update({
          matched_booking_id: bookingId,
          matched_at: new Date().toISOString(),
        })
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast({ title: "Virement assigné à la réservation" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assigner le virement</DialogTitle>
          <DialogDescription>
            Virement de <strong>+{transactionAmount.toFixed(2)} €</strong> du{" "}
            {format(new Date(transactionDate), "dd MMMM yyyy", { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, logement, montant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-auto space-y-2 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Aucune réservation trouvée
            </p>
          ) : (
            bookings.map((b: any) => {
              const amountMatch = Math.abs(b.total_price - transactionAmount) < 1;
              return (
                <button
                  key={b.id}
                  onClick={() => matchMutation.mutate(b.id)}
                  disabled={matchMutation.isPending}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors flex items-center justify-between gap-3 disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {b.listings?.title || "Logement"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.profiles?.full_name || b.profiles?.email || "—"} •{" "}
                      {format(new Date(b.checkin_date), "dd/MM/yyyy")} →{" "}
                      {format(new Date(b.checkout_date), "dd/MM/yyyy")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-medium ${amountMatch ? "text-emerald-600" : ""}`}>
                      {Number(b.total_price).toFixed(2)} €
                    </span>
                    {amountMatch && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        <Check className="h-3 w-3 mr-0.5" />
                        Montant
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
