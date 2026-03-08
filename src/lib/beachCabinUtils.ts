/**
 * Check if a booking's dates overlap with the beach cabin period.
 * Period is defined by start month/day to end month/day (annually recurring).
 */
export function isBeachCabinPeriod(
  checkinDate: Date,
  checkoutDate: Date,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): boolean {
  const checkinYear = checkinDate.getFullYear();
  const checkoutYear = checkoutDate.getFullYear();

  // Check each year that the booking spans
  for (let year = checkinYear; year <= checkoutYear; year++) {
    const periodStart = new Date(year, startMonth - 1, startDay);
    const periodEnd = new Date(year, endMonth - 1, endDay, 23, 59, 59);

    // Check overlap: booking overlaps period if checkin < periodEnd && checkout > periodStart
    if (checkinDate <= periodEnd && checkoutDate >= periodStart) {
      return true;
    }
  }

  return false;
}
