import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DriverlandingpageComponent } from './driverlandingpage/driverlandingpage.component';
import { PagesComponent } from './pages.component';
import { PagesaddeditComponent } from './pagesaddedit/pagesaddedit.component';
import { PageslistComponent } from './pageslist/pageslist.component';

const routes: Routes = [
  {
    path : '',
    component : PagesComponent,
    children : [
      {
        path: 'list',
        component: PageslistComponent,
        data: {
          title: 'List'
        }
      },
      {
        path: 'add',
        component: PagesaddeditComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'edit/:id',
        component: PagesaddeditComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'driver-landing-page',
        component: DriverlandingpageComponent,
        data: {
          title: 'Driver Landing Page'
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
export class PagesRoutingModule { }
