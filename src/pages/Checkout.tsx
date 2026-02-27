import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FormInput from "@/components/listing/FormInput";
import FormPhoneInput from "@/components/listing/FormPhoneInput";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useDemoData } from "@/hooks/useDemoData";

interface Listing {
  id: string;
  title: string;
  base_price: number;
  cleaning_fee: number;
  cover_image: string;
  city: string;
  state: string;
  country: string;
  cancellation_policy_id: string;
  cancellation_policy: {
    name: string;
  };
}

interface AvailabilityRule {
  start_date: string;
  end_date: string;
  price: number | null;
}

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isDemoMode, getBooking, updateBooking, addTransaction } = useDemoData();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1 = Contact Info, 2 = Payment Info

  // Contact Information fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Payment Information fields
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [cvc, setCvc] = useState("");
  
  // Validation errors
  const [cardNumberError, setCardNumberError] = useState("");
  const [expirationDateError, setExpirationDateError] = useState("");
  const [cvcError, setCvcError] = useState("");
  
  // Billing Address fields
  const [billingCountry, setBillingCountry] = useState("United States");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [billingState, setBillingState] = useState("");

  // Booking details from URL params
  const bookingId = searchParams.get("bookingId");

  // Booking data
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    if (!bookingId) {
      toast({
        title: "Invalid booking",
        description: "Missing booking details. Please try again.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchData();
  }, [user, bookingId]);

  const fetchData = async () => {
    setLoading(true);

    try {
      let bookingData;
      
      if (isDemoMode && user) {
        // Demo mode: Get booking from localStorage
        bookingData = getBooking(bookingId!);
        
        if (!bookingData) {
          throw new Error("Booking not found in demo storage");
        }
        
        // Verify booking belongs to current user
        if (bookingData.guest_user_id !== user.id) {
          toast({
            title: "Error",
            description: "Unauthorized access to this booking",
            variant: "destructive",
          });
          navigate("/");
          return;
        }
        
        // Check if booking is in the correct state
        if (bookingData.status !== "pending_payment") {
          if (bookingData.status === "confirmed") {
            navigate(`/booking-confirmation/${bookingId}`);
            return;
          }
          toast({
            title: "Error",
            description: `This booking is ${bookingData.status} and cannot be completed`,
            variant: "destructive",
          });
          navigate("/");
          return;
        }
        
        setBooking(bookingData);
      } else {
        // Real user: Fetch from DB
        const { data: fetchedBooking, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .single();

        if (bookingError) throw bookingError;

        // Verify booking belongs to current user
        if (fetchedBooking.guest_user_id !== user?.id) {
          toast({
            title: "Error",
            description: "Unauthorized access to this booking",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        // Check if booking is in the correct state
        if (fetchedBooking.status !== "pending_payment") {
          if (fetchedBooking.status === "confirmed") {
            navigate(`/booking-confirmation/${bookingId}`);
            return;
          }
          toast({
            title: "Error",
            description: `This booking is ${fetchedBooking.status} and cannot be completed`,
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        bookingData = fetchedBooking;
        setBooking(bookingData);
      }

      // Fetch listing details with cancellation policy
      let listingData;
      
      if (isDemoMode && bookingData.listings) {
        // Demo mode: Use listing data from booking
        listingData = {
          ...bookingData.listings,
          cancellation_policy: { name: "Flexible" } // Default for demo
        };
      } else {
        // Real user: Fetch from DB
        const { data, error: listingError } = await supabase
          .from("listings")
          .select(`
            *,
            cancellation_policy:cancellation_policies(name)
          `)
          .eq("id", bookingData.listing_id)
          .single();

        if (listingError || !data) {
          toast({
            title: "Error",
            description: "Failed to load listing details",
            variant: "destructive",
          });
          navigate("/");
          return;
        }
        
        listingData = data;
      }

      setListing(listingData);

      // Fetch user profile to pre-fill contact info
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, phone")
        .eq("id", user?.id)
        .single();

      if (profileData) {
        setFirstName(profileData.first_name || "");
        setLastName(profileData.last_name || "");
        setEmail(profileData.email || "");
        setPhone(profileData.phone || "");
      }

      setLoading(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load booking",
        variant: "destructive",
      });
      navigate("/");
    }
  };


  // Luhn algorithm for card validation with test card support
  const validateCardNumber = (cardNum: string): boolean => {
    const cleaned = cardNum.replace(/\D/g, '');
    
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }
    
    // Allow common test card numbers for demo/testing
    const testCards = [
      '4111111111111111', // Visa test
      '5555555555554444', // Mastercard test
      '378282246310005',  // Amex test
      '6011111111111117', // Discover test
      '3530111333300000', // JCB test
      '1234123412341234', // Generic test pattern
    ];
    
    if (testCards.includes(cleaned)) {
      return true;
    }
    
    // Luhn algorithm check for real cards
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  // Validate expiration date (not expired and valid month)
  const validateExpirationDate = (expDate: string): boolean => {
    if (expDate.length !== 5) return false;
    
    const [month, year] = expDate.split('/');
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (monthNum < 1 || monthNum > 12) {
      return false;
    }
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
    const currentMonth = currentDate.getMonth() + 1;
    
    if (yearNum < currentYear) {
      return false;
    }
    
    if (yearNum === currentYear && monthNum < currentMonth) {
      return false;
    }
    
    return true;
  };

  // Validate CVC (3-4 digits)
  const validateCVC = (cvcValue: string): boolean => {
    return /^\d{3,4}$/.test(cvcValue);
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const limited = cleaned.substring(0, 16);
    const formatted = limited.match(/.{1,4}/g)?.join(' ') || limited;
    return formatted;
  };

  // Format expiration date as MM/YY
  const formatExpirationDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + (cleaned.length > 2 ? '/' + cleaned.substring(2, 4) : '');
    }
    return cleaned;
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Update user profile with contact information
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        })
        .eq("id", user?.id);

      if (profileError) throw profileError;

      toast({
        title: "Contact information saved",
        description: "Please complete payment information",
      });

      // Move to payment step
      setStep(2);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save contact information",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent, provider: 'stripe' | 'paypal' = 'stripe') => {
    e.preventDefault();
    
    // Reset errors
    setCardNumberError("");
    setExpirationDateError("");
    setCvcError("");
    
    // Validate payment fields only for stripe
    if (provider === 'stripe') {
      let hasError = false;
      
      // Validate card number
      if (!validateCardNumber(cardNumber)) {
        setCardNumberError("Invalid card number. Please check and try again.");
        hasError = true;
      }
      
      // Validate expiration date
      if (!validateExpirationDate(expirationDate)) {
        const [month] = expirationDate.split('/');
        const monthNum = parseInt(month);
        if (monthNum && (monthNum < 1 || monthNum > 12)) {
          setExpirationDateError("Invalid month. Please enter a month between 01 and 12.");
        } else {
          setExpirationDateError("Card is expired or invalid date format.");
        }
        hasError = true;
      }
      
      // Validate CVC
      if (!validateCVC(cvc)) {
        setCvcError("Invalid CVC. Please enter 3-4 digits.");
        hasError = true;
      }
      
      if (hasError) {
        return;
      }
    }
    
    setSubmitting(true);

    try {
      if (!booking) return;

      if (isDemoMode && user) {
        // Demo mode: Update booking and create transaction in localStorage
        updateBooking(booking.id, {
          status: "confirmed",
          updated_at: new Date().toISOString(),
        });

        const transactionId = `demo-txn-${Date.now()}`;
        addTransaction({
          id: transactionId,
          booking_id: booking.id,
          type: "capture",
          amount: booking.total_price,
          currency: "USD",
          provider: provider,
          status: "succeeded",
          created_at: new Date().toISOString(),
          bookings: {
            id: booking.id,
            listing_id: booking.listing_id,
            guest_user_id: user.id,
            checkin_date: booking.checkin_date,
            checkout_date: booking.checkout_date,
            nights: booking.nights,
            guests: booking.guests,
            listings: booking.listings || { title: "Demo Listing" }
          }
        });

        toast({
          title: "Success!",
          description: "Your demo booking has been confirmed.",
        });

        navigate(`/booking-confirmation/${booking.id}`);
      } else {
        // Real user: Call RPC
        const { data: confirmResult, error: confirmError } = await supabase
          .rpc('confirm_booking_payment', {
            p_booking_id: booking.id,
            p_provider: provider,
            p_amount: booking.total_price,
            p_currency: 'USD'
          });

        if (confirmError) throw confirmError;
        
        const result = confirmResult as { success: boolean; error?: string };
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to confirm payment');
        }

        toast({
          title: "Success!",
          description: "Your booking has been confirmed.",
        });

        navigate(`/booking-confirmation/${booking.id}`);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !listing || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const checkIn = booking.checkin_date;
  const checkOut = booking.checkout_date;
  const nights = booking.nights;
  const guests = booking.guests;
  const subtotal = booking.subtotal;
  const serviceFee = booking.service_fee;
  const cleaningFee = booking.cleaning_fee;
  // Use stored tax amount from financial snapshot
  const taxes = booking.taxes || 0;
  const totalPrice = booking.total_price;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(`/listing/${listing.id}`)}
          className="mb-6 -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Checkout Heading */}
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Booking Overview & Pricing */}
          <div className="space-y-6">
            {/* Booking Overview */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Your Trip</h2>
              
              <div className="flex gap-4 mb-6">
                <img
                  src={listing.cover_image || "/placeholder.svg"}
                  alt={listing.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-semibold">{listing.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {listing.city}, {listing.state}, {listing.country}
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dates</span>
                  <span>
                    {checkIn && checkOut && 
                      `${format(new Date(checkIn), "MMM dd")} - ${format(new Date(checkOut), "MMM dd, yyyy")}`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Guests</span>
                  <span>{guests} {guests === 1 ? "guest" : "guests"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nights</span>
                  <span>{nights} {nights === 1 ? "night" : "nights"}</span>
                </div>
              </div>
            </Card>

            {/* Price Breakdown */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Price Details</h2>
              
              <div className="space-y-3">
                {booking.pricing_breakdown ? (
                  <>
                    {/* Base rate nights */}
                    {booking.pricing_breakdown.base_nights_count > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          ${listing.base_price.toFixed(2)} × {booking.pricing_breakdown.base_nights_count} {booking.pricing_breakdown.base_nights_count === 1 ? 'night' : 'nights'}
                        </span>
                        <span>${booking.pricing_breakdown.base_nights_total.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {/* Custom rate nights */}
                    {booking.pricing_breakdown.custom_nights_count > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {booking.pricing_breakdown.custom_nights_count} {booking.pricing_breakdown.custom_nights_count === 1 ? 'night' : 'nights'} (custom pricing)
                        </span>
                        <span>${booking.pricing_breakdown.custom_nights_total.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {/* Discount */}
                    {booking.pricing_breakdown.discount_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 font-medium">
                          {(booking.pricing_breakdown.discount_rate * 100).toFixed(0)}% {booking.pricing_breakdown.discount_type} discount
                        </span>
                        <span className="text-green-600 font-medium">
                          -${booking.pricing_breakdown.discount_amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  /* Legacy bookings without breakdown */
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ${listing.base_price.toFixed(2)} × {nights} nights
                    </span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                )}
                
                {/* Subtotal */}
                <div className="flex justify-between text-sm font-medium border-t pt-3">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cleaning fee</span>
                  <span>${cleaningFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service fee</span>
                  <span>${serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxes</span>
                  <span>${taxes.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between font-semibold text-base border-t pt-3 mt-3">
                  <span>Total (USD)</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Additional Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Good to Know</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>Cancellation policy:</strong> {listing.cancellation_policy?.name || "Standard"}
                </p>
                <p>
                  <strong>Customer support:</strong> Available 24/7 for any questions or concerns
                </p>
                <p>
                  <strong>Payment:</strong> Secure checkout with SSL encryption via Stripe or PayPal
                </p>
              </div>
            </Card>
          </div>

          {/* Right Column - Contact Information or Payment Form */}
          <div>
            <Card className="p-6">
              {step === 1 ? (
                <>
                  <h2 className="text-xl font-semibold mb-6">Contact Information</h2>
                  
                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormInput
                        label="First Name"
                        value={firstName}
                        onChange={setFirstName}
                        required
                      />
                      
                      <FormInput
                        label="Last Name"
                        value={lastName}
                        onChange={setLastName}
                        required
                      />
                    </div>
                    
                    <FormInput
                      label="Email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      required
                    />
                    
                    <FormPhoneInput
                      label="Phone Number"
                      value={phone}
                      onChange={setPhone}
                      required
                    />

                    <Button
                      type="submit"
                      className="w-full h-12 text-base rounded-full"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Next"
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      By selecting the button below, I agree to the Host's House Rules, Ground rules for guests, and the cancellation policy.
                    </p>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-6">Payment Information</h2>
                  
                  <form onSubmit={(e) => handlePaymentSubmit(e, 'stripe')} className="space-y-6">
                    {/* Payment Information Section */}
                    <div className="space-y-4">
                      <FormInput
                        label="Cardholder Name"
                        value={cardholderName}
                        onChange={setCardholderName}
                        required
                      />

                      <div>
                        <FormInput
                          label="Card Number"
                          value={cardNumber}
                          onChange={(value) => {
                            setCardNumber(formatCardNumber(value));
                            setCardNumberError("");
                          }}
                          pattern="[0-9 ]*"
                          maxLength={19}
                          required
                        />
                        {cardNumberError && (
                          <p className="text-sm text-destructive mt-1">{cardNumberError}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FormInput
                            label="Expiration Date"
                            placeholder="MM/YY"
                            value={expirationDate}
                            onChange={(value) => {
                              setExpirationDate(formatExpirationDate(value));
                              setExpirationDateError("");
                            }}
                            pattern="[0-9/]*"
                            maxLength={5}
                            required
                          />
                          {expirationDateError && (
                            <p className="text-sm text-destructive mt-1">{expirationDateError}</p>
                          )}
                        </div>

                        <div>
                          <FormInput
                            label="CVC"
                            type="password"
                            value={cvc}
                            onChange={(value) => {
                              const cleaned = value.replace(/\D/g, '');
                              if (cleaned.length <= 4) {
                                setCvc(cleaned);
                              }
                              setCvcError("");
                            }}
                            pattern="[0-9]*"
                            maxLength={4}
                            required
                          />
                          {cvcError && (
                            <p className="text-sm text-destructive mt-1">{cvcError}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Billing Address Section */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold">Billing Address</h3>

                      <Select value={billingCountry} onValueChange={setBillingCountry}>
                        <SelectTrigger className="h-14 rounded-full border-[#D5DAE7] bg-white">
                          <SelectValue placeholder="Country or Region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">🇺🇸 United States</SelectItem>
                          <SelectItem value="United Kingdom">🇬🇧 United Kingdom</SelectItem>
                          <SelectItem value="France">🇫🇷 France</SelectItem>
                          <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                          <SelectItem value="Italy">🇮🇹 Italy</SelectItem>
                          <SelectItem value="Spain">🇪🇸 Spain</SelectItem>
                          <SelectItem value="Japan">🇯🇵 Japan</SelectItem>
                          <SelectItem value="China">🇨🇳 China</SelectItem>
                          <SelectItem value="India">🇮🇳 India</SelectItem>
                          <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                          <SelectItem value="Brazil">🇧🇷 Brazil</SelectItem>
                          <SelectItem value="Mexico">🇲🇽 Mexico</SelectItem>
                          <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormInput
                        label="Address Line 1"
                        value={addressLine1}
                        onChange={setAddressLine1}
                        required
                      />

                      <FormInput
                        label="Address Line 2"
                        value={addressLine2}
                        onChange={setAddressLine2}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormInput
                          label="City"
                          value={city}
                          onChange={setCity}
                          required
                        />

                        <FormInput
                          label="Postal Code"
                          value={postalCode}
                          onChange={setPostalCode}
                          required
                        />
                      </div>

                      <FormInput
                        label="State"
                        value={billingState}
                        onChange={setBillingState}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-base rounded-full"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Confirm & Pay $${totalPrice.toFixed(2)}`
                      )}
                    </Button>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-3">Or checkout with</p>
                      <Button
                        type="button"
                        className="w-full h-12 text-base rounded-full bg-[#FFC439] hover:bg-[#FFB700] text-black font-semibold"
                        disabled={submitting}
                        onClick={(e) => handlePaymentSubmit(e, 'paypal')}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'PayPal'
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                      By selecting the button above, I agree to the Host's House Rules, Ground rules for guests, and the cancellation policy.
                    </p>
                  </form>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
