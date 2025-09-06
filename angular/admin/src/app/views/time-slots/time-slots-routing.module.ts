import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddTimeSlotComponent } from './add-time-slot/add-time-slot.component';
import { TimeSlotsListComponent } from './time-slots-list/time-slots-list.component';
import { TimeSlotsComponent } from './time-slots.component';

const routes: Routes = [
  {
    path: '',
    component: TimeSlotsComponent,
    children: [
      {
        path: 'list',
        component: TimeSlotsListComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: AddTimeSlotComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: AddTimeSlotComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'view/:id',
        component: AddTimeSlotComponent,
        data: {
          title: 'View'
        }
      },
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TimeSlotsRoutingModule { }
