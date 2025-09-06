import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OrdersRoutingModule } from './orders-routing.module';
import { OrderdashboardComponent } from './orderdashboard/orderdashboard.component';
import { UsercancelledordersComponent } from './usercancelledorders/usercancelledorders.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { DeliveredordersComponent } from './deliveredorders/deliveredorders.component';
import { NgChartsModule } from 'ng2-charts';
import { VieworderComponent } from './vieworder/vieworder.component';
import { TabsModule, TabsetConfig } from 'ngx-bootstrap/tabs';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker'
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CancelordersComponent } from './cancelorders/cancelorders.component';
import { OrderpickupComponent } from './orderpickup/orderpickup.component';
import { NewordersComponent } from './neworders/neworders.component';
import { PackedordersComponent } from './packedorders/packedorders.component';
import { AssigndriverlistComponent } from './assigndriverlist/assigndriverlist.component';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { ReturnsComponent } from './returns/returns.component';
import { CollectedComponent } from './collected/collected.component';
import { RefundedComponent } from './refunded/refunded.component';
import { ReturnViewComponent } from './return-view/return-view.component';
import { AllOrdersComponent } from './all-orders/all-orders.component';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { ModalModule } from 'ngx-bootstrap/modal';

@NgModule({
  declarations: [
    OrderdashboardComponent,
    UsercancelledordersComponent,
    DeliveredordersComponent,
    VieworderComponent,
    CancelordersComponent,
    OrderpickupComponent,
    NewordersComponent,
    PackedordersComponent,
    AssigndriverlistComponent,
    ReturnsComponent,
    CollectedComponent,
    RefundedComponent,
    ReturnViewComponent,
    AllOrdersComponent,

  ],
  imports: [
    CommonModule,
    OrdersRoutingModule,
    CommonTableModule,
    NgChartsModule,
    TabsModule.forRoot(),
    CollapseModule.forRoot(),
    BsDatepickerModule,
    NgSelectModule,
    FormsModule,
    ReactiveFormsModule,
    AccordionModule,
    ModalModule.forRoot(),
  ]
})
export class OrdersModule { }
