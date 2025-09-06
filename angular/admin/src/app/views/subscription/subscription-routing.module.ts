import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SubscriptionComponent } from './subscription.component';
import { SubscriptionaddEditComponent } from './subscriptionadd-edit/subscriptionadd-edit.component';
import { SubscriptionlistComponent } from './subscriptionlist/subscriptionlist.component';

const routes: Routes = [
  {
    path: '',
    component: SubscriptionComponent,
    children: [
      {
        path: 'list',
        component: SubscriptionlistComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: SubscriptionaddEditComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: SubscriptionaddEditComponent,
        data: {
          title: 'Edit'
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
export class SubscriptionRoutingModule { }
