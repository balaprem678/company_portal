import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { TimeSlotsRoutingModule } from './time-slots-routing.module';
import { TimeSlotsListComponent } from './time-slots-list/time-slots-list.component';
import { AddTimeSlotComponent } from './add-time-slot/add-time-slot.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { TimepickerModule } from 'ngx-bootstrap/timepicker';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
@NgModule({
  declarations: [
    TimeSlotsListComponent,
    AddTimeSlotComponent
  ],
  imports: [
    CommonModule,
    TimeSlotsRoutingModule,
    CommonTableModule,
    FormsModule,
    TimepickerModule.forRoot(),
    NgSelectModule
  ],
  providers:[DatePipe]
})
export class TimeSlotsModule { }
