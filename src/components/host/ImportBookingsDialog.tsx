import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format, parse, isValid, differenceInCalendarDays } from "date-fns";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  rowNumber: number;
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
}

const TEMPLATE_COLUMNS = [
  // Booking
  { key: "listing_title", label: "Nom du bien", required: true, example: "Appartement Centre-Ville" },
  { key: "checkin_date", label: "Date d'arrivée (JJ/MM/AAAA)", required: true, example: "15/07/2026" },
  { key: "checkout_date", label: "Date de départ (JJ/MM/AAAA)", required: true, example: "22/07/2026" },
  { key: "rental_price", label: "Prix de location (€)", required: true, example: "700" },
  { key: "cleaning_fee", label: "Frais de ménage (€)", required: false, example: "80" },
  { key: "status", label: "Statut", required: false, example: "confirmed" },
  { key: "igloohome_code", label: "Code clé Igloohome", required: false, example: "123456789" },
  { key: "notes", label: "Notes", required: false, example: "" },
  { key: "created_at", label: "Date de création (AA-MM-JJ HH:mm)", required: false, example: "23-01-21 22:42" },
  // Tenant
  { key: "tenant_first_name", label: "Prénom du locataire", required: true, example: "Jean" },
  { key: "tenant_last_name", label: "Nom du locataire", required: false, example: "Dupont" },
  { key: "tenant_email", label: "E-mail du locataire", required: false, example: "jean@example.com" },
  { key: "tenant_phone", label: "Téléphone du locataire", required: false, example: "+32 470 12 34 56" },
  { key: "tenant_gender", label: "Sexe (homme/femme)", required: false, example: "homme" },
  { key: "tenant_street", label: "Rue", required: false, example: "Rue de la Loi" },
  { key: "tenant_street_number", label: "Numéro", required: false, example: "16" },
  { key: "tenant_postal_code", label: "Code postal", required: false, example: "1000" },
  { key: "tenant_city", label: "Ville", required: false, example: "Bruxelles" },
  { key: "tenant_country", label: "Pays", required: false, example: "Belgique" },
  { key: "tenant_notes", label: "Notes locataire", required: false, example: "" },
  // Payment status
  { key: "deposit_paid", label: "Acompte payé (oui/non)", required: false, example: "non" },
  { key: "balance_paid", label: "Solde payé (oui/non)", required: false, example: "non" },
];

function parseDate(val: any): Date | null {
  if (!val) return null;
  // Handle Excel serial numbers
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return new Date(d.y, d.m - 1, d.d);
    return null;
  }
  const str = String(val).trim();
  // Try DD/MM/YYYY
  const parsed = parse(str, "dd/MM/yyyy", new Date());
  if (isValid(parsed)) return parsed;
  // Try YYYY-MM-DD
  const parsed2 = parse(str, "yyyy-MM-dd", new Date());
  if (isValid(parsed2)) return parsed2;
  // Try DD-MM-YYYY
  const parsed3 = parse(str, "dd-MM-yyyy", new Date());
  if (isValid(parsed3)) return parsed3;
  return null;
}

function parseDateTime(val: any): Date | null {
  if (!val) return null;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0);
    return null;
  }
  const str = String(val).trim();
  // Try YY-MM-DD HH:mm (e.g. 23-01-21 22:42)
  const p1 = parse(str, "yy-MM-dd HH:mm", new Date());
  if (isValid(p1)) return p1;
  // Try YYYY-MM-DD HH:mm
  const p2 = parse(str, "yyyy-MM-dd HH:mm", new Date());
  if (isValid(p2)) return p2;
  // Try DD/MM/YYYY HH:mm
  const p3 = parse(str, "dd/MM/yyyy HH:mm", new Date());
  if (isValid(p3)) return p3;
  // Fallback to date-only parsers
  return parseDate(val);
}

export function ImportBookingsDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] });

  const { data: listings = [] } = useQuery({
    queryKey: ["host-listings-simple", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, base_price, cleaning_fee")
        .eq("host_user_id", user.id)
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = TEMPLATE_COLUMNS.map(c => c.label);
    const exampleRow = TEMPLATE_COLUMNS.map(c => c.example);
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

    // Set column widths
    ws["!cols"] = TEMPLATE_COLUMNS.map(c => ({ wch: Math.max(c.label.length, 20) }));

    XLSX.utils.book_append_sheet(wb, ws, "Réservations");
    XLSX.writeFile(wb, "template_import_reservations.xlsx");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    try {
      const data = await f.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      // Map column labels to keys
      const labelToKey: Record<string, string> = {};
      TEMPLATE_COLUMNS.forEach(c => { labelToKey[c.label] = c.key; });

      const rows: ParsedRow[] = jsonData.map((row, idx) => {
        const mapped: Record<string, any> = {};
        Object.entries(row).forEach(([colLabel, value]) => {
          const key = labelToKey[colLabel.trim()] || colLabel.trim();
          mapped[key] = value;
        });

        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!mapped.listing_title) errors.push("Nom du bien manquant");
        if (!mapped.checkin_date) errors.push("Date d'arrivée manquante");
        if (!mapped.checkout_date) errors.push("Date de départ manquante");
        if (!mapped.rental_price && mapped.rental_price !== 0) errors.push("Prix de location manquant");
        if (!mapped.tenant_first_name) errors.push("Prénom du locataire manquant");

        // Validate dates
        const checkin = parseDate(mapped.checkin_date);
        const checkout = parseDate(mapped.checkout_date);
        if (mapped.checkin_date && !checkin) errors.push("Date d'arrivée invalide");
        if (mapped.checkout_date && !checkout) errors.push("Date de départ invalide");
        if (checkin && checkout && checkout <= checkin) errors.push("Départ doit être après arrivée");

        // Validate listing exists
        if (mapped.listing_title) {
          const match = listings.find(l => l.title.toLowerCase().trim() === String(mapped.listing_title).toLowerCase().trim());
          if (!match) errors.push(`Bien "${mapped.listing_title}" introuvable`);
        }

        // Validate gender
        if (mapped.tenant_gender) {
          const g = String(mapped.tenant_gender).toLowerCase().trim();
          if (!["homme", "femme", "male", "female", "m", "f"].includes(g)) {
            warnings.push("Sexe non reconnu (attendu: homme/femme)");
          }
        }

        return { rowNumber: idx + 2, data: mapped, errors, warnings };
      });

      setParsedRows(rows);
      setStep("preview");
    } catch (err: any) {
      toast({ title: "Erreur de lecture", description: err.message, variant: "destructive" });
    }
  };

  const normalizeGender = (val: string | undefined): string | null => {
    if (!val) return null;
    const g = val.toLowerCase().trim();
    if (["homme", "male", "m"].includes(g)) return "male";
    if (["femme", "female", "f"].includes(g)) return "female";
    return null;
  };

  const handleImport = async () => {
    if (!user) return;
    setStep("importing");

    const validRows = parsedRows.filter(r => r.errors.length === 0);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of validRows) {
      try {
        const d = row.data;
        const listing = listings.find(l => l.title.toLowerCase().trim() === String(d.listing_title).toLowerCase().trim());
        if (!listing) throw new Error(`Bien "${d.listing_title}" introuvable`);

        // 1. Create or find tenant
        const tenantFirstName = String(d.tenant_first_name).trim();
        const tenantLastName = d.tenant_last_name ? String(d.tenant_last_name).trim() : null;
        const tenantEmail = d.tenant_email ? String(d.tenant_email).trim() : null;

        let tenantId: string | null = null;

        // Check if tenant already exists (by email or name)
        if (tenantEmail) {
          const { data: existing } = await supabase
            .from("tenants")
            .select("id")
            .eq("host_user_id", user.id)
            .eq("email", tenantEmail)
            .maybeSingle();
          if (existing) tenantId = existing.id;
        }

        if (!tenantId) {
          const { data: newTenant, error: tErr } = await supabase.from("tenants").insert({
            host_user_id: user.id,
            first_name: tenantFirstName,
            last_name: tenantLastName,
            email: tenantEmail,
            phone: d.tenant_phone ? String(d.tenant_phone).trim() : null,
            gender: normalizeGender(d.tenant_gender),
            street: d.tenant_street ? String(d.tenant_street).trim() : null,
            street_number: d.tenant_street_number ? String(d.tenant_street_number).trim() : null,
            postal_code: d.tenant_postal_code ? String(d.tenant_postal_code).trim() : null,
            city: d.tenant_city ? String(d.tenant_city).trim() : null,
            country: d.tenant_country ? String(d.tenant_country).trim() : null,
            notes: d.tenant_notes ? String(d.tenant_notes).trim() : null,
          }).select("id").single();
          if (tErr) throw tErr;
          tenantId = newTenant.id;
        }

        // 2. Create booking
        const checkin = parseDate(d.checkin_date)!;
        const checkout = parseDate(d.checkout_date)!;
        const nights = differenceInCalendarDays(checkout, checkin);
        const rentalPrice = parseFloat(String(d.rental_price)) || 0;
        const cleaningFee = d.cleaning_fee != null ? parseFloat(String(d.cleaning_fee)) || 0 : (listing.cleaning_fee || 0);
        const totalPrice = rentalPrice + cleaningFee;
        const guestsCount = d.guests ? parseInt(String(d.guests)) || 1 : 1;
        const igloohomeCode = d.igloohome_code ? String(d.igloohome_code).replace(/\D/g, "") : null;

        const validStatuses = ["confirmed", "pending_payment", "cancelled", "completed", "cancelled_guest", "cancelled_host", "expired"];
        const status = d.status && validStatuses.includes(String(d.status).toLowerCase().trim())
          ? String(d.status).toLowerCase().trim()
          : "confirmed";

        const tenantName = [tenantFirstName, tenantLastName].filter(Boolean).join(" ");

        // Parse optional created_at
        const importedCreatedAt = d.created_at ? parseDateTime(d.created_at) : null;

        const bookingInsert: Record<string, any> = {
          listing_id: listing.id,
          guest_user_id: user.id,
          checkin_date: format(checkin, "yyyy-MM-dd"),
          checkout_date: format(checkout, "yyyy-MM-dd"),
          nights,
          guests: guestsCount,
          subtotal: rentalPrice,
          cleaning_fee: cleaningFee,
          total_price: totalPrice,
          host_payout_gross: totalPrice,
          host_payout_net: totalPrice,
          status: status as any,
          currency: "EUR",
          igloohome_code: igloohomeCode || null,
          pricing_breakdown: {
            rental_price: rentalPrice,
            tenant_id: tenantId,
          },
          notes: [
            `Locataire: ${tenantName}`,
            d.notes ? String(d.notes).trim() : null,
          ].filter(Boolean).join(" | ") || null,
        };

        if (importedCreatedAt) {
          bookingInsert.created_at = importedCreatedAt.toISOString();
        }

        const { data: newBooking, error: bErr } = await supabase.from("bookings").insert(bookingInsert).select("id").single();

        if (bErr) throw bErr;

        // Mark payment items as paid if specified
        if (newBooking) {
          const isYes = (v: any) => v && ["oui", "yes", "true", "1", "o"].includes(String(v).toLowerCase().trim());
          const depositPaid = isYes(d.deposit_paid);
          const balancePaid = isYes(d.balance_paid);

          if (depositPaid || balancePaid) {
            const { data: payItems } = await supabase
              .from("booking_payment_items")
              .select("id, sort_order")
              .eq("booking_id", newBooking.id)
              .order("sort_order");

            if (payItems && payItems.length > 0) {
              const now = new Date().toISOString();
              const idsToMark: string[] = [];
              if (depositPaid && payItems[0]) idsToMark.push(payItems[0].id);
              if (balancePaid && payItems.length > 1) {
                payItems.slice(1).forEach(p => idsToMark.push(p.id));
              } else if (balancePaid && payItems.length === 1) {
                idsToMark.push(payItems[0].id);
              }
              if (idsToMark.length > 0) {
                await supabase
                  .from("booking_payment_items")
                  .update({ is_paid: true, paid_at: now, updated_at: now })
                  .in("id", idsToMark);
              }
            }
          }
        }
        success++;
      } catch (err: any) {
        failed++;
        errors.push(`Ligne ${row.rowNumber}: ${err.message}`);
      }
    }

    const skipped = parsedRows.length - validRows.length;
    if (skipped > 0) {
      errors.unshift(`${skipped} ligne(s) ignorée(s) car invalide(s)`);
    }

    setImportResults({ success, failed, errors });
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["host-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["host-tenants"] });
  };

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setStep("upload");
    setImportResults({ success: 0, failed: 0, errors: [] });
    onOpenChange(false);
  };

  const validCount = parsedRows.filter(r => r.errors.length === 0).length;
  const errorCount = parsedRows.filter(r => r.errors.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importer des réservations
          </DialogTitle>
          <DialogDescription>
            Importez vos réservations depuis un fichier Excel (.xlsx, .xls, .csv).
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Glissez votre fichier ici ou cliquez pour sélectionner</p>
                <p className="text-xs text-muted-foreground mt-1">Formats acceptés : .xlsx, .xls, .csv</p>
              </div>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="max-w-xs mx-auto"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Télécharger le template</p>
                <p className="text-xs text-muted-foreground">Fichier Excel pré-formaté avec toutes les colonnes</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template .xlsx
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 py-2">
            <div className="flex gap-3">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> {validCount} valide(s)
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> {errorCount} erreur(s)
                </Badge>
              )}
              <Badge variant="secondary">{parsedRows.length} ligne(s) total</Badge>
            </div>

            <ScrollArea className="h-[350px] border rounded-md">
              <div className="p-3 space-y-2">
                {parsedRows.map((row) => (
                  <div
                    key={row.rowNumber}
                    className={`p-3 rounded-md border text-sm ${
                      row.errors.length > 0 ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="font-medium">Ligne {row.rowNumber}</span>
                        <span className="text-muted-foreground ml-2">
                          {row.data.tenant_first_name} {row.data.tenant_last_name || ""} — {row.data.listing_title}
                        </span>
                        {row.data.checkin_date && row.data.checkout_date && (
                          <span className="text-muted-foreground ml-2">
                            ({String(row.data.checkin_date)} → {String(row.data.checkout_date)})
                          </span>
                        )}
                      </div>
                      {row.errors.length > 0 ? (
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                    {row.errors.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {row.errors.map((err, i) => (
                          <p key={i} className="text-xs text-destructive">• {err}</p>
                        ))}
                      </div>
                    )}
                    {row.warnings.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {row.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> {w}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === "importing" && (
          <div className="py-12 text-center space-y-3">
            <div className="h-8 w-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Import en cours...</p>
          </div>
        )}

        {step === "done" && (
          <div className="py-6 space-y-4">
            <div className="text-center space-y-2">
              {importResults.success > 0 && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                  <span className="text-lg font-medium">{importResults.success} réservation(s) importée(s)</span>
                </div>
              )}
              {importResults.failed > 0 && (
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span>{importResults.failed} échouée(s)</span>
                </div>
              )}
            </div>

            {importResults.errors.length > 0 && (
              <ScrollArea className="h-[200px] border rounded-md p-3">
                {importResults.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive py-0.5">• {err}</p>
                ))}
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>Annuler</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setParsedRows([]); }}>
                Retour
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                Importer {validCount} réservation(s)
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
