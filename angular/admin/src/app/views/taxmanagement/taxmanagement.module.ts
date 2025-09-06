import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TaxmanagementRoutingModule } from './taxmanagement-routing.module';
import { AddEditTaxComponent } from './add-edit-tax/add-edit-tax.component';
import { TaxlistComponent } from './taxlist/taxlist.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';


@NgModule({
  declarations: [
    AddEditTaxComponent,
    TaxlistComponent
  ],
  imports: [
    CommonModule,
    TaxmanagementRoutingModule,
    CommonTableModule,
    NgSelectModule,
    FormsModule,
    RouterModule,
  ]
})
export class TaxmanagementModule { }
