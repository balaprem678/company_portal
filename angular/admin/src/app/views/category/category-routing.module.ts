import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CategoryComponent } from './category.component';
import { MaincategorylistComponent } from './maincategorylist/maincategorylist.component';
import { SubcategorylistComponent } from './subcategorylist/subcategorylist.component';
import { AddsubcategoryComponent } from './addsubcategory/addsubcategory.component';
import { AddmaincategoryComponent } from './addmaincategory/addmaincategory.component';
const routes: Routes = [
  {
    path: '',
    component: CategoryComponent,
    children: [
      {
        path: 'category-list',
        component: MaincategorylistComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'category-add',
        component: AddmaincategoryComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'category-edit/:id',
        component: AddmaincategoryComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'category-view/:view',
        component: AddmaincategoryComponent,
        data: {
          title: 'View'
        }
      },
      {
        path: 'sub-category-list',
        component: SubcategorylistComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'sub-category-add',
        component: AddsubcategoryComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'sub-category-edit/:id',
        component: AddsubcategoryComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: '',
        redirectTo: 'category-list',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CategoryRoutingModule { }
