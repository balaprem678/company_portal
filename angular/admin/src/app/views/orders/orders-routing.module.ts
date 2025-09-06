import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AssigndriverlistComponent } from './assigndriverlist/assigndriverlist.component';
import { CancelordersComponent } from './cancelorders/cancelorders.component';
import { DeliveredordersComponent } from './deliveredorders/deliveredorders.component';
import { NewordersComponent } from './neworders/neworders.component';
import { OrderdashboardComponent } from './orderdashboard/orderdashboard.component';
import { OrderpickupComponent } from './orderpickup/orderpickup.component';
import { OrdersComponent } from './orders.component';
import { PackedordersComponent } from './packedorders/packedorders.component';
import { UsercancelledordersComponent } from './usercancelledorders/usercancelledorders.component';
import { VieworderComponent } from './vieworder/vieworder.component';
import { ReturnsComponent } from './returns/returns.component';
import { CollectedComponent } from './collected/collected.component';
import { RefundedComponent } from './refunded/refunded.component';
import { ReturnViewComponent } from './return-view/return-view.component';
import { AllOrdersComponent } from './all-orders/all-orders.component';

const routes: Routes = [{
  path: '',
  component: OrdersComponent,
  children: [
    // {
    //   path: 'orders-dashboard',
    //   component: OrderdashboardComponent,
    //   data: {
    //     title: 'Orders Dashboard'
    //   }
    // },
    {
      path: 'usercancelledorders',
      component: UsercancelledordersComponent,
      data: {
        title: 'usercancelledorders'
      }
    },
    {
      path: 'returnedorders',
      component: ReturnsComponent,
      data: {
        title: 'usercancelledorders'
      }
    },
    {
      path: 'allorders',
      component: AllOrdersComponent,
      data: {
        title: 'allorders'
      }
    },
    {
      path: 'return-collectedorders',
      component: CollectedComponent,
      data: {
        title: 'usercancelledorders'
      }
    },
    {
      path: 'refundedorders',
      component: RefundedComponent,
      data: {
        title: 'usercancelledorders'
      }
    },
    {
      path: 'deliveredorders',
      component: DeliveredordersComponent,
      data: {
        title: 'Delivered Orders '
      }
    },
    {
      path: 'vieworders/:id',
      component: VieworderComponent,
      data: {
        title: 'View Order'
      }
    },
    {
      path: 'return-vieworders/:id/:time/:status',
      component: ReturnViewComponent,
      data: {
        title: 'View Order'
      }
    },
    {
      path: 'cancelorders',
      component: CancelordersComponent,
      data: {
        title: 'Cancel Orders'
      }
    },
    {
      path: 'orderpickup',
      component: OrderpickupComponent,
      data: {
        title: 'Order On Going'
      }
    }, {
      path: 'neworders',
      component: NewordersComponent,
      data: {
        title: 'New Orders'
      }
    },
    {
      path: 'packedorders',
      component: PackedordersComponent,
      data: {
        title: 'Packed  Orders'
      }
    },
    {
      path: 'assigndriver/:id',
      component: AssigndriverlistComponent,
      data: {
        title: 'Assign Driver'
      }
    },
    {
      path: '',
      redirectTo: 'neworders',
      pathMatch: 'full'
    }

  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrdersRoutingModule { }
