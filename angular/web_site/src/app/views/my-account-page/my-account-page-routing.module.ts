import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyAccountPageComponent } from './my-account-page.component';
import { MyOrdersComponent } from './my-orders/my-orders.component';
import { NewOrderReceivedComponent } from './new-order-received/new-order-received.component';
import { ManageAddressComponent } from './manage-address/manage-address.component';
import { BillingAddressComponent } from './billing-address/billing-address.component';
import { ShippingAddressComponent } from './shipping-address/shipping-address.component';
import { EaccountComponent } from './eaccount/eaccount.component';

const routes: Routes = [
  {
    path: '',
    component: MyAccountPageComponent
},
{
  path: "my-orders",
  component: MyOrdersComponent,
  data: {
      title: "My orders"
  },
},
{
  path: "manage-address",
  component: ManageAddressComponent,
  data: {
      title: "Manage address"
  },
},
{
  path: "billing-address",
  component: BillingAddressComponent,
  data: {
      title: "Billing address"
  },
},
{
  path: "shipping-address/:id",
  component: ShippingAddressComponent,
  data: {
      title: "Shipping address"
  },
},
{
  path: "eaccount",
  component: EaccountComponent,
  data: {
      title: "Manage Profile"
  },
},
{
  path: "new-order-received",
  component: NewOrderReceivedComponent,
  data: {
      title: "New order received"
  },
},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MyAccountPageRoutingModule { }
