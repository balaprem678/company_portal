import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddEditComponent } from './add-edit/add-edit.component';
import { ListComponent } from './list/list.component';
import { PaymentgatewayComponent } from './paymentgateway.component';

const routes: Routes = [
  {
    path: '',
    component: PaymentgatewayComponent,
    children: [
      {
        path: 'list',
        component: ListComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: AddEditComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: AddEditComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'view/:id',
        component: AddEditComponent,
        data: {
          title: 'View'
        }
      },
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaymentgatewayRoutingModule { }
