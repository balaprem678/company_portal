import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DealAddEditComponent } from './deal-add-edit/deal-add-edit.component';
import { DealListComponent } from './deal-list/deal-list.component';

const routes: Routes = [ {
  path: '',
  children: [
    {
      path: 'list',
      component: DealListComponent,
      data: {
        title: 'Deals List'
      }
    },
  {
  path: 'add',
  component: DealAddEditComponent,
  data: {
    title: 'Add Deal'
  }
},
{
  path: 'edit/:id',
  component: DealAddEditComponent,
  data: {
    title: 'Edit Deal'
  }
},
{
  path: 'view/:id',
  component: DealAddEditComponent,
  data: {
    title: 'Deal View Page'
  }
},
{
  path: '',
  redirectTo: 'deals',
  pathMatch: 'full'
}
]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DealsRoutingModule { }
