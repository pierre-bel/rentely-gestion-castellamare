import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { format, parseISO, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { AvailabilityRule } from "@/pages/host/CreateListing";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface StepAvailabilityProps {
  formData: {
    availability_rules: AvailabilityRule[];
    base_price: number;
    currency?: string;
    title?: string;
  };
  updateFormData: (data: Partial<{ availability_rules: AvailabilityRule[] }>) => void;
  listingId?: string;
}

const StepAvailability = ({ formData, updateFormData, listingId }: StepAvailabilityProps) => {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();

  const hasValidRange = selectedRange?.from && selectedRange?.to;

  // Fetch existing bookings for this listing
  const { data: bookings = [] } = useQuery({
    queryKey: ["listing-bookings-availability", listingId],
    queryFn: async () => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("checkin_date, checkout_date, status, notes")
        .eq("listing_id", listingId)
        .not("status", "in", "(cancelled_guest,cancelled_host,expired)");
      if (error) throw error;
      return data || [];
    },
    enabled: !!listingId,
  });

  const isDateBooked = (date: Date): boolean => {
    return bookings.some((b) => {
      const checkin = parseISO(b.checkin_date);
      const checkout = parseISO(b.checkout_date);
      return isWithinInterval(date, { start: checkin, end: checkout });
    });
  };

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

  const isDateInRange = (date: Date, rule: AvailabilityRule) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return dateStr >= rule.startDate && dateStr <= rule.endDate;
  };

  const getDateStyle = (date: Date) => {
    for (const rule of formData.availability_rules) {
      if (isDateInRange(date, rule) && rule.price === null) return "blocked";
    }
    return "available";
  };

  const modifiers = {
    blocked: (date: Date) => getDateStyle(date) === "blocked",
    booked: (date: Date) => isDateBooked(date),
    available: (date: Date) => getDateStyle(date) === "available" && !isDateBooked(date),
  };

  const modifiersStyles = {
    blocked: { backgroundColor: "hsl(var(--calendar-blocked) / 0.3)", color: "hsl(var(--foreground))" },
    booked: { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontWeight: "600" },
    available: { backgroundColor: "hsl(var(--calendar-available) / 0.3)", color: "hsl(var(--foreground))" },
  };

  const rangeState = getSelectedRangeState();
  const blockButtonText = rangeState === 'all-blocked' ? 'Débloquer les dates' : 'Bloquer les dates';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-base text-foreground mb-6">
          Gérez la disponibilité de votre bien.
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
          <div className="w-4 h-4 rounded-full bg-primary" />
          <span className="text-muted-foreground">Réservé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-calendar-blocked/30" />
          <span className="text-muted-foreground">Bloqué</span>
        </div>
      </div>
    </div>
  );
};

export default StepAvailability;
