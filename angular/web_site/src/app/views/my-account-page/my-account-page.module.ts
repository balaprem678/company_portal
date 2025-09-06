import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MyAccountPageRoutingModule } from './my-account-page-routing.module';
import { MyOrdersComponent } from './my-orders/my-orders.component';
import { NewOrderReceivedComponent } from './new-order-received/new-order-received.component';
import { ManageAddressComponent } from './manage-address/manage-address.component';
import { BillingAddressComponent } from './billing-address/billing-address.component';
import { ShippingAddressComponent } from './shipping-address/shipping-address.component';
import { EaccountComponent } from './eaccount/eaccount.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StatusPipePipe } from './status-pipe.pipe'; 
import { NgxIntlTelInputModule } from '@khazii/ngx-intl-tel-input';

@NgModule({
  declarations: [
    MyOrdersComponent,
    NewOrderReceivedComponent,
    ManageAddressComponent,
    BillingAddressComponent,
    ShippingAddressComponent,
    EaccountComponent,
    StatusPipePipe
  ],
  imports: [
    CommonModule,
    MyAccountPageRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgxIntlTelInputModule
  ]
})
export class MyAccountPageModule { }
