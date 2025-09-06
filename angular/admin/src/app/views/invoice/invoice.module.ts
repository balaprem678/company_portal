import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';

import { InvoiceRoutingModule } from './invoice-routing.module';
import { AddInvoiceComponent } from './add-invoice/add-invoice.component';
import { InvoiceListComponent } from './invoice-list/invoice-list.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    AddInvoiceComponent,
    InvoiceListComponent
  ],
  imports: [
    CommonModule,
    InvoiceRoutingModule,
    NgSelectModule,
    FormsModule
  ]
})
export class InvoiceModule { }
