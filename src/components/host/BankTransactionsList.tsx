import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, RefreshCw, Trash2, Link2, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MatchTransactionDialog } from "./MatchTransactionDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParsedTransaction {
  date: string;
  amount: number;
  description: string;
  debtorName?: string;
  debtorIban?: string;
}

function parseCSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const separator = headerLine.includes(";") ? ";" : ",";
  const headers = headerLine.split(separator).map((h) => h.trim().replace(/"/g, ""));

  // Try to detect columns
  const dateIdx = headers.findIndex((h) =>
    /date|datum|valeur|opération/.test(h)
  );
  const amountIdx = headers.findIndex((h) =>
    /montant|amount|crédit|credit|debit|débit|somme/.test(h)
  );
  const creditIdx = headers.findIndex((h) => /crédit|credit/.test(h));
  const debitIdx = headers.findIndex((h) => /débit|debit/.test(h));
  const descIdx = headers.findIndex((h) =>
    /description|libellé|libelle|label|motif|détail|detail|communication/.test(h)
  );
  const nameIdx = headers.findIndex((h) =>
    /nom|name|émetteur|emetteur|contrepartie|tiers/.test(h)
  );
  const ibanIdx = headers.findIndex((h) => /iban|compte/.test(h));

  const results: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields with separators inside
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator.charAt(0) && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    let amount = 0;
    if (creditIdx >= 0 && debitIdx >= 0) {
      const credit = parseFloat((values[creditIdx] || "0").replace(/\s/g, "").replace(",", ".")) || 0;
      const debit = parseFloat((values[debitIdx] || "0").replace(/\s/g, "").replace(",", ".")) || 0;
      amount = credit > 0 ? credit : -debit;
    } else if (amountIdx >= 0) {
      amount = parseFloat((values[amountIdx] || "0").replace(/\s/g, "").replace(",", ".")) || 0;
    }

    // Parse date - try common formats
    let dateStr = values[dateIdx >= 0 ? dateIdx : 0] || "";
    dateStr = dateStr.replace(/"/g, "");
    let parsedDate: string | null = null;

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = dateStr.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
    if (dmyMatch) {
      parsedDate = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
    }
    // YYYY-MM-DD
    const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!parsedDate && isoMatch) {
      parsedDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    if (!parsedDate) continue;

    results.push({
      date: parsedDate,
      amount,
      description: values[descIdx >= 0 ? descIdx : 1] || "",
      debtorName: nameIdx >= 0 ? values[nameIdx] : undefined,
      debtorIban: ibanIdx >= 0 ? values[ibanIdx] : undefined,
    });
  }

  return results;
}

export function BankTransactionsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [matchingTx, setMatchingTx] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [parseErrors, setParseErrors] = useState<string | null>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["bank-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("*, bookings(id, checkin_date, checkout_date, total_price, listing_id, listings(title))")
        .eq("host_user_id", user!.id)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const unmatchMutation = useMutation({
    mutationFn: async (txId: string) => {
      const { error } = await supabase
        .from("bank_transactions")
        .update({ matched_booking_id: null, matched_payment_item_id: null, matched_at: null })
        .eq("id", txId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast({ title: "Assignation supprimée" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bank_transactions")
        .delete()
        .eq("host_user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast({ title: "Toutes les transactions supprimées" });
    },
  });

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user?.id) return;

      setImporting(true);
      setParseErrors(null);

      try {
        const text = await file.text();
        const parsed = parseCSV(text);

        if (parsed.length === 0) {
          setParseErrors(
            "Aucune transaction trouvée. Vérifiez que votre fichier CSV contient des colonnes Date et Montant."
          );
          return;
        }

        // Filter only positive amounts (incoming transfers)
        const incoming = parsed.filter((t) => t.amount > 0);

        if (incoming.length === 0) {
          setParseErrors(
            `${parsed.length} lignes trouvées mais aucun virement entrant (montant positif). Seuls les virements entrants sont importés.`
          );
          return;
        }

        // Upsert transactions
        const rows = incoming.map((t, i) => ({
          host_user_id: user.id,
          external_id: `${t.date}_${t.amount}_${i}`,
          transaction_date: t.date,
          amount: t.amount,
          currency: "EUR",
          description: t.description,
          debtor_name: t.debtorName || null,
          debtor_iban: t.debtorIban || null,
        }));

        // Insert in batches of 50
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50);
          const { error } = await supabase
            .from("bank_transactions")
            .upsert(batch, { onConflict: "host_user_id,external_id" });
          if (error) throw error;
        }

        queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
        toast({
          title: "Import réussi",
          description: `${incoming.length} virement(s) entrant(s) importé(s) sur ${parsed.length} lignes.`,
        });
      } catch (err: any) {
        toast({
          title: "Erreur d'import",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [user?.id, queryClient, toast]
  );

  const matchedTx = transactions.find((t: any) => t.id === matchingTx);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Virements bancaires
              </CardTitle>
              <CardDescription>
                Importez un relevé CSV depuis votre banque pour voir les virements entrants et les assigner à vos réservations.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {transactions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteAllMutation.mutate()}
                  disabled={deleteAllMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Tout supprimer
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Importer un CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {parseErrors && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseErrors}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun virement importé</p>
              <p className="text-sm mt-1">
                Exportez un relevé CSV depuis votre banque en ligne, puis importez-le ici.
              </p>
              <p className="text-xs mt-3 text-muted-foreground/70">
                Formats supportés : colonnes Date, Montant (ou Crédit/Débit), Description. Séparateurs : virgule ou point-virgule.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead className="hidden sm:table-cell">Description</TableHead>
                  <TableHead className="hidden md:table-cell">Émetteur</TableHead>
                  <TableHead>Réservation</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: any) => {
                  const isMatched = !!tx.matched_booking_id;
                  const booking = tx.bookings;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(tx.transaction_date), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-medium text-emerald-600 whitespace-nowrap">
                        +{Number(tx.amount).toFixed(2)} €
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-muted-foreground text-sm">
                        {tx.description || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {tx.debtor_name || "—"}
                      </TableCell>
                      <TableCell>
                        {isMatched && booking ? (
                          <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            {booking.listings?.title
                              ? `${booking.listings.title} — ${format(new Date(booking.checkin_date), "dd/MM")}`
                              : "Assigné"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Non assigné
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {isMatched ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => unmatchMutation.mutate(tx.id)}
                              title="Retirer l'assignation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setMatchingTx(tx.id)}
                              title="Assigner à une réservation"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {matchingTx && matchedTx && (
        <MatchTransactionDialog
          open={!!matchingTx}
          onOpenChange={(open) => !open && setMatchingTx(null)}
          transactionId={matchingTx}
          transactionAmount={Number(matchedTx.amount)}
          transactionDate={matchedTx.transaction_date}
        />
      )}
    </div>
  );
}
