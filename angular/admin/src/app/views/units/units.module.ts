import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UnitsRoutingModule } from './units-routing.module';
import { UnitlistComponent } from './unitlist/unitlist.component';
import { AddEditUnitsComponent } from './add-edit-units/add-edit-units.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgSelectModule } from '@ng-select/ng-select';


@NgModule({
  declarations: [
    UnitlistComponent,
    AddEditUnitsComponent
  ],
  imports: [
    CommonModule,
    UnitsRoutingModule,
    CommonTableModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule
  ]
})
export class UnitsModule { }
