import { startOfWeek, eachDayOfInterval, format, getDay } from "date-fns";

interface WeeklyPricing {
  week_start_date: string;
  nightly_rate: number;
  weekend_nightly_rate: number;
  extra_night_weekend_rate: number;
}

/**
 * Calculate suggested rental price from weekly pricing rules.
 * Weekend = Friday + Saturday nights (getDay 5,6 for check-in day).
 * If no pricing rule exists for a given week, falls back to listing base_price.
 * 
 * Returns breakdown: { total, weekdayNights, weekendNights, details[] }
 */
export function calculatePricingFromWeeklyRates(
  checkinDate: Date,
  checkoutDate: Date,
  weeklyPricing: WeeklyPricing[],
  fallbackNightlyRate: number
): { total: number; weekdayNights: number; weekendNights: number; details: string[] } {
  // Each night is the day you check in. Last night = day before checkout.
  const lastNight = new Date(checkoutDate);
  lastNight.setDate(lastNight.getDate() - 1);

  const nights = eachDayOfInterval({ start: checkinDate, end: lastNight });

  // Build lookup: week_start_date -> pricing
  const pricingMap = new Map<string, WeeklyPricing>();
  for (const p of weeklyPricing) {
    pricingMap.set(p.week_start_date, p);
  }

  let total = 0;
  let weekdayNights = 0;
  let weekendNights = 0;
  const details: string[] = [];

  for (const night of nights) {
    const dayOfWeek = getDay(night); // 0=Sun, 5=Fri, 6=Sat
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

    // Find the Monday of this night's week
    const monday = startOfWeek(night, { weekStartsOn: 1 });
    const mondayStr = format(monday, "yyyy-MM-dd");
    const pricing = pricingMap.get(mondayStr);

    let rate: number;
    if (pricing) {
      rate = isWeekend ? pricing.weekend_nightly_rate : pricing.nightly_rate;
    } else {
      rate = fallbackNightlyRate;
    }

    total += rate;
    if (isWeekend) {
      weekendNights++;
    } else {
      weekdayNights++;
    }
  }

  return { total: Math.round(total * 100) / 100, weekdayNights, weekendNights, details };
}
