import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Copy, Check, Code } from "lucide-react";
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

  const getBookingType = (date: Date): 'checkin' | 'checkout' | 'middle' | 'single' | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    let isCheckin = false;
    let isCheckout = false;

    for (const b of bookings) {
      if (b.checkin_date === dateStr) isCheckin = true;
      if (b.checkout_date === dateStr) isCheckout = true;
    }

    if (isCheckin && isCheckout) return 'single'; // turnover day
    if (isCheckin) return 'checkin';
    if (isCheckout) return 'checkout';

    // Check if it's a middle day
    for (const b of bookings) {
      const checkin = parseISO(b.checkin_date);
      const checkout = parseISO(b.checkout_date);
      if (isWithinInterval(date, { start: checkin, end: checkout })) return 'middle';
    }
    return null;
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
    bookedCheckin: (date: Date) => getBookingType(date) === 'checkin',
    bookedCheckout: (date: Date) => getBookingType(date) === 'checkout',
    bookedMiddle: (date: Date) => getBookingType(date) === 'middle',
    bookedTurnover: (date: Date) => getBookingType(date) === 'single',
    available: (date: Date) => getDateStyle(date) === "available" && getBookingType(date) === null,
  };

  const modifiersStyles = {
    blocked: { backgroundColor: "hsl(var(--calendar-blocked) / 0.3)", color: "hsl(var(--foreground))" },
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
          modifiersClassNames={{
            bookedCheckin: "day-booked-checkin",
            bookedCheckout: "day-booked-checkout",
            bookedMiddle: "day-booked-middle",
            bookedTurnover: "day-booked-turnover",
          }}
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

      {/* Embed code section */}
      {listingId && <EmbedCodeSection listingId={listingId} />}
    </div>
  );
};

function EmbedCodeSection({ listingId }: { listingId: string }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/embed/availability/${listingId}`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="450" frameborder="0" style="border:none;border-radius:12px;max-width:640px;" title="Disponibilités"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
      <div className="flex items-center gap-2">
        <Code className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">Intégrer ce calendrier sur un site externe</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Copiez le code ci-dessous et collez-le dans le HTML de votre site pour afficher le calendrier de disponibilité en temps réel.
      </p>
      <div className="relative">
        <pre className="bg-card border rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
          {iframeCode}
        </pre>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute top-2 right-2 h-7 gap-1.5 text-xs"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copié" : "Copier"}
        </Button>
      </div>
    </div>
  );
}

export default StepAvailability;
