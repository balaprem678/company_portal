import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OfferAddEditComponent } from './offer-add-edit/offer-add-edit.component';
import { OfferListComponent } from './offer-list/offer-list.component';
const routes: Routes = [ {
  path: '',
  children: [
    {
      path: 'add',
      component: OfferAddEditComponent,
      data: {
        title: 'add'
      }
    },
    {
      path: 'edit/:id',
      component: OfferAddEditComponent,
      data: {
        title: 'Edit'
      }
    },
    {
      path: 'list',
      component: OfferListComponent,
      data: {
        title: 'Offer-list'
      }
    },
    {
      path: '',
      redirectTo: 'offer',
      pathMatch: 'full'
    }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OfferManagementRoutingModule { }
