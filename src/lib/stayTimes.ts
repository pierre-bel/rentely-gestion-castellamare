import { supabase } from "@/integrations/supabase/client";

export interface YearlyStayTime {
  listing_id: string;
  year: number;
  checkin_time: string | null;
  checkout_time: string | null;
}

export async function fetchYearlyStayTimes(listingIds: string[]): Promise<YearlyStayTime[]> {
  if (listingIds.length === 0) return [];
  const { data } = await supabase
    .from("listing_yearly_stay_times")
    .select("listing_id, year, checkin_time, checkout_time")
    .in("listing_id", listingIds);
  return (data as YearlyStayTime[]) || [];
}

/** Returns the stay times for a listing at a given check-in date: yearly override first, then listing defaults. */
export function getStayTimesForDate(
  listing: { id: string; checkin_from?: string | null; checkout_until?: string | null },
  checkinDate: Date | string | null | undefined,
  yearly: YearlyStayTime[]
): { checkin: string; checkout: string } {
  const defCheckin = listing.checkin_from?.slice(0, 5) || "";
  const defCheckout = listing.checkout_until?.slice(0, 5) || "";
  if (!checkinDate) return { checkin: defCheckin, checkout: defCheckout };
  const year = typeof checkinDate === "string" ? parseInt(checkinDate.slice(0, 4)) : checkinDate.getFullYear();
  const row = yearly.find((y) => y.listing_id === listing.id && y.year === year);
  return {
    checkin: row?.checkin_time?.slice(0, 5) || defCheckin,
    checkout: row?.checkout_time?.slice(0, 5) || defCheckout,
  };
}
