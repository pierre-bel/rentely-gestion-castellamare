import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, differenceInDays, addDays, isWithinInterval, parseISO, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Users, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AuthDialog } from "@/components/AuthDialog";
import GuestDebtPaymentDialog from "@/components/guest/GuestDebtPaymentDialog";
import type { DateRange } from "react-day-picker";
import { useDemoData } from "@/hooks/useDemoData";
interface BookingWidgetProps {
  listing: {
    id: string;
    base_price: number;
    cleaning_fee: number;
    min_nights: number;
    max_nights: number;
    guests_max: number;
    cancellation_policy_id: string;
    weekly_discount: number;
    monthly_discount: number;
  };
}
interface AvailabilityRule {
  id: string;
  start_date: string;
  end_date: string;
  price: number | null;
}
interface BookedDate {
  checkin_date: string;
  checkout_date: string;
}
const BookingWidget = ({
  listing
}: BookingWidgetProps) => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [searchParams] = useSearchParams();
  const { isDemoMode, addBooking, addTransaction } = useDemoData();
  
  // Initialize dateRange from URL parameters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const checkInParam = searchParams.get("checkIn");
    const checkOutParam = searchParams.get("checkOut");
    
    if (checkInParam && checkOutParam) {
      try {
        return {
          from: new Date(checkInParam),
          to: new Date(checkOutParam)
        };
      } catch (e) {
        console.error("Invalid date parameters:", e);
      }
    }
    return undefined;
  });
  
  // Initialize guests from URL parameters
  const [guests, setGuests] = useState(() => {
    const guestsParam = searchParams.get("guests");
    if (guestsParam) {
      const parsedGuests = parseInt(guestsParam);
      if (!isNaN(parsedGuests) && parsedGuests > 0) {
        return parsedGuests;
      }
    }
    return 1;
  });
  const [loading, setLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [bookedDates, setBookedDates] = useState<BookedDate[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [debtPaymentDialogOpen, setDebtPaymentDialogOpen] = useState(false);
  const [guestServiceFeeRate, setGuestServiceFeeRate] = useState(0.08);
  const [taxRate, setTaxRate] = useState(0.10);
  const [ratesLoading, setRatesLoading] = useState(true);
  const checkIn = dateRange?.from;
  const checkOut = dateRange?.to;

  // Fetch platform rates
  useEffect(() => {
    const fetchRates = async () => {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["default_guest_service_fee_rate", "default_tax_rate"])
        .eq("is_active", true);

      if (settings) {
        const serviceFeeRate = settings.find(s => s.setting_key === "default_guest_service_fee_rate");
        const taxRateData = settings.find(s => s.setting_key === "default_tax_rate");
        
        if (serviceFeeRate) setGuestServiceFeeRate(parseFloat(serviceFeeRate.setting_value));
        if (taxRateData) setTaxRate(parseFloat(taxRateData.setting_value));
      }
      setRatesLoading(false);
    };
    fetchRates();
  }, []);

  // Fetch availability data and existing bookings
  useEffect(() => {
    const fetchAvailabilityData = async () => {
      setAvailabilityLoading(true);

      // Fetch availability rules
      const {
        data: availData,
        error: availError
      } = await supabase.from("listing_availability").select("*").eq("listing_id", listing.id).order("start_date", {
        ascending: true
      });
      if (!availError && availData) {
        setAvailabilityRules(availData);
      }

      // Fetch existing bookings
      const {
        data: bookingData,
        error: bookingError
      } = await supabase.from("bookings").select("checkin_date, checkout_date").eq("listing_id", listing.id).in("status", ["confirmed", "pending_payment", "completed"]);
      if (!bookingError && bookingData) {
        setBookedDates(bookingData);
      }
      setAvailabilityLoading(false);
    };
    fetchAvailabilityData();
  }, [listing.id]);

  // Check if a date is unavailable (blocked or booked)
  const isDateUnavailable = (date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");

    // Check against availability rules where price is null (blocked dates)
    const isBlocked = availabilityRules.some(rule => {
      if (rule.price !== null) return false; // Not a blocked date
      const ruleStart = parseISO(rule.start_date);
      const ruleEnd = parseISO(rule.end_date);
      return isWithinInterval(date, {
        start: ruleStart,
        end: ruleEnd
      });
    });
    if (isBlocked) return true;

    // Check against existing bookings
    const isBooked = bookedDates.some(booking => {
      const bookingStart = parseISO(booking.checkin_date);
      const bookingEnd = parseISO(booking.checkout_date);
      // Date is unavailable if it's within the booking range (inclusive of check-in, exclusive of check-out)
      return date >= bookingStart && date < bookingEnd;
    });
    return isBooked;
  };

  // Check if a date is isolated (not enough consecutive available days for min_nights)
  const isDateIsolated = (date: Date): boolean => {
    // If date is already unavailable, it's not isolated (it's just unavailable)
    if (isDateUnavailable(date)) return false;
    
    // Check if there are enough consecutive available dates starting from this date
    // to meet the minimum nights requirement
    let consecutiveAvailableDays = 0;
    let currentDate = new Date(date);
    
    // We need at least min_nights + 1 days (check-in + min_nights to check-out)
    const requiredDays = listing.min_nights + 1;
    
    for (let i = 0; i < requiredDays; i++) {
      if (isDateUnavailable(currentDate)) {
        break;
      }
      consecutiveAvailableDays++;
      currentDate = addDays(currentDate, 1);
    }
    
    // If we don't have enough consecutive available days, this date is isolated
    return consecutiveAvailableDays < requiredDays;
  };

  // Check if range contains any unavailable dates
  const hasUnavailableDateInRange = (start: Date, end: Date): boolean => {
    let currentDate = new Date(start);
    while (currentDate < end) {
      if (isDateUnavailable(currentDate)) {
        return true;
      }
      currentDate = addDays(currentDate, 1);
    }
    return false;
  };

  // Calculate subtotal with custom pricing AND discounts
  const calculateSubtotalWithDiscounts = (start: Date, end: Date): {
    subtotal: number;
    baseNightsTotal: number;
    customNightsTotal: number;
    baseNightsCount: number;
    discountApplied: number;
    discountAmount: number;
  } => {
    let baseNightsTotal = 0;
    let customNightsTotal = 0;
    let baseNightsCount = 0;
    
    let currentDate = new Date(start);
    while (currentDate < end) {
      // Find custom price for this date
      const customPriceRule = availabilityRules.find(rule => {
        if (rule.price === null) return false;
        const ruleStart = parseISO(rule.start_date);
        const ruleEnd = parseISO(rule.end_date);
        return isWithinInterval(currentDate, {
          start: ruleStart,
          end: ruleEnd
        });
      });
      
      if (customPriceRule?.price) {
        customNightsTotal += customPriceRule.price;
      } else {
        baseNightsTotal += listing.base_price;
        baseNightsCount++;
      }
      
      currentDate = addDays(currentDate, 1);
    }
    
    // Determine which discount applies
    let discountRate = 0;
    const totalNights = differenceInDays(end, start);
    
    if (totalNights >= 30 && listing.monthly_discount > 0) {
      discountRate = listing.monthly_discount / 100;
    } else if (totalNights >= 7 && listing.weekly_discount > 0) {
      discountRate = listing.weekly_discount / 100;
    }
    
    // Apply discount ONLY to base-price nights
    const discountAmount = baseNightsTotal * discountRate;
    const subtotal = customNightsTotal + baseNightsTotal - discountAmount;
    
    return {
      subtotal,
      baseNightsTotal,
      customNightsTotal,
      baseNightsCount,
      discountApplied: discountRate,
      discountAmount
    };
  };
  
  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  
  const pricingBreakdown = checkIn && checkOut 
    ? calculateSubtotalWithDiscounts(checkIn, checkOut)
    : { 
        subtotal: 0, 
        baseNightsTotal: 0, 
        customNightsTotal: 0, 
        baseNightsCount: 0,
        discountApplied: 0,
        discountAmount: 0 
      };

  const subtotal = pricingBreakdown.subtotal;
  const serviceFee = subtotal * guestServiceFeeRate;
  const taxes = (subtotal + listing.cleaning_fee + serviceFee) * taxRate;
  const totalPrice = subtotal + listing.cleaning_fee + serviceFee + taxes;

  // Handle date range selection
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      setDateRange(range);
      return;
    }

    // If only start date is selected
    if (!range.to) {
      setDateRange(range);
      return;
    }

    // Both dates selected - validate
    const from = range.from;
    const to = range.to;

    // Check if range contains unavailable dates
    if (hasUnavailableDateInRange(from, to)) {
      toast({
        title: "Invalid selection",
        description: "Your selected dates contain unavailable dates. Please choose different dates.",
        variant: "destructive"
      });
      return;
    }

    // Validate minimum nights
    const selectedNights = differenceInDays(to, from);
    if (selectedNights < listing.min_nights) {
      toast({
        title: "Minimum stay required",
        description: `This property requires a minimum stay of ${listing.min_nights} nights`,
        variant: "destructive"
      });
      return;
    }

    // Validate maximum nights
    if (listing.max_nights && selectedNights > listing.max_nights) {
      toast({
        title: "Maximum stay exceeded",
        description: `This property allows a maximum stay of ${listing.max_nights} nights`,
        variant: "destructive"
      });
      return;
    }
    setDateRange(range);
  };
  const handleBooking = async () => {
    if (!user) {
      // Store booking info in localStorage for after login
      localStorage.setItem(
        "pendingBooking",
        JSON.stringify({
          listingId: listing.id,
          checkin: dateRange?.from,
          checkout: dateRange?.to,
          guests,
        })
      );
      setAuthDialogOpen(true);
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Invalid dates",
        description: "Please select check-in and check-out dates",
        variant: "destructive",
      });
      return;
    }

    // Final validations before booking
    const start = dateRange.from;
    const end = dateRange.to;
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Check minimum nights
    if (listing.min_nights && nights < listing.min_nights) {
      toast({
        title: "Minimum stay required",
        description: `This property requires a minimum stay of ${listing.min_nights} nights`,
        variant: "destructive",
      });
      return;
    }

    // Check maximum nights
    if (listing.max_nights && nights > listing.max_nights) {
      toast({
        title: "Maximum stay exceeded",
        description: `This property allows a maximum stay of ${listing.max_nights} nights`,
        variant: "destructive",
      });
      return;
    }


    // Check for unavailable dates in the range
    if (hasUnavailableDateInRange(start, end)) {
      toast({
        title: "Dates unavailable",
        description: "Some dates in your selection are unavailable",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isDemoMode && user) {
        // Demo mode: Fetch full listing data and cancellation policy
        const { data: fullListing, error: listingError } = await supabase
          .from('listings')
          .select('id, title, address, city, state, country, cover_image, base_price, checkin_from, checkout_until, type, size_sqft, guests_max, beds, bedrooms, bathrooms, host_user_id, cancellation_policy_id')
          .eq('id', listing.id)
          .single();

        if (listingError || !fullListing) {
          throw new Error("Could not load listing details");
        }

        // Fetch cancellation policy
        const { data: policyData, error: policyError } = await supabase
          .from('cancellation_policies')
          .select('policy_key, name, description, refund_percentage, days_before_checkin')
          .eq('id', fullListing.cancellation_policy_id)
          .single();

        if (policyError || !policyData) {
          throw new Error("Could not load cancellation policy");
        }

        const bookingId = `demo-booking-${Date.now()}`;
        const newBooking = {
          id: bookingId,
          listing_id: listing.id,
          guest_user_id: user.id,
          status: "pending_payment",
          checkin_date: format(dateRange.from, "yyyy-MM-dd"),
          checkout_date: format(dateRange.to, "yyyy-MM-dd"),
          nights: nights,
          guests: guests,
          subtotal: subtotal,
          cleaning_fee: listing.cleaning_fee,
          service_fee: serviceFee,
          taxes: taxes,
          total_price: totalPrice,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          cancellation_policy_snapshot: {
            policy_key: policyData.policy_key,
            name: policyData.name,
            description: policyData.description,
            refund_percentage: policyData.refund_percentage,
            days_before_checkin: policyData.days_before_checkin
          },
          pricing_breakdown: {
            base_nights_count: pricingBreakdown.baseNightsCount,
            base_nights_total: pricingBreakdown.baseNightsTotal,
            custom_nights_count: nights - pricingBreakdown.baseNightsCount,
            custom_nights_total: pricingBreakdown.customNightsTotal,
            discount_type: pricingBreakdown.discountApplied > 0 
              ? (nights >= 30 ? 'monthly' : 'weekly')
              : null,
            discount_rate: pricingBreakdown.discountApplied,
            discount_amount: pricingBreakdown.discountAmount
          },
          listings: fullListing
        };

        addBooking(newBooking);

        toast({
          title: "Success!",
          description: "Proceeding to checkout...",
        });

        navigate(`/checkout?bookingId=${bookingId}`);
      } else {
        // Real user: Use RPC
        const { data: result, error } = await supabase.rpc(
          "create_booking_with_financial_snapshot",
          {
            p_listing_id: listing.id,
            p_checkin_date: format(dateRange.from, "yyyy-MM-dd"),
            p_checkout_date: format(dateRange.to, "yyyy-MM-dd"),
            p_guests: guests,
            p_subtotal: subtotal,
            p_cleaning_fee: listing.cleaning_fee,
            p_nights_breakdown: {
              base_nights: pricingBreakdown.baseNightsCount,
              base_total: pricingBreakdown.baseNightsTotal,
              custom_total: pricingBreakdown.customNightsTotal
            },
            p_pricing_breakdown: {
              base_nights_count: pricingBreakdown.baseNightsCount,
              base_nights_total: pricingBreakdown.baseNightsTotal,
              custom_nights_count: nights - pricingBreakdown.baseNightsCount,
              custom_nights_total: pricingBreakdown.customNightsTotal,
              discount_type: pricingBreakdown.discountApplied > 0 
                ? (nights >= 30 ? 'monthly' : 'weekly')
                : null,
              discount_rate: pricingBreakdown.discountApplied,
              discount_amount: pricingBreakdown.discountAmount
            }
          }
        );

        if (error) {
          console.log("Booking error detected:", error);
          console.log("Error message:", error.message);
          console.log("Checking for OUTSTANDING_DEBT:", error.message?.includes("OUTSTANDING_DEBT::"));
          
          // Check if error is due to outstanding debt
          if (error.message && error.message.includes("OUTSTANDING_DEBT::")) {
            console.log("Opening debt payment dialog");
            setDebtPaymentDialogOpen(true);
            setLoading(false);
            return;
          }
          throw error;
        }

        // RPC function returns { booking_id, status }
        const typedResult = result as {
          booking_id?: string;
          status?: string;
        };

        if (!typedResult?.booking_id) {
          throw new Error("Failed to create booking - no booking ID returned");
        }

        toast({
          title: "Success!",
          description: "Proceeding to checkout...",
        });

        // Navigate to checkout page for payment
        navigate(`/checkout?bookingId=${typedResult.booking_id}`);
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return <>
    <GuestDebtPaymentDialog
      open={debtPaymentDialogOpen}
      onOpenChange={setDebtPaymentDialogOpen}
      onPaymentSuccess={() => {
        setDebtPaymentDialogOpen(false);
        toast({
          title: "Payment Successful",
          description: "Your debt has been paid. You can now proceed with your booking.",
        });
      }}
    />
    <Card className="bg-[#F8FAFF]">
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2">
          <span className="text-2xl">${listing.base_price}</span>
          <span className="text-base font-normal text-muted-foreground">/ night</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unified Date Range Picker */}
        <div>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <div className="bg-white border border-[#D5DAE7] rounded-lg grid grid-cols-2 divide-x divide-[#D5DAE7] cursor-pointer overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="flex flex-col gap-2 flex-1">
                    <Label className="text-sm font-medium">Check-in</Label>
                    <div className={cn("text-sm", !checkIn && "text-muted-foreground")}>
                      {checkIn ? format(checkIn, "MMM dd, yyyy") : "Select date"}
                    </div>
                  </div>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="flex flex-col gap-2 flex-1">
                    <Label className="text-sm font-medium">Check-out</Label>
                    <div className={cn("text-sm", !checkOut && "text-muted-foreground")}>
                      {checkOut ? format(checkOut, "MMM dd, yyyy") : "Select date"}
                    </div>
                  </div>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              {availabilityLoading ? <div className="p-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div> : <div className="p-0">
                  <Calendar mode="range" selected={dateRange} onSelect={handleDateRangeSelect} disabled={date => {
                // Disable past dates
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (date < today) return true;

                // Disable unavailable dates
                if (isDateUnavailable(date)) return true;

                // Disable isolated dates
                return isDateIsolated(date);
              }} numberOfMonths={2} initialFocus className="pointer-events-auto" modifiers={{
                unavailable: date => isDateUnavailable(date),
                isolated: date => isDateIsolated(date)
              }} modifiersClassNames={{
                unavailable: "unavailable-date",
                isolated: "unavailable-date"
              }} />
                  {/* Legend */}
                  <div className="p-3 border-t bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Selected range</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full bg-muted line-through" />
                      <span className="text-muted-foreground">Unavailable</span>
                    </div>
                  </div>
                </div>}
            </PopoverContent>
          </Popover>
          {listing.min_nights > 1 && <p className="text-xs text-muted-foreground mt-2">
              Minimum stay: {listing.min_nights} nights
            </p>}
        </div>


        {/* Price Breakdown */}
        {nights > 0 && <div className="space-y-2 pt-2">
            {/* Show detailed breakdown when custom pricing exists */}
            {pricingBreakdown.customNightsTotal > 0 ? (
              <>
                {pricingBreakdown.baseNightsCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>${listing.base_price} × {pricingBreakdown.baseNightsCount} {pricingBreakdown.baseNightsCount === 1 ? 'night' : 'nights'}</span>
                    <span>${pricingBreakdown.baseNightsTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Custom rate × {nights - pricingBreakdown.baseNightsCount} {(nights - pricingBreakdown.baseNightsCount) === 1 ? 'night' : 'nights'}</span>
                  <span>${pricingBreakdown.customNightsTotal.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm">
                <span>${listing.base_price} × {nights} {nights === 1 ? 'night' : 'nights'}</span>
                <span>${pricingBreakdown.baseNightsTotal.toFixed(2)}</span>
              </div>
            )}
            
            {/* Discount */}
            {pricingBreakdown.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  {Math.round(pricingBreakdown.discountApplied * 100)}% {nights >= 30 ? 'Monthly' : 'Weekly'} discount
                </span>
                <span>-${pricingBreakdown.discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span>Cleaning fee</span>
              <span>${listing.cleaning_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Service fee</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Taxes</span>
              <span>${taxes.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>}

        <Button onClick={handleBooking} disabled={loading || !checkIn || !checkOut || nights < listing.min_nights} className="w-full" size="lg">
          {loading ? <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming...
            </> : "Reserve"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">You will not be charged yet</p>
      </CardContent>
      
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </Card>
  </>;
};
export default BookingWidget;