import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { StadiumsComponent } from './stadiums';

it('rejects reversed times and permits retry after a conflict', () => {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const page = TestBed.createComponent(StadiumsComponent).componentInstance;
  const http = TestBed.inject(HttpTestingController);
  page.openBooking({
    id: 1,
    name: 'Arena',
    location: 'City',
    pricePerHour: 50,
    categoryId: 1,
    isAvailable: true,
  });
  Object.assign(page.booking, {
    customerName: 'Sara',
    startTime: '2099-05-01T18:00',
    endTime: '2099-05-01T17:00',
  });
  page.reserve();
  expect(page.error()).toContain('after');
  http.expectNone((r) => r.method === 'POST');
  page.booking.endTime = '2099-05-01T19:00';
  page.reserve();
  page.reserve();
  http
    .expectOne((r) => r.method === 'POST')
    .flush('Taken', { status: 400, statusText: 'Bad Request' });
  expect(page.error()).toBe('Taken');
  expect(page.booking.customerName).toBe('Sara');
  page.reserve();
  http.expectOne((r) => r.method === 'POST').flush({ totalPrice: 50 });
  expect(page.notice()).toContain('50 YER');
  http.verify();
});
