import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddBrandComponent } from './add-brand/add-brand.component';
import { BrandListComponent } from './brand-list/brand-list.component';
import { BrandComponent } from './brand.component';

const routes: Routes = [{
  path: '',
  component: BrandComponent,
  children: [{
    path: 'brand-add',
    component: AddBrandComponent,
    data: {
      title: 'brand Add'
    }
  },
  {
    path: 'brand-list',
    component: BrandListComponent,
    data: {
      title: 'brand List'
    }
  },
  {
    path: 'brand-edit/:id',
    component: AddBrandComponent,
    data: {
      title: 'brand edit'
    }
  },{
    path: '',
    redirectTo: 'brand-list',
    pathMatch: 'full'
  }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BrandRoutingModule { }
