import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PaymentgatewayRoutingModule } from './paymentgateway-routing.module';
import { PaymentgatewayComponent } from './paymentgateway.component';
import { ListComponent } from './list/list.component';
import { AddEditComponent } from './add-edit/add-edit.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonTableModule } from 'src/app/common-table/common-table.module';


@NgModule({
  declarations: [
    PaymentgatewayComponent,
    ListComponent,
    AddEditComponent
  ],
  imports: [
    CommonModule,
    PaymentgatewayRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonTableModule,
  ]
})
export class PaymentgatewayModule { }
