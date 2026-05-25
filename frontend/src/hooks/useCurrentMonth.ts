import { useTodayDate } from './useTodayDate'
import { monthOf } from '../lib/month'

// Returns the user's current month (YYYY-MM) derived from `useTodayDate`.
// Updates automatically when the underlying date rolls over.
export function useCurrentMonth(): string {
  const { date } = useTodayDate()
  return monthOf(date)
}
