import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Receipt, DollarSign } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import AccountRestrictionBanner from "./AccountRestrictionBanner";
import { useDemoData } from "@/hooks/useDemoData";

// Helper function to safely format dates
const safeFormatDate = (dateValue: string | Date | null | undefined, formatStr: string = "MMM dd, yyyy"): string => {
  if (!dateValue) return "N/A";
  
  try {
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
    if (!isValid(date)) return "N/A";
    return format(date, formatStr);
  } catch {
    return "N/A";
  }
};

interface BookingPayment {
  id: string;
  type?: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
  booking_id: string;
  bookings: {
    id: string;
    checkin_date: string;
    checkout_date: string;
    nights: number;
    guests: number;
    listings: {
      title: string;
      city: string;
      country: string;
    } | null;
  };
}

interface DebtPayment {
  id: string;
  type?: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
  dispute_id: string;
  booking_id: string;
  bookings: {
    id: string;
    listings: {
      title: string;
      city: string;
      country: string;
    } | null;
  };
  disputes: {
    id: string;
    category: string;
    description: string;
  };
}

interface Refund {
  id: string;
  type?: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
  dispute_id: string | null;
  booking_id: string;
  bookings: {
    id: string;
    checkin_date: string;
    checkout_date: string;
    listings: {
      title: string;
      city: string;
      country: string;
    } | null;
  };
  disputes: {
    id: string;
    category: string;
    resolution_notes: string;
  } | null;
}

const GuestPayments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookingPayments, setBookingPayments] = useState<BookingPayment[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDemoMode, getTransactions } = useDemoData();

  useEffect(() => {
    if (user) {
      if (isDemoMode) {
        fetchDemoTransactions();
      } else {
        fetchAllTransactions();
      }
    }
  }, [user, isDemoMode]);

  const fetchDemoTransactions = async () => {
    try {
      // Fetch capture transactions (booking and debt payments)
      const captureTransactions = getTransactions({ type: "capture", status: "succeeded" });
      
      const bookingPaymentsData: BookingPayment[] = [];
      const debtPaymentsData: DebtPayment[] = [];
      
      captureTransactions.forEach((transaction: any) => {
        // Skip transactions with null listings
        if (!transaction.bookings?.listings) return;
        
        if (transaction.dispute_id) {
          debtPaymentsData.push(transaction as DebtPayment);
        } else {
          bookingPaymentsData.push(transaction as BookingPayment);
        }
      });

      // Fetch refund transactions
      const refundTransactions = getTransactions({ type: "refund", status: "succeeded" });
      const refundsData: Refund[] = refundTransactions
        .filter((transaction: any) => transaction.bookings?.listings)
        .map((transaction: any) => transaction as Refund);

      setBookingPayments(bookingPaymentsData);
      setDebtPayments(debtPaymentsData);
      setRefunds(refundsData);
    } catch (error) {
      console.error("Error fetching demo transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTransactions = async () => {
    try {
      // Fetch all capture transactions (booking payments and debt payments)
      const { data: captureData, error: captureError } = await supabase
        .from("transactions")
        .select(`
          id,
          amount,
          currency,
          status,
          provider,
          created_at,
          booking_id,
          dispute_id,
          bookings!inner (
            id,
            checkin_date,
            checkout_date,
            nights,
            guests,
            guest_user_id,
            listings (
              title,
              city,
              country
            )
          ),
          disputes!transactions_dispute_id_fkey (
            id,
            category,
            description
          )
        `)
        .eq("type", "capture")
        .eq("status", "succeeded")
        .eq("bookings.guest_user_id", user?.id)
        .order("created_at", { ascending: false });

      if (captureError) throw captureError;

      // Separate booking payments from debt payments and filter out null listings
      const bookingPaymentsData: BookingPayment[] = [];
      const debtPaymentsData: DebtPayment[] = [];
      
      (captureData || []).forEach((transaction) => {
        if (!transaction.bookings?.listings) return; // Skip if no listings data
        
        if (transaction.dispute_id) {
          debtPaymentsData.push(transaction as DebtPayment);
        } else {
          bookingPaymentsData.push(transaction as BookingPayment);
        }
      });

      setBookingPayments(bookingPaymentsData);
      setDebtPayments(debtPaymentsData);

      // Fetch refunds
      const { data: refundsData, error: refundsError } = await supabase
        .from("transactions")
        .select(`
          id,
          amount,
          currency,
          status,
          provider,
          created_at,
          dispute_id,
          booking_id,
          bookings!inner (
            id,
            checkin_date,
            checkout_date,
            guest_user_id,
            listings (
              title,
              city,
              country
            )
          ),
          disputes!transactions_dispute_id_fkey (
            id,
            category,
            resolution_notes
          )
        `)
        .eq("type", "refund")
        .eq("status", "succeeded")
        .eq("bookings.guest_user_id", user?.id)
        .order("created_at", { ascending: false });

      if (refundsError) throw refundsError;
      
      // Filter out refunds with null listings data
      const validRefunds = (refundsData || []).filter(refund => refund.bookings?.listings);
      setRefunds(validRefunds);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalBookingPayments = bookingPayments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalDebtPayments = debtPayments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalRefunded = refunds.reduce((acc, r) => acc + Number(r.amount), 0);
  const totalPaymentsCount = bookingPayments.length + debtPayments.length;
  const totalSpent = totalBookingPayments + totalDebtPayments;
  const netSpent = totalSpent - totalRefunded;

  return (
    <div className="space-y-6">
      {/* Account Restriction Banner */}
      <AccountRestrictionBanner />

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold">{totalPaymentsCount}</p>
            </div>
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
            </div>
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Refunded</p>
              <p className="text-2xl font-bold text-green-600">${totalRefunded.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Spent</p>
              <p className="text-2xl font-bold">${netSpent.toFixed(2)}</p>
            </div>
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Tabs for All Transaction Types */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="payments">Bookings ({bookingPayments.length})</TabsTrigger>
          <TabsTrigger value="debts">Debts ({debtPayments.length})</TabsTrigger>
          <TabsTrigger value="refunds">Refunds ({refunds.length})</TabsTrigger>
        </TabsList>

        {/* All Transactions */}
        <TabsContent value="all" className="space-y-4 mt-6">
          {totalPaymentsCount === 0 && refunds.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't made any transactions yet.
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* Combine all transactions and sort by date */}
              {[...refunds, ...bookingPayments, ...debtPayments]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((transaction: any) => {
                  // Check transaction type first for proper identification
                  const transactionType = transaction.type;
                  
                  // Check if it's a refund by type first, then fallback to checking bookings structure
                  if (transactionType === 'refund' || (!('nights' in transaction.bookings))) {
                    const refund = transaction as Refund;
                    return (
                      <Card
                        key={refund.id}
                        className="p-6 hover:shadow-md transition-shadow cursor-pointer border-green-200"
                        onClick={() => navigate(`/guest/bookings`, { state: { from: location.pathname } })}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                              <DollarSign className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{refund.bookings.listings.title}</h3>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Refunded
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {refund.bookings.listings.city}, {refund.bookings.listings.country}
                              </p>
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span>Transaction: {refund.id.substring(0, 8)}</span>
                                <span>•</span>
                                <span>{refund.provider}</span>
                              </div>
                              {refund.disputes?.resolution_notes && (
                                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                                  {refund.disputes.resolution_notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg text-green-600">
                              +${refund.amount.toFixed(2)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {safeFormatDate(refund.created_at)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  }
                  
                  // Check if it's a debt payment
                  if ('dispute_id' in transaction && transaction.dispute_id && 'disputes' in transaction && transaction.disputes && 'description' in transaction.disputes) {
                    const debtPayment = transaction as DebtPayment;
                    return (
                      <Card
                        key={debtPayment.id}
                        className="p-6 hover:shadow-md transition-shadow cursor-pointer border-orange-200"
                        onClick={() => navigate(`/guest/bookings`, { state: { from: location.pathname } })}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                              <Receipt className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{debtPayment.bookings.listings.title}</h3>
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  Debt Payment
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {debtPayment.bookings.listings.city}, {debtPayment.bookings.listings.country}
                              </p>
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span>Transaction: {debtPayment.id.substring(0, 8)}</span>
                                <span>•</span>
                                <span>Dispute: {debtPayment.disputes.id.substring(0, 8)}</span>
                                <span>•</span>
                                <span>{debtPayment.provider}</span>
                              </div>
                              {debtPayment.disputes.description && (
                                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                                  Reason: {debtPayment.disputes.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg text-orange-600">
                              -${debtPayment.amount.toFixed(2)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {safeFormatDate(debtPayment.created_at)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  }
                  
                  // Otherwise it's a booking payment
                  const bookingPayment = transaction as BookingPayment;
                  return (
                    <Card
                      key={bookingPayment.id}
                      className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/guest/bookings`, { state: { from: location.pathname } })}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Receipt className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{bookingPayment.bookings.listings.title}</h3>
                              <Badge variant="outline">Booking Payment</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {bookingPayment.bookings.listings.city}, {bookingPayment.bookings.listings.country}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span>Transaction: {bookingPayment.id.substring(0, 8)}</span>
                              <span>•</span>
                              <span>
                                {safeFormatDate(bookingPayment.bookings.checkin_date, "MMM dd")} -{" "}
                                {safeFormatDate(bookingPayment.bookings.checkout_date, "MMM dd, yyyy")}
                              </span>
                              <span>•</span>
                              <span>{bookingPayment.bookings.nights} nights</span>
                              <span>•</span>
                              <span>{bookingPayment.provider}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">-${bookingPayment.amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {safeFormatDate(bookingPayment.created_at)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </>
          )}
        </TabsContent>

        {/* Bookings Only */}
        <TabsContent value="payments" className="space-y-4 mt-6">
          {bookingPayments.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                <p className="text-muted-foreground">You haven't made any bookings yet.</p>
              </div>
            </Card>
          ) : (
            bookingPayments.map((payment) => (
              <Card
                key={payment.id}
                className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/guest/bookings`, { state: { from: location.pathname } })}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{payment.bookings.listings.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {payment.bookings.listings.city}, {payment.bookings.listings.country}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Transaction: {payment.id.substring(0, 8)}</span>
                        <span>•</span>
                        <span>
                          {safeFormatDate(payment.bookings.checkin_date, "MMM dd")} -{" "}
                          {safeFormatDate(payment.bookings.checkout_date, "MMM dd, yyyy")}
                        </span>
                        <span>•</span>
                        <span>{payment.bookings.nights} nights</span>
                        <span>•</span>
                        <span>{payment.provider}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">${payment.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {safeFormatDate(payment.created_at)}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Debt Payments Only */}
        <TabsContent value="debts" className="space-y-4 mt-6">
          {debtPayments.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No debts</h3>
                <p className="text-muted-foreground">You don't have any outstanding debts.</p>
              </div>
            </Card>
          ) : (
            debtPayments.map((payment) => (
              <Card
                key={payment.id}
                className="p-6 hover:shadow-md transition-shadow cursor-pointer border-orange-200"
                onClick={() => navigate(`/guest/bookings`, { state: { from: location.pathname } })}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{payment.bookings.listings.title}</h3>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          Debt Payment
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {payment.bookings.listings.city}, {payment.bookings.listings.country}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Transaction: {payment.id.substring(0, 8)}</span>
                        <span>•</span>
                        <span>Dispute: {payment.disputes.id.substring(0, 8)}</span>
                        <span>•</span>
                        <span>{payment.provider}</span>
                      </div>
                      {payment.disputes.description && (
                        <p className="text-sm text-muted-foreground mt-2 max-w-md">
                          Reason: {payment.disputes.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">${payment.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {safeFormatDate(payment.created_at)}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Refunds Only */}
        <TabsContent value="refunds" className="space-y-4 mt-6">
          {refunds.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No refunds</h3>
                <p className="text-muted-foreground">You haven't received any refunds yet.</p>
              </div>
            </Card>
          ) : (
            refunds.map((refund) => (
              <Card
                key={refund.id}
                className="p-6 hover:shadow-md transition-shadow cursor-pointer border-green-200"
                onClick={() => navigate(`/guest/bookings`, { state: { from: location.pathname } })}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{refund.bookings.listings.title}</h3>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Refunded
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {refund.bookings.listings.city}, {refund.bookings.listings.country}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Transaction: {refund.id.substring(0, 8)}</span>
                        {refund.disputes && (
                          <>
                            <span>•</span>
                            <span>Dispute: {refund.disputes.id.substring(0, 8)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{refund.provider}</span>
                      </div>
                      {refund.disputes?.resolution_notes && (
                        <p className="text-sm text-muted-foreground mt-2 max-w-md">
                          {refund.disputes.resolution_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg text-green-600">
                      +${refund.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {safeFormatDate(refund.created_at)}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GuestPayments;
