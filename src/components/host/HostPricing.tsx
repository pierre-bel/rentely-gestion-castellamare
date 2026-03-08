import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Download, Upload, Trash2, Plus, FileSpreadsheet } from "lucide-react";
import { format, startOfWeek, addWeeks, parseISO, getISOWeek, getYear } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";

interface WeeklyPricing {
  id?: string;
  listing_id: string;
  host_user_id: string;
  week_start_date: string;
  nightly_rate: number;
  weekend_nightly_rate: number;
  extra_night_weekend_rate: number;
}

interface Listing {
  id: string;
  title: string;
  base_price: number;
}

export function HostPricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedListingId, setSelectedListingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [weeksToGenerate, setWeeksToGenerate] = useState(12);
  const [editedRows, setEditedRows] = useState<Record<string, Partial<WeeklyPricing>>>({});

  // Fetch listings
  const { data: listings = [] } = useQuery({
    queryKey: ["host-listings-pricing", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, base_price")
        .eq("host_user_id", user.id)
        .order("title");
      if (error) throw error;
      return data as Listing[];
    },
    enabled: !!user?.id,
  });

  // Fetch weekly pricing for selected listing
  const { data: pricingData = [], isLoading } = useQuery({
    queryKey: ["listing-weekly-pricing", selectedListingId],
    queryFn: async () => {
      if (!selectedListingId) return [];
      const { data, error } = await supabase
        .from("listing_weekly_pricing")
        .select("*")
        .eq("listing_id", selectedListingId)
        .order("week_start_date");
      if (error) throw error;
      return data as WeeklyPricing[];
    },
    enabled: !!selectedListingId,
  });

  // Merged data: existing + edited
  const displayData = useMemo(() => {
    return pricingData.map((row) => ({
      ...row,
      ...(editedRows[row.week_start_date] || {}),
    }));
  }, [pricingData, editedRows]);

  const updateRow = (weekStart: string, field: keyof WeeklyPricing, value: number) => {
    setEditedRows((prev) => ({
      ...prev,
      [weekStart]: { ...(prev[weekStart] || {}), [field]: value },
    }));
  };

  // Generate weeks from today
  const handleGenerateWeeks = async () => {
    if (!user?.id || !selectedListingId) return;
    const listing = listings.find((l) => l.id === selectedListingId);
    const basePrice = listing?.base_price || 0;

    const today = new Date();
    const firstSaturday = startOfWeek(today, { weekStartsOn: 6 });
    const existingDates = new Set(pricingData.map((p) => p.week_start_date));

    const newRows: WeeklyPricing[] = [];
    for (let i = 0; i < weeksToGenerate; i++) {
      const weekStart = addWeeks(firstSaturday, i);
      const dateStr = format(weekStart, "yyyy-MM-dd");
      if (!existingDates.has(dateStr)) {
        newRows.push({
          listing_id: selectedListingId,
          host_user_id: user.id,
          week_start_date: dateStr,
          nightly_rate: basePrice,
          weekend_nightly_rate: basePrice,
          extra_night_weekend_rate: basePrice,
        });
      }
    }

    if (newRows.length === 0) {
      toast({ title: "Aucune semaine à ajouter", description: "Toutes les semaines existent déjà." });
      return;
    }

    const { error } = await supabase.from("listing_weekly_pricing").insert(newRows);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Semaines ajoutées", description: `${newRows.length} semaine(s) générée(s).` });
      queryClient.invalidateQueries({ queryKey: ["listing-weekly-pricing", selectedListingId] });
    }
  };

  // Save edited rows
  const handleSave = async () => {
    if (!user?.id || Object.keys(editedRows).length === 0) return;
    setSaving(true);

    try {
      for (const [weekStart, changes] of Object.entries(editedRows)) {
        const existing = pricingData.find((p) => p.week_start_date === weekStart);
        if (existing?.id) {
          const { error } = await supabase
            .from("listing_weekly_pricing")
            .update({ ...changes, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (error) throw error;
        }
      }
      toast({ title: "Tarifs sauvegardés" });
      setEditedRows({});
      queryClient.invalidateQueries({ queryKey: ["listing-weekly-pricing", selectedListingId] });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Delete a row
  const handleDeleteRow = async (id: string) => {
    const { error } = await supabase.from("listing_weekly_pricing").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["listing-weekly-pricing", selectedListingId] });
    }
  };

  // Download Excel template
  const handleDownloadTemplate = () => {
    const listing = listings.find((l) => l.id === selectedListingId);
    const templateData = [];
    const firstSaturday = startOfWeek(new Date(), { weekStartsOn: 6 });

    for (let i = 0; i < 52; i++) {
      const weekStart = addWeeks(firstSaturday, i);
      templateData.push({
        "Semaine du (samedi)": format(weekStart, "dd/MM/yyyy"),
        "Tarif nuit (semaine) €": listing?.base_price || 0,
        "Tarif nuit (week-end) €": listing?.base_price || 0,
        "Nuit supp. week-end €": listing?.base_price || 0,
      });
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 22 }, { wch: 24 }, { wch: 24 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tarifs");
    XLSX.writeFile(wb, `tarifs_${listing?.title || "bien"}.xlsx`);
  };

  // Import Excel
  const handleImportExcel = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user?.id || !selectedListingId) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = evt.target?.result;
          const wb = XLSX.read(data, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<any>(ws);

          const pricingRows: WeeklyPricing[] = [];

          for (const row of rows) {
            const dateRaw = row["Semaine du (samedi)"] || row["Semaine du (lundi)"];
            if (!dateRaw) continue;

            // Parse dd/MM/yyyy or Excel serial
            let weekStart: Date;
            if (typeof dateRaw === "number") {
              weekStart = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
            } else {
              const parts = dateRaw.split("/");
              if (parts.length === 3) {
                weekStart = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              } else {
                weekStart = new Date(dateRaw);
              }
            }

            // Align to Saturday
            weekStart = startOfWeek(weekStart, { weekStartsOn: 6 });

            const nightly = parseFloat(row["Tarif nuit (semaine) €"]) || 0;
            const weekend = parseFloat(row["Tarif nuit (week-end) €"]) || 0;
            const extra = parseFloat(row["Nuit supp. week-end €"]) || 0;

            pricingRows.push({
              listing_id: selectedListingId,
              host_user_id: user.id,
              week_start_date: format(weekStart, "yyyy-MM-dd"),
              nightly_rate: nightly,
              weekend_nightly_rate: weekend,
              extra_night_weekend_rate: extra,
            });
          }

          if (pricingRows.length === 0) {
            toast({ title: "Aucune donnée trouvée", variant: "destructive" });
            return;
          }

          // Upsert
          const { error } = await supabase
            .from("listing_weekly_pricing")
            .upsert(pricingRows, { onConflict: "listing_id,week_start_date" });

          if (error) throw error;

          toast({ title: "Import réussi", description: `${pricingRows.length} semaine(s) importée(s).` });
          queryClient.invalidateQueries({ queryKey: ["listing-weekly-pricing", selectedListingId] });
        } catch (err: any) {
          toast({ title: "Erreur d'import", description: err.message, variant: "destructive" });
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = "";
    },
    [user?.id, selectedListingId, queryClient, toast]
  );

  const hasEdits = Object.keys(editedRows).length > 0;

  return (
    <div className="space-y-6">
      {/* Listing selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tarifs hebdomadaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Bien</Label>
            <Select value={selectedListingId} onValueChange={(v) => { setSelectedListingId(v); setEditedRows({}); }}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un bien..." />
              </SelectTrigger>
              <SelectContent>
                {listings.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedListingId && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={weeksToGenerate}
                    onChange={(e) => setWeeksToGenerate(parseInt(e.target.value) || 12)}
                    className="w-20"
                  />
                  <Button variant="outline" onClick={handleGenerateWeeks}>
                    <Plus className="h-4 w-4 mr-2" />
                    Générer semaines
                  </Button>
                </div>

                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template Excel
                </Button>

                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Importer Excel
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
                  </label>
                </Button>

                {hasEdits && (
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pricing table */}
      {selectedListingId && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Chargement...</div>
            ) : displayData.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                <p>Aucun tarif configuré pour ce bien.</p>
                <p className="text-xs mt-1">Utilisez "Générer semaines" ou importez un fichier Excel.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semaine</TableHead>
                    <TableHead className="text-right">Nuit semaine (€)</TableHead>
                    <TableHead className="text-right">Nuit week-end (€)</TableHead>
                    <TableHead className="text-right">Nuit supp. WE (€)</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((row) => {
                    const weekDate = parseISO(row.week_start_date);
                    const weekNum = getISOWeek(weekDate);
                    const isEdited = !!editedRows[row.week_start_date];

                    return (
                      <TableRow key={row.week_start_date} className={isEdited ? "bg-accent/30" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">S{weekNum}</Badge>
                            <span className="text-sm">
                              {format(weekDate, "dd MMM yyyy", { locale: fr })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={row.nightly_rate}
                            onChange={(e) => updateRow(row.week_start_date, "nightly_rate", parseFloat(e.target.value) || 0)}
                            className="w-24 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={row.weekend_nightly_rate}
                            onChange={(e) => updateRow(row.week_start_date, "weekend_nightly_rate", parseFloat(e.target.value) || 0)}
                            className="w-24 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={row.extra_night_weekend_rate}
                            onChange={(e) => updateRow(row.week_start_date, "extra_night_weekend_rate", parseFloat(e.target.value) || 0)}
                            className="w-24 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell>
                          {row.id && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRow(row.id!)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
