import { BookingsComponent } from './bookings/bookings';
import { Routes } from '@angular/router';
import { StadiumsComponent } from './stadiums/stadiums';
import { About } from './about/about';
import { Contact } from './contact/contact';

export const routes: Routes = [
  { path: '', redirectTo: 'stadiums', pathMatch: 'full' }, 
  { path: 'stadiums', component: StadiumsComponent },
  { path: 'bookings', component: BookingsComponent },
  { path: 'about', component: About },
  { path: 'contact', component: Contact }
];
