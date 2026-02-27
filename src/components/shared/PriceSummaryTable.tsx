import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface PriceSummaryTableProps {
  base_price: number;
  cleaning_fee: number;
}

const PriceSummaryTable = ({ base_price, cleaning_fee }: PriceSummaryTableProps) => {
  const [taxRate, setTaxRate] = useState(0.10);
  const [guestServiceFeeRate, setGuestServiceFeeRate] = useState(0.08);
  const [hostCommissionRate, setHostCommissionRate] = useState(0.05);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["default_tax_rate", "default_guest_service_fee_rate", "default_host_commission_rate"])
        .eq("is_active", true);

      if (settings) {
        const taxRateData = settings.find(s => s.setting_key === "default_tax_rate");
        const serviceFeeRateData = settings.find(s => s.setting_key === "default_guest_service_fee_rate");
        const hostCommissionRateData = settings.find(s => s.setting_key === "default_host_commission_rate");
        
        if (taxRateData) setTaxRate(parseFloat(taxRateData.setting_value));
        if (serviceFeeRateData) setGuestServiceFeeRate(parseFloat(serviceFeeRateData.setting_value));
        if (hostCommissionRateData) setHostCommissionRate(parseFloat(hostCommissionRateData.setting_value));
      }
      setLoading(false);
    };
    fetchRates();
  }, []);

  const nights = 3;
  const subtotal = base_price * nights;
  const taxes = subtotal * taxRate;
  const platformFee = subtotal * guestServiceFeeRate;
  const totalGuest = subtotal + cleaning_fee + taxes + platformFee;
  const hostPayoutGross = subtotal + cleaning_fee;
  const hostCommissionAmount = hostPayoutGross * hostCommissionRate;
  const hostPayout = hostPayoutGross - hostCommissionAmount;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="rounded-lg overflow-hidden min-w-[600px] sm:min-w-0" style={{ borderWidth: '1px', borderColor: '#D5DAE7' }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-transparent border-b" style={{ borderBottomColor: '#D5DAE7' }}>
              <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Item</th>
              <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Calculation</th>
              <th className="text-right p-2 md:p-3 font-medium text-xs md:text-sm">Amount ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-table-stripe">
              <td className="p-2 md:p-3">Base price</td>
              <td className="p-2 md:p-3">${base_price} × {nights} nights</td>
              <td className="p-2 md:p-3 text-right">${subtotal.toFixed(2)}</td>
            </tr>
            {cleaning_fee > 0 && (
              <tr className="border-t border-table-stripe bg-table-stripe">
                <td className="p-2 md:p-3">Cleaning fee</td>
                <td className="p-2 md:p-3">Fixed</td>
                <td className="p-2 md:p-3 text-right">${cleaning_fee.toFixed(2)}</td>
              </tr>
            )}
            <tr className="border-t border-table-stripe">
              <td className="p-2 md:p-3">Taxes ({(taxRate * 100).toFixed(0)}%)</td>
              <td className="p-2 md:p-3">Auto-applied</td>
              <td className="p-2 md:p-3 text-right">${taxes.toFixed(2)}</td>
            </tr>
            <tr className="border-t border-table-stripe bg-table-stripe">
              <td className="p-2 md:p-3">Platform fee (guest side)</td>
              <td className="p-2 md:p-3">{(guestServiceFeeRate * 100).toFixed(0)}% service charge</td>
              <td className="p-2 md:p-3 text-right">${platformFee.toFixed(2)}</td>
            </tr>
            <tr className="border-t border-table-stripe">
              <td className="p-2 md:p-3 font-medium">Total (guest pays)</td>
              <td className="p-2 md:p-3"></td>
              <td className="p-2 md:p-3 text-right font-medium">
                ${totalGuest.toFixed(2)}
              </td>
            </tr>
            <tr className="border-t border-table-stripe bg-table-stripe">
              <td className="p-2 md:p-3 text-xs md:text-sm font-bold">Host payout (after host fee {(hostCommissionRate * 100).toFixed(0)}%)</td>
              <td className="p-2 md:p-3 text-xs md:text-sm">(${subtotal.toFixed(2)} + ${cleaning_fee.toFixed(2)}) − {(hostCommissionRate * 100).toFixed(0)}%</td>
              <td className="p-2 md:p-3 text-right text-xs md:text-sm font-bold">
                ${hostPayout.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PriceSummaryTable;
