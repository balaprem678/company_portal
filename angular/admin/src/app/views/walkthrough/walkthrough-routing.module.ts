import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WalkthroughComponent } from './walkthrough.component';
import { WalkthroughListComponent } from './walkthrough-list/walkthrough-list.component';
import { AddEditWalkthroughComponent } from './add-edit-walkthrough/add-edit-walkthrough.component';


const routes: Routes = [
  {
    path: '',
    component: WalkthroughComponent,
    children: [
      {
        path: 'list',
        component: WalkthroughListComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: AddEditWalkthroughComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: AddEditWalkthroughComponent,
        data: {
          title: 'Edit'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WalkthroughRoutingModule { }
