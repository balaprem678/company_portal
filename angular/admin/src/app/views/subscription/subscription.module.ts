import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SubscriptionRoutingModule } from './subscription-routing.module';
import { SubscriptionComponent } from './subscription.component';
import { SubscriptionlistComponent } from './subscriptionlist/subscriptionlist.component';
import { SubscriptionaddEditComponent } from './subscriptionadd-edit/subscriptionadd-edit.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonTableModule } from 'src/app/common-table/common-table.module';


@NgModule({
  declarations: [
    SubscriptionComponent,
    SubscriptionlistComponent,
    SubscriptionaddEditComponent
  ],
  imports: [
    CommonModule,
    SubscriptionRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonTableModule,
  ]
})
export class SubscriptionModule { }
