import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BookingsComponent } from './bookings';

it('changes schedules and retries failed requests', async () => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'bookings', component: BookingsComponent }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  const page = await harness.navigateByUrl('/bookings?stadium=1', BookingsComponent);
  http
    .expectOne((r) => r.url.endsWith('/Stadiums'))
    .flush([
      { id: 1, name: 'North' },
      { id: 2, name: 'South' },
    ]);
  const previous = http.expectOne((r) => r.url.endsWith('/stadium/1'));
  await TestBed.inject(Router).navigateByUrl('/bookings?stadium=2');
  expect(previous.cancelled).toBe(true);
  http
    .expectOne((r) => r.url.endsWith('/stadium/2'))
    .flush('', { status: 500, statusText: 'Server Error' });
  harness.detectChanges();
  expect(harness.routeNativeElement?.textContent).toContain('Could not load bookings');
  page.refreshSchedule.next();
  http.expectOne((r) => r.url.endsWith('/stadium/2')).flush([]);
  harness.detectChanges();
  expect(harness.routeNativeElement?.textContent).toContain('No bookings for South');
  page.refreshSchedule.next();
  http
    .expectOne((r) => r.url.endsWith('/stadium/2'))
    .flush([{ id: 7, customerName: 'Sara', totalPrice: 100 }]);
  harness.detectChanges();
  expect(harness.routeNativeElement?.textContent).toContain('Sara');
  http.verify();
});
