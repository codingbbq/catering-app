import type { BookingListItem } from "@catering/shared-types";
import type { CalendarEvent, DayCell } from "./calendar-types";

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getMonthGrid(year: number, month: number): DayCell[] {
  const today = new Date();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Sunday = 0
  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const cells: DayCell[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    cells.push({
      date: d,
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      dayNumber: d.getDate(),
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    cells.push({
      date: d,
      isCurrentMonth: true,
      isToday: isSameDay(d, today),
      dayNumber: day,
    });
  }

  // Next month leading days to complete full weeks
  const totalSlots = cells.length > 35 ? 42 : 35;
  const remaining = totalSlots - cells.length;
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day);
    cells.push({
      date: d,
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      dayNumber: day,
    });
  }

  return cells;
}

export function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  const dayOfWeek = d.getDay(); // 0 is Sunday
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    days.push(day);
  }
  return days;
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatWeekRange(referenceDate: Date): string {
  const days = getWeekDays(referenceDate);
  const first = days[0]!;
  const last = days[6]!;

  if (first.getMonth() === last.getMonth()) {
    return `${first.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${last.getDate()}, ${first.getFullYear()}`;
  }
  return `${first.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${last.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${last.getFullYear()}`;
}

export function formatDayHeader(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function mapBookingToEvent(b: BookingListItem): CalendarEvent {
  const eventDate = new Date(b.eventDate);

  // Extract time if present in ISO string
  const hours = eventDate.getHours();
  const minutes = eventDate.getMinutes();
  const hasTime = !(hours === 0 && minutes === 0);
  const startTime = hasTime
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    : undefined;

  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    title: b.title,
    status: b.status,
    customerId: b.customerId,
    customerName: b.customerName,
    customerEmail: b.customerEmail ?? undefined,
    customerPhone: b.customerPhone ?? undefined,
    eventDate,
    startTime,
    guestCount: b.guestCount ?? undefined,
    venueName: b.venueName ?? undefined,
    venueAddress: b.venueAddress ?? undefined,
    totalAmount: b.totalAmount,
    currency: b.currency,
    raw: b,
  };
}

export const CALENDAR_HOURS = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
];
