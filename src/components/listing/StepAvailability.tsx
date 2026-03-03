import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AvailabilityRule } from "@/pages/host/CreateListing";
import { Input } from "@/components/ui/input";

interface StepAvailabilityProps {
  formData: {
    availability_rules: AvailabilityRule[];
    base_price: number;
    currency?: string;
    title?: string;
  };
  updateFormData: (data: Partial<{ availability_rules: AvailabilityRule[] }>) => void;
}

const StepAvailability = ({ formData, updateFormData }: StepAvailabilityProps) => {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [newPrice, setNewPrice] = useState("");

  const hasValidRange = selectedRange?.from && selectedRange?.to;

  const getSelectedRangeState = (): 'all-blocked' | 'all-available' | 'mixed' | 'none' => {
    if (!hasValidRange) return 'none';
    
    const dates = getDatesInRange(selectedRange.from!, selectedRange.to!);
    const blockedCount = dates.filter(date => getDateStyle(date) === 'blocked').length;
    
    if (blockedCount === dates.length) return 'all-blocked';
    if (blockedCount === 0) return 'all-available';
    return 'mixed';
  };

  const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return format(date, "yyyy-MM-dd");
  };

  const handleBlockDates = () => {
    if (!hasValidRange) return;

    const startStr = format(selectedRange.from, "yyyy-MM-dd");
    const endStr = format(selectedRange.to, "yyyy-MM-dd");
    const rangeState = getSelectedRangeState();

    if (rangeState === 'all-blocked') {
      const newRules: AvailabilityRule[] = [];
      const rulesToRemove: string[] = [];

      formData.availability_rules.forEach(rule => {
        const overlaps = rule.startDate <= endStr && rule.endDate >= startStr;
        const isBlockingRule = rule.price === null;

        if (overlaps && isBlockingRule) {
          rulesToRemove.push(rule.id);
          if (rule.startDate < startStr) {
            newRules.push({ id: crypto.randomUUID(), startDate: rule.startDate, endDate: addDays(startStr, -1), price: null });
          }
          if (rule.endDate > endStr) {
            newRules.push({ id: crypto.randomUUID(), startDate: addDays(endStr, 1), endDate: rule.endDate, price: null });
          }
        }
      });

      updateFormData({
        availability_rules: formData.availability_rules.filter(rule => !rulesToRemove.includes(rule.id)).concat(newRules),
      });
    } else {
      const filteredRules = formData.availability_rules.filter(rule => !(rule.startDate <= endStr && rule.endDate >= startStr));
      updateFormData({
        availability_rules: [...filteredRules, { id: crypto.randomUUID(), startDate: startStr, endDate: endStr, price: null }],
      });
    }

    setSelectedRange(undefined);
  };

  const getDatesInRange = (from: Date, to: Date): Date[] => {
    const dates: Date[] = [];
    const current = new Date(from);
    while (current <= to) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const getPriceForDate = (date: Date): number => {
    const dateStr = format(date, "yyyy-MM-dd");
    for (const rule of formData.availability_rules) {
      if (dateStr >= rule.startDate && dateStr <= rule.endDate && rule.price !== null) return rule.price;
    }
    return formData.base_price;
  };

  const checkConsistentPricing = (): { isConsistent: boolean; price?: number } => {
    if (!hasValidRange) return { isConsistent: false };
    const dates = getDatesInRange(selectedRange.from!, selectedRange.to!);
    const prices = dates.map(date => getPriceForDate(date));
    const uniquePrices = [...new Set(prices)];
    return uniquePrices.length === 1 ? { isConsistent: true, price: uniquePrices[0] } : { isConsistent: false };
  };

  const handleOpenPricingModal = () => {
    const { isConsistent, price } = checkConsistentPricing();
    setNewPrice(isConsistent && price !== undefined ? price.toString() : "");
    setIsPricingModalOpen(true);
  };

  const handleConfirmPricing = () => {
    if (!hasValidRange || !newPrice) return;
    const priceValue = parseFloat(newPrice);
    if (isNaN(priceValue) || priceValue <= 0) return;

    const startStr = format(selectedRange.from, "yyyy-MM-dd");
    const endStr = format(selectedRange.to, "yyyy-MM-dd");

    const newRules: AvailabilityRule[] = [];
    const rulesToRemove: string[] = [];

    formData.availability_rules.forEach(rule => {
      const overlaps = rule.startDate <= endStr && rule.endDate >= startStr;
      if (overlaps) {
        rulesToRemove.push(rule.id);
        if (rule.price !== null) {
          if (rule.startDate < startStr) newRules.push({ id: crypto.randomUUID(), startDate: rule.startDate, endDate: addDays(startStr, -1), price: rule.price });
          if (rule.endDate > endStr) newRules.push({ id: crypto.randomUUID(), startDate: addDays(endStr, 1), endDate: rule.endDate, price: rule.price });
        }
      }
    });

    updateFormData({
      availability_rules: formData.availability_rules.filter(rule => !rulesToRemove.includes(rule.id)).concat([...newRules, { id: crypto.randomUUID(), startDate: startStr, endDate: endStr, price: priceValue }]),
    });

    setSelectedRange(undefined);
    setIsPricingModalOpen(false);
    setNewPrice("");
  };

  const isDateInRange = (date: Date, rule: AvailabilityRule) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return dateStr >= rule.startDate && dateStr <= rule.endDate;
  };

  const getDateStyle = (date: Date) => {
    for (const rule of formData.availability_rules) {
      if (isDateInRange(date, rule)) return rule.price === null ? "blocked" : "custom-price";
    }
    return "available";
  };

  const modifiers = {
    blocked: (date: Date) => getDateStyle(date) === "blocked",
    customPrice: (date: Date) => getDateStyle(date) === "custom-price",
    available: (date: Date) => getDateStyle(date) === "available",
  };

  const modifiersStyles = {
    blocked: { backgroundColor: "hsl(var(--calendar-blocked) / 0.3)", color: "hsl(var(--foreground))" },
    customPrice: { backgroundColor: "hsl(38 92% 50% / 0.3)", color: "hsl(var(--foreground))", fontWeight: "600" },
    available: { backgroundColor: "hsl(var(--calendar-available) / 0.3)", color: "hsl(var(--foreground))" },
  };

  const rangeState = getSelectedRangeState();
  const blockButtonText = rangeState === 'all-blocked' ? 'Débloquer les dates' : 'Bloquer les dates';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-base text-foreground mb-6">
          Gérez la disponibilité et les tarifs de votre bien.
        </p>
      </div>

      <div className="flex justify-between items-center gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground font-normal">Annonce</p>
          <p className="text-base font-semibold text-foreground">{formData.title || "Annonce sans titre"}</p>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!hasValidRange} onClick={handleBlockDates} className="rounded-full">
            {blockButtonText}
          </Button>
          <Button type="button" variant="outline" disabled={!hasValidRange} onClick={handleOpenPricingModal} className="rounded-full">
            Modifier le tarif
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={setSelectedRange}
          numberOfMonths={2}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          className="rounded-xl border"
        />
      </div>

      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-calendar-available/30" />
          <span className="text-muted-foreground">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-calendar-blocked/30" />
          <span className="text-muted-foreground">Bloqué</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "hsl(38 92% 50% / 0.3)" }} />
          <span className="text-muted-foreground">Tarif personnalisé</span>
        </div>
      </div>

      <Dialog open={isPricingModalOpen} onOpenChange={setIsPricingModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Modifier le tarif</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Dates sélectionnées</p>
                <p className="text-base font-semibold">
                  {hasValidRange && `${format(selectedRange.from, "d MMM", { locale: fr })}-${format(selectedRange.to, "d MMM yyyy", { locale: fr })}`}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Tarif de base / nuit</p>
                <p className="text-base font-semibold">{formData.base_price.toFixed(2)} €</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="number"
                  placeholder=" "
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  min="1"
                  step="0.01"
                  className="peer h-14 rounded-full pl-10 pr-6 border-[#D5DAE7] bg-white text-base placeholder-transparent focus:outline-none focus-visible:ring-0 focus:ring-0 focus:ring-offset-0 focus:border-primary"
                />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-base text-foreground pointer-events-none z-10">
                  €
                </span>
                <label className="absolute left-10 top-1/2 -translate-y-1/2 text-base text-muted-foreground transition-all duration-200 pointer-events-none peer-focus:top-0 peer-focus:left-4 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
                  Nouveau tarif / nuit
                </label>
              </div>
              {!checkConsistentPricing().isConsistent && (
                <p className="text-xs text-muted-foreground pl-4">
                  Le nouveau tarif s'appliquera à toute la plage sélectionnée.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => { setIsPricingModalOpen(false); setNewPrice(""); }} className="rounded-full px-8">
              Annuler
            </Button>
            <Button type="button" onClick={handleConfirmPricing} disabled={!newPrice || parseFloat(newPrice) <= 0} className="rounded-full px-8">
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StepAvailability;
