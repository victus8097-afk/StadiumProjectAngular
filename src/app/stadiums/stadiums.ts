import { Feature } from '../stadium-api';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { validateBooking, BookingRequest, Stadium, StadiumApi, requestError } from '../stadium-api';

function blankStadium(): Stadium {
  return {
    id: 0,
    name: '',
    location: '',
    pricePerHour: 5000,
    isAvailable: true,
    categoryId: 1,
    bookingPolicy: {
      openingTime: '16:00',
      closingTime: '23:59',
      slotDurationMinutes: 60,
      maxAdvanceBookingDays: 30,
      cancellationDeadlineHours: 24,
    },
  };
}

@Component({
  selector: 'app-stadiums',
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './stadiums.html',
})
export class StadiumsComponent implements OnInit {
  private readonly api = inject(StadiumApi);
  readonly features = signal<Feature[]>([]);
  readonly featuresLoading = signal(false);
  readonly featureError = signal('');
  readonly managingFeatures = signal(false);
  featureName = '';
  featureId: number | null = null;

  loadFeatures() {
    this.featuresLoading.set(true);
    this.featureError.set('');
    this.api.features().subscribe({
      next: (rows) => {
        this.features.set(rows);
        this.featuresLoading.set(false);
      },
      error: (err) => {
managingFeatures: any;
        this.featuresLoading.set(false);
        this.featureError.set(requestError(err, 'Could not load features.'));
      },
    });
  }

  saveFeature() {
    if (this.busy() || !this.featureName.trim() || this.featureName.trim().length > 100) return;
    this.busy.set(true);
    const request =
      this.featureId === null
        ? this.api.addFeature(this.featureName.trim())
        : this.api.updateFeature(this.featureId, this.featureName.trim());
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.featureName = '';
        this.featureId = null;
        this.loadFeatures();
        this.load();
      },
      error: (err) => this.failed(err),
    });
  }

  removeFeature(feature: Feature) {
    if (this.busy() || !confirm('Delete ' + feature.name + ' from the catalog and all stadiums?'))
      return;
    this.busy.set(true);
    this.api.deleteFeature(feature.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.featureId = null;
        this.featureName = '';
        this.loadFeatures();
        this.load();
      },
      error: (err) => this.failed(err),
    });
  }

  selectFeature(stadium: Stadium, id: number, checked: boolean) {
    stadium.featureIds = checked
      ? [...(stadium.featureIds ?? []), id]
      : stadium.featureIds?.filter((value) => value !== id);
  }

  readonly rows = signal<Stadium[]>([]);
  readonly query = signal('');
  readonly filtered = computed(() => {
    const key = this.query().trim().toLowerCase();
    return this.rows().filter((s) =>
      [s.name, s.location].some((value) => value.toLowerCase().includes(key)),
    );
  });
  readonly categories = ['Football', 'Basketball', 'Tennis'];
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly policyId = signal<number | null>(null);
  readonly editor = signal<Stadium | null>(null);
  readonly bookingStadium = signal<Stadium | null>(null);
  booking!: BookingRequest;

  ngOnInit() {
    this.load();
    this.loadFeatures();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.stadiums().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(requestError(err, 'Could not load stadiums.'));
        this.loading.set(false);
      },
    });
  }

  closeForms() {
    this.editor.set(null);
    this.bookingStadium.set(null);
    this.error.set('');
  }

  edit(s?: Stadium) {
    this.closeForms();
    this.notice.set('');
    const draft = s ? structuredClone(s) : blankStadium();
    draft.bookingPolicy ??= blankStadium().bookingPolicy;
    draft.featureIds = draft.stadiumFeatures?.map((link) => link.featureId) ?? [];
    this.editor.set(draft);
  }

  private failed(err: HttpErrorResponse) {
    this.busy.set(false);
    this.error.set(requestError(err, 'The request failed. Please try again.'));
  }

  save(s: Stadium) {
    if (this.busy()) return;
    s.name = s.name.trim();
    s.location = s.location.trim();
    if (!s.name || !s.location) {
      this.error.set('Enter a stadium name and location.');
      return;
    }
    const policy = s.bookingPolicy;
    if (
      policy &&
      this.timeInSeconds(policy.closingTime) === this.timeInSeconds(policy.openingTime)
    ) {
      this.error.set('Opening and closing times must differ.');
      return;
    }
    const data = structuredClone(s);
    data.stadiumFeatures = (data.featureIds ?? []).map((featureId) => ({
      featureId,
      feature: this.features().find((f) => f.id === featureId),
    }));
    if (data.bookingPolicy) {
      for (const key of ['openingTime', 'closingTime'] as const) {
        if (data.bookingPolicy[key].length === 5) data.bookingPolicy[key] += ':00';
      }
    }
    this.error.set('');
    this.busy.set(true);
    const saved = (row: Stadium) => {
      this.rows.update((rows) =>
        s.id ? rows.map((item) => (item.id === s.id ? row : item)) : [...rows, row],
      );
      this.query.set('');
      this.busy.set(false);
      this.closeForms();
      this.notice.set(s.name + (s.id ? ' updated.' : ' added.'));
    };
    if (s.id)
      this.api
        .update(data)
        .subscribe({ next: () => saved(data), error: (err) => this.failed(err) });
    else this.api.create(data).subscribe({ next: saved, error: (err) => this.failed(err) });
  }

  toggle(s: Stadium) {
    const updated = { ...s, isAvailable: !s.isAvailable };
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.api.update(updated).subscribe({
      next: () => {
        this.rows.update((rows) => rows.map((row) => (row.id === s.id ? updated : row)));
        this.busy.set(false);
      },
      error: (err) => this.failed(err),
    });
  }

  remove(s: Stadium) {
    if (!confirm('Delete ' + s.name + '?')) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.api.remove(s.id).subscribe({
      next: () => {
        this.rows.update((rows) => rows.filter((row) => row.id !== s.id));
        this.busy.set(false);
        this.notice.set(s.name + ' deleted.');
      },
      error: (err) => this.failed(err),
    });
  }

  openBooking(s: Stadium) {
    this.closeForms();
    this.notice.set('');
    this.booking = {
      stadiumId: s.id,
      customerName: '',
      customerPhone: '',
      startTime: '',
      endTime: '',
    };
    this.bookingStadium.set(s);
  }

  hours() {
    return (Date.parse(this.booking.endTime) - Date.parse(this.booking.startTime)) / 3600000;
  }

  private timeInSeconds(value: string) {
    const [hours, minutes, seconds = 0] = value.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }

  reserve() {
    if (this.busy()) return;
    const { data, message } = validateBooking(this.booking);
    this.error.set(message);
    if (message) return;
    this.busy.set(true);
    this.api.book(data).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.closeForms();
        this.notice.set(
          'Booking confirmed for ' + data.customerName + '. Total: ' + result.totalPrice + ' YER.',
        );
      },
      error: (err) => this.failed(err),
    });
  }
}
