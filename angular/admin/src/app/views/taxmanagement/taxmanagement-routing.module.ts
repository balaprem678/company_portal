import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddEditTaxComponent } from './add-edit-tax/add-edit-tax.component';
import { TaxlistComponent } from './taxlist/taxlist.component';
import { TaxmanagementComponent } from './taxmanagement.component';

const routes: Routes = [
  {
    path: '',
    component: TaxmanagementComponent,
    children: [
      {
        path: 'list',
        component: TaxlistComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: AddEditTaxComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: AddEditTaxComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'view/:id',
        component: AddEditTaxComponent,
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
export class TaxmanagementRoutingModule { }
