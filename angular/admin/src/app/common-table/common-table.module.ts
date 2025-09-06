import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonTableComponent } from './common-table.component';
import { Ng2SmartTableModule } from "./table/public-api";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ModalModule } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { NgSelectModule } from '@ng-select/ng-select';


@NgModule({
  declarations: [
    CommonTableComponent
  ],
  imports: [
    CommonModule,
    Ng2SmartTableModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ModalModule.forRoot(),
    BsDropdownModule.forRoot(),
    CollapseModule.forRoot(),
    BsDatepickerModule.forRoot(),
    NgSelectModule
  ],
  exports: [
    CommonTableComponent
  ]
})
export class CommonTableModule { }
