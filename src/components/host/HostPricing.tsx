import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, Download, Upload, Trash2, Plus, FileSpreadsheet, CalendarDays } from "lucide-react";
import { format, startOfWeek, addWeeks, parseISO, getISOWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface WeeklyPricing {
  id?: string;
  listing_id: string;
  host_user_id: string;
  week_start_date: string;
  weekly_rate: number;
  weekend_rate: number;
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
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [weeksToGenerate, setWeeksToGenerate] = useState(12);
  const [editedRows, setEditedRows] = useState<Record<string, Partial<WeeklyPricing>>>({});

  // School holidays state
  interface SchoolHoliday { id: string; label: string; start_date: string; end_date: string; }
  const [schoolHolidays, setSchoolHolidays] = useState<SchoolHoliday[]>([]);
  const [holidayLabel, setHolidayLabel] = useState("");
  const [holidayStart, setHolidayStart] = useState<Date | undefined>();
  const [holidayEnd, setHolidayEnd] = useState<Date | undefined>();
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayStartOpen, setHolidayStartOpen] = useState(false);
  const [holidayEndOpen, setHolidayEndOpen] = useState(false);

  // Fetch school holidays
  const { data: schoolHolidaysData = [] } = useQuery({
    queryKey: ["host-school-holidays", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("host_school_holidays")
        .select("*")
        .eq("host_user_id", user.id)
        .order("start_date");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  // Sync school holidays to state
  useState(() => {
    if (schoolHolidaysData.length > 0 && schoolHolidays.length === 0) {
      setSchoolHolidays(schoolHolidaysData.map((h: any) => ({
        id: h.id, label: h.label, start_date: h.start_date, end_date: h.end_date,
      })));
    }
  });

  // Keep state in sync with query data
  useMemo(() => {
    if (schoolHolidaysData.length > 0 || schoolHolidays.length > 0) {
      const mapped = schoolHolidaysData.map((h: any) => ({
        id: h.id, label: h.label, start_date: h.start_date, end_date: h.end_date,
      }));
      if (JSON.stringify(mapped) !== JSON.stringify(schoolHolidays)) {
        setSchoolHolidays(mapped);
      }
    }
  }, [schoolHolidaysData]);

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

  const allSelected = listings.length > 0 && selectedListingIds.length === listings.length;
  const primaryListingId = selectedListingIds[0] || "";

  const toggleListing = (id: string) => {
    setSelectedListingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setEditedRows({});
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedListingIds([]);
    } else {
      setSelectedListingIds(listings.map((l) => l.id));
    }
    setEditedRows({});
  };

  // Fetch weekly pricing for the first selected listing (reference grid)
  const { data: pricingData = [], isLoading } = useQuery({
    queryKey: ["listing-weekly-pricing", primaryListingId],
    queryFn: async () => {
      if (!primaryListingId) return [];
      const { data, error } = await supabase
        .from("listing_weekly_pricing")
        .select("*")
        .eq("listing_id", primaryListingId)
        .order("week_start_date");
      if (error) throw error;
      return data as WeeklyPricing[];
    },
    enabled: !!primaryListingId,
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

  // Generate weeks for all selected listings
  const handleGenerateWeeks = async () => {
    if (!user?.id || selectedListingIds.length === 0) return;

    const today = new Date();
    const firstSaturday = startOfWeek(today, { weekStartsOn: 6 });
    const existingDates = new Set(pricingData.map((p) => p.week_start_date));

    const newRows: WeeklyPricing[] = [];
    for (const listingId of selectedListingIds) {
      const listing = listings.find((l) => l.id === listingId);
      const basePrice = listing?.base_price || 0;
      // Default weekly = basePrice * 7, weekend = basePrice * 2
      const defaultWeekly = basePrice * 7;
      const defaultWeekend = basePrice * 2;

      for (let i = 0; i < weeksToGenerate; i++) {
        const weekStart = addWeeks(firstSaturday, i);
        const dateStr = format(weekStart, "yyyy-MM-dd");
        // For the primary listing, skip existing dates
        if (listingId === primaryListingId && existingDates.has(dateStr)) continue;

        newRows.push({
          listing_id: listingId,
          host_user_id: user.id,
          week_start_date: dateStr,
          weekly_rate: defaultWeekly,
          weekend_rate: defaultWeekend,
          extra_night_weekend_rate: basePrice,
        });
      }
    }

    if (newRows.length === 0) {
      toast({ title: "Aucune semaine à ajouter", description: "Toutes les semaines existent déjà." });
      return;
    }

    const { error } = await supabase
      .from("listing_weekly_pricing")
      .upsert(newRows, { onConflict: "listing_id,week_start_date" });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Semaines ajoutées", description: `${newRows.length} semaine(s) générée(s) pour ${selectedListingIds.length} bien(s).` });
      for (const id of selectedListingIds) {
        queryClient.invalidateQueries({ queryKey: ["listing-weekly-pricing", id] });
      }
    }
  };

  // Save edited rows to ALL selected listings
  const handleSave = async () => {
    if (!user?.id || Object.keys(editedRows).length === 0) return;
    setSaving(true);

    try {
      for (const listingId of selectedListingIds) {
        for (const [weekStart, changes] of Object.entries(editedRows)) {
          // Upsert for each listing
          const upsertData = {
            listing_id: listingId,
            host_user_id: user.id,
            week_start_date: weekStart,
            ...changes,
            updated_at: new Date().toISOString(),
          };

          if (listingId === primaryListingId) {
            const existing = pricingData.find((p) => p.week_start_date === weekStart);
            if (existing?.id) {
              const { error } = await supabase
                .from("listing_weekly_pricing")
                .update({ ...changes, updated_at: new Date().toISOString() })
                .eq("id", existing.id);
              if (error) throw error;
            }
          } else {
            // For other listings, update by listing_id + week_start_date
            const { error } = await supabase
              .from("listing_weekly_pricing")
              .update({ ...changes, updated_at: new Date().toISOString() })
              .eq("listing_id", listingId)
              .eq("week_start_date", weekStart);
            if (error) throw error;
          }
        }
      }
      toast({ title: "Tarifs sauvegardés", description: selectedListingIds.length > 1 ? `Appliqué à ${selectedListingIds.length} bien(s).` : undefined });
      setEditedRows({});
      for (const id of selectedListingIds) {
        queryClient.invalidateQueries({ queryKey: ["listing-weekly-pricing", id] });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Delete a row for all selected listings
  const handleDeleteRow = async (weekStartDate: string) => {
    for (const listingId of selectedListingIds) {
      const { error } = await supabase
        .from("listing_weekly_pricing")
        .delete()
        .eq("listing_id", listingId)
        .eq("week_start_date", weekStartDate);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
    }
    for (const id of selectedListingIds) {
      queryClient.invalidateQueries({ queryKey: ["listing-weekly-pricing", id] });
    }
  };

  // Download Excel template
  const handleDownloadTemplate = () => {
    const listing = listings.find((l) => l.id === primaryListingId);
    const basePrice = listing?.base_price || 0;
    const templateData = [];
    const firstSaturday = startOfWeek(new Date(), { weekStartsOn: 6 });

    for (let i = 0; i < 52; i++) {
      const weekStart = addWeeks(firstSaturday, i);
      templateData.push({
        "Semaine du (samedi)": format(weekStart, "dd/MM/yyyy"),
        "Tarif semaine (€)": basePrice * 7,
        "Tarif week-end (€)": basePrice * 2,
        "Nuit supp. WE (€)": basePrice,
      });
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tarifs");
    XLSX.writeFile(wb, `tarifs_${listing?.title || "bien"}.xlsx`);
  };

  // Import Excel
  const handleImportExcel = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user?.id || selectedListingIds.length === 0) return;

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

            weekStart = startOfWeek(weekStart, { weekStartsOn: 6 });

            const weekly = parseFloat(row["Tarif semaine (€)"] || row["Tarif semaine (€)"] || row["Tarif nuit (semaine) €"]) || 0;
            const weekend = parseFloat(row["Tarif week-end (€)"] || row["Tarif week-end (€)"] || row["Tarif nuit (week-end) €"]) || 0;
            const extra = parseFloat(row["Nuit supp. WE (€)"] || row["Nuit supp. week-end €"]) || 0;

            for (const listingId of selectedListingIds) {
              pricingRows.push({
                listing_id: listingId,
                host_user_id: user.id,
                week_start_date: format(weekStart, "yyyy-MM-dd"),
                weekly_rate: weekly,
                weekend_rate: weekend,
                extra_night_weekend_rate: extra,
              });
            }
          }

          if (pricingRows.length === 0) {
            toast({ title: "Aucune donnée trouvée", variant: "destructive" });
            return;
          }

          const { error } = await supabase
            .from("listing_weekly_pricing")
            .upsert(pricingRows, { onConflict: "listing_id,week_start_date" });

          if (error) throw error;

          toast({ title: "Import réussi", description: `${pricingRows.length} semaine(s) importée(s) pour ${selectedListingIds.length} bien(s).` });
          for (const id of selectedListingIds) {
            queryClient.invalidateQueries({ queryKey: ["listing-weekly-pricing", id] });
          }
        } catch (err: any) {
          toast({ title: "Erreur d'import", description: err.message, variant: "destructive" });
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = "";
    },
    [user?.id, selectedListingIds, queryClient, toast]
  );

  const hasEdits = Object.keys(editedRows).length > 0;
  const hasSelection = selectedListingIds.length > 0;

  return (
    <div className="space-y-6">
      {/* Listing selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Grille tarifaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-3 block">Appliquer à</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Tous les biens ({listings.length})
                </label>
              </div>
              <Separator />
              <div className="grid gap-2">
                {listings.map((l) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`listing-${l.id}`}
                      checked={selectedListingIds.includes(l.id)}
                      onCheckedChange={() => toggleListing(l.id)}
                    />
                    <label htmlFor={`listing-${l.id}`} className="text-sm cursor-pointer">
                      {l.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            {selectedListingIds.length > 1 && (
              <p className="text-xs text-muted-foreground mt-2">
                Les modifications seront appliquées aux {selectedListingIds.length} biens sélectionnés.
                La grille affichée est celle de « {listings.find((l) => l.id === primaryListingId)?.title} ».
              </p>
            )}
          </div>

          {hasSelection && (
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
                    {saving ? "Sauvegarde..." : `Sauvegarder${selectedListingIds.length > 1 ? ` (${selectedListingIds.length} biens)` : ""}`}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pricing table */}
      {hasSelection && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Chargement...</div>
            ) : displayData.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                <p>Aucun tarif configuré.</p>
                <p className="text-xs mt-1">Utilisez « Générer semaines » ou importez un fichier Excel.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semaine</TableHead>
                    <TableHead className="text-right">Semaine (€)</TableHead>
                    <TableHead className="text-right">Week-end (€)</TableHead>
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
                            step={1}
                            value={row.weekly_rate}
                            onChange={(e) => updateRow(row.week_start_date, "weekly_rate", parseFloat(e.target.value) || 0)}
                            className="w-24 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={row.weekend_rate}
                            onChange={(e) => updateRow(row.week_start_date, "weekend_rate", parseFloat(e.target.value) || 0)}
                            className="w-24 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={row.extra_night_weekend_rate}
                            onChange={(e) => updateRow(row.week_start_date, "extra_night_weekend_rate", parseFloat(e.target.value) || 0)}
                            className="w-24 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRow(row.week_start_date)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
