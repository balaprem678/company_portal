import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminearningsRoutingModule } from './adminearnings-routing.module';
import { AdminearningslistComponent } from './adminearningslist/adminearningslist.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    AdminearningslistComponent
  ],
  imports: [
    CommonModule,
    AdminearningsRoutingModule,
    CommonTableModule,
    NgSelectModule,
    BsDatepickerModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class AdminearningsModule { }
