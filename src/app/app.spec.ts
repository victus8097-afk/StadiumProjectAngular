import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

it('links to the booking schedule', async () => {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  expect(fixture.nativeElement.querySelector('a[href="/bookings"]')?.textContent).toBe('Bookings');
});
