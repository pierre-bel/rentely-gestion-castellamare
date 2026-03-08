import { startOfWeek, eachDayOfInterval, format, getDay, differenceInCalendarDays } from "date-fns";

interface WeeklyPricing {
  week_start_date: string;
  weekly_rate: number;
  weekend_rate: number;
  extra_night_weekend_rate: number;
}

/**
 * Calculate suggested rental price from weekly pricing rules.
 * 
 * Model:
 * - weekly_rate = price for the full week (Saturday to Saturday, 7 nights)
 * - weekend_rate = price for the full weekend (Friday + Saturday nights)
 * - extra_night_weekend_rate = rate per extra night on weekends
 * 
 * Weekday nights = Sun, Mon, Tue, Wed, Thu (check-in day)
 * Weekend nights = Fri, Sat (check-in day)
 * 
 * Calculation:
 * - For each week (Sat→Sat) in the booking, we prorate:
 *   - If all 7 nights are booked: weekly_rate
 *   - If only weekend (Fri+Sat): weekend_rate
 *   - Otherwise: (weekday_nights / 5) * (weekly_rate - weekend_rate) + weekend portion
 */
export function calculatePricingFromWeeklyRates(
  checkinDate: Date,
  checkoutDate: Date,
  weeklyPricing: WeeklyPricing[],
  fallbackWeeklyRate: number
): { total: number; weekdayNights: number; weekendNights: number; details: string[] } {
  const lastNight = new Date(checkoutDate);
  lastNight.setDate(lastNight.getDate() - 1);

  const nights = eachDayOfInterval({ start: checkinDate, end: lastNight });

  // Build lookup: week_start_date -> pricing
  const pricingMap = new Map<string, WeeklyPricing>();
  for (const p of weeklyPricing) {
    pricingMap.set(p.week_start_date, p);
  }

  // Group nights by their week (Saturday start)
  const weekGroups = new Map<string, { weekday: number; weekend: number }>();
  let totalWeekday = 0;
  let totalWeekend = 0;

  for (const night of nights) {
    const dayOfWeek = getDay(night); // 0=Sun, 5=Fri, 6=Sat
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const saturday = startOfWeek(night, { weekStartsOn: 6 });
    const weekKey = format(saturday, "yyyy-MM-dd");

    if (!weekGroups.has(weekKey)) {
      weekGroups.set(weekKey, { weekday: 0, weekend: 0 });
    }
    const group = weekGroups.get(weekKey)!;
    if (isWeekend) {
      group.weekend++;
      totalWeekend++;
    } else {
      group.weekday++;
      totalWeekday++;
    }
  }

  let total = 0;
  const details: string[] = [];

  for (const [weekKey, group] of weekGroups) {
    const pricing = pricingMap.get(weekKey);
    const weeklyRate = pricing?.weekly_rate ?? fallbackWeeklyRate;
    const weekendRate = pricing?.weekend_rate ?? (weeklyRate * 2 / 7);
    const extraRate = pricing?.extra_night_weekend_rate ?? (weeklyRate / 7);

    const totalNightsInGroup = group.weekday + group.weekend;

    if (totalNightsInGroup === 7) {
      // Full week
      total += weeklyRate;
    } else if (group.weekday === 0 && group.weekend === 2) {
      // Exact weekend (Fri + Sat)
      total += weekendRate;
    } else {
      // Partial: prorate weekday portion from weekly rate, weekend from weekend rate
      // Weekday per-night = (weekly_rate - weekend_rate) / 5
      // Weekend: if 2 nights → weekend_rate, if 1 night → weekend_rate / 2
      const weekdayPerNight = (weeklyRate - weekendRate) / 5;
      const weekdayCost = group.weekday * weekdayPerNight;
      const weekendCost = group.weekend > 0
        ? (group.weekend >= 2 ? weekendRate : weekendRate / 2)
        : 0;
      total += weekdayCost + weekendCost;
    }
  }

  return { total: Math.round(total * 100) / 100, weekdayNights: totalWeekday, weekendNights: totalWeekend, details };
}
