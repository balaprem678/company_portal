import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FuelRecordsRoutingModule } from './fuel-records-routing.module';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { FuelRecordsListComponent } from './fuel-records-list/fuel-records-list.component';
import { FuelRecordsComponent } from './fuel-records.component';


@NgModule({
  declarations: [
    FuelRecordsListComponent,
    FuelRecordsComponent,

  ],
  imports: [
    CommonModule,
    FuelRecordsRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonTableModule,
  ]
})
export class FuelRecordsModule { }
