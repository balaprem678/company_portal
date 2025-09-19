import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddContractsComponent } from './add-contracts/add-contracts.component';
import { ListContractsComponent } from './list-contracts/list-contracts.component';

const routes: Routes = [
    {
      path: 'add',
      component: AddContractsComponent,
      data: {
        title: 'Add',
      },
      // canActivate: [AuthGuard]
    },
    {
      path: 'edit/:id',
      component: AddContractsComponent ,
      data: {
        title: 'Add',
      },
    },
    {
      path: 'view/:id',
      component: AddContractsComponent ,
      data: {
        title: 'View',
      },
    },
    {
      path: 'list',
      component: ListContractsComponent,
      data: {
        title: 'List',
      },
      // canActivate: [AuthGuard]
    },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ContractsRoutingModule { }
