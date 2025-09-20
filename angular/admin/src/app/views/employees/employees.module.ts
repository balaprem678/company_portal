import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EmployeesRoutingModule } from './employees-routing.module';
import { AddNewEmployeesComponent } from './add-new-employees/add-new-employees.component';
import { ActiveEmployeesComponent } from './active-employees/active-employees.component';


@NgModule({
  declarations: [
    AddNewEmployeesComponent,
    ActiveEmployeesComponent
  ],
  imports: [
    CommonModule,
    EmployeesRoutingModule
  ]
})
export class EmployeesModule { }
