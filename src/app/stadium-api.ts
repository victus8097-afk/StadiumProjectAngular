import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

export interface BookingPolicy {
  openingTime: string;
  closingTime: string;
  slotDurationMinutes: number;
  maxAdvanceBookingDays: number;
  cancellationDeadlineHours: number;
}

export interface Stadium {
  id: number;
  name: string;
  location: string;
  pricePerHour: number;
  isAvailable: boolean;
  categoryId: number;
  bookingPolicy?: BookingPolicy | null;
}

export interface BookingRequest {
  stadiumId: number;
  customerName: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
}

export interface Booking extends BookingRequest {
  id: number;
  totalPrice: number;
  status: string;
}

export function validateBooking(draft: BookingRequest) {
  const data = {
    ...draft,
    customerName: draft.customerName.trim(),
    customerPhone: draft.customerPhone
      .trim()
      .replace(/[٠-٩]/g, (n) => String(n.charCodeAt(0) - 1632)),
  };
  let message = '';
  if (!data.customerName) message = 'Enter the customer name.';
  else if (data.customerPhone && !/^\+?[\d ()-]+$/.test(data.customerPhone))
    message = 'Enter a valid phone number.';
  else if (data.customerPhone && !/\d/.test(data.customerPhone))
    message = 'Enter a phone number with digits.';
  else if (!(Date.parse(data.startTime) > Date.now()))
    message = 'Choose a start time in the future.';
  else if (!(Date.parse(data.endTime) - Date.parse(data.startTime) > 0))
    message = 'End time must be after start time.';
  return { data, message };
}

export function requestError(err: HttpErrorResponse, fallback: string): string {
  if (err.status === 0) return 'Cannot reach the local API. Check the connection and try again.';
  return err.status < 500 && typeof err.error === 'string' && err.error.length < 300
    ? err.error
    : fallback;
}

@Injectable({ providedIn: 'root' })
export class StadiumApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';
  stadiums() {
    return this.http.get<Stadium[]>(this.base + '/Stadiums');
  }
  create({ id, ...data }: Stadium) {
    return this.http.post<Stadium>(this.base + '/Stadiums', data);
  }
  update({ id, ...data }: Stadium) {
    return this.http.put(this.base + '/Stadiums/' + id, data);
  }
  remove(id: number) {
    return this.http.delete(this.base + '/Stadiums/' + id);
  }
  bookings(id: number) {
    return this.http.get<Booking[]>(this.base + '/Bookings/stadium/' + id, {
      params: { includeCancelled: true },
    });
  }
  updateBooking(id: number, data: BookingRequest) {
    return this.http.put<Booking>(this.base + '/Bookings/' + id, data);
  }
  cancelBooking(id: number) {
    return this.http.patch<void>(this.base + '/Bookings/' + id + '/cancel', {});
  }
  deleteBooking(id: number) {
    return this.http.delete<void>(this.base + '/Bookings/' + id);
  }
  book(data: BookingRequest) {
    return this.http.post<Booking>(this.base + '/Bookings', data);
  }
}
