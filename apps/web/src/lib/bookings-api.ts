import type {
  BookingDetail,
  BookingListResponse,
  BookingSearchParams,
  CancelBookingRequest,
  ConfirmBookingRequest,
  CreateBookingFromQuotationRequest,
  CreateBookingRequest,
  UpdateBookingRequest,
} from "@catering/shared-types";
import { apiFetch } from "./api-client";

export function listBookings(
  token: string,
  params?: BookingSearchParams,
): Promise<BookingListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.customerId) query.set("customerId", params.customerId);
  if (params?.enquiryId) query.set("enquiryId", params.enquiryId);
  if (params?.quotationId) query.set("quotationId", params.quotationId);
  if (params?.fromDate) query.set("fromDate", params.fromDate);
  if (params?.toDate) query.set("toDate", params.toDate);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return apiFetch(`/bookings${qs ? `?${qs}` : ""}`, { token });
}

export function getBooking(bookingId: string, token: string): Promise<BookingDetail> {
  return apiFetch(`/bookings/${bookingId}`, { token });
}

export function createBooking(
  dto: CreateBookingRequest,
  token: string,
): Promise<BookingDetail> {
  return apiFetch("/bookings", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function createBookingFromQuotation(
  dto: CreateBookingFromQuotationRequest,
  token: string,
): Promise<BookingDetail> {
  return apiFetch("/bookings/from-quotation", {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

export function updateBooking(
  bookingId: string,
  dto: UpdateBookingRequest,
  token: string,
): Promise<BookingDetail> {
  return apiFetch(`/bookings/${bookingId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
    token,
  });
}

export function confirmBooking(
  bookingId: string,
  token: string,
  dto?: ConfirmBookingRequest,
): Promise<BookingDetail> {
  return apiFetch(
    `/bookings/${bookingId}/confirm`,
    dto
      ? { method: "POST", body: JSON.stringify(dto), token }
      : { method: "POST", token },
  );
}

export function cancelBooking(
  bookingId: string,
  dto: CancelBookingRequest,
  token: string,
): Promise<BookingDetail> {
  return apiFetch(`/bookings/${bookingId}/cancel`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}
