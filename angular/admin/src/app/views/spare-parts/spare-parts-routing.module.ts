import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SparePartsNewComponent } from './spare-parts-new/spare-parts-new.component';
import { SparePartsListComponent } from './spare-parts-list/spare-parts-list.component';

const routes: Routes = [
{
      path: 'add',
      component: SparePartsNewComponent,
      data: {
        title: 'Add',
      },
      // canActivate: [AuthGuard]
    },
    {
      path: 'edit/:id',
      component: SparePartsNewComponent ,
      data: {
        title: 'Add',
      },
    },
    {
      path: 'view/:id',
      component: SparePartsNewComponent ,
      data: {
        title: 'View',
      },
    },
    {
      path: 'list',
      component: SparePartsListComponent,
      data: {
        title: 'List',
      },
      // canActivate: [AuthGuard]
    },];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SparePartsRoutingModule { }
