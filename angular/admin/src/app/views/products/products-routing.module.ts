import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductsComponent } from './products.component';
import { ProductlistComponent } from './productlist/productlist.component';
import { AddeditproductComponent } from './addeditproduct/addeditproduct.component';

const routes: Routes = [
  {
    path: '',
    component: ProductsComponent,
    children: [
      {
        path: 'list',
        component: ProductlistComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: AddeditproductComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: AddeditproductComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'view/:id',
        component: AddeditproductComponent,
        data: {
          title: 'Product View Page'
        }
      },
      {
        path: 'food-clone/:id',
        component: AddeditproductComponent,
        data: {
          title: 'Clone'
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
export class ProductsRoutingModule { }
