import type { BookingListItem, BookingStatus } from "@catering/shared-types";

export type CalendarViewMode = "month" | "week" | "day" | "agenda";

export interface CalendarEvent {
  id: string;
  bookingNumber: string;
  title: string;
  status: BookingStatus;
  customerId: string;
  customerName: string;
  customerEmail?: string | null | undefined;
  customerPhone?: string | null | undefined;
  eventDate: Date;
  startTime?: string | undefined;
  endTime?: string | undefined;
  guestCount?: number | null | undefined;
  venueName?: string | null | undefined;
  venueAddress?: string | null | undefined;
  totalAmount: number;
  currency: string;
  raw: BookingListItem;
}

export interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayNumber: number;
}
