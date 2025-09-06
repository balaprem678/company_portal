import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddInvoiceComponent } from './add-invoice/add-invoice.component';
import { InvoiceListComponent } from './invoice-list/invoice-list.component';
const routes: Routes = [
  {
      path: '',
      children: [
        {
          path: 'list',
          component: InvoiceListComponent,
          data: {
            title: 'list'
          }
        },
        {
          path: 'add',
          component: AddInvoiceComponent,
          data: {
            title: 'Add'
          }
        },
        {
          path: 'edit/:id',
          component: AddInvoiceComponent,
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
export class InvoiceRoutingModule { 

}
