import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  Observable,
  Subject,
  switchMap,
} from 'rxjs';
import { Booking, BookingRequest, StadiumApi, requestError, validateBooking } from '../stadium-api';

@Component({
  selector: 'app-bookings',
  imports: [AsyncPipe, DatePipe, DecimalPipe, RouterLink, FormsModule],
  templateUrl: './bookings.html',
})
export class BookingsComponent {
  private readonly api = inject(StadiumApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly reload = new Subject<void>();
  readonly refreshSchedule = new Subject<void>();
  readonly schedule$ = this.reload.pipe(
    startWith(undefined),
    switchMap(() =>
      this.api.stadiums().pipe(
        switchMap((stadiums) =>
          combineLatest([
            this.route.queryParamMap,
            this.refreshSchedule.pipe(startWith(undefined)),
          ]).pipe(
            switchMap(([params]) => {
              const requested = params.get('stadium');
              const stadium = requested
                ? stadiums.find((s) => s.id === Number(requested))
                : stadiums[0];
              const state = {
                stadiums,
                stadium,
                bookings: [] as Booking[],
                loading: false,
                error: '',
              };
              if (!stadium)
                return of({
                  ...state,
                  error: requested ? 'The selected stadium is unavailable.' : '',
                });
              return this.api.bookings(stadium.id).pipe(
                map((bookings) => ({ ...state, bookings })),
                startWith({ ...state, loading: true }),
                catchError((err) =>
                  of({ ...state, error: requestError(err, 'Could not load bookings.') }),
                ),
              );
            }),
          ),
        ),
        catchError((err) =>
          of({
            stadiums: [],
            stadium: undefined,
            bookings: [],
            loading: false,
            error: requestError(err, 'Could not load stadiums.'),
          }),
        ),
      ),
    ),
  );

  readonly draft = signal<(BookingRequest & { id: number }) | null>(null);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly error = signal('');

  edit(row: Booking) {
    this.error.set('');
    this.message.set('');
    const { id, stadiumId, customerName, customerPhone, startTime, endTime } = row;
    this.draft.set({ id, stadiumId, customerName, customerPhone, startTime, endTime });
  }

  save() {
    const draft = this.draft();
    if (!draft) return;
    const { id, ...fields } = draft;
    const { data, message } = validateBooking(fields);
    if (message) {
      this.error.set(message);
      return;
    }
    this.submit(this.api.updateBooking(id, data), 'Booking updated.');
  }

  cancel(row: Booking) {
    if (confirm('Cancel the booking for ' + row.customerName + ' and release this time slot?'))
      this.submit(this.api.cancelBooking(row.id), 'Booking cancelled.');
  }

  remove(row: Booking) {
    if (confirm('Permanently delete the booking for ' + row.customerName + '?'))
      this.submit(this.api.deleteBooking(row.id), 'Booking deleted.');
  }

  private submit(request: Observable<unknown>, success: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.draft.set(null);
        this.message.set(success);
        this.refreshSchedule.next();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(requestError(err, 'Could not change the booking.'));
      },
    });
  }

  selectStadium(value: string) {
    this.draft.set(null);
    this.message.set('');
    this.error.set('');
    this.router.navigate([], { relativeTo: this.route, queryParams: { stadium: value } });
  }
}
