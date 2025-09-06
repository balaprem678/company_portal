import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComboListComponent } from './combo-list/combo-list.component';
import { ComboAddEditComponent } from './combo-add-edit/combo-add-edit.component';

const routes: Routes = [{
  path: '',
  children: [
    {
      path: 'list',
      component: ComboListComponent,
      data: {
        title: 'Combo Offer List'
      }
    },
  {
  path: 'add',
  component: ComboAddEditComponent,
  data: {
    title: 'Add Combo Offer'
  }
},
{
  path: 'edit/:id',
  component: ComboAddEditComponent,
  data: {
    title: 'Edit Combo Offer'
  }
},
{
  path: 'view/:id',
  component: ComboAddEditComponent,
  data: {
    title: 'Combo Offer View Page'
  }
},
{
  path: '',
  redirectTo: 'combo',
  pathMatch: 'full'
}
]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ComboRoutingModule { }
